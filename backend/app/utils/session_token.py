import hmac
import hashlib
import app.config.app_config as CFG


def generate_session_token(receipt_no: str) -> str:
    """Generate an HMAC-SHA256 token for a receipt number."""
    return hmac.new(
        CFG.SESSION_SECRET.encode(),
        receipt_no.encode(),
        hashlib.sha256
    ).hexdigest()


def verify_session_token(receipt_no: str, token: str) -> bool:
    """Verify that a session token matches the receipt number."""
    expected = generate_session_token(receipt_no)
    return hmac.compare_digest(expected, token)
