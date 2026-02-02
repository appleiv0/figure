from fastapi import Response
from fastapi.responses import StreamingResponse
import libcommon.config.config as config
import libcommon.config.status_error as status_error
from libcommon.utils.StreamResponse import file_reader_stream

##### docs 관련
default_responses = {
    404: {"description": "Not found"},
    500: {
        "description": "fail",
        "content": {"plain/text": {"example": "internal server error"}},
    },
}


def make_doc_resp_json(description: str, json: dict):
    return {
        "description": description,
        "content": {"application/json": {"example": json}},
    }


def make_doc_resp_plaintext(description: str, text: str):
    return {
        "description": description,
        "content": {"text/plain": {"example": text}},
    }


def make_doc_resp_file_download(description: str):
    return {
        "description": description,
        "content": {"application/octet-stream": {"example": "file"}},
    }


##### docs 관련


##### 응답
# 반환할 내용이 있으면 반환하고, 아니면 그냥 응답 그대로 리턴
def response(response: Response, status: int, content=None, is_return_content_when_ok=True):
    """
    response: 응답
    status: 응답의 status
    content: 응답의 내용, 기본값은 None으로 반환할 내용이 있을때만 설정
    is_return_content_when_ok: True면 content가 존재하면 status가 200일때만 content 응답으로 반환, False면 content가 존재하면 content 응답으로 반환
    """
    response.status_code = status
    content_return = (status == status_error.OK) if is_return_content_when_ok else True
    if isinstance(content, list):
        # 파이썬은 empty list도 그냥 false로 처리
        if len(content) == 0 and content_return:
            return []
        else:
            return content if content and content_return else response
    else:
        return content if content and content_return else response


def stream_response(content):
    """
    content: 스트림할 제네레이터
    """
    # application/json으로 지정안하면 파일 다운로드가 되어버림
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Transfer-Encoding": "chunked",
    }
    return StreamingResponse(content=content, headers=headers)


def download_response(filename):
    """
    filename: 파일이름, 현재는 downloads 경로의 파일만을 읽을수 있음
    """
    filepath = f"{config.get_downloads_dir()}/{filename}"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    # 파일 다운로드 스트림으로 진행
    return StreamingResponse(file_reader_stream(filepath), headers=headers)


##### 응답
