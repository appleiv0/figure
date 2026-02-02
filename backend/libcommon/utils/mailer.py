import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import libcommon.config.config as config


def send_gmail(
    receiver_email,
    subject,
    text,
    html,
    sender_email=config.GMAIL_SENDER_EMAIL,
    app_password=config.GMAIL_APP_PASSWORD,
):
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = sender_email
    message["To"] = receiver_email

    part1 = MIMEText(text, "plain")
    part2 = MIMEText(html, "html")

    message.attach(part1)
    message.attach(part2)

    # 에러 발생안하는듯, 이건 메일을 다시 보내는걸로 해결될듯
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(sender_email, app_password)
        server.sendmail(sender_email, receiver_email, message.as_string())


def test_send_gmail():
    sender_email = "john@m47rix.com"
    receiver_email = "dakenesnes@gmail.com"
    # receiver_email = "test@exam.com"
    app_password = "bgjn dpml puor adjf"

    subject = "This is a lucky email from Python"
    text = "Hi!\nHow are you?\nHere is the link you wanted:\nhttp://www.python.org"
    html = """\
    <html>
    <head></head>
    <body>
        <p>Hi!<br>
        How are you?<br>
        Here is the <a href="http://www.python.org">link</a> you wanted.
        </p>
    </body>
    </html>
    """

    # html = f"<html><body><a>{text}</a></body></html>"

    print("try send email")
    send_gmail(sender_email, receiver_email, app_password, subject, text, html)
    print("end send email")


if __name__ == "__main__":
    test_send_gmail()
