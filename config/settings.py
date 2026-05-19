import os
import secrets
from datetime import timedelta

_INSECURE_JWT  = "ShowShung-mafia-jwt-secret-2026-stable-key-do-not-change"
_INSECURE_DB   = "postgresql://mafia:mafia123@localhost:5432/mafiadb"


def _require_secret(env_var: str, fallback: str, name: str) -> str:
    value = os.environ.get(env_var, fallback)
    is_prod = os.environ.get("FLASK_ENV", "production") not in ("development", "testing")
    if is_prod and value == fallback:
        raise RuntimeError(
            f"[SECURITY] {name} is using the insecure default value. "
            f"Set the {env_var} environment variable before deploying."
        )
    return value


class Config:
    """Base configuration — secrets are required in production."""
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    SQLALCHEMY_DATABASE_URI = _require_secret(
        "DATABASE_URL", _INSECURE_DB, "Database URL"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Access token: short-lived; refresh token carries the long session
    JWT_SECRET_KEY = _require_secret(
        "JWT_SECRET", _INSECURE_JWT, "JWT secret key"
    )
    JWT_ACCESS_TOKEN_EXPIRES  = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_TOKEN_LOCATION        = ["headers", "cookies"]
    JWT_COOKIE_SECURE         = os.environ.get("FLASK_ENV", "production") == "production"
    JWT_COOKIE_SAMESITE       = "Lax"
    JWT_COOKIE_CSRF_PROTECT   = True

    ADMIN_USERNAMES = ["shahab", "admin"]
