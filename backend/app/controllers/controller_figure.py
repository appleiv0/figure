import os
import re
import time
from datetime import datetime
import libcommon.config.status_error as status_error
from app.models.response_figure import (
    ReceiptNoRes,
    SetFigureRes,
    SetPostionRes,
    LLMCompletionRes,
    GetReportRes,
)
from libcommon.utils.chatUtils import get_josa, get_josa_en
from libcommon.utils.jsonUtils import make_json, read_json
from app.repositories.session_repository import session_repository

import app.config.app_config as CFG
from app.controllers import chatbot


def sanitize_filename(name: str) -> str:
    """Remove path separators and dangerous characters from filename."""
    if not name:
        return ""
    return re.sub(r'[/\\<>:"|?*\x00-\x1f]', '', name)


card_directions = {
    "강아지": "left",
    "개": "left",
    "개구리": "left",
    "고슴도치": "left",
    "공룡": "left",
    "나비": "left",
    "도마뱀": "left",
    "독수리": "right",
    "돌": "right",
    "돌고래": "left",
    "돼지": "left",
    "말": "right",
    "뱀": "left",
    "병아리": "left",
    "불곰": "right",
    "사자": "right",
    "상어": "right",
    "새끼-양": "left",
    "악어": "left",
    "알에서-나오는-병아리": "left",
    "양": "left",
    "일반-새": "left",
    "젖소": "right",
    "조개": "right",
    "캥거루": "left",
    "코끼리": "right",
    "코브라": "left",
    "토끼": "left",
    "학": "left",
    "호랑이": "right",
    "흑표범": "right",
    "새끼팬더": "left",
}


def create_receipt_number(counselor: dict, kid: dict, agree: bool):
    """Create a new therapy session with unique receipt number"""
    receipt_no = str(int(time.time() * 1000))
    josa = get_josa_en(kid["name"])

    # Create session data
    session_data = {
        "date": datetime.strftime(datetime.now(), format="%Y%m%d%H%M%S"),
        "receiptNo": receipt_no,
        "counselor": counselor,
        "kid": {**kid, **josa},
        "agree": agree,
        "figures": {"1": [], "2": [], "3": [], "5": [], "6": []},
        "positions": {},
        "friendly_message": "",
        "llmCompletion": {},
        "abuser": {},
        "score": 0,
        "abuse": {"1": 0, "2": 0, "3": 0, "4": 0, "6": 0},
        "report": "",
        "scripts": {},
        "chatHistory": []
    }

    # Save to JSON first (before MongoDB adds datetime objects)
    sanitized_name = sanitize_filename(kid['name'])
    json_path = os.path.join(CFG.THERAPY_RESULT_DIR, f"{receipt_no}_{sanitized_name}.json")
    make_json(json_path, session_data)

    # Save to MongoDB (this adds datetime fields)
    session_repository.create_session(session_data)

    return status_error.OK, ReceiptNoRes(receiptNo=int(receipt_no), endWord=josa)


def set_figure(kidName: str, receiptNo: int, stage: str, figures: list):
    """Set figure selection for a stage"""
    receipt_no_str = str(receiptNo)

    # Get session from MongoDB
    session = session_repository.find_by_receipt_no(receipt_no_str)

    if not session:
        # Fallback to JSON file if not in MongoDB
        sanitized_name = sanitize_filename(kidName)
        data_json_path = os.path.join(CFG.THERAPY_RESULT_DIR, f"{receiptNo}_{sanitized_name}.json")
        session = read_json(data_json_path)

    if stage in ["3", "5", "6"]:
        family_list = [x["relation"] for x in session["figures"][stage]]
        for figure in figures:
            if figure["relation"] in family_list:
                idx = family_list.index(figure["relation"])
                session["figures"][stage][idx] = figure
            else:
                session["figures"][stage].append(figure)
    else:
        session["figures"][stage] = figures

    # Update MongoDB
    session_repository.update_figures(receipt_no_str, stage, session["figures"][stage])

    # Also update JSON for backward compatibility
    sanitized_name = sanitize_filename(kidName)
    data_json_path = os.path.join(CFG.THERAPY_RESULT_DIR, f"{receiptNo}_{sanitized_name}.json")
    make_json(data_json_path, session)

    score, message = chatbot.get_score(kidName, receiptNo)

    return status_error.OK, SetFigureRes(score=score)


def set_position(kidName: str, receiptNo: int, centerH: int, centerV: int, figures: list, canvas_image: str = None):
    """Set card positions"""
    receipt_no_str = str(receiptNo)

    # Get session from MongoDB
    session = session_repository.find_by_receipt_no(receipt_no_str)

    if not session:
        # Fallback to JSON file
        sanitized_name = sanitize_filename(kidName)
        data_json_path = os.path.join(CFG.THERAPY_RESULT_DIR, f"{receiptNo}_{sanitized_name}.json")
        session = read_json(data_json_path)

    positions_data = {
        "centerH": centerH,
        "centerV": centerV,
        "figures": figures
    }

    # Process card directions
    for i, card in enumerate(positions_data["figures"]):
        if card["figure"] in card_directions.keys():
            if card["direction"] == 0:
                positions_data["figures"][i]["direction"] = card_directions[card["figure"]]
            else:
                if card_directions[card["figure"]] == "right":
                    positions_data["figures"][i]["direction"] = "left"
                else:
                    positions_data["figures"][i]["direction"] = "right"
        else:
            positions_data["figures"][i]["direction"] = "left"

    session["positions"] = positions_data

    # Update MongoDB
    session_repository.update_positions(receipt_no_str, positions_data)

    # Save canvas image if provided
    if canvas_image:
        session_repository.update_canvas_image(receipt_no_str, canvas_image)
        session["canvasImage"] = canvas_image

    # Also update JSON for backward compatibility
    sanitized_name = sanitize_filename(kidName)
    data_json_path = os.path.join(CFG.THERAPY_RESULT_DIR, f"{receiptNo}_{sanitized_name}.json")
    make_json(data_json_path, session)

    score, message = chatbot.get_score(kidName, receiptNo)

    return status_error.OK, SetPostionRes(score=score, message=message)


def llm_completion(kidName: str, receiptNo: int, count: int, relation: str, message: str):
    """Handle LLM chat completion"""
    receipt_no_str = str(receiptNo)
    sanitized_name = sanitize_filename(kidName)
    data_json_path = os.path.join(CFG.THERAPY_RESULT_DIR, f"{receiptNo}_{sanitized_name}.json")

    # Get session from MongoDB
    session = session_repository.find_by_receipt_no(receipt_no_str)

    if not session:
        # Fallback to JSON file
        session = read_json(data_json_path)

    if relation not in session.get("llmCompletion", {}).keys():
        session.setdefault("llmCompletion", {})[relation] = {"bot": ["", ""], "user": ["", ""]}
        session.setdefault("abuser", {})[relation] = 0

        # Update MongoDB
        session_repository.update_llm_completion(receipt_no_str, relation, {"bot": ["", ""], "user": ["", ""]})
        session_repository.update_session(receipt_no_str, {f"abuser.{relation}": 0})

        # Update JSON
        make_json(data_json_path, session)

    if count > 0:
        user_messages = session["llmCompletion"][relation]["user"]
        while len(user_messages) < count:
            user_messages.append("")
        user_messages[count - 1] = message

        # Update MongoDB with user message
        session_repository.update_llm_completion(receipt_no_str, relation, session["llmCompletion"][relation])

        # Add to chat history
        chat_entry = {
            "role": "user",
            "relation": relation,
            "content": message,
            "timestamp": datetime.utcnow()
        }
        session_repository.update_chat_history(receipt_no_str, chat_entry)

        # Update JSON
        make_json(data_json_path, session)

    # Get LLM completion
    completion = chatbot.get_llm_completion(kidName, receiptNo, count, relation)

    # Add bot response to chat history
    bot_entry = {
        "role": "bot",
        "relation": relation,
        "content": completion,
        "timestamp": datetime.utcnow()
    }
    session_repository.update_chat_history(receipt_no_str, bot_entry)

    return status_error.OK, LLMCompletionRes(message=completion)


def get_Report(kidName: str, receiptNo: int):
    """Get the final report"""
    receipt_no_str = str(receiptNo)

    score, _ = chatbot.get_score(kidName, receiptNo)
    message, data_json = chatbot.get_report(kidName, receiptNo)

    # Update MongoDB with final report
    session_repository.update_report(receipt_no_str, message)
    session_repository.update_scoring(receipt_no_str, score, data_json.get("abuse", {}), data_json.get("abuser", {}))

    return status_error.OK, GetReportRes(score=score, message=message, result=data_json)
