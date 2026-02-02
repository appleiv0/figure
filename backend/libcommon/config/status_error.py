from fastapi import status


# fastapi의 uvicorn은 100이상, 600이하의 status code만을 반환할수 있음
# 일관성 있게 반환하기 위해 여기에 지정한 상태만 반환

OK = status.HTTP_200_OK
CREATED = status.HTTP_201_CREATED
BAD_REQUEST = status.HTTP_400_BAD_REQUEST  # 잘못된 요청, 로그인하는데 비밀번호 틀렸다던지 하는 상황
UNAUTHORIZED = status.HTTP_401_UNAUTHORIZED  # 이메일 인증이 안된 경우, 권한이 없는 접근 시도시
FORBIDDEN = status.HTTP_403_FORBIDDEN  # 토큰이 잘못된 경우
CONFLICT = (
    status.HTTP_409_CONFLICT
)  # 데이터베이스와 불일치, 접속 토큰은 데이터베이스에 유저 정보를 생성한 이후인데, 토큰의 정보가 데이터베이스와 불일치
INTERNAL_SERVER_ERROR = status.HTTP_500_INTERNAL_SERVER_ERROR
# custom status error
TOKEN_NOT_EXIST = FORBIDDEN  # 토큰이 없음, 금지된 접근방식
ACCESS_TOKEN_INVALID = FORBIDDEN  # 토큰이 잘못되어있음, 금지된 접근방식
ACCESS_TOKEN_BLACKLIST = FORBIDDEN  # 토큰이 블랙리스트 처리됨, 금지된 접근방식
REFRESH_TOKEN_INVALID = FORBIDDEN  # 토큰이 잘못되어있음, 금지된 접근방식
ACCESS_TOKEN_EMAIL_UNAUTHENTICATE = UNAUTHORIZED  # 이메일 인증이 되지 않아 권한 부여가 안됨
