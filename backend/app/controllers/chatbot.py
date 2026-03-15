import os
import numpy as np

from libcommon.utils.jsonUtils import make_json, read_json
import app.config.app_config as CFG
from app.controllers import chatbot_template
from libcommon.utils.chatUtils import get_josa

from openai import OpenAI

client = OpenAI(api_key=CFG.OPENAI_API_KEY)

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


def request_chatgpt_1(prompt: dict):
    chat_completion = client.chat.completions.create(
        messages=prompt, model="gpt-3.5-turbo", max_tokens=200, temperature=0.2
    )
    # print(chat_completion)
    completion = chat_completion.choices[0].message.content
    return completion


def request_chatgpt_2(prompt: dict):
    chat_completion = client.chat.completions.create(
        messages=prompt, model="gpt-3.5-turbo", max_tokens=200, temperature=0
    )
    # print(chat_completion)
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
            m_3 = f"- {figure['figure']}의 행동:{figure['message']}"
            f_3 = figure["figure"]
    m_6 = ""
    f_6 = ""
    for figure in data_json["figures"]["6"]:
        if figure["relation"] == relation:
            f_6 = figure["figure"]
            # m_6 = f"- {f_3}{get_josa(f_3)['이/가']} 생각하는 나:{figure['figure']}, {figure['message']}."
            m_6 = f"- {f_3}{get_josa(f_3)['이/가']} 생각하는 {figure['figure']}:{figure['message']}.\n- {f_6}{get_josa(f_6)['은/는']} 나야."
    m_llm = f"- {data_json['llmCompletion'][relation]['bot'][0]}: {data_json['llmCompletion'][relation]['user'][0]}"

    prompt_prefix = "다음 내용을 참고해서 나에게 짧은 위로의 말을 해줘."
    prompt_scenario = "\n".join([m_3, m_6])
    prompt_suffix = m_llm

    prompt: list[dict[str, str]] = [
        {
            "role": "system",
            "content": "당신은 친절한 상담사. 질문에 친절하게 답변해줘.",
        },
        {
            "role": "system",
            "content": "10살 어린이의 친구처럼 친근하게 말해줘.",
        },
        {
            "role": "user",
            "content": f"{prompt_prefix}\n토끼는 나를 힘들게 하지 않아. 나를 양처럼 생각하고 옆에 같이 있어줘.",
        },
        {"role": "assistant", "content": "그렇게 토끼는 너를 친근하게 생각하고 옆에 있어주는구나."},
        {
            "role": "user",
            "content": f"{prompt_prefix}\n돼지때문에 나는 아무것도 못해요. 우리식구 다 힘들어요. 조개는 돼지때문에 아무것도 안하고 돼지 보기 싫어서 딱 닫고 있어요. 돼지가 들어오면 피해요.",
        },
        {"role": "assistant", "content": "그래서 돼지가 조개를 힘들게 하는구나."},
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
            m_3 = f"- {figure['figure']}의 행동:{figure['message']}"
            f_3 = figure["figure"]
    m_6 = ""
    f_6 = ""
    for figure in data_json["figures"]["6"]:
        if figure["relation"] == relation:
            f_6 = figure["figure"]
            # m_6 = f"- {f_3}{get_josa(f_3)['이/가']} 생각하는 나:{figure['figure']}, {figure['message']}."
            m_6 = f"- {f_3}{get_josa(f_3)['이/가']} 생각하는 {figure['figure']}:{figure['message']}.\n- {f_6}{get_josa(f_6)['은/는']} 나야."

    prompt_prefix = "다음 두 가지 내용을 참고하고, 간단한 피드백과 질문을 해줘."
    prompt_scenario = "\n".join([m_3, m_6])
    prompt_suffix = ""

    prompt: list[dict[str, str]] = [
        {
            "role": "system",
            "content": "당신은 친절한 상담사. 질문에 친절하게 답변해줘.",
        },
        {
            "role": "system",
            "content": "10살 어린이의 친구처럼 친근하게 말해줘.",
        },
        {
            "role": "user",
            "content": f"{prompt_prefix}\n- 상어의 행동: 우리 엄마는 아무도 이길 사람이 없어요.\n- 상어가 생각하는 나: 악어, 내가 자꾸 말썽부리고 대들고 싸우니까",
        },
        {"role": "assistant", "content": "상어가 너를 악어로 보고 어떻게 힘들게 할까?"},
        {
            "role": "user",
            "content": f"{prompt_prefix}\n- 토끼의 행동: 토끼같이 귀여워요.\n- 토끼가 생각하는 나: 양, 내가 양처럼 순하고 우니까.",
        },
        {"role": "assistant", "content": "토끼는 너를 양으로 보고 힘들게 하지는 않니?"},
        {
            "role": "user",
            "content": f"{prompt_prefix}\n- 돼지의 행동: 술 쳐먹고 맨날 오줌 싸고 똥 싸고 돼지처럼 더러우니까요.\n- 돼지가 생각하는 나: 조개, 내가 아빠를 무시하니까 아빠는 날 조개라고 고를거예요.",
        },
        {"role": "assistant", "content": "아빠가 너를 조개로 보고 너를 어떻게 힘들게 할까?"},
        {
            "role": "user",
            "content": "\n".join([prompt_prefix, prompt_scenario, prompt_suffix]),
        },
    ]

    # print(prompt)
    return prompt, f_6


def get_llm_completion(kidName: str, receiptNo: int, count: int, relation: str):
    ## 가족 구성원 학대 여부에 따른 prompt 정의

    data_json_path = os.path.join(CFG.THERAPY_RESULT_DIR, f"{receiptNo}_{kidName}.json")
    data_json = read_json(data_json_path)

    if count == 0:
        prompt, f_6 = prompt_engineering_1(data_json, relation)
        ## LLM 호출
        chat_completion = request_chatgpt_1(prompt)

        completion = f"그렇구나. 그래서 {relation}{get_josa(relation)['이/가']} 너를 {f_6}{get_josa(f_6)['로/으로']} 보고 있구나.\n{chat_completion}"
        data_json["llmCompletion"][relation]["bot"][count] = completion
        make_json(data_json_path, data_json)
    elif count == 1:
        prompt, f_3 = prompt_engineering_2(data_json, relation)
        completion = request_chatgpt_2(prompt)
        completion = f"{completion}\n{f_3}에게 어떤 말을 하고싶을까?"

        data_json["llmCompletion"][relation]["bot"][count] = completion
        make_json(data_json_path, data_json)
    else:
        f_3 = prompt_engineering_3(data_json, relation)
        completion = f"그렇구나. {f_3}에게 그렇게 말해주고 싶구나."

    return completion
    # return prompt


def get_friendly(kidName: str, positions: dict):
    x_ceter, y_center = positions["centerH"], positions["centerV"]
    if not positions.get("figures"):
        return 0, ""
    card_size_x = (
        positions["figures"][0]["position"]["p2"][0] - positions["figures"][0]["position"]["p1"][0]
    )
    card_size_y = (
        positions["figures"][0]["position"]["p2"][1] - positions["figures"][0]["position"]["p1"][1]
    )

    distance_1 = (card_size_x**2 + card_size_y**2) ** 0.5
    distance_2 = ((x_ceter - card_size_x) ** 2 + (y_center - card_size_y) ** 2) ** 0.5

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
    data_json_path = os.path.join(CFG.THERAPY_RESULT_DIR, f"{receiptNo}_{kidName}.json")
    data_json = read_json(data_json_path)

    score = 0
    message = ""
    stages = data_json["figures"]
    if "1" in stages.keys():
        abuser_count = 0
        victim_count = 0
        for figure in stages["1"]:
            if figure["figure"] in abuser:
                abuser_count += 1
            if figure["figure"] in victim:
                victim_count += 1
            # if abuser_count >= 1 and victim_count >= 1:
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

    # Stage 5: figures["5"] vs figures["3"] — 가족 동물이 가해자↔피해자로 바뀌면 긴장/갈등
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

    # Stage 6: figures["6"] vs figures["1"] — 나의 동물이 가해자↔피해자로 바뀌면 긴장/갈등
    tension_6 = 0
    if "6" in stages.keys() and "1" in stages.keys():
        stage1_has_abuser = any(fig["figure"] in abuser for fig in stages["1"])
        stage1_has_victim = any(fig["figure"] in victim for fig in stages["1"])
        stage6_has_abuser = any(fig["figure"] in abuser for fig in stages["6"])
        stage6_has_victim = any(fig["figure"] in victim for fig in stages["6"])
        if (stage1_has_abuser and stage6_has_victim) or (stage1_has_victim and stage6_has_abuser):
            tension_6 = 1
    data_json["abuse"]["6"] = tension_6

    if data_json["positions"]:
        ## position으로 score 계산
        score_4, message = get_friendly(kidName, data_json["positions"])
        score += score_4
        data_json["friendly_message"] = message
        data_json["abuse"]["4"] = score_4

    data_json["score"] = score
    make_json(data_json_path, data_json)

    return score, message


def get_report(kidName: str, receiptNo: int):
    """stage 1 피해자 1+, stage 2 가해자 1+, stage 3 가해자 1+ 이면 역기능.
    그 외는 기능.

    Args:
        kidName (str): [description]
        receiptNo (int): [description]
    """
    message = "기능적입니다."

    data_json_path = os.path.join(CFG.THERAPY_RESULT_DIR, f"{receiptNo}_{kidName}.json")
    data_json = read_json(data_json_path)

    abuse = data_json["abuse"]
    if abuse["1"] + abuse["2"] + abuse["3"] == 3:
        message = "역기능 있습니다."

    # 긴장/갈등 판정: stage 5 + stage 6
    tension_5 = abuse.get("5", 0)
    tension_6 = abuse.get("6", 0)
    if tension_5 + tension_6 == 2:
        tension_message = "긴장/갈등 높음"
    elif tension_5 + tension_6 == 1:
        tension_message = "긴장/갈등 있음"
    else:
        tension_message = "긴장/갈등 없음"

    data_json["report"] = message
    data_json["tension"] = tension_message
    data_json["scripts"] = chatbot_template.therapy_script(
        kidName,
        data_json["figures"],
        data_json["friendly_message"],
        data_json["llmCompletion"],
    )

    make_json(data_json_path, data_json)

    return message, data_json
