import os

THERAPY_RESULT_DIR = os.environ["THERAPY_RESULT_DIR"]
THERAPY_RESULT_TEMPLATE_PATH = os.path.join(THERAPY_RESULT_DIR, "0_template.json")
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
SESSION_SECRET = os.environ.get("SESSION_SECRET")
if not SESSION_SECRET or SESSION_SECRET == "change-this-session-secret-in-production":
    raise RuntimeError(
        "SESSION_SECRET environment variable must be set to a strong random value. "
        "Generate with: python3 -c \"import secrets; print(secrets.token_hex(32))\". "
        "This value must remain stable across deployments to keep in-progress session "
        "tokens valid."
    )
