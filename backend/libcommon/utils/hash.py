import bcrypt


def make_hash(password: str, salt_round: int = 12):
    return bcrypt.hashpw(
        password.encode("utf-8"), bcrypt.gensalt(rounds=salt_round)
    ).decode(encoding="utf-8")


def check_hash(password: str, hashed_password: str):
    hashed_password = bytes(hashed_password, "utf-8")
    # hashed_password = hashed_password.encode("utf-8")
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password)
