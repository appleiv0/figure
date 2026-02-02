from libcommon.utils.chatUtils import get_josa


def therapy_script(
    kid_name: str,
    figures: dict,
    friendly_message: str,
    llm_completion: dict,
):
    stage_0 = [
        {"bot": "안녕? 내 이름은 푸름이야"},
        {"bot": f"나는 {kid_name}{get_josa(kid_name)['과/와']} 함께 동물들을 가지고 {kid_name}의 이야기를 들어보려고 해."},
        {"button": "동물 선택하러 가기"},
    ]

    stage_1 = [
        {"bot": f"이 동물들이 왜 {kid_name}{get_josa(kid_name)['라/이라']}고 생각했어?"},
        {"bot": f"어떤 부분이 {kid_name}{get_josa(kid_name)['랑/이랑']} 닮았다고 생각이 들었는지 궁금해."},
        {"image": ", ".join([x["figure"] for x in figures["1"]])},
        {"user": f"{figures['1'][0]['message']}"},
        {"bot": f"그랬구나, {kid_name}{get_josa(kid_name)['은/는']} 그렇게 생각했구나"},
        {"bot": f"이번에는 {kid_name}{get_josa(kid_name)['이/가']} 되고싶은 동물을 선택해보자."},
        {"button": "동물 선택하러 가기"},
    ]

    stage_2 = [
        {"bot": f"{kid_name}{get_josa(kid_name)['은/는']} 이 동물들이 왜 되고 싶을까?"},
        {"image": ", ".join([x["figure"] for x in figures["2"]])},
        {"user": f"{figures['2'][0]['message']}"},
        {
            "bot": f"그랬구나, {kid_name}{get_josa(kid_name)['은/는']} 그래서 {', '.join([x['figure'] for x in figures['2']])}{get_josa(figures['2'][-1]['figure'])['을/를']} 선택했구나."
        },
        {"bot": f"이번에는 {kid_name}의 가족들을 동물로 선택해보자."},
        {"bot": f"{kid_name}의 가족들은 누구누구야?"},
        {"button": ", ".join([x["relation"] for x in figures["3"]])},
    ]
    stage_3 = []
    for i, figure in enumerate(figures["3"]):
        if i == 0:
            start_word = "먼저"
        else:
            start_word = "이번에는"
        stage_3.extend(
            [
                {
                    "bot": f"{start_word} {figure['relation']}{get_josa(figure['relation'])['고/라고']} 생각되는 동물을 선택해보자"
                },
                {"button": "동물 선택하러 가기"},
                {"image": figure["figure"]},
                {
                    "bot": f"{figure['figure']}{get_josa(figure['figure'])['을/를']} 골랐구나. {figure['relation']}{get_josa(figure['relation'])['은/는']} 왜 {figure['figure']} 같다고 생각했을까?"
                },
                {"user": f"{figure['message']}"},
                {"bot": f"그렇구나. {figure['figure']}의 모습이 {figure['relation']} 같구나."},
            ]
        )

    stage_4 = [
        {"bot": "이번에는 동물 중에서 누구 누구가 서로 친한지 친한 동물들끼리 세워보자."},
        {"button": "동물 세우러 가기"},
        {"bot": friendly_message},
        {"bot": f"이번엔 우리 가족이 어떤 동물이었으면 좋겠는지 {kid_name}{get_josa(kid_name)['이/가']} 바라는 동물들로 바꾸어보자."},
    ]

    stage_5 = []
    for i, figure in enumerate(figures["5"]):
        if i == 0:
            start_word = "먼저"
        else:
            start_word = "이번에는"

        stage_3_figure = figures["3"][i]["figure"]

        stage_5.extend(
            [
                {
                    "bot": f"{start_word} {figure['relation']}{get_josa(figure['relation'])['은/는']} {stage_3_figure}{get_josa(stage_3_figure)['였/이었']}는데, 어떤 동물이 되었으면 좋겠어?"
                },
                {"button": "동물 선택하러 가기"},
                {"image": figure["figure"]},
            ]
        )
        if figure["figure"] == stage_3_figure:
            stage_5.append(
                [
                    {
                        "bot": f"{figure['relation']}{get_josa(figure['relation'])['은/는']} {stage_3_figure}{get_josa(stage_3_figure)['였/이었']}는데, {figure['figure']}{get_josa(figure['figure'])['이/가']} 되었으면 좋겠는 이유가 있을까?"
                    },
                    {"user": figure["message"]},
                    {
                        "bot": f"그렇구나. 그래서 {figure['relation']}{get_josa(figure['relation'])['이/가']} {figure['figure']}{get_josa(figure['figure'])['이/가']} 되었으면 좋겠구나."
                    },
                ]
            )
        else:
            stage_5.extend(
                [
                    {
                        "bot": f"{figure['relation']}{get_josa(figure['relation'])['은/는']} {stage_3_figure}{get_josa(stage_3_figure)['였/이었']}는데, 바뀌지 않아도 괜찮구나."
                    },
                ]
            )

    stage_6 = []
    for i, figure in enumerate(figures["6"]):
        llm = llm_completion[figure["relation"]]
        stage_6.extend(
            [
                {
                    "bot": f"{figure['relation']}{get_josa(figure['relation'])['은/는']} 너를 무슨 동물로 세울 것 같니?"
                },
                {"button": "동물 선택하러 가기"},
                {
                    "bot": f"{figure['figure']}{get_josa(figure['figure'])['로/으로']} 고를 것 같구나. 왜 {figure['figure']}{get_josa(figure['figure'])['고/라고']}생각할 것 같은지 말해보자."
                },
                {"user": f"{figure['message']}"},
                {"bot": f"{llm['bot'][0]}"},
                {"user": f"{llm['user'][0]}"},
                {"bot": f"{llm['bot'][1]}"},
                {"bot": f"{figure['figure']}에게 어떤 말이 하고싶을까?"},
                {"user": f"{llm['user'][1]}"},
                {"bot": f"그렇구나. {figure['figure']}에게 그렇게 말해주고 싶구나"},
            ]
        )

    scripts = stage_0 + stage_1 + stage_2 + stage_3 + stage_4 + stage_5 + stage_6
    return scripts
