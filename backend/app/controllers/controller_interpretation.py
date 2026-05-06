import math
import os
import httpx
import app.config.app_config as CFG

OPENAI_API_KEY = CFG.OPENAI_API_KEY
ANTHROPIC_API_KEY = CFG.ANTHROPIC_API_KEY


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
    kid_name = session.get("kid", {}).get("name", "")
    family_figures = session.get("figures", {}).get("3", [])
    family_roles = set()
    for f in family_figures:
        rel = f.get("relation", "")
        if rel and rel != "나" and rel != kid_name:
            family_roles.add(rel)
    placed_roles = set(result["인형_등장"])
    # "나" in placed_roles matches the kid
    placed_roles_normalized = placed_roles | ({kid_name} if "나" in placed_roles else set())
    result["인형_부재"] = list(family_roles - placed_roles_normalized)

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

    # 최광현 동물상징체계 8대 분류
    symbol_categories = {
        "강함": {"코끼리", "불곰", "독수리", "공룡", "버팔로", "사자", "수사자", "호랑이"},
        "약함": {"병아리", "나비", "조개", "개구리", "강아지", "고슴도치", "양", "토끼", "알에서-나오는-병아리", "다람쥐", "미어캣", "새끼양", "돌"},
        "독립": {"돌고래", "거북이", "고양이", "말", "북극곰", "수사슴", "물개", "새"},
        "의존": {"알에서-나오는-병아리", "토끼", "병아리", "새끼양", "강아지", "팬더", "새끼팬더", "판다", "새끼북극곰"},
        "방어/생존": {"고슴도치", "거북이", "기린", "낙타", "미어캣", "북극곰", "버팔로", "여우", "뱀", "개", "젖소", "조개", "코끼리"},
        "공격": {"상어", "독사", "악어", "늑대", "흑표범", "사자", "수사자", "호랑이", "멧돼지", "불곰", "공룡", "도마뱀"},
        "긍정적소망": {"새", "돌고래", "나비", "팬더", "새끼팬더", "판다", "말", "강아지", "캥거루", "백조", "젖소", "수사슴", "물개", "거북이"},
        "부정적소망": {"악어", "불곰", "흑표범", "사자", "수사자", "호랑이", "상어", "독사", "독수리", "공룡", "뱀"},
    }

    def get_symbol_category(animal):
        cats = []
        for cat, animals in symbol_categories.items():
            if animal in animals:
                cats.append(cat)
        return cats if cats else ["기타"]

    # Self-wish gap (상징 분류 기반)
    self_cats = set()
    for a in result["자기상_동물"]:
        self_cats.update(get_symbol_category(a))
    wish_cats = set()
    for a in result["소망_동물"]:
        wish_cats.update(get_symbol_category(a))

    gap = "보통"
    if result["자기상_동물"] == result["소망_동물"]:
        gap = "없음"
    elif ("약함" in self_cats or "의존" in self_cats) and ("강함" in self_cats or "공격" in wish_cats or "부정적소망" in wish_cats):
        gap = "크다"
    elif ("방어/생존" in self_cats) and ("독립" in wish_cats or "강함" in wish_cats):
        gap = "크다"
    result["자기소망_갭"] = gap

    # 상징 분류 정보 추가
    result["자기상_상징"] = [{"동물": a, "분류": get_symbol_category(a)} for a in result["자기상_동물"]]
    result["소망_상징"] = [{"동물": a, "분류": get_symbol_category(a)} for a in result["소망_동물"]]

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


async def generate_interpretation(session, model: str = "claude"):
    """Call Claude or GPT API to generate clinical interpretation"""
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

## 가족체계유형 분류 기준 (9가지)

### 기능적 가족체계 (1가지)
1. **균형형** (7.3%) - 부부 중심의 밀착 관계, 건강한 친밀관계
   - 배치: 경계에 걸쳐 서로 마주봄 (내향), 원형/만다라 형태
   - 핵심: 적절한 경계선, 개별성과 독립성 존중, 타협 가능
   - 사례 발화: "딸 부잣집이에요. 언제나 북적거렸어요. 아빠는 퇴근하실 때 먹을 것을 사오셔서 맛있게 먹고 항상 유머가 많으셔서 저희가 웃고 있는 거예요"

### 역기능적 가족체계 (8가지)
2. **부친고립형** (12.2%) - 아버지 왕따형, 삼각관계
   - 배치: 1인(부/모) 경계 밖, 나머지 경계 안. 경계 안끼리만 바라봄, 고립자에게 시선 없음
   - 핵심: 부부관계 문제가 자녀로 확장, 한쪽 배우자가 자녀를 자기편으로 끌어들임
   - 사례 발화: "엄마와 세 자매인 우리 여자 넷이서 아빠를 왕따시킨 기억이 나요. 아빠와는 지금도 어색해요"

3. **분열형** (12.2%) - 편 가르기, 이혼 직전형
   - 배치: 가족이 두 팀으로 나뉨. [A] 1그룹 경계 안 + 1그룹 경계 밖, [B] 두 그룹 모두 경계 밖. 두 그룹 시선이 서로 반대 방향
   - 핵심: 부부갈등이 최고조, 각 배우자가 자녀를 자기편으로 끌어들여 가족 전체 분열
   - 사례 발화: "아빠는 항상 사고를 치고 문제를 일으키면서 엄마와 항상 싸우셨고 그때마다 엄마는 항상 외가집으로 가버렸고 아빠는 나에게 화풀이하고 나를 때렸어요"

4. **이산형** (9.8%) - 관심·친밀감 전무, 무늬만 가족
   - 배치: 50% 이상 구성원이 경계 밖(흩어짐), 방향 제각각(상관없음)
   - 핵심: 가족 구성원끼리 심리적 결합이 없는 상태, 독립과 분리는 있으나 친밀감 부족
   - 사례 발화: "우리 식구들은 모두 따로따로 각자 다녀요. 함께 어떤 걸 같이 해본 적이 없어요. 가족이 서로에게 관심이 없었어요"

5. **세대단절형** (9.8%) - 세대 간 단절, 내부 경계선 없음
   - 배치: 1그룹(부모세대) 경계 안, 1그룹(자녀세대) 경계 밖. 두 그룹 서로 등 돌림(반대 방향)
   - 핵심: 부모가 자녀에게 충분한 애착관계를 형성하지 못함. 부모 역할과 애착 부족
   - 사례 발화: "부모님이 같이 일을 하셔서 항상 할머니에게 맡겨진 아이였어요", "늦둥이 막내로 태어나서 부모님이 서울에서 언니와 오빠들을 공부시키느라 시골 할머니 댁에 맡겨져 외롭고 심심한 아이였어요"

6. **우회공격형** (7.3%) - 부부갈등 → 자녀 공격 우회, 희생양
   - 배치: 희생양 → 경계 밖, 나머지 → 경계 안. 경계 안 전체가 희생양 향해 대립
   - 핵심: 가족의 희생양이 된 자녀는 '정서적 쓰레기통' 역할, 문제아의 역할이 우세
   - 사례 발화: "부모님이 함께 일을 하셔서 저에게 관심이 없어서 전 매일 사고 치면서 관심을 끌던 아이였어요", "남동생 때문에 부모님이 자주 싸우셨어요. 그래서 저는 조용히 자기 할 일을 하면서 눈치보고 켰어요"

7. **우회보호형** (26.8%) - 역기능 최다, 부부갈등 → 자녀 과보호 우회
   - 배치: 전체 경계 안(원형 포위), 모두 중심(약한 자녀)을 향함
   - 핵심: 자녀 중 한 명이 병약하거나 장애가 있어 가족 전체가 둘러싸서 보호. 부부갈등의 우회로
   - 사례 발화: "바쁜 부모님 대신에 어린 막내 동생을 돌보면서 스스로 다 할 줄 아는 아이였어요. 동생을 돌보는 일은 항상 저의 일이었어요. 엄마에게 돌봄 받고 보호받고 싶었어요"

8. **밀착형** (7.3%) - 자아분리 불가, 개인 정서 보장 X
   - 배치: 전체 경계 안(겹침·공간없음), 방향 불분명(밀착으로 상실)
   - 핵심: 가족 간 경계 침해, 과도한 밀착, 독립과 분리 부족, 애증의 관계
   - 사례 발화: "저는 외동으로 부모님은 항상 나만 바라보고 나에게만 집중했어요. 저희 집은 항상 저를 중심으로 돌아갔고 전 너무 부담스러웠지만 그래서 더 의존적인 아이가 됐어요"

9. **목적지향형** (7.3%) - 정서교류 없이 생존·목표만 공유
   - 배치: 전체 경계 안(일렬), 같은 방향 →
   - 핵심: 관계와 소통이 제대로 형성되지 못하고 생존과 안전을 위해 버팀. 친밀감과 소통 포기
   - 사례 발화: "아빠는 바쁘고 엄마는 친밀감이 없어요. 하지만 어려서 전 뭐든지 잘하는 아이라며 칭찬하셨어요. 뭐든지 보채지 않고 잘하는 애쓰는 아이였어요"

## 핵심 구분 포인트
- **이산형 vs 목적지향형**: 이산형=방향 제각각, 50%↑ 경계 밖 / 목적지향형=같은 방향 일렬, 경계 안
- **밀착형 vs 우회보호형**: 밀착형=인형 겹침·공간없음 / 우회보호형=중심 자녀를 원형 포위
- **고립형 vs 분열형**: 고립형=1인 경계 밖·외면 / 분열형=두 그룹 대립·시선 반대

## 인형 배치 해석 원칙
1. 거리: 밀착(<0.3) = 과도한 융합 | 가까움(0.3~0.7) = 정서적 친밀 | 중간(0.7~1.2) = 적절한 경계 | 멀음(>1.2) = 심리적 단절
2. 방향: 마주봄 = 직접 대면·소통 | 같은방향 = 공동 회피 | 등짐 = 심리적 단절·갈등
3. 부재 인물: 배치하지 않은 가족 = 심리적 배제 또는 회피
4. 배치 형태: 원형=상호연결 | 일렬=목적지향 | 분산=해체 | 밀착=경계붕괴

## 동물 상징 해석 (최광현 동물상징체계)

### 8대 상징 분류
1. **강함**: 코끼리(거대한 힘, 연대감, 위협적 아버지상), 불곰(전쟁의 신, 거친 공격성), 독수리(하늘의 제왕, 영적 힘, 초월적 위치), 공룡(최강 존재, 소통 불가), 버팔로(통제 불가, 원시적 자연의 힘), 여우(잔꾀와 적응력, 생존 기제)
2. **약함**: 병아리(보호 필요, 열등감), 나비(새로운 시작, 외상 경험자의 재생 욕구), 조개(자기 보호, 입을 닫아야 하는 상황), 개구리(최하위, 낮은 자존감, 무기력), 강아지(사랑받고 싶은 소망, 돌봄 필요), 고슴도치(위축, 자기 비밀, 방어적), 양(착하지만 무능하고 수동적), 토끼(약함, 낮은 자존감, 불안, 두려움), 알에서나오는병아리(가장 위험한 순간, 극도의 불안)
3. **독립**: 돌고래(자유, 영리, 현실 탈출 욕구), 거북이(방어, 개별적 분리), 독수리(초월적 거리감), 고양이(독립성, 길들여지지 않음, 선악 이중성), 말(자유, 주도권, 모성적 돌봄, 현실 탈출 의지), 북극곰(인내와 생존력), 수사슴(독립적 카리스마, 영적 존엄), 새(현실 탈출, 사라지길 바라는 소망)
4. **의존**: 알에서나오는병아리(극도의 위험, 불안), 토끼(포식자 세상, 자신감 부족), 병아리(보호 필요, 미성장), 새끼양(무능, 돌봄 필요), 강아지(사랑받고 싶음, 미숙), 팬더곰(사랑·존중·인정 욕구), 새끼북극곰(의존적, 모성애 유발)
5. **방어/생존**: 고슴도치(위축, 폐쇄적, 건드리면 반격), 거북이(껍질 속 방어), 기린(적응력, 경계병 역할), 미어캣(경계, 눈치, 위축), 북극곰(생존 능력), 여우(적응력, 잔꾀), 뱀(공포, 생존력, 지혜), 개(충성, 경계병, 안내자), 젖소(모성적 보호, 양육, 책임), 조개(보호)
6. **공격**: 상어(최고 포식자, 양심 없음, 절박한 상황), 독사(공포, 인내, 치명적), 악어(통제 불가, 원시적 공포), 늑대(두려움+매력, 충성, 고독), 흑표범(내재된 분노, 원시적 힘), 사자(최고 파워, 카리스마, 통솔력), 호랑이(여성적·영적 힘, 통제 불가), 멧돼지(흥분 시 통제 불능), 도마뱀(혐오, 애착 불가능)
7. **긍정적 소망**: 새(탈출 욕구), 돌고래(자유·현실 탈출), 나비(재생·새 출발), 팬더(사랑·인정 욕구), 말(자유·해결 의지), 강아지(돌봄·사랑 욕구), 캥거루(헌신적 모성), 백조(아름다움·관심), 젖소(모성적 양육·보호)
8. **부정적 소망**: 악어·불곰·흑표범·사자·호랑이(원시적 힘, 내재된 분노와 갈등이 큼), 상어(절박, 양심 없는 힘), 독수리·공룡(압도적 파워, 소통 단절), 돼지(소망 시 리더십·대장 의미)

### 핵심 해석 원칙
- **자기상 동물**: 현재 자기 인식. 약한 동물 선택=낮은 자존감, 강한 동물=통제 욕구
- **소망 동물**: 되고 싶은 모습. 부정적 소망 동물=내재된 분노·갈등. 긍정적 소망=탈출·재생 욕구
- **가족 동물**: 가족에 대한 지각. 공격 동물로 표현=공포·두려움의 대상. 약한 동물=무능한 존재로 인식
- **가족이 보는 나(Stage 6)**: 가족 관계 속 자기 역할 인식
- **자기상→소망 변화**: 약함→강함=힘에 대한 갈망, 의존→독립=자율성 욕구, 같은 계열 유지=안정적 자기 인식
- **맥락 중요**: 같은 동물도 자기상/가족/소망에 따라 의미가 달라짐 (예: 불곰 자기상=공격성, 불곰 소망=투쟁 환경에서 살아남기 위한 힘 필요)

## 해석 형식
- 4~5문단
- 1문단: 가족체계유형 판정 (9가지 중 가장 부합하는 유형 1~3개를 선정하고 각각의 근거를 제시. 주 유형 1개 + 보조 유형 1~2개. 예: "주 유형: 이산형, 보조 유형: 목적지향형")
- 2문단: 인형 배치 공간 해석 (거리, 방향, 부재 인물)
- 3문단: 동물 상징 해석 (자기상, 소망, 가족 동물의 의미)
- 4문단: 핵심 발화와 배치의 통합 해석
- 5문단(선택): 임상적 시사점
- 판단적 표현 지양, "~할 수 있다", "~를 시사한다" 형태 사용
- 전문 용어 사용 가능

## 주의사항 (반드시 준수)
- **클러스터 먼저 탐지 후 유형 판정**: 개별 거리만 보지 말고, 밀착(< 0.3) 또는 가까운(0.3~0.7) 관계를 먼저 찾아 클러스터(하위체계)를 식별할 것. 클러스터가 존재하면 이산형이 아니다. 클러스터에 포함되지 않은 구성원이 있으면 고립형 또는 우회공격형을 우선 검토할 것. 예: 엄마-언니-남동생이 밀착(0.25~0.27)하고 나와 아빠가 멀리 떨어져 있으면 → 이산형(X) → 고립형(선우 고립, 모 중심 클러스터에서 배제). 인형의 방향(등돌림, rot 90° 이상 차이)도 고립 판정의 핵심 근거이다.
- **데이터 무결성 체크**: 같은 역할의 인형이 2개 이상 배치되어 있거나, 동물 선택에는 있는 가족 구성원이 인형 배치에 없는 경우, 입력 오류 가능성을 먼저 언급할 것. 중복 배치를 "양가적 인식" 등으로 과잉 해석하지 말 것. 예: 아빠가 2개 배치되고 남편이 미배치 → "아빠 인형 중 하나가 남편을 의미할 가능성이 있으며, 데이터 확인이 필요하다"로 기술.
- **균형형 판정은 엄격하게**: 가족 구성원 중 1명이라도 고립(멀리 떨어지거나 등을 돌림)되어 있으면 균형형이 아니다. 일부 구성원만 가까운 것은 하위체계 형성이지 균형형이 아니다. 균형형은 모든 구성원이 적절한 거리와 방향으로 연결되어야 한다.
- **인형 모델과 크기도 해석할 것**: 성인을 아기/어린이 모델로 표현하거나 크기를 매우 작게 설정한 경우, 해당 가족 구성원을 약하거나 무력한 존재로 인식하고 있음을 시사한다. 인형의 자세(앉음/서있음)도 해석에 포함할 것.
- **다중 고립 판정 주의**: 고립형은 1인만 고립된 경우이다. 2인 이상 고립되어 있으면 단순 고립형이 아니라 분열형(가족이 여러 그룹으로 분리) 또는 우회공격형(희생양)+고립형의 복합으로 판정해야 한다. 예: 아빠도 고립, 내담자도 고립, 나머지 밀착 → "부친고립형"만으로 설명 불가 → 복합 유형으로 판정할 것.
- **나이에 따른 유형 판정 주의**: 세대단절형은 부모 세대와 자녀 세대 간의 단절이다. 내담자가 자녀(아동·청소년)인 경우, 자녀 세대 내에서 한 명만 고립된 것은 세대단절이 아니라 우회공격형(희생양) 또는 고립형에 해당할 수 있다. 내담자의 나이와 가족 내 위치를 반드시 고려하여 유형을 판정할 것.
- **가족 동물 vs 가족소망 동물을 절대 혼동하지 말 것**: "가족 동물"은 현재 가족에 대한 인식이고, "가족소망 동물"은 바라는 모습이다. 소망 동물의 특성을 현재 인정하고 있는 것으로 해석하면 안 된다. 예: 아들을 고슴도치로 표현(현재)하고 돌고래를 소망했다면, "영리함을 인정"이 아니라 "영리해지길 바란다"로 해석해야 한다.
- **동물과 설명을 정확히 매칭할 것**: 각 동물에 대한 설명(이유)을 다른 동물에 잘못 연결하지 말 것. 데이터에 "동물=이유" 형태로 제공되니 반드시 매칭을 확인하고 인용할 것.
- **자기상 동물 vs 소망 동물도 구분할 것**: 자기상은 현재 자기 인식, 소망은 되고 싶은 모습. 소망 동물의 특성이 현재 있다고 해석하면 안 된다."""

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

## 동물 상징 (최광현 상징분류 포함)
자기상 동물: {', '.join([f"{a['동물']}[{'/'.join(a['분류'])}]" for a in processed['자기상_상징']]) if processed.get('자기상_상징') else '없음'}
소망 동물: {', '.join([f"{a['동물']}[{'/'.join(a['분류'])}]" for a in processed['소망_상징']]) if processed.get('소망_상징') else '없음'}
가족 동물 (현재 가족을 어떻게 보는지): {', '.join([d['구성원'] + '=' + d['동물'] for d in processed['가족_동물']]) if processed['가족_동물'] else '없음'}
가족소망 동물 (가족이 이렇게 되었으면 하는 바람): {', '.join([d['구성원'] + '=' + d['동물'] for d in processed['가족소망_동물']]) if processed['가족소망_동물'] else '없음'}
자기상-소망 괴리: {processed['자기소망_갭']}

## 상담 발화
{chr(10).join(conversation_lines) if conversation_lines else '발화 데이터 없음'}

위 데이터를 최광현·선우현(2020) 인형상징체계 해석 틀로 분석한 임상 해석을 작성해주세요."""

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            if model == "gpt":
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
                    print(f"GPT API unexpected response: {data}")
                    return None
            else:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "Content-Type": "application/json",
                        "x-api-key": ANTHROPIC_API_KEY,
                        "anthropic-version": "2023-06-01",
                    },
                    json={
                        "model": "claude-sonnet-4-20250514",
                        "max_tokens": 4096,
                        "system": system_prompt,
                        "messages": [
                            {"role": "user", "content": user_prompt}
                        ]
                    }
                )
                data = response.json()
                if "content" in data and len(data["content"]) > 0:
                    return data["content"][0]["text"]
                else:
                    print(f"Claude API unexpected response: {data}")
                    return None
    except Exception as e:
        print(f"AI API error ({model}): {e}")
        return None
