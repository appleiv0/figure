#!/usr/bin/env python3
"""
Migration V2: Label normalization for existing sessions.

Transforms:
1. self_label_normalized: kid name in relation field → "나"
2. duplicate_labels_disambiguated: same label appearing N times → "첫째 ○○", "둘째 ○○", ...
3. family_members_added: extract from figures["3"] if missing

Affected fields per session:
- figures["1"], figures["2"], figures["3"], figures["5"], figures["6"]: each item.relation
- positions["figures"]: each item.relation
- family_members: created if missing

Usage:
    python scripts/migrate_v2_labels.py --dry-run                    # default, output to stdout
    python scripts/migrate_v2_labels.py --dry-run --output report.txt
    python scripts/migrate_v2_labels.py --dry-run --json out.json    # machine-readable
    python scripts/migrate_v2_labels.py --apply                      # WARNING: D-1c only
"""
import argparse
import json
import os
import sys
from collections import Counter
from datetime import datetime, timezone

# backend 디렉토리에서 실행하므로 app 모듈 import 가능하게
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.mongodb import get_sessions_collection


SELF_LABEL = "나"
ORDINAL_KOR = ["", "첫째 ", "둘째 ", "셋째 ", "넷째 ", "다섯째 ", "여섯째 ", "일곱째 "]
RELATION_FIGURES_KEYS = ["1", "2", "3", "5", "6"]

# 변환 제외: stage 특이 의도 표기
PRESERVED_LABELS = {
    "나(소망)",  # figures["2"] 자기상 vs 소망상 구분
}

# 외/친 미상 조부모 — 영원히 보존 결정
AMBIGUOUS_GRANDPARENT_LABELS = {"할아버지", "할머니"}

# 한국어 ordinal prefix들 (구 시스템 수동 ordinal 인식용)
KNOWN_ORDINAL_PREFIXES = [
    "첫째 ", "둘째 ", "셋째 ", "넷째 ", "다섯째 ",
    "여섯째 ", "일곱째 ", "여덟째 ", "아홉째 ", "열째 ",
    "둘째", "셋째", "넷째",  # 띄어쓰기 없는 변형 ("셋째여동생")
    "큰", "작은",  # "큰누나", "작은누나"
    "막내",  # "막내여동생"
]


def get_ordinal_prefix(n: int) -> str:
    """1 → '첫째 ', 2 → '둘째 ', n>7 → 'n번째 '"""
    if 0 < n < len(ORDINAL_KOR):
        return ORDINAL_KOR[n]
    return f"{n}번째 "


def strip_ordinal_prefix(label: str) -> str:
    """구 시스템 수동 ordinal 라벨에서 base 추출.
    예: "둘째 남동생" → "남동생", "셋째여동생" → "여동생"
    매칭 안 되면 원본 반환."""
    for prefix in KNOWN_ORDINAL_PREFIXES:
        if label.startswith(prefix) and len(label) > len(prefix):
            return label[len(prefix):]
    if "번째 " in label:
        return label.split("번째 ", 1)[1]
    return label


def is_preserved_label(label: str) -> bool:
    """변환에서 제외해야 할 라벨인지 확인."""
    return label in PRESERVED_LABELS or label in AMBIGUOUS_GRANDPARENT_LABELS


def build_label_mapping(figures_3: list, kid_name: str) -> tuple:
    """
    figures["3"]를 기준으로 family_members와 라벨 매핑 결정.

    Returns:
      family_members: ["엄마", "첫째 형", "둘째 형", ..., "나"]
      occurrence_to_new: list of new labels in figures_3 등장 순서
      summary_changes: list of human-readable change descriptions
    """
    if not figures_3:
        return [], [], []

    # 1) 등장 순서대로 본인 정규화 + 중복 카운트
    raw_labels = []
    for item in figures_3:
        rel = item.get("relation", "")
        if rel == kid_name:
            raw_labels.append(SELF_LABEL)
        else:
            raw_labels.append(rel)

    # 2) 중복 카운트
    label_counts = Counter(raw_labels)

    # 3) 등장 순서대로 ordinal 분기 적용
    seen_index = {}
    occurrence_to_new = []
    for raw in raw_labels:
        if label_counts[raw] == 1:
            occurrence_to_new.append(raw)
        else:
            seen_index[raw] = seen_index.get(raw, 0) + 1
            new_label = f"{get_ordinal_prefix(seen_index[raw])}{raw}"
            occurrence_to_new.append(new_label)

    family_members = occurrence_to_new[:]
    summary_changes = []

    if any(label_counts[l] > 1 for l in label_counts):
        dup_summary = ", ".join(f"{l}×{c}" for l, c in label_counts.items() if c > 1)
        summary_changes.append(f"duplicate labels: {dup_summary}")

    return family_members, occurrence_to_new, summary_changes


def transform_relation_list(items: list, kid_name: str, family_members: list) -> tuple:
    """
    figures의 한 stage 또는 positions의 figures를 변환.

    Returns: (new_items, warnings)
    """
    if not items:
        return items, []

    # base label → list of new labels in family_members order
    base_to_news = {}
    for m in family_members:
        base = m
        for prefix in ORDINAL_KOR[1:]:
            if m.startswith(prefix):
                base = m[len(prefix):]
                break
        if base == m and "번째 " in m:
            base = m.split("번째 ", 1)[1]
        base_to_news.setdefault(base, []).append(m)

    new_items = []
    warnings = []
    seen_in_items = {}

    for item in items:
        key = "relation" if "relation" in item else ("role" if "role" in item else None)
        if key is None:
            new_items.append(item)
            continue

        old_label = item.get(key, "")
        new_item = dict(item)

        # 1) 본인 정규화
        if old_label == kid_name:
            new_item[key] = SELF_LABEL
            new_items.append(new_item)
            continue

        # 2) 변환 제외 라벨 (그대로 보존, warning 없음)
        if is_preserved_label(old_label):
            new_items.append(new_item)
            continue

        # 3) 구 시스템 수동 ordinal 라벨 인식
        base = strip_ordinal_prefix(old_label)
        if base != old_label:
            # base가 family_members에 있으면 매핑 시도, 없으면 그대로 (보존)
            candidates = base_to_news.get(base, [])
            if candidates:
                seen_in_items[base] = seen_in_items.get(base, 0) + 1
                idx = seen_in_items[base] - 1
                if idx < len(candidates):
                    new_item[key] = candidates[idx]
                    new_items.append(new_item)
                    continue
            # 매핑 실패 → 그대로 보존 (warning 없음, 의도된 구 데이터)
            new_items.append(new_item)
            continue

        # 4) 일반 매핑
        candidates = base_to_news.get(old_label, [])
        if len(candidates) == 0:
            # family_members에 없는 라벨 — 그대로 보존
            # ("조카", "아들", "딸" 등 positions 전용 라벨 — 정상)
            warnings.append(f"label '{old_label}' not in family_members (preserved as-is)")
            new_items.append(new_item)
        elif len(candidates) == 1:
            new_item[key] = candidates[0]
            new_items.append(new_item)
        else:
            seen_in_items[old_label] = seen_in_items.get(old_label, 0) + 1
            occurrence_idx = seen_in_items[old_label] - 1
            if occurrence_idx < len(candidates):
                new_item[key] = candidates[occurrence_idx]
                new_items.append(new_item)
            else:
                warnings.append(
                    f"label '{old_label}' appears more than expected in items"
                )
                new_items.append(new_item)

    return new_items, warnings


def detect_warnings(session: dict) -> list:
    """변환 전 정보성 note 감지."""
    notes = []
    figures = session.get("figures", {})

    for stage_key in RELATION_FIGURES_KEYS:
        for item in figures.get(stage_key, []):
            rel = item.get("relation", "")
            if rel in AMBIGUOUS_GRANDPARENT_LABELS:
                notes.append(f"figures[{stage_key}]: '{rel}' kept as-is (외/친 ambiguous, preserved by policy)")

    for item in session.get("positions", {}).get("figures", []):
        rel = item.get("relation", "")
        if rel in AMBIGUOUS_GRANDPARENT_LABELS:
            notes.append(f"positions: '{rel}' kept as-is (외/친 ambiguous, preserved by policy)")

    # figures 간 라벨 set 불일치 — 정보성 참고용
    fig3_labels = Counter(item.get("relation", "") for item in figures.get("3", []))
    for other in ["5", "6"]:
        other_labels = Counter(item.get("relation", "") for item in figures.get(other, []))
        if other_labels and fig3_labels != other_labels:
            notes.append(
                f"figures[3] vs figures[{other}] count differs (informational): "
                f"3={dict(fig3_labels)} vs {other}={dict(other_labels)}"
            )

    return notes


def transform_session(session: dict) -> dict:
    """한 세션을 변환."""
    receipt_no = session.get("receiptNo")
    kid = session.get("kid", {})
    kid_name = kid.get("name", "")

    pre_warnings = detect_warnings(session)

    figures = session.get("figures", {})
    figures_3 = figures.get("3", [])

    # family_members 결정
    existing_fm = session.get("family_members", [])
    if existing_fm and isinstance(existing_fm, list) and len(existing_fm) > 0:
        family_members = existing_fm
    else:
        family_members, _, _ = build_label_mapping(figures_3, kid_name)

    changes = []
    if family_members and not existing_fm:
        changes.append(f"family_members_added: {family_members}")

    # figures 변환
    new_figures = {}
    all_post_warnings = []
    for stage_key in RELATION_FIGURES_KEYS:
        items = figures.get(stage_key, [])
        if not items:
            new_figures[stage_key] = items
            continue
        new_items, warnings = transform_relation_list(items, kid_name, family_members)
        new_figures[stage_key] = new_items
        for w in warnings:
            all_post_warnings.append(f"figures[{stage_key}]: {w}")
        old_labels = [it.get("relation") for it in items]
        new_labels = [it.get("relation") for it in new_items]
        if old_labels != new_labels:
            changes.append(f"figures[{stage_key}]: {old_labels} → {new_labels}")

    # positions 변환
    positions = session.get("positions", {})
    pos_figures = positions.get("figures", [])
    new_pos_figures = pos_figures
    if pos_figures:
        new_pos_figures, pos_warnings = transform_relation_list(pos_figures, kid_name, family_members)
        for w in pos_warnings:
            all_post_warnings.append(f"positions: {w}")
        old_roles = [it.get("relation", it.get("role")) for it in pos_figures]
        new_roles = [it.get("relation", it.get("role")) for it in new_pos_figures]
        if old_roles != new_roles:
            changes.append(f"positions: {old_roles} → {new_roles}")

    new_positions = dict(positions)
    if pos_figures:
        new_positions["figures"] = new_pos_figures

    no_op = len(changes) == 0

    return {
        "receiptNo": receipt_no,
        "kid_name": kid_name,
        "status": session.get("status", "in_progress"),
        "no_op": no_op,
        "pre_warnings": pre_warnings,
        "changes": changes,
        "post_warnings": all_post_warnings,
        "preview": {
            "before": {
                "figures": {k: figures.get(k, []) for k in RELATION_FIGURES_KEYS},
                "family_members": existing_fm,
                "positions_figures": pos_figures,
            },
            "after": {
                "figures": new_figures,
                "family_members": family_members,
                "positions_figures": new_pos_figures,
            },
        },
    }


def write_text_report(results: list, output) -> None:
    """사람이 읽기 좋은 텍스트 보고서."""
    total = len(results)
    no_op_count = sum(1 for r in results if r["no_op"])
    affected = total - no_op_count
    pre_noted = sum(1 for r in results if r["pre_warnings"])
    post_warned = sum(1 for r in results if r["post_warnings"])

    print(f"=== Migration V2 Dry-Run Report ===", file=output)
    print(f"Generated: {datetime.now(timezone.utc).isoformat()}", file=output)
    print(f"Total sessions: {total}", file=output)
    print(f"Affected sessions: {affected}", file=output)
    print(f"No-op sessions: {no_op_count}", file=output)
    print(f"Sessions with notes: {pre_noted}", file=output)
    print(f"Sessions with post-warnings: {post_warned}", file=output)
    print("", file=output)

    print(f"--- Affected Sessions Detail ---", file=output)
    for r in results:
        if r["no_op"] and not r["pre_warnings"]:
            continue
        print(f"\n[receiptNo: {r['receiptNo']}] kid={r['kid_name']} status={r['status']}", file=output)
        if r["no_op"]:
            print(f"  no_op (notes only)", file=output)
        if r["pre_warnings"]:
            print(f"  notes (informational):", file=output)
            for w in r["pre_warnings"]:
                print(f"    - {w}", file=output)
        if r["changes"]:
            print(f"  changes:", file=output)
            for c in r["changes"]:
                print(f"    - {c}", file=output)
        if r["post_warnings"]:
            print(f"  post_warnings (label preserved as-is):", file=output)
            for w in r["post_warnings"]:
                print(f"    - {w}", file=output)

    no_op_sessions = [r for r in results if r["no_op"] and not r["pre_warnings"]]
    if no_op_sessions:
        print(f"\n--- No-op Sessions (no changes, no notes) ---", file=output)
        for r in no_op_sessions:
            print(f"  {r['receiptNo']} ({r['kid_name']})", file=output)


def write_json_report(results: list, path: str) -> None:
    """JSON으로 전체 변환 미리보기 export."""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2, default=str)


def main():
    parser = argparse.ArgumentParser(description="Migrate session labels to V2 format")
    parser.add_argument("--dry-run", action="store_true", default=True,
                        help="Dry run mode (default, no DB changes)")
    parser.add_argument("--apply", action="store_true",
                        help="Actually apply changes to DB. REQUIRES backup. (D-1c)")
    parser.add_argument("--output", default=None, help="Output file path for text report (default: stdout)")
    parser.add_argument("--json", default=None, help="Output JSON file for full preview")
    args = parser.parse_args()

    if args.apply:
        print("ERROR: --apply mode is for D-1c. This script (D-1a) only supports --dry-run.", file=sys.stderr)
        print("To apply, use the D-1c version of this script (created in a separate step).", file=sys.stderr)
        sys.exit(1)

    print("Connecting to MongoDB...", file=sys.stderr)
    collection = get_sessions_collection()

    sessions = list(collection.find({}))
    print(f"Loaded {len(sessions)} sessions", file=sys.stderr)

    results = [transform_session(s) for s in sessions]

    output = open(args.output, "w", encoding="utf-8") if args.output else sys.stdout
    try:
        write_text_report(results, output)
    finally:
        if args.output:
            output.close()

    if args.json:
        write_json_report(results, args.json)
        print(f"\nJSON preview saved to {args.json}", file=sys.stderr)

    if args.output:
        print(f"\nReport saved to {args.output}", file=sys.stderr)


if __name__ == "__main__":
    main()
