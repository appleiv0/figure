import jwt
from datetime import datetime, timezone, timedelta

ALGORITHM = "HS256"


# exp_second 이 함수를 호출하는 시간 기준 이후 더할 초,
def encode_jwt(jwt_payload, secret="secret", exp_second: int = None):
    # jwt.encode({"exp": 1371720939}, "secret")
    # jwt.encode({"exp": datetime.now(tz=timezone.utc)}, "secret")
    if exp_second and exp_second > 0:
        exp_time = datetime.now(tz=timezone.utc) + timedelta(seconds=exp_second)
        exp_payload = {"exp": exp_time}
        jwt_payload.update(exp_payload)
    # print("jwt_payload", jwt_payload)

    return jwt.encode(jwt_payload, secret, algorithm=ALGORITHM)


# leeway 10으로 설정시, 설정한 시간보다 10초 안까지 초과해도 에러 발생하지 않음, 30초가 만료시간인데 연산이 30초보다 조금 더 걸릴수 있을때 적용
def decode_jwt(encoded_jwt, secret="secret", leeway=0):
    return jwt.decode(encoded_jwt, secret, leeway=leeway, algorithms=[ALGORITHM])


if __name__ == "__main__":
    import time

    print(type(jwt))
    exp = 5
    leeway = 0
    jwt_payload = jwt.encode(
        {"exp": datetime.now(tz=timezone.utc) + timedelta(seconds=exp)}, "secret"
    )

    # time.sleep(exp)

    # JWT payload is now expired
    # But with some leeway, it will still validate
    ret = jwt.decode(jwt_payload, "secret", leeway=leeway)
    print(ret)
