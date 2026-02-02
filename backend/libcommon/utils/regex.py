import re

email_regex = re.compile(
    r"([A-Za-z0-9]+[.-_])*[A-Za-z0-9]+@[A-Za-z0-9-]+(\.[A-Z|a-z]{2,})+"
)

# 최소 한개의 소문자 + 최소 한개의 대문자 + 최소 한개의 숫자 + 최소 한개의 특수 문자+ 최소 8자
password_regex = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
)


def is_valid_email(email):
    if re.fullmatch(email_regex, email):
        return True
    return False


def is_valid_password(password):
    if re.fullmatch(password_regex, password):
        return True
    return False
