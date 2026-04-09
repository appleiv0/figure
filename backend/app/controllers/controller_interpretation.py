import math
import os
import httpx
import app.config.app_config as CFG

OPENAI_API_KEY = CFG.OPENAI_API_KEY


def get_distance_label(dist):
    if dist < 0.3:
        return "밀착"
    if dist < 0.7:
        return "가까움"
    if dist < 1.2:
        return "중간"
    return "멀음"


def get_direction_label(angle):
    if angle < 60:
        return "마주봄"
    if angle < 120:
        return "같은방향"
    return "등짐"


def facing_angle(rot_a, rot_b, pos_a, pos_b):
    """Calculate how much two dolls face each other"""
    dx = pos_b['x'] - pos_a['x']
    dz = pos_b['z'] - pos_a['z']
    dist = math.sqrt(dx**2 + dz**2)
    if dist < 0.001:
        return 0.0
    # Doll A facing B
    fa_x, fa_z = math.sin(rot_a), math.cos(rot_a)
    cos_a = max(-1, min(1, fa_x * (dx / dist) + fa_z * (dz / dist)))
    angle_a2b = math.degrees(math.acos(cos_a))
    # Doll B facing A
    fb_x, fb_z = math.sin(rot_b), math.cos(rot_b)
    cos_b = max(-1, min(1, fb_x * (-dx / dist) + fb_z * (-dz / dist)))
    angle_b2a = math.degrees(math.acos(cos_b))
    return (angle_a2b + angle_b2a) / 2


def preprocess_for_interpretation(session):
    """Preprocess session data for GPT API interpretation"""
    result = {
        "인형_등장": [],
        "인형_부재": [],
        "인형_거리": {},
        "인형_방향": {},
        "회전분산": 0.0,
        "배치형태": "미확인",
        "자기상_동물": [],
        "소망_동물": [],
        "가족_동물": [],
        "가족소망_동물": [],
        "자기소망_갭": "없음",
        "핵심발화": []
    }

    # Extract doll instances from session
    doll_instances = session.get("dollInstances", [])
    positions_figures = []
    if session.get("positions") and session["positions"].get("figures"):
        positions_figures = session["positions"]["figures"]

    # Use dollInstances if available, otherwise positions.figures
    dolls = doll_instances if doll_instances else positions_figures

    # Build doll data
    doll_data = []
    for doll in dolls:
        label = doll.get("label") or doll.get("relation") or "?"
        pos = doll.get("position", {})
        rot = doll.get("rotation", 0) or 0
        doll_data.append({
            "label": label,
            "x": pos.get("x", 0),
            "z": pos.get("z", 0),
            "rotation": rot
        })
        result["인형_등장"].append(label)

    # Find absent family members
    family_figures = session.get("figures", {}).get("3", [])
    family_roles = set()
    for f in family_figures:
        rel = f.get("relation", "")
        if rel and rel != "나":
            family_roles.add(rel)
    placed_roles = set(result["인형_등장"])
    result["인형_부재"] = list(family_roles - placed_roles)

    # Calculate distances and directions between all pairs
    for i in range(len(doll_data)):
        for j in range(i + 1, len(doll_data)):
            a, b = doll_data[i], doll_data[j]
            key = f"{a['label']}-{b['label']}"
            dx = b['x'] - a['x']
            dz = b['z'] - a['z']
            dist = math.sqrt(dx**2 + dz**2)
            result["인형_거리"][key] = round(dist, 2)

            angle = facing_angle(
                a['rotation'], b['rotation'],
                {"x": a['x'], "z": a['z']},
                {"x": b['x'], "z": b['z']}
            )
            result["인형_방향"][key] = get_direction_label(angle)

    # Rotation variance
    if doll_data:
        rotations = [d['rotation'] for d in doll_data]
        mean_rot = sum(rotations) / len(rotations)
        variance = sum((r - mean_rot)**2 for r in rotations) / len(rotations)
        result["회전분산"] = round(variance, 4)

    # Layout type estimation
    if len(doll_data) <= 1:
        result["배치형태"] = "단독"
    elif result["회전분산"] < 0.1:
        result["배치형태"] = "목적지향형추정"
    else:
        distances = list(result["인형_거리"].values())
        avg_dist = sum(distances) / len(distances) if distances else 0
        if avg_dist < 0.3:
            result["배치형태"] = "밀착형"
        elif avg_dist > 1.2:
            result["배치형태"] = "분산형"
        else:
            result["배치형태"] = "혼합형"

    # Animal symbols
    figures = session.get("figures", {})
    for fig in figures.get("1", []):
        result["자기상_동물"].append(fig.get("figure", ""))
    for fig in figures.get("2", []):
        result["소망_동물"].append(fig.get("figure", ""))
    for fig in figures.get("3", []):
        result["가족_동물"].append({"구성원": fig.get("relation", ""), "동물": fig.get("figure", "")})
    for fig in figures.get("5", []):
        result["가족소망_동물"].append({"구성원": fig.get("relation", ""), "동물": fig.get("figure", "")})

    # Self-wish gap
    strong_animals = {"독수리", "사자", "호랑이", "말", "늑대", "상어", "악어", "곰"}
    weak_animals = {"토끼", "병아리", "나비", "개구리", "달팽이", "양"}
    self_set = set(result["자기상_동물"])
    wish_set = set(result["소망_동물"])
    if (self_set & weak_animals) and (wish_set & strong_animals):
        result["자기소망_갭"] = "크다"
    elif self_set == wish_set:
        result["자기소망_갭"] = "없음"
    else:
        result["자기소망_갭"] = "보통"

    # Key conversations
    chat_history = session.get("chatHistory", [])
    llm_completion = session.get("llmCompletion", {})

    # From chatHistory
    if chat_history:
        relations = {}
        for m in chat_history:
            rel = m.get("relation", "unknown")
            if rel not in relations:
                relations[rel] = {"questions": [], "answers": []}
            if m.get("role") == "bot":
                relations[rel]["questions"].append(m.get("content", ""))
            else:
                relations[rel]["answers"].append(m.get("content", ""))

        for rel, data in relations.items():
            for i in range(min(len(data["questions"]), len(data["answers"]))):
                if data["answers"][i].strip():
                    result["핵심발화"].append({
                        "role": rel,
                        "question": data["questions"][i],
                        "answer": data["answers"][i]
                    })
    elif llm_completion:
        for rel, data in llm_completion.items():
            bots = data.get("bot", [])
            users = data.get("user", [])
            for i in range(min(len(bots), len(users))):
                if users[i].strip():
                    result["핵심발화"].append({
                        "role": rel,
                        "question": bots[i],
                        "answer": users[i]
                    })

    return result


async def generate_interpretation(session):
    """Call OpenAI GPT API to generate clinical interpretation"""
    processed = preprocess_for_interpretation(session)

    kid = session.get("kid", {})
    name = kid.get("name", "내담자")
    sex = "여" if kid.get("sex") == "Female" else "남" if kid.get("sex") == "Male" else "-"
    birth = kid.get("birth", "")

    # Calculate age
    age = "-"
    if birth:
        from datetime import datetime
        try:
            if "T" in str(birth):
                birth_date = datetime.fromisoformat(str(birth).replace("Z", "+00:00"))
            else:
                birth_date = datetime.strptime(str(birth)[:10], "%Y-%m-%d")
            today = datetime.now()
            age = today.year - birth_date.year
            if (today.month, today.day) < (birth_date.month, birth_date.day):
                age -= 1
        except Exception:
            pass

    report = session.get("report", "-")
    tension = session.get("tension", "-")

    system_prompt = """당신은 최광현·선우현(2020) 인형상징체계 해석 틀을 적용하는 가족치료 임상 전문가입니다.

## 해석 틀 핵심 원칙

### 인형 배치 해석
1. 거리 (Distance)
   - 밀착(< 0.3): 과도한 심리적 융합, 분화 어려움
   - 가까움(0.3~0.7): 정서적 친밀감, 관계 중심성
   - 중간(0.7~1.2): 적절한 경계, 독립성과 연결의 균형
   - 멀음(> 1.2): 심리적 단절, 회피, 정서적 거리

2. 방향 (Direction)
   - 마주봄: 직접적 대면 관계, 소통 가능성
   - 같은방향: 공동 회피, 서로를 직접 대면하지 않음
   - 등짐: 심리적 단절, 갈등 회피 또는 배제

3. 부재 인물 (Absent Figure)
   - 배치하지 않은 가족 구성원은 심리적 배제 또는 회피 대상
   - 부모 부재: 보호 기능 상실, 형제 관계가 주요 역동 담당

4. 배치 형태
   - 목적지향형: 생존·목표 중심, 정서적 소통 제한
   - 분산형: 가족 해체, 각자도생
   - 원형: 상호 연결
   - 밀착형: 경계 붕괴, 과도한 융합

### 동물 상징 해석
- 자기상 동물: 현재 자기 인식
- 소망 동물: 되고 싶은 모습
- 가족 동물: 가족 구성원에 대한 지각
- 자기상 vs 소망 갭이 클수록: 현실 자아와 이상 자아 괴리

### 핵심 발화 해석
- 발화에서 드러나는 관계 인식과 자기 역할

## 해석 형식
- 3~4문단, 각 문단 3~5문장
- 1문단: 인형 배치 공간 해석
- 2문단: 동물 상징 해석
- 3문단: 핵심 발화와 배치의 통합 해석
- 4문단(선택): 임상적 시사점
- 판단적 표현 지양, "~할 수 있다", "~를 시사한다" 형태 사용
- 전문 용어 사용 가능"""

    # Build distance text
    dist_lines = []
    for k, v in processed["인형_거리"].items():
        dist_lines.append(f"  {k}: {v} ({get_distance_label(v)})")

    dir_lines = []
    for k, v in processed["인형_방향"].items():
        dir_lines.append(f"  {k}: {v}")

    conversation_lines = []
    for f in processed["핵심발화"]:
        conversation_lines.append(f'[{f["role"]}] 질문: "{f["question"]}" → 답변: "{f["answer"]}"')

    user_prompt = f"""다음 AI가족평가 데이터를 분석하여 임상 해석을 작성해주세요.

## 기본 정보
- 이름: {name}
- 나이: {age}세
- 성별: {sex}
- 평가 결과: {report}
- 긴장/갈등: {tension}

## 인형 배치 분석
등장 인물: {', '.join(processed['인형_등장']) if processed['인형_등장'] else '없음'}
부재 가족: {', '.join(processed['인형_부재']) if processed['인형_부재'] else '없음'}

인형 간 거리:
{chr(10).join(dist_lines) if dist_lines else '  데이터 없음'}

인형 간 방향:
{chr(10).join(dir_lines) if dir_lines else '  데이터 없음'}

배치 형태 추정: {processed['배치형태']}

## 동물 상징
자기상 동물: {', '.join(processed['자기상_동물']) if processed['자기상_동물'] else '없음'}
소망 동물: {', '.join(processed['소망_동물']) if processed['소망_동물'] else '없음'}
가족 동물: {', '.join([d['구성원'] + '=' + d['동물'] for d in processed['가족_동물']]) if processed['가족_동물'] else '없음'}
가족소망 동물: {', '.join([d['구성원'] + '=' + d['동물'] for d in processed['가족소망_동물']]) if processed['가족소망_동물'] else '없음'}
자기상-소망 괴리: {processed['자기소망_갭']}

## 상담 발화
{chr(10).join(conversation_lines) if conversation_lines else '발화 데이터 없음'}

위 데이터를 최광현·선우현(2020) 인형상징체계 해석 틀로 분석한 임상 해석을 작성해주세요."""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {OPENAI_API_KEY}"
                },
                json={
                    "model": "gpt-4o",
                    "max_tokens": 2000,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ]
                }
            )
            data = response.json()
            if "choices" in data and len(data["choices"]) > 0:
                return data["choices"][0]["message"]["content"]
            else:
                return None
    except Exception as e:
        print(f"OpenAI API error: {e}")
        return None
