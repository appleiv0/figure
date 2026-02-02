import secrets


# 서버에서 직접 사용하지 않고, jwt secret key 생성할때 사용, 서버마다 secret key 달라야 함
def generate_secret_key(length: int = 128):
    return secrets.token_urlsafe(length)


if __name__ == "__main__":
    print(generate_secret_key())
