from fastapi import APIRouter
from fastapi import Response
from fastapi.responses import PlainTextResponse, JSONResponse

import libcommon.config.status_error as status_error
import libcommon.config.config as config
from libcommon.routes import (
    default_responses,
    response,
    make_doc_resp_plaintext,
    make_doc_resp_json,
)

from app.models.request_figure import (
    ReceiptNoReq,
    SetFigureReq,
    SetPostionReq,
    LLMCompletionReq,
    GetReportReq,
)
from app.models.response_figure import (
    ReceiptNoRes,
    SetFigureRes,
    SetPostionRes,
    LLMCompletionRes,
    GetReportRes,
)

import app.controllers.controller_figure as controller_figure
from app.routers.admin import router as admin_router


logger = config.init_logger()


router = APIRouter(
    prefix="",
    responses=default_responses,
)

TAGS = ["IndexRouter"]

# Include admin router
router.include_router(admin_router)


@router.get(
    "/",
    tags=TAGS,
    description="기본 url, aws 모니터링 같은 서비스에서 서버 기본 url에 생존 체크를 위한 요청을 보낼수 있음, 그럴때 상태코드 200 반환해야함",
    responses={
        200: {"description": "success"},
    },
    response_class=Response,
)
def home(res: Response):
    return response(res, status_error.OK)


@router.get(
    "/robots.txt",
    tags=TAGS,
    description="크롤링 봇 대처, 전부 허용 안함",
    responses={
        200: make_doc_resp_plaintext(description="success", text="User-agent: *\nDisallow: /")
    },
    response_class=PlainTextResponse,
)
def robots_txt(res: PlainTextResponse):
    content = "User-agent: *\nDisallow: /"
    return response(res, status_error.OK, content)


@router.post(
    "/createReceiptNo",
    tags=TAGS,
    description="사용자 관리번호 생성 및 관리번호 반환",
    responses={
        200: make_doc_resp_json(
            "success",
            {
                "receiptNo": 1,
                "endWord": {
                    "eun": "은/는",
                    "li": "이/가",
                    "eul": "을/를",
                    "kwa": "과/와",
                    "ra": "라/이라",
                    "rang": "랑/이랑",
                    "ka": "가/이가",
                    "yeout": "였/이었",
                },
            },
        ),
    },
    response_class=JSONResponse,
    response_model=ReceiptNoRes,
)
def create_receipt_number(res: JSONResponse, req: ReceiptNoReq):
    status_error, ret = controller_figure.create_receipt_number(req.counselor, req.kid, req.agree)
    return response(res, status_error, ret)


@router.post(
    "/setFigure",
    tags=TAGS,
    description="""선택한 카드의 관계와 선택한 이유 저장
- stage field
    - "1":
        - Select from 1 to 4 maximum.
        - relation = "나".
        - message = 4개 모두 동일
    - "2":
        - Select from 1 to 4 maximum.
        - relation = "나"
        - message = 4개 모두 동일
    - "3": Select one per member.
        - relation ⊂ {"나", "아빠", "엄마", "누나", "형", "남동생", "누나", "여동생", "삼촌", "이모", "고모"}
        - message = 구성원 각각 존재
    - "5":
        - Select one per member.
        - relation ⊂ {"나", "아빠", "엄마", "누나", "형", "남동생", "누나", "여동생", "삼촌", "이모", "고모"}
        - message = 구성원 각각 존재
    - "6":
        - Select one per member, except "me".
        - relation ⊂ {"아빠", "엄마", "누나", "형", "남동생", "누나", "여동생", "삼촌", "이모", "고모"}
        - message = 구성원 각각 존재
    """,
    responses={
        200: make_doc_resp_json("success", {"score": 1}),
    },
    response_class=JSONResponse,
    response_model=SetFigureRes,
)
def set_figure(res: JSONResponse, req: SetFigureReq):
    status_error, ret = controller_figure.set_figure(
        req.kidName, req.receiptNo, req.stage, req.figures
    )
    return response(res, status_error, ret)


@router.post(
    "/setPosition",
    tags=TAGS,
    description="""선택한 카드의 위치 저장
- position [pixel] : card positions
    - p1: left top [x, y]
    - p2: right bottom [x, y]
- direction" : default = 0, flipped = 1
    """,
    responses={
        200: make_doc_resp_json("success", {"score": 1, "message": "상어랑 돼지가 친하구나."})
    },
    response_class=JSONResponse,
    response_model=SetPostionRes,
)
def set_position(res: JSONResponse, req: SetPostionReq):
    status_error, ret = controller_figure.set_position(
        req.kidName, req.receiptNo, req.centerH, req.centerV, req.figures, req.canvasImage
    )
    return response(res, status_error, ret)


@router.post(
    "/llmCompletion",
    tags=TAGS,
    description="""사용자 정보를 바탕으로 챗봇 메시지 반환
- count: 챗봇 메시지 호출 count
    """,
    responses={200: make_doc_resp_json("success", {"message": "아빠는 언제 같이 놀아주나요?"})},
    response_class=JSONResponse,
    response_model=LLMCompletionRes,
)
def llm_completion(res: JSONResponse, req: LLMCompletionReq):
    status_error, ret = controller_figure.llm_completion(
        req.kidName, req.receiptNo, req.count, req.relation, req.message
    )
    return response(res, status_error, ret)


@router.post(
    "/getReport",
    tags=TAGS,
    description="결과 페이지 정보 반환",
    responses={
        200: make_doc_resp_json(
            "success", {"message": "학대 가능성이 있습니다.|학대 가능성이 없습니다.", "score": 1}
        )
    },
    response_class=JSONResponse,
    response_model=GetReportRes,
)
def get_Report(res: JSONResponse, req: GetReportReq):
    status_error, ret = controller_figure.get_Report(req.kidName, req.receiptNo)
    return response(res, status_error, ret)
