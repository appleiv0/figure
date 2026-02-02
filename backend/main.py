# coding=utf8
import os
import uvicorn
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException

import libcommon.config.config as config
from libcommon.middlewares.middleware import log_request_middleware
from libcommon.middlewares.exception_handlers import (
    request_validation_exception_handler,
    http_exception_handler,
    unhandled_exception_handler,
)

from app.routers.index import router as index_router

root_path = os.path.abspath(".")

logger = config.init_logger()
if config.PRODUCTION == "False":
    app = FastAPI(title=config.DOC_TITLE)
else:
    app = FastAPI(title=config.DOC_TITLE, docs_url=None, redoc_url=None)

# 허용할 오리진 설정 필요
ALLOWED_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:3001").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(index_router)

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

app.middleware("http")(log_request_middleware)
app.add_exception_handler(RequestValidationError, request_validation_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)
app.mount("/", StaticFiles(directory="./public"), name="static")


if __name__ == "__main__":
    # 일단 앱이 올라가면 한번만 호출됨, reload를 True로 설정해도 이곳은 다시 호출되지 않음

    # 로그 디렉토리 생성
    config.init_directories()

    host = config.HOST
    port = config.PORT
    reload = True
    if config.PRODUCTION == "True":
        reload = False
    logger.message(f"run {host}:{port}:{reload}")

    uvicorn.run("main:app", host=host, port=int(port), reload=reload)
