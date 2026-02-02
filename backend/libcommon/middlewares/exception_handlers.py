import sys

from typing import Union

from fastapi import Request
from fastapi.exceptions import RequestValidationError, HTTPException
from fastapi.exception_handlers import http_exception_handler as _http_exception_handler
from fastapi.exception_handlers import (
    request_validation_exception_handler as _request_validation_exception_handler,
)
from fastapi.responses import JSONResponse
from fastapi.responses import PlainTextResponse
from fastapi.responses import Response

import traceback

import libcommon.config.config as config
import libcommon.config.status_error as status_error

logger = config.init_logger()


# 인자 잘못될때 호출
async def request_validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    This is a wrapper to the default RequestValidationException handler of FastAPI.
    This function will be called when client input is not valid.
    """
    body = await request.body()
    query_params = request.query_params._dict  # pylint: disable=protected-access
    detail = {
        "errors": exc.errors(),
        "body": body.decode(),
        "query_params": query_params,
    }
    logger.msg_error(f"RequestValidationError : {detail}")
    return await _request_validation_exception_handler(request, exc)


# http error
async def http_exception_handler(
    request: Request, exc: HTTPException
) -> Union[JSONResponse, Response]:
    """
    This is a wrapper to the default HTTPException handler of FastAPI.
    This function will be called when a HTTPException is explicitly raised.
    """
    logger.msg_error(f"HTTPException {exc.status_code} : {exc.detail}")

    return await _http_exception_handler(request, exc)


def error_log():
    try:
        traces = traceback.format_exc().splitlines()
        for trace in traces:
            logger.msg_error(f"{trace}")
    except Exception:
        pass


# 서버 코드 자체 에러, try catch로 잡히는 코드 에러
async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> PlainTextResponse:
    """
    This middleware will log all unhandled exceptions.
    Unhandled exceptions are all exceptions that are not HTTPExceptions or RequestValidationErrors.
    """
    host = getattr(getattr(request, "client", None), "host", None)
    port = getattr(getattr(request, "client", None), "port", None)
    url = (
        f"{request.url.path}?{request.query_params}"
        if request.query_params
        else request.url.path
    )

    exception_type, exception_value, exception_traceback = sys.exc_info()

    exception_name = getattr(exception_type, "__name__", None)
    logger.msg_error(
        f'UnhandledException : {host}:{port} - "{request.method} {url}" 500 Internal Server Error <{exception_name}: {exception_value}>',
    )
    error_log()

    raise HTTPException(
        status_code=status_error.INTERNAL_SERVER_ERROR,
        detail="internal server error" if config.PRODUCTION == "True" else str(exc),
    )
