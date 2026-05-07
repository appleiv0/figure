#!/usr/bin/env python3
"""
GPT 응답 품질 테스트 — 운영 API를 통해 실제 검사 시뮬레이션 후 GPT 응답 분석.

사용법:
    python scripts/test_gpt_quality.py --code 9MB4JS --api https://figuretherapy.ai.kr
"""
import argparse
import json
import re
import sys
import time
import requests

# 테스트 시나리오: 다양한 패턴의 아이 답변
TEST_SCENARIOS = [
    {
        "name": "일반 가족 (형 2명)",
        "kid": {"name": "테스트아동", "sex": "Male", "birth": "2015-03-15"},
        "family": ["엄마", "아빠", "첫째 형", "둘째 형", "여동생", "나"],
        "stage1_animals": ["강아지", "병아리", "나비", "토끼"],
        "stage2_animals": ["사자", "독수리", "호랑이", "돌고래"],
        "stage3": {
            "엄마": {"figure": "캥거루", "message": "우리 엄마는 캥거루처럼 품이 넓어요"},
            "아빠": {"figure": "사자", "message": "아빠는 무서워요"},
            "첫째 형": {"figure": "상어", "message": "나랑 많이 싸워서"},
            "둘째 형": {"figure": "악어", "message": "자꾸 시비걸어서"},
            "여동생": {"figure": "병아리", "message": "귀엽고 작아서"},
        },
        # Stage 5 (가족이 보는 나) 답변들
        "stage5": {
            "엄마": {"figure": "강아지", "message": "귀엽거든"},
            "아빠": {"figure": "개", "message": "성실해 지라고"},
            "첫째 형": {"figure": "상어", "message": "쉬운 먹이감이라서"},
            "둘째 형": {"figure": "병아리", "message": "얌채같아서"},
            "여동생": {"figure": "독수리", "message": "날럽해서"},
        },
        # GPT 1턴 후 아이 답변 (감정 탐색)
        "user_responses_turn1": {
            "엄마": "내가 귀엽거든",
            "아빠": "성실해 지라고",
            "첫째 형": "쉬운 먹이감이라서",
            "둘째 형": "얌채같아서",
            "여동생": "날럽해서",
        },
        # GPT 2턴 후 아이 답변
        "user_responses_turn2": {
            "엄마": "기분 좋아",
            "아빠": "싫어",
            "첫째 형": "형이 먼저 때려",
            "둘째 형": "비밀",
            "여동생": "1",
        },
    }
]

# GPT 응답 품질 체크 패턴
QUALITY_CHECKS = [
    {
        "name": "동물 이름 노출",
        "pattern": r"(캥거루|강아지|사자|상어|악어|병아리|독수리|호랑이|돌고래|토끼|나비|코브라|뱀|조개|젖소|돼지|불곰|코끼리|기린|펭귄|원숭이|거북이|달팽이|개미|물고기|버팔로|여우|학)",
        "severity": "HIGH",
        "description": "동물 이름이 GPT 응답에 포함됨 (규칙 위반)",
    },
    {
        "name": "추상적 공감",
        "pattern": r"그렇게 생각해서|그렇게 느껴서|그런 생각이",
        "severity": "MEDIUM",
        "description": "구체적 내용 대신 추상적 공감 사용",
    },
    {
        "name": "일반적 위로/훈계",
        "pattern": r"소중한 존재|서로 이해|노력해|특별한 아이|정말 멋진",
        "severity": "MEDIUM",
        "description": "일반적 위로/훈계 표현 사용 (규칙 위반)",
    },
    {
        "name": "다중 질문",
        "pattern": r"\?.*\?",
        "severity": "MEDIUM",
        "description": "한 응답에 질문 2개 이상 (규칙 위반)",
    },
    {
        "name": "단어 변환",
        "pattern": r"얌전|날렵|성실하다고 생각",
        "severity": "HIGH",
        "description": "아이의 단어를 임의 변환 (얌채→얌전 등)",
    },
    {
        "name": "가족에게 말하라고",
        "pattern": r"에게 어떤 말을 하고싶|에게 말해|에게 말을",
        "severity": "MEDIUM",
        "description": "가족에게 말하라고 유도 (푸름이에게 말해야 함)",
    },
    {
        "name": "그렇구나 시작",
        "pattern": r"^그렇구나",
        "severity": "LOW",
        "description": "의미 없는 답변에 '그렇구나'로 시작",
    },
]


def check_gpt_response(response: str, context: dict) -> list:
    """GPT 응답에서 문제 패턴 감지"""
    issues = []
    for check in QUALITY_CHECKS:
        matches = re.findall(check["pattern"], response)
        if matches:
            issues.append({
                "check": check["name"],
                "severity": check["severity"],
                "description": check["description"],
                "matches": matches,
                "response": response[:200],
            })
    return issues


def run_api_test(api_base: str, code: str, scenario: dict) -> dict:
    """API를 통해 검사 시뮬레이션"""
    results = {
        "scenario": scenario["name"],
        "gpt_responses": [],
        "issues": [],
        "total_calls": 0,
    }

    s = requests.Session()

    # 1. 코드 검증
    print(f"  [1] 코드 검증: {code}")
    r = s.post(f"{api_base}/public/validate-code", json={"code": code})
    if r.status_code != 200:
        print(f"    ❌ 코드 검증 실패: {r.status_code} {r.text}")
        return results
    code_data = r.json()
    print(f"    ✓ valid={code_data.get('valid')}, used={code_data.get('used')}")

    if code_data.get("used"):
        print(f"    ⚠️  이미 사용된 코드, 건너뜀")
        return results

    # 2. 코드 사용 + 세션 생성
    print(f"  [2] 코드 사용 + 세션 생성")
    r = s.post(f"{api_base}/public/use-code", json={"code": code, "counselorEmail": "appleiv@gmail.com"})
    if r.status_code != 200:
        print(f"    ❌ 코드 사용 실패: {r.status_code}")
        return results
    use_data = r.json()
    session_token = use_data.get("sessionToken", "")

    # 세션 생성 (createReceiptNo)
    r = s.post(f"{api_base}/createReceiptNo", json={
        "counselor": {"organization": "테스트", "name": "테스트상담사"},
        "kid": scenario["kid"],
        "agree": True,
        "counselorEmail": "appleiv@gmail.com",
    })
    if r.status_code != 200:
        print(f"    ❌ 세션 생성 실패: {r.status_code} {r.text}")
        return results
    receipt_data = r.json()
    receipt_no = receipt_data.get("receiptNo")
    session_token = receipt_data.get("sessionToken", session_token)
    kid_name = scenario["kid"]["name"]
    print(f"    ✓ receiptNo={receipt_no}")

    # 3. Stage 1 — 자기상
    print(f"  [3] Stage 1 자기상")
    figures_1 = [{"relation": "나", "figure": a, "message": a} for a in scenario["stage1_animals"]]
    r = s.post(f"{api_base}/setFigure", json={
        "kidName": kid_name, "receiptNo": receipt_no,
        "stage": "1", "figures": figures_1, "sessionToken": session_token,
    })
    print(f"    ✓ setFigure stage=1: {r.status_code}")

    # 4. Stage 2 — 소망
    print(f"  [4] Stage 2 소망")
    figures_2 = [{"relation": "나(소망)", "figure": a, "message": a} for a in scenario["stage2_animals"]]
    r = s.post(f"{api_base}/setFigure", json={
        "kidName": kid_name, "receiptNo": receipt_no,
        "stage": "2", "figures": figures_2, "sessionToken": session_token,
        "family_members": scenario["family"],
    })
    print(f"    ✓ setFigure stage=2: {r.status_code}")

    # 5. Stage 3 — 가족원 동물 + 대화
    print(f"  [5] Stage 3 가족원 동물")
    for relation, data in scenario["stage3"].items():
        fig = {"relation": relation, "figure": data["figure"], "message": data["message"]}
        r = s.post(f"{api_base}/setFigure", json={
            "kidName": kid_name, "receiptNo": receipt_no,
            "stage": "3", "figures": [fig], "sessionToken": session_token,
        })
        print(f"    ✓ {relation} = {data['figure']}: {r.status_code}")

    # 6. Stage 4 — 가족 소망 (간단 저장)
    print(f"  [6] Stage 4 가족소망")
    figures_5 = [{"relation": rel, "figure": d["figure"], "message": d["message"]}
                 for rel, d in scenario["stage3"].items()]
    r = s.post(f"{api_base}/setFigure", json={
        "kidName": kid_name, "receiptNo": receipt_no,
        "stage": "5", "figures": figures_5, "sessionToken": session_token,
    })
    print(f"    ✓ setFigure stage=5: {r.status_code}")

    # 7. Stage 5 — 가족이 보는 나 + GPT 대화 (핵심 테스트)
    print(f"  [7] Stage 5 가족이 보는 나 + GPT 대화")
    for relation, data in scenario["stage5"].items():
        fig = {"relation": relation, "figure": data["figure"], "message": data["message"]}
        r = s.post(f"{api_base}/setFigure", json={
            "kidName": kid_name, "receiptNo": receipt_no,
            "stage": "6", "figures": [fig], "sessionToken": session_token,
        })

        # GPT 1턴 호출
        time.sleep(1)  # rate limit 방지
        user_msg = scenario["user_responses_turn1"].get(relation, "몰라")

        # 사용자 답변 먼저 저장 (백엔드가 llmCompletion[relation]["user"][0]에 기록)
        s.post(f"{api_base}/saveChat", json={
            "kidName": kid_name, "receiptNo": receipt_no,
            "role": "user", "content": user_msg, "relation": relation,
            "sessionToken": session_token,
        })

        r_llm = s.post(f"{api_base}/llmCompletion", json={
            "kidName": kid_name, "receiptNo": receipt_no,
            "count": 0, "relation": relation,
            "message": user_msg, "sessionToken": session_token,
        })
        results["total_calls"] += 1

        if r_llm.status_code == 200:
            llm_data = r_llm.json()
            gpt_response_1 = llm_data.get("message", "") or llm_data.get("completion", "")
            print(f"\n    === {relation} (1턴) ===")
            print(f"    아이: {user_msg}")
            print(f"    GPT: {gpt_response_1[:150]}")

            # GPT 응답도 저장
            s.post(f"{api_base}/saveChat", json={
                "kidName": kid_name, "receiptNo": receipt_no,
                "role": "bot", "content": gpt_response_1, "relation": relation,
                "sessionToken": session_token,
            })

            issues = check_gpt_response(gpt_response_1, {"relation": relation, "turn": 1, "user_msg": user_msg})
            results["gpt_responses"].append({
                "relation": relation, "turn": 1,
                "user_msg": user_msg, "gpt_response": gpt_response_1,
                "issues": issues,
            })
            results["issues"].extend(issues)

        # GPT 2턴 호출
        time.sleep(1)
        user_msg_2 = scenario["user_responses_turn2"].get(relation, "몰라")

        # 사용자 답변 저장
        s.post(f"{api_base}/saveChat", json={
            "kidName": kid_name, "receiptNo": receipt_no,
            "role": "user", "content": user_msg_2, "relation": relation,
            "sessionToken": session_token,
        })

        r_llm2 = s.post(f"{api_base}/llmCompletion", json={
            "kidName": kid_name, "receiptNo": receipt_no,
            "count": 1, "relation": relation,
            "message": user_msg_2, "sessionToken": session_token,
        })
        results["total_calls"] += 1

        if r_llm2.status_code == 200:
            llm_data2 = r_llm2.json()
            gpt_response_2 = llm_data2.get("message", "") or llm_data2.get("completion", "")
            print(f"    아이: {user_msg_2}")
            print(f"    GPT: {gpt_response_2[:150]}")

            issues2 = check_gpt_response(gpt_response_2, {"relation": relation, "turn": 2, "user_msg": user_msg_2})
            results["gpt_responses"].append({
                "relation": relation, "turn": 2,
                "user_msg": user_msg_2, "gpt_response": gpt_response_2,
                "issues": issues2,
            })
            results["issues"].extend(issues2)

    return results


def print_report(results: dict):
    """결과 리포트 출력"""
    print("\n" + "=" * 60)
    print(f"  GPT 응답 품질 테스트 결과")
    print("=" * 60)
    print(f"시나리오: {results['scenario']}")
    print(f"총 GPT 호출: {results['total_calls']}")
    print(f"총 응답 수: {len(results['gpt_responses'])}")
    print(f"문제 발견: {len(results['issues'])}")

    if results["issues"]:
        print(f"\n--- 발견된 문제 ---")
        for i, issue in enumerate(results["issues"], 1):
            print(f"\n[{i}] [{issue['severity']}] {issue['check']}")
            print(f"    {issue['description']}")
            print(f"    매칭: {issue['matches']}")
            print(f"    응답: {issue['response']}")
    else:
        print(f"\n✅ 모든 응답이 규칙을 준수합니다.")

    # 심각도별 통계
    high = sum(1 for i in results["issues"] if i["severity"] == "HIGH")
    medium = sum(1 for i in results["issues"] if i["severity"] == "MEDIUM")
    low = sum(1 for i in results["issues"] if i["severity"] == "LOW")
    print(f"\n심각도: HIGH={high}, MEDIUM={medium}, LOW={low}")


def main():
    parser = argparse.ArgumentParser(description="GPT 응답 품질 테스트")
    parser.add_argument("--code", required=True, help="사용할 쿠폰 코드")
    parser.add_argument("--api", default="https://figuretherapy.ai.kr", help="API base URL")
    parser.add_argument("--json", default=None, help="결과 JSON 저장 경로")
    args = parser.parse_args()

    scenario = TEST_SCENARIOS[0]
    print(f"=== GPT 품질 테스트 시작 ===")
    print(f"API: {args.api}")
    print(f"코드: {args.code}")
    print(f"시나리오: {scenario['name']}")
    print()

    results = run_api_test(args.api, args.code, scenario)
    print_report(results)

    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"\n결과 저장: {args.json}")


if __name__ == "__main__":
    main()
