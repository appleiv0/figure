import os
import re
import numpy as np

from libcommon.utils.jsonUtils import make_json, read_json
import app.config.app_config as CFG
from app.controllers import chatbot_template
from libcommon.utils.chatUtils import get_josa
from app.repositories.session_repository import session_repository

from openai import AsyncOpenAI


def _sanitize(name: str) -> str:
    """Remove path separators, dangerous characters, and whitespace from filename."""
    if not name:
        return ""
    return re.sub(r'[/\\<>:"|?*\x00-\x1f\s]', '', name)

client = AsyncOpenAI(api_key=CFG.OPENAI_API_KEY)

abuser = [
    "코끼리",
    "불곰",
    "흑표범",
    "사자",
    "상어",
    "공룡",
    "호랑이",
    "돼지",
    "코브라",
    "도마뱀",
    "악어",
    "독수리",
    "여우",
]
victim = [
    "병아리",
    "나비",
    "조개",
    "개구리",
    "돌",
    "강아지",
    "고슴도치",
    "양",
    "새끼-양",
    "토끼",
    "알에서-나오는-병아리",
]
hope_positive = ["새", "돌고래", "나비", "새끼팬더", "말", "강아지", "개", "양", "새끼-양", "캥거루", "버팔로", "젖소", "코끼리"]
kid_relation = ["형", "누나", "동생", "언니", "오빠"]


async def request_chatgpt_1(prompt: dict):
    chat_completion = await client.chat.completions.create(
        messages=prompt, model="gpt-4o", max_tokens=200, temperature=0.2
    )
    completion = chat_completion.choices[0].message.content
    return completion


async def request_chatgpt_2(prompt: dict):
    chat_completion = await client.chat.completions.create(
        messages=prompt, model="gpt-4o", max_tokens=200, temperature=0.2
    )
    completion = chat_completion.choices[0].message.content
    return completion


def prompt_engineering_3(data_json: dict, relation: str):
    ## 대화 파악, prompt engineering
    f_3 = ""
    for figure in data_json["figures"]["3"]:
        if figure["relation"] == relation:
            f_3 = figure["figure"]

    return f_3


def prompt_engineering_2(data_json: dict, relation: str):
    ## 대화 파악, prompt engineering
    m_3 = ""
    f_3 = ""
    for figure in data_json["figures"]["3"]:
        if figure["relation"] == relation:
            m_3 = f"- 아이가 {relation}{get_josa(relation)['을/를']} {figure['figure']}로 표현한 이유: {figure['message']}"
            f_3 = figure["figure"]
    m_6 = ""
    f_6 = ""
    for figure in data_json["figures"]["6"]:
        if figure["relation"] == relation:
            f_6 = figure["figure"]
            m_6 = f"- {relation}({f_3}){get_josa(f_3)['이/가']} 생각하는 나({f_6}): {figure['message']}"
    m_llm = f"- 이전 대화: {data_json['llmCompletion'][relation]['bot'][0]}: {data_json['llmCompletion'][relation]['user'][0]}"

    prompt_prefix = f"다음은 아이가 가족 구성원 '{relation}'{get_josa(relation)['을/를']} 동물로 표현한 내용과 이전 대화야. 이를 참고해서 짧은 위로의 말을 해줘.\n규칙:\n1. 동물 이름 대신 '{relation}'과 '너'를 사용해.\n2. {relation}{get_josa(relation)['이/가']} 너(아이)에게 어떻게 하는지 방향으로 말해."
    prompt_scenario = "\n".join([m_3, m_6])
    prompt_suffix = m_llm

    prompt: list[dict[str, str]] = [
        {
            "role": "system",
            "content": "당신은 '푸름이'라는 아동 인형치료 전문 상담 캐릭터야. 10살 어린이의 친구처럼 친근하게 반말로 위로해줘.\n규칙:\n1. 동물 이름이 아닌 가족 호칭(엄마, 아빠 등)과 '너'를 사용해.\n2. 아이가 말한 구체적인 내용을 그대로 반영해서 공감해. 예: '형이 먼저 때려' → '형이 너를 때려서 힘들겠구나' (O). '그렇게 생각해서 힘들겠구나' (X, 너무 추상적).\n3. 응답은 1~2문장. 질문은 딱 하나만.\n4. '서로 이해하려고 노력해', '소중한 존재' 같은 일반적 위로/훈계 금지. 아이의 감정에만 집중.\n5. 너는 푸름이야. '나한테 말해줘'라고 해. 가족 구성원한테 말하라고 하면 안 돼.\n6. 아이가 쓴 단어를 임의로 바꾸지 마. 모르는 단어나 비표준어는 그대로 반복하고 의미를 되물어봐.",
        },
        {
            "role": "user",
            "content": "다음은 아이가 가족 구성원 '엄마'를 동물로 표현한 내용과 이전 대화야. 이를 참고해서 짧은 위로의 말을 해줘.\n규칙:\n1. 동물 이름 대신 '엄마'와 '너'를 사용해.\n2. 엄마가 너(아이)에게 어떻게 하는지 방향으로 말해.\n- 아이가 엄마를 토끼로 표현한 이유: 토끼같이 귀여워요.\n- 엄마(토끼)가 생각하는 나(양): 내가 순해서\n- 이전 대화: 엄마가 너를 힘들게 하지는 않니?: 엄마는 나를 힘들게 하지 않아. 옆에 같이 있어줘.",
        },
        {"role": "assistant", "content": "엄마가 너를 소중하게 생각하고 옆에 있어주는구나. 정말 다행이다."},
        {
            "role": "user",
            "content": "다음은 아이가 가족 구성원 '아빠'를 동물로 표현한 내용과 이전 대화야. 이를 참고해서 짧은 위로의 말을 해줘.\n규칙:\n1. 동물 이름 대신 '아빠'와 '너'를 사용해.\n2. 아빠가 너(아이)에게 어떻게 하는지 방향으로 말해.\n- 아이가 아빠를 돼지로 표현한 이유: 술 쳐먹고 맨날 더러우니까요.\n- 아빠(돼지)가 생각하는 나(조개): 내가 아빠를 무시하니까\n- 이전 대화: 아빠가 너한테 어떻게 할 때 제일 힘들어?: 아빠때문에 아무것도 못해요. 아빠 보기 싫어요.",
        },
        {"role": "assistant", "content": "아빠 때문에 많이 힘들었구나. 네 마음이 충분히 이해돼. 너는 잘못한 게 없어."},
        {
            "role": "user",
            "content": "다음은 아이가 가족 구성원 '형'을 동물로 표현한 내용과 이전 대화야. 이를 참고해서 짧은 위로의 말을 해줘.\n규칙:\n1. 동물 이름 대신 '형'과 '너'를 사용해.\n2. 형이 너(아이)에게 어떻게 하는지 방향으로 말해.\n- 아이가 형을 상어로 표현한 이유: 나랑 많이 싸워서.\n- 형(상어)이 생각하는 나(상어): 나랑 많이 싸워\n- 이전 대화: 형이 너를 그렇게 생각한다니 힘들겠다. 왜 많이 싸우는 거야?: 형이 먼저 때려",
        },
        {"role": "assistant", "content": "형이 너를 때려서 많이 힘들겠구나. 맞을 때 어떤 기분이 들어?"},
        {
            "role": "user",
            "content": "\n".join([prompt_prefix, prompt_scenario, prompt_suffix]),
        },
    ]

    # print(prompt)
    return prompt, f_3


def prompt_engineering_1(data_json: dict, relation: str):
    ## 대화 파악, prompt engineering
    m_3 = ""
    f_3 = ""
    for figure in data_json["figures"]["3"]:
        if figure["relation"] == relation:
            m_3 = f"- 아이가 {relation}{get_josa(relation)['을/를']} {figure['figure']}로 표현한 이유: {figure['message']}"
            f_3 = figure["figure"]
    m_6 = ""
    f_6 = ""
    for figure in data_json["figures"]["6"]:
        if figure["relation"] == relation:
            f_6 = figure["figure"]
            m_6 = f"- {relation}({f_3}){get_josa(f_3)['이/가']} 생각하는 나({f_6}): {figure['message']}"

    prompt_prefix = f"다음은 아이가 가족 구성원 '{relation}'{get_josa(relation)['을/를']} 동물로 표현한 내용과, {relation}{get_josa(relation)['이/가']} 나를 어떤 동물로 볼 것 같은지에 대한 내용이야. 이를 참고해서 간단한 피드백과 질문을 해줘.\n규칙:\n1. 절대 동물 이름을 말하지 마. '{relation}'과 '너'만 사용해. 동물 이름(캥거루, 독수리, 상어 등)을 응답에 포함하면 안 됨.\n2. '{relation}이 생각하는 나' 부분의 이유를 맥락에 맞게 질문해. '{relation}{get_josa(relation)['이/가']} 왜 너를 그렇게 보는 거 같아?' 식으로 자연스럽게."
    prompt_scenario = "\n".join([m_3, m_6])
    prompt_suffix = ""

    prompt: list[dict[str, str]] = [
        {
            "role": "system",
            "content": "당신은 '푸름이'라는 이름의 아동 인형치료 전문 상담 캐릭터야. 10살 어린이의 친구처럼 친근하게 반말로 말해줘.\n규칙:\n1. 동물 이름이 아닌 가족 호칭(엄마, 아빠 등)과 '너'를 사용해.\n2. 응답은 1~2문장. 질문은 한 번에 딱 하나만. 여러 질문 금지.\n3. 아이의 답변을 받으면 그 이유를 한 단계 더 파고들어. 예: 아이가 '귀여워서'라고 하면 → '엄마가 너를 왜 귀여워하는 거 같아?' 식으로.\n4. 아이의 답변이 의미 없거나 너무 짧으면(숫자, 단일 글자, 'ㅋ', '몰라' 등) '그렇구나'로 넘어가지 말고, 부드럽게 다시 물어봐.\n5. 절대 '그리고', '또한' 등으로 질문을 이어붙이지 마.\n6. 너는 푸름이야. 이야기를 나누자고 할 때 '나한테 이야기해줄 수 있어'라고 해. 가족 구성원한테 말하라고 하면 안 돼.\n7. 논리적으로 이상한 질문 금지. 예: '엄마가 너를 귀엽다고 하는데 너도 귀엽다고 느끼니?' → 잘못됨. 대신 '엄마가 너를 왜 귀여워하는 거 같아?' → 자연스러움.\n8. 아이의 답변 의미를 정확히 파악해. '~해지라고', '~하라고'는 바람/기대(소망)이지 현재 상태가 아님. 예: '성실해지라고' → '아빠가 네가 성실해지길 바라시는구나' (O). '아빠가 너를 성실하다고 생각하는구나' (X).\n9. 아이가 쓴 단어를 임의로 바꾸지 마. 모르는 단어나 비표준어(사투리, 속어, 줄임말)는 그대로 반복하고 의미를 되물어봐. 예: '얌채같아서' → '얌채같다고 생각하는구나. 얌채가 어떤 뜻이야?' (O). '얌전하다고 생각하는구나' (X, 임의 변환 금지).",
        },
        {
            "role": "user",
            "content": "다음은 아이가 가족 구성원 '엄마'를 동물로 표현한 내용과, 엄마가 나를 어떤 동물로 볼 것 같은지에 대한 내용이야. 이를 참고해서 간단한 피드백과 질문을 해줘.\n규칙:\n1. 동물 이름 대신 '엄마'와 '너'를 사용해.\n2. '엄마가 생각하는 나' 부분의 이유는 엄마가 너를 그렇게 보는 이유야. 이 이유가 너의 행동이나 특성이라면 그에 대한 너의 감정을 물어봐.\n- 아이가 엄마를 상어로 표현한 이유: 우리 엄마는 아무도 이길 사람이 없어요.\n- 엄마(상어)가 생각하는 나(악어): 내가 자꾸 말썽부리고 대들고 싸우니까",
        },
        {"role": "assistant", "content": "너는 엄마를 상어라고 표현했구나. 너는 왜 엄마가 무섭다고 느끼는 거야?"},
        {
            "role": "user",
            "content": "다음은 아이가 가족 구성원 '엄마'를 동물로 표현한 내용과, 엄마가 나를 어떤 동물로 볼 것 같은지에 대한 내용이야. 이를 참고해서 간단한 피드백과 질문을 해줘.\n규칙:\n1. 동물 이름 대신 '엄마'와 '너'를 사용해.\n2. '엄마가 생각하는 나' 부분의 이유는 엄마가 너를 그렇게 보는 이유야. 이 이유가 너의 행동이나 특성이라면 그에 대한 너의 감정을 물어봐.\n- 아이가 엄마를 젖소로 표현한 이유: 엄마가 밥을 잘 차려줘서요.\n- 엄마(젖소)가 생각하는 나(양): 내가 순해서",
        },
        {"role": "assistant", "content": "너는 엄마를 젖소라고 표현했구나. 엄마가 밥을 잘 차려줄 때 어떤 기분이 들어?"},
        {
            "role": "user",
            "content": "다음은 아이가 가족 구성원 '아빠'를 동물로 표현한 내용과, 아빠가 나를 어떤 동물로 볼 것 같은지에 대한 내용이야. 이를 참고해서 간단한 피드백과 질문을 해줘.\n규칙:\n1. 동물 이름 대신 '아빠'와 '너'를 사용해.\n2. '아빠가 생각하는 나' 부분의 이유는 아빠가 너를 그렇게 보는 이유야. 이 이유가 너의 행동이나 특성이라면 그에 대한 너의 감정을 물어봐.\n- 아이가 아빠를 돼지로 표현한 이유: 술 쳐먹고 맨날 오줌 싸고 똥 싸고 돼지처럼 더러우니까요.\n- 아빠(돼지)가 생각하는 나(조개): 내가 아빠를 무시하니까",
        },
        {"role": "assistant", "content": "너는 왜 아빠를 돼지라고 느끼는 거야?"},
        {
            "role": "user",
            "content": "다음은 아이가 가족 구성원 '엄마'를 동물로 표현한 내용과, 엄마가 나를 어떤 동물로 볼 것 같은지에 대한 내용이야. 이를 참고해서 간단한 피드백과 질문을 해줘.\n규칙:\n1. 동물 이름 대신 '엄마'와 '너'를 사용해.\n2. '엄마가 생각하는 나' 부분의 이유는 엄마가 너를 그렇게 보는 이유야. 이 이유가 너의 행동이나 특성이라면 그에 대한 너의 감정을 물어봐.\n- 아이가 엄마를 돌고래로 표현한 이유: 엄마가 똑똒해서.\n- 엄마(돌고래)가 생각하는 나(강아지): 내가 귀엽거든",
        },
        {"role": "assistant", "content": "엄마가 너를 귀엽다고 생각하는구나. 엄마가 너를 왜 귀여워하는 거 같아?"},
        {
            "role": "user",
            "content": "다음은 아이가 가족 구성원 '아빠'를 동물로 표현한 내용과, 아빠가 나를 어떤 동물로 볼 것 같은지에 대한 내용이야. 이를 참고해서 간단한 피드백과 질문을 해줘.\n규칙:\n1. 동물 이름 대신 '아빠'와 '너'를 사용해.\n2. '아빠가 생각하는 나' 부분의 이유는 아빠가 너를 그렇게 보는 이유야. 이 이유가 너의 행동이나 특성이라면 그에 대한 너의 감정을 물어봐.\n- 아이가 아빠를 사자로 표현한 이유: 아빠가 무서워서.\n- 아빠(사자)가 생각하는 나(개): 성실해지라고",
        },
        {"role": "assistant", "content": "아빠가 네가 성실해지길 바라시는구나. 그 말을 들으면 어떤 기분이 들어?"},
        {
            "role": "user",
            "content": "\n".join([prompt_prefix, prompt_scenario, prompt_suffix]),
        },
    ]

    # print(prompt)
    return prompt, f_6


async def get_llm_completion(kidName: str, receiptNo: int, count: int, relation: str):
    ## 가족 구성원 학대 여부에 따른 prompt 정의

    receipt_no_str = str(receiptNo)
    data_json = session_repository.find_by_receipt_no(receipt_no_str)
    if not data_json:
        return ""

    if count == 0:
        prompt, f_6 = prompt_engineering_1(data_json, relation)
        ## LLM 호출
        chat_completion = await request_chatgpt_1(prompt)

        completion = chat_completion
        data_json["llmCompletion"][relation]["bot"][count] = completion
        session_repository.update_llm_completion(receipt_no_str, relation, data_json["llmCompletion"][relation])
    elif count == 1:
        prompt, f_3 = prompt_engineering_2(data_json, relation)
        completion = await request_chatgpt_2(prompt)
        # GPT 응답만 사용 (하드코딩 접미사 제거)

        data_json["llmCompletion"][relation]["bot"][count] = completion
        session_repository.update_llm_completion(receipt_no_str, relation, data_json["llmCompletion"][relation])
    else:
        f_3 = prompt_engineering_3(data_json, relation)
        completion = f"그렇구나. {relation}에게 그렇게 말해주고 싶구나."

    return completion
    # return prompt


def get_friendly(kidName: str, positions: dict):
    x_center, y_center = positions["centerH"], positions["centerV"]
    if not positions.get("figures") or len(positions["figures"]) == 0:
        return 0, ""
    card_size_x = (
        positions["figures"][0]["position"]["p2"][0] - positions["figures"][0]["position"]["p1"][0]
    )
    card_size_y = (
        positions["figures"][0]["position"]["p2"][1] - positions["figures"][0]["position"]["p1"][1]
    )

    distance_1 = (card_size_x**2 + card_size_y**2) ** 0.5
    distance_2 = distance_1 * 2  # 카드 대각선의 2배 이상이면 "멀다"

    friend_dict = {}
    family_dict = {}
    animal_me = ""
    for figure_1 in positions["figures"]:
        friend_dict[figure_1["figure"]] = {"contact": [], "near": [], "far": []}
        family_dict[figure_1["relation"]] = {"contact": [], "near": [], "far": []}
        if figure_1["relation"] == kidName:
            animal_me = figure_1["figure"]
        for figure_2 in positions["figures"]:
            if figure_1["relation"] == figure_2["relation"]:
                continue
            x_1, y_1 = figure_1["position"]["p1"]
            x_2, y_2 = figure_2["position"]["p1"]

            distance = ((x_1 - x_2) ** 2 + (y_1 - y_2) ** 2) ** 0.5

            if abs(x_1 - x_2) < card_size_x and abs(y_1 - y_2) < card_size_y:
                # if distance < distance_1:
                friend_dict[figure_1["figure"]]["contact"].append(figure_2["figure"])
                family_dict[figure_1["relation"]]["contact"].append(figure_2["relation"])
            elif distance > distance_2 * 1.2:
                friend_dict[figure_1["figure"]]["far"].append(figure_2["figure"])
                family_dict[figure_1["relation"]]["far"].append(figure_2["relation"])
            else:
                friend_dict[figure_1["figure"]]["near"].append(figure_2["figure"])
                family_dict[figure_1["relation"]]["near"].append(figure_2["relation"])

    ## 거리 기준으로 상호간에 친밀도 계산. "나"를 우선수위에 두고 친밀도 작성.
    friend = []
    for figure, figure_relation in friend_dict.items():
        cands = figure_relation["contact"] + figure_relation["near"]
        for cand in cands:
            friend_tmp = sorted([figure, cand])
            if friend_tmp not in friend:
                friend.append(friend_tmp)
    message_friend = []
    for set_friend in friend:
        A = list(set_friend)[0]
        B = list(set_friend)[1]
        message_tmp = f"{A}{get_josa(A)['과/와']} {B}{get_josa(B)['이/가']} 서로 친하고"
        message_friend.append(message_tmp)

    if message_friend:
        message_friend[-1] = message_friend[-1].replace("친하고", "친하구나.")
    message = f"그렇구나. {', '.join(message_friend)}"

    score = 0
    # kidName 또는 "나"로 조회 시도
    kid_data = family_dict.get(kidName) or family_dict.get("나")
    if kid_data and {"엄마", "아빠"} & set(kid_data["contact"] + kid_data["far"]):
        score += 1

    # print(set(family_dict[kidName]["contact"] + family_dict[kidName]["far"]))
    # print(score)

    # message = ""
    return score, message


def get_score(kidName: str, receiptNo: int):
    receipt_no_str = str(receiptNo)
    data_json = session_repository.find_by_receipt_no(receipt_no_str)
    if not data_json:
        return 0, ""

    score = 0
    message = ""
    stages = data_json["figures"]
    if "1" in stages.keys():
        victim_count = 0
        for figure in stages["1"]:
            if figure["figure"] in victim:
                victim_count += 1
        if victim_count >= 1:
            score += 1
            data_json["abuse"]["1"] = 1

    if "2" in stages.keys():
        abuser_count = 0
        for figure in stages["2"]:
            if figure["figure"] in abuser:
                abuser_count += 1
        if abuser_count >= 1:
            score += 1
            data_json["abuse"]["2"] = 1

    if "3" in stages.keys():
        abuser_count = 0
        for figure in stages["3"]:
            if figure["figure"] in abuser:
                abuser_count += 1
        if abuser_count >= 1:
            score += 1
            data_json["abuse"]["3"] = 1

    # 본인-가족 동역학 긴장(tension_family_dynamics):
    # figures["5"](Stage 4: 가족이 보는 나) vs figures["3"](Stage 3: 내가 본 가족원)
    # 같은 가족원에 대해 본인-가족 시점에서 가해/피해 동물 역전이 있으면 긴장 가산.
    # 예: 엄마가 호랑이(가해)인데, 엄마가 보는 나는 토끼(피해) → 가해자-피해자 구도 긴장
    tension_5 = 0
    if "5" in stages.keys() and "3" in stages.keys():
        for fig5 in stages["5"]:
            for fig3 in stages["3"]:
                if fig3["relation"] == fig5["relation"]:
                    fig3_abuser = fig3["figure"] in abuser
                    fig3_victim = fig3["figure"] in victim
                    fig5_abuser = fig5["figure"] in abuser
                    fig5_victim = fig5["figure"] in victim
                    if (fig3_abuser and fig5_victim) or (fig3_victim and fig5_abuser):
                        tension_5 = 1
                    break
            if tension_5:
                break
    data_json["abuse"]["5"] = tension_5

    # 자기인식-가족기대 갈등(tension_self_vs_family_expectation):
    # figures["6"](Stage 5: 가족이 보는 소망하는 나) vs figures["1"](Stage 1: 자기상)
    # 본인이 보는 자기 vs 가족이 기대하는 본인 사이의 가해/피해 역전이 있으면 긴장 가산.
    # 예: 본인은 토끼(피해)라 보는데, 가족이 기대하는 나는 호랑이(가해) → 자기인식 갈등
    tension_6 = 0
    if "6" in stages.keys() and "1" in stages.keys():
        stage1_has_abuser = any(fig["figure"] in abuser for fig in stages["1"])
        stage1_has_victim = any(fig["figure"] in victim for fig in stages["1"])
        stage6_has_abuser = any(fig["figure"] in abuser for fig in stages["6"])
        stage6_has_victim = any(fig["figure"] in victim for fig in stages["6"])
        if (stage1_has_abuser and stage6_has_victim) or (stage1_has_victim and stage6_has_abuser):
            tension_6 = 1
    data_json["abuse"]["6"] = tension_6

    # 긴장/갈등 메시지 설정
    if tension_5 + tension_6 == 2:
        data_json["tension"] = "높음"
    elif tension_5 + tension_6 == 1:
        data_json["tension"] = "있음"
    else:
        data_json["tension"] = "없음"

    if data_json["positions"]:
        ## position으로 score 계산
        score_4, message = get_friendly(kidName, data_json["positions"])
        score += score_4
        data_json["friendly_message"] = message
        data_json["abuse"]["4"] = score_4

    data_json["score"] = score
    session_repository.update_session(receipt_no_str, {
        "score": score,
        "abuse": data_json["abuse"],
        "friendly_message": data_json.get("friendly_message", ""),
        "tension": data_json.get("tension", "없음"),
    })

    return score, message


def get_reliability(kidName: str, receiptNo: int):
    """응답 신뢰도 분석: 응답시간, 인형조작, 동물선택, 가족선택, 대화품질 5가지 지표를 종합.

    Returns:
        dict: {
            responseTime: {score, detail},
            dollInteraction: {score, detail},
            animalSelection: {score, detail},
            familySelection: {score, detail},
            chatQuality: {score, detail},
            totalScore, grade
        }
    """
    from datetime import datetime

    receipt_no_str = str(receiptNo)
    data_json = session_repository.find_by_receipt_no(receipt_no_str)
    if not data_json:
        return {}

    result = {}

    # ── A. 응답시간: chatHistory에서 bot→user 쌍의 시간차 분석 ──
    chat_history = data_json.get("chatHistory", [])
    response_delays = []
    for i in range(len(chat_history) - 1):
        cur = chat_history[i]
        nxt = chat_history[i + 1]
        if cur.get("role") == "bot" and nxt.get("role") == "user":
            try:
                ts_bot = cur.get("timestamp", "")
                ts_user = nxt.get("timestamp", "")
                if isinstance(ts_bot, str) and isinstance(ts_user, str) and ts_bot and ts_user:
                    t_bot = datetime.fromisoformat(ts_bot)
                    t_user = datetime.fromisoformat(ts_user)
                    diff = (t_user - t_bot).total_seconds()
                    if diff >= 0:
                        response_delays.append(diff)
            except (ValueError, TypeError):
                continue

    if response_delays:
        # 극단값 제거 후 중위값 사용 (Bowling et al. 2021)
        sorted_delays = sorted(response_delays)
        # 상하 10% 제거
        trim = max(1, len(sorted_delays) // 10)
        trimmed = sorted_delays[trim:-trim] if len(sorted_delays) > 4 else sorted_delays
        median_delay = trimmed[len(trimmed) // 2] if trimmed else sorted_delays[len(sorted_delays) // 2]
        avg_delay = sum(trimmed) / len(trimmed) if trimmed else sum(sorted_delays) / len(sorted_delays)
        # 아동 자유응답 기준: 질문 읽기 + 생각 + 입력에 최소 5초
        if median_delay >= 8.0:
            rt_score = 3
            rt_detail = f"챗봇 대화 응답 중위값 {median_delay:.1f}초 (충실한 응답, {len(response_delays)}건)"
        elif median_delay >= 5.0:
            rt_score = 2
            rt_detail = f"챗봇 대화 응답 중위값 {median_delay:.1f}초 (보통, {len(response_delays)}건)"
        elif median_delay >= 2.0:
            rt_score = 1
            rt_detail = f"챗봇 대화 응답 중위값 {median_delay:.1f}초 (빠른 응답, {len(response_delays)}건)"
        else:
            rt_score = 1
            rt_detail = f"챗봇 대화 응답 중위값 {median_delay:.1f}초 (너무 빠름, {len(response_delays)}건)"
    else:
        rt_score = 0
        rt_detail = "대화 기록 없음"

    result["responseTime"] = {"score": rt_score, "detail": rt_detail}

    # ── B. 인형 조작 신뢰도: interactionCount 기반 분석 (fallback: dragCount → 좌표 분산도) ──
    doll_instances = data_json.get("dollInstances", [])
    positions_data = data_json.get("positions", {})

    # interactionCount 데이터가 있는지 확인
    has_interaction_data = (
        doll_instances
        and len(doll_instances) >= 2
        and any(d.get("interactionCount") is not None for d in doll_instances)
    )

    # dragCount 데이터가 있는지 확인 (fallback용)
    has_drag_data = (
        doll_instances
        and len(doll_instances) >= 2
        and any(d.get("dragCount") is not None for d in doll_instances)
    )

    if has_interaction_data:
        # interactionCount 기반 분석
        total_dolls = len(doll_instances)
        interacted_count = 0
        drag_total = 0
        rotation_total = 0
        pose_total = 0
        size_total = 0

        for d in doll_instances:
            ic = d.get("interactionCount", 0)
            if ic > 0:
                interacted_count += 1
            drag_total += d.get("dragCount", 0)
            if d.get("rotationChanged", False):
                rotation_total += 1
            if d.get("poseChanged", False):
                pose_total += 1
            if d.get("sizeChanged", False):
                size_total += 1

        interacted_ratio = interacted_count / total_dolls if total_dolls > 0 else 0

        detail_str = f"{total_dolls}개 인형 중 {interacted_count}개 조작 (드래그 {drag_total}, 회전 {rotation_total}, 포즈 {pose_total}, 크기 {size_total})"
        # ADPA 문헌: 조작 0 = 놀이 거부(비타당), 1개 이상이면 의미 있는 표현 가능
        if interacted_count == 0:
            pv_score = 0
            pv_detail = f"조작 없음 - 놀이 거부 ({detail_str})"
        elif interacted_ratio >= 0.8:
            pv_score = 3
            pv_detail = f"충실한 조작 ({detail_str})"
        elif interacted_ratio >= 0.3:
            pv_score = 2
            pv_detail = f"보통 조작 ({detail_str})"
        else:
            pv_score = 1
            pv_detail = f"일부만 조작 ({detail_str})"

    elif has_drag_data:
        # Fallback 1: dragCount 기반 분석 (interactionCount 없는 이전 세션)
        total_dolls = len(doll_instances)
        moved_count = 0
        for d in doll_instances:
            drag_count = d.get("dragCount", 0)
            if drag_count > 0:
                initial_pos = d.get("initialPosition", {})
                final_pos = d.get("position", {})
                if initial_pos and final_pos:
                    dx = final_pos.get("x", 0) - initial_pos.get("x", 0)
                    dy = final_pos.get("y", 0) - initial_pos.get("y", 0)
                    dz = final_pos.get("z", 0) - initial_pos.get("z", 0)
                    move_dist = (dx ** 2 + dy ** 2 + dz ** 2) ** 0.5
                    if move_dist >= 0.1:
                        moved_count += 1
                else:
                    moved_count += 1

        moved_ratio = moved_count / total_dolls if total_dolls > 0 else 0

        if moved_ratio >= 0.8:
            pv_score = 3
            pv_detail = f"충실한 배치 (이동한 인형: {moved_count}/{total_dolls}, {moved_ratio:.0%})"
        elif moved_ratio >= 0.5:
            pv_score = 2
            pv_detail = f"보통 배치 (이동한 인형: {moved_count}/{total_dolls}, {moved_ratio:.0%})"
        else:
            pv_score = 1
            pv_detail = f"대부분 이동하지 않음 (이동한 인형: {moved_count}/{total_dolls}, {moved_ratio:.0%})"
    else:
        # Fallback 2: 기존 좌표 분산도 분석 (dragCount도 없는 이전 세션)
        coords = []
        if doll_instances and len(doll_instances) >= 2:
            for d in doll_instances:
                pos = d.get("position", {})
                x = pos.get("x", 0)
                z = pos.get("z", 0)
                coords.append((x, z))
        elif positions_data.get("figures") and len(positions_data["figures"]) >= 2:
            for fig in positions_data["figures"]:
                p1 = fig.get("position", {}).get("p1", [0, 0])
                coords.append((p1[0], p1[1]))

        if len(coords) >= 2:
            distances = []
            for i in range(len(coords)):
                for j in range(i + 1, len(coords)):
                    dx = coords[i][0] - coords[j][0]
                    dy = coords[i][1] - coords[j][1]
                    distances.append((dx ** 2 + dy ** 2) ** 0.5)
            avg_dist = sum(distances) / len(distances) if distances else 0
            std_dist = (sum((d - avg_dist) ** 2 for d in distances) / len(distances)) ** 0.5 if distances else 0

            if std_dist > avg_dist * 0.3 and avg_dist > 0.01:
                pv_score = 3
                pv_detail = f"다양한 위치 배치 (분산도: {std_dist:.2f})"
            elif avg_dist > 0.01:
                pv_score = 2
                pv_detail = f"보통 위치 배치 (분산도: {std_dist:.2f})"
            else:
                pv_score = 1
                pv_detail = "인형들이 거의 같은 위치에 배치됨"
        else:
            pv_score = 0
            pv_detail = "위치 데이터 부족"

    result["dollInteraction"] = {"score": pv_score, "detail": pv_detail}

    # ── 카드 선택 시간 분석 헬퍼 ──
    def _analyze_selection_timing(stage_keys: list[str], figures_data: dict) -> dict | None:
        """selectedAt 타임스탬프로 연속 선택 간 시간차를 분석한다.

        Returns:
            dict with keys: intervals, median, fast_count, rush_count, total, detail
            or None if selectedAt data is not available.
        """
        timestamps = []
        for sk in stage_keys:
            for fig in figures_data.get(sk, []):
                ts_str = fig.get("selectedAt")
                if ts_str and isinstance(ts_str, str):
                    try:
                        timestamps.append(datetime.fromisoformat(ts_str))
                    except (ValueError, TypeError):
                        continue
        if len(timestamps) < 2:
            return None

        timestamps.sort()
        intervals = []
        for i in range(1, len(timestamps)):
            diff = (timestamps[i] - timestamps[i - 1]).total_seconds()
            if diff >= 0:
                intervals.append(diff)

        if not intervals:
            return None

        sorted_iv = sorted(intervals)
        median = sorted_iv[len(sorted_iv) // 2]
        rush_count = sum(1 for iv in intervals if iv < 1.0)
        fast_count = sum(1 for iv in intervals if 1.0 <= iv < 3.0)
        normal_count = sum(1 for iv in intervals if iv >= 3.0)

        if median >= 3.0:
            detail = f"선택 간격 중위값 {median:.1f}초 (정상, {normal_count}건 정상/{fast_count}건 빠름/{rush_count}건 매우빠름)"
            score_adj = 0
        elif median >= 1.0:
            detail = f"선택 간격 중위값 {median:.1f}초 (빠른 선택, {normal_count}건 정상/{fast_count}건 빠름/{rush_count}건 매우빠름)"
            score_adj = -1
        else:
            detail = f"선택 간격 중위값 {median:.1f}초 (막 찍기 의심, {normal_count}건 정상/{fast_count}건 빠름/{rush_count}건 매우빠름)"
            score_adj = -2

        return {
            "intervals": intervals,
            "median": median,
            "fast_count": fast_count,
            "rush_count": rush_count,
            "normal_count": normal_count,
            "total": len(intervals),
            "detail": detail,
            "score_adj": score_adj,
        }

    # ── C-1. 동물 선택 패턴 (animalSelection): stage 1, 2의 동물 다양성 + 위치 반복 분석 ──
    # 동물 카드 고정 순서 (프론트엔드 Animal 배열의 index 순서)
    ANIMAL_ORDER = [
        "강아지", "개", "개구리", "고슴도치", "나비", "독수리", "돌고래", "돼지",
        "병아리", "사자", "상어", "악어", "알에서-나오는-병아리", "새", "젖소", "조개",
        "캥거루", "코끼리", "코브라", "토끼", "호랑이", "흑표범", "새끼팬더", "공룡",
        "도마뱀", "돌", "말", "불곰", "새끼-양", "양", "버팔로", "여우",
    ]
    animal_index_map = {name: idx for idx, name in enumerate(ANIMAL_ORDER)}

    figures = data_json.get("figures", {})

    # stage 1, 2에서 선택된 동물들의 인덱스 수집
    animal_indices_per_stage = []
    animal_names_all = []
    for stage_key in ["1", "2"]:
        stage_figs = figures.get(stage_key, [])
        stage_indices = []
        for fig in stage_figs:
            name = fig.get("figure", "")
            if name:
                animal_names_all.append(name)
                idx = animal_index_map.get(name)
                if idx is not None:
                    stage_indices.append(idx)
        if stage_indices:
            animal_indices_per_stage.append(stage_indices)

    if animal_names_all:
        unique_animals = set(animal_names_all)
        total_animals = len(animal_names_all)
        diversity_ratio = len(unique_animals) / total_animals

        # 위치 반복 분석: 모든 stage에서 선택된 인덱스가 동일한지 확인
        all_indices = []
        for indices in animal_indices_per_stage:
            all_indices.extend(indices)

        position_repeat = False
        if len(animal_indices_per_stage) == 2 and all(len(s) > 0 for s in animal_indices_per_stage):
            # stage 1과 stage 2에서 선택한 인덱스 집합이 동일하면 위치 반복 의심
            if set(animal_indices_per_stage[0]) == set(animal_indices_per_stage[1]):
                position_repeat = True

        # 선택 이유(message) 품질 분석: 무의미한 텍스트(1~2자, 자음만, 숫자/특수문자만) 비율
        import re
        all_messages = []
        for stage_key in ["1", "2"]:
            for fig in figures.get(stage_key, []):
                msg = fig.get("message", "").strip()
                all_messages.append(msg)

        meaningless_count = 0
        for msg in all_messages:
            if not msg or len(msg) <= 2 or re.match(r'^[ㄱ-ㅎㅏ-ㅣ\d\W]+$', msg):
                meaningless_count += 1
        msg_total = len(all_messages) if all_messages else 1
        meaningless_ratio = meaningless_count / msg_total

        # 종합 판정: 다양성 + 이유 품질 + 위치 반복
        # 무의미 이유 예시 수집 (최대 3개)
        meaningless_examples = []
        for msg in all_messages:
            if not msg or len(msg) <= 2 or re.match(r'^[ㄱ-ㅎㅏ-ㅣ\d\W]+$', msg):
                if msg:
                    meaningless_examples.append(f'"{msg}"')
                if len(meaningless_examples) >= 3:
                    break
        examples_str = ", ".join(meaningless_examples) if meaningless_examples else "빈 입력"

        if meaningless_ratio >= 0.8:
            as_score = 1
            as_detail = f"선택 이유 {meaningless_ratio:.0%}가 무의미 ({meaningless_count}/{msg_total}건, 예: {examples_str}) - 1~2자, 자음만, 숫자/특수문자"
        elif position_repeat and len(unique_animals) <= 2:
            as_score = 1
            as_detail = f"위치 반복 + 낮은 다양성 ({len(unique_animals)}종/{total_animals}개) - 무성의 응답 가능"
        elif meaningless_ratio >= 0.5:
            as_score = 2
            as_detail = f"보통 ({len(unique_animals)}종/{total_animals}개, 무의미 이유 {meaningless_ratio:.0%})"
        elif diversity_ratio >= 0.5 and len(unique_animals) >= 3:
            as_score = 3
            as_detail = f"다양한 동물 선택 ({len(unique_animals)}종/{total_animals}개, 다양성 {diversity_ratio:.0%})"
        else:
            as_score = 2
            note = " (참고: 위치 반복 감지)" if position_repeat else ""
            as_detail = f"보통 다양성 ({len(unique_animals)}종/{total_animals}개, 다양성 {diversity_ratio:.0%}){note}"
    else:
        as_score = 0
        as_detail = "동물 선택 데이터 없음"

    result["animalSelection"] = {"score": as_score, "detail": as_detail}

    # 동물 카드 선택 시간 분석 (stage 1, 2) - 별도 항목
    animal_timing = _analyze_selection_timing(["1", "2"], figures)
    if animal_timing:
        at_score = 3 if animal_timing["median"] >= 3.0 else (2 if animal_timing["median"] >= 1.0 else 1)
        result["animalTiming"] = {"score": at_score, "detail": animal_timing["detail"]}
    else:
        result["animalTiming"] = {"score": 0, "detail": "선택 시간 데이터 없음"}

    # ── C-2. 가족 선택 패턴 (familySelection): stage 3, 5, 6의 가족 동물 분석 ──
    family_animals_all = []
    family_by_relation = {}  # relation -> {stage -> animal}

    for stage_key in ["3", "5", "6"]:
        stage_figs = figures.get(stage_key, [])
        for fig in stage_figs:
            name = fig.get("figure", "")
            relation = fig.get("relation", "")
            if name and relation:
                family_animals_all.append(name)
                if relation not in family_by_relation:
                    family_by_relation[relation] = {}
                family_by_relation[relation][stage_key] = name

    if family_animals_all:
        unique_family = set(family_animals_all)
        total_family = len(family_animals_all)

        # 모든 가족 구성원에 같은 동물을 선택했는지
        stage3_animals = [fig.get("figure", "") for fig in figures.get("3", []) if fig.get("figure")]
        all_same_in_stage3 = len(set(stage3_animals)) <= 1 and len(stage3_animals) >= 2

        # stage 3과 stage 5에서 같은 가족에 대해 같은 동물만 반복했는지
        same_repeat_35 = 0
        compare_count_35 = 0
        for relation, stages in family_by_relation.items():
            if "3" in stages and "5" in stages:
                compare_count_35 += 1
                if stages["3"] == stages["5"]:
                    same_repeat_35 += 1

        repeat_ratio_35 = same_repeat_35 / compare_count_35 if compare_count_35 > 0 else 0

        diversity_ratio_fam = len(unique_family) / total_family if total_family > 0 else 0

        # 가족 선택 이유(message) 품질 분석
        fam_messages = []
        for stage_key in ["3", "5", "6"]:
            for fig in figures.get(stage_key, []):
                msg = fig.get("message", "").strip()
                fam_messages.append(msg)

        fam_meaningless = 0
        for msg in fam_messages:
            if not msg or len(msg) <= 2 or re.match(r'^[ㄱ-ㅎㅏ-ㅣ\d\W]+$', msg):
                fam_meaningless += 1
        fam_msg_total = len(fam_messages) if fam_messages else 1
        fam_meaningless_ratio = fam_meaningless / fam_msg_total

        notes = []
        if all_same_in_stage3:
            notes.append("가족 전원에 같은 동물 선택")
        if compare_count_35 > 0 and repeat_ratio_35 >= 0.8:
            notes.append(f"stage 3↔5 동일 동물 반복 ({same_repeat_35}/{compare_count_35})")

        # 무의미 이유 예시 수집 (최대 3개)
        fam_examples = []
        for msg in fam_messages:
            if not msg or len(msg) <= 2 or re.match(r'^[ㄱ-ㅎㅏ-ㅣ\d\W]+$', msg):
                if msg:
                    fam_examples.append(f'"{msg}"')
                if len(fam_examples) >= 3:
                    break
        fam_examples_str = ", ".join(fam_examples) if fam_examples else "빈 입력"

        if fam_meaningless_ratio >= 0.8:
            fs_score = 1
            fs_detail = f"선택 이유 {fam_meaningless_ratio:.0%}가 무의미 ({fam_meaningless}/{fam_msg_total}건, 예: {fam_examples_str}) - 1~2자, 자음만, 숫자/특수문자"
        elif diversity_ratio_fam >= 0.5 and len(unique_family) >= 3 and fam_meaningless_ratio < 0.5:
            fs_score = 3
            fs_detail = f"다양한 가족 동물 선택 ({len(unique_family)}종/{total_family}개, 다양성 {diversity_ratio_fam:.0%})"
        elif diversity_ratio_fam >= 0.3 or len(unique_family) >= 2:
            fs_score = 2
            note_str = f" (참고: {', '.join(notes)})" if notes else ""
            fs_detail = f"보통 다양성 ({len(unique_family)}종/{total_family}개, 다양성 {diversity_ratio_fam:.0%}){note_str}"
        else:
            fs_score = 2
            note_str = f" - {', '.join(notes)}" if notes else ""
            fs_detail = f"반복적 선택 ({len(unique_family)}종/{total_family}개) - 임상적 고착 가능성 참고{note_str}"
    else:
        fs_score = 0
        fs_detail = "가족 동물 선택 데이터 없음"

    result["familySelection"] = {"score": fs_score, "detail": fs_detail}

    # 가족 카드 선택 시간 분석 (stage 3, 5, 6) - 별도 항목
    family_timing = _analyze_selection_timing(["3", "5", "6"], figures)
    if family_timing:
        ft_score = 3 if family_timing["median"] >= 3.0 else (2 if family_timing["median"] >= 1.0 else 1)
        result["familyTiming"] = {"score": ft_score, "detail": family_timing["detail"]}
    else:
        result["familyTiming"] = {"score": 0, "detail": "선택 시간 데이터 없음"}

    # ── D. 대화품질: user 메시지 길이 분석 ──
    user_messages = [e.get("content", "") for e in chat_history if e.get("role") == "user"]

    if user_messages:
        avg_len = sum(len(m) for m in user_messages) / len(user_messages)
        # 아동 기준: "응", "아빠", "무서워" 등 2~4자 응답도 임상적으로 유효
        meaningful_msgs = sum(1 for m in user_messages if len(m) >= 2)
        meaningful_ratio = meaningful_msgs / len(user_messages)

        if avg_len >= 5 and meaningful_ratio >= 0.5:
            cq_score = 3
            cq_detail = f"챗봇 대화 충실 (평균 {avg_len:.1f}자, 2자 이상 {meaningful_ratio:.0%}, {len(user_messages)}건)"
        elif avg_len >= 2:
            cq_score = 2
            cq_detail = f"챗봇 대화 보통 (평균 {avg_len:.1f}자, 2자 이상 {meaningful_ratio:.0%}, {len(user_messages)}건)"
        else:
            cq_score = 1
            cq_detail = f"챗봇 대화 짧음 (평균 {avg_len:.1f}자, 2자 이상 {meaningful_ratio:.0%}, {len(user_messages)}건)"
    else:
        cq_score = 0
        cq_detail = "챗봇 대화 기록 없음"

    result["chatQuality"] = {"score": cq_score, "detail": cq_detail}

    # ── 그룹별 점수 ──
    def calc_group(items):
        scores = [s for s in items if s > 0]
        if not scores:
            return 0, "낮음"
        avg = sum(scores) / len(scores)
        if avg >= 2.5:
            return round(avg, 2), "높음"
        elif avg >= 1.5:
            return round(avg, 2), "보통"
        else:
            return round(avg, 2), "낮음"

    # 동물 검사 신뢰도: 동물 선택 + 동물 선택 시간 + 가족 선택 + 가족 선택 시간 + 대화 품질 + 응답 시간
    animal_score, animal_grade = calc_group([
        result["animalSelection"]["score"],
        result["animalTiming"]["score"],
        result["familySelection"]["score"],
        result["familyTiming"]["score"],
        result["chatQuality"]["score"],
        result["responseTime"]["score"],
    ])
    result["animalTest"] = {"score": animal_score, "grade": animal_grade}

    # 인형 가족검사 신뢰도: 인형 조작
    family_score, family_grade = calc_group([
        result["dollInteraction"]["score"],
    ])
    result["familyTest"] = {"score": family_score, "grade": family_grade}

    # 종합 점수 (IER 문헌: 2개 이상 지표가 동시에 플래그될 때만 "낮음" 판정)
    all_item_scores = [
        result["responseTime"]["score"],
        result["dollInteraction"]["score"],
        result["animalSelection"]["score"],
        result["familySelection"]["score"],
        result["chatQuality"]["score"],
    ]
    # score 0은 데이터 없음이므로 제외
    active_scores = [s for s in all_item_scores if s > 0]
    low_count = sum(1 for s in active_scores if s <= 1)

    all_group_scores = [animal_score, family_score]
    valid = [s for s in all_group_scores if s > 0]
    total_score = round(sum(valid) / len(valid), 2) if valid else 0

    # 2개 이상 지표가 score 1이면 "낮음", 그 외 점수 기반 판정
    if low_count >= 2:
        grade = "낮음"
    elif total_score >= 2.5:
        grade = "높음"
    elif total_score >= 1.5:
        grade = "보통"
    else:
        grade = "낮음"

    result["totalScore"] = total_score
    result["grade"] = grade
    result["lowIndicatorCount"] = low_count

    return result


def get_report(kidName: str, receiptNo: int):
    """stage 1 피해자 1+, stage 2 가해자 1+, stage 3 가해자 1+ 이면 역기능.
    그 외는 기능.

    Args:
        kidName (str): [description]
        receiptNo (int): [description]
    """
    message = "기능적입니다."

    receipt_no_str = str(receiptNo)
    data_json = session_repository.find_by_receipt_no(receipt_no_str)
    if not data_json:
        return "기능적입니다.", {}

    abuse = data_json.get("abuse", {})
    if abuse.get("1", 0) + abuse.get("2", 0) + abuse.get("3", 0) == 3:
        message = "역기능 있습니다."

    # 긴장/갈등 판정: stage 5 + stage 6
    tension_5 = abuse.get("5", 0)
    tension_6 = abuse.get("6", 0)
    if tension_5 + tension_6 == 2:
        tension_message = "높음"
    elif tension_5 + tension_6 == 1:
        tension_message = "있음"
    else:
        tension_message = "없음"

    data_json["report"] = message
    data_json["tension"] = tension_message
    data_json["scripts"] = chatbot_template.therapy_script(
        kidName,
        data_json["figures"],
        data_json["friendly_message"],
        data_json["llmCompletion"],
    )

    session_repository.update_session(receipt_no_str, {
        "report": data_json.get("report", ""),
        "tension": data_json.get("tension", ""),
        "scripts": data_json.get("scripts", {}),
    })

    return message, data_json
