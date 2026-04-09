import os
from datetime import timedelta


class Config:
    """Base configuration."""
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "postgresql://mafia:mafia123@localhost:5432/mafiadb"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get(
        "JWT_SECRET",
        "ShowShung-mafia-jwt-secret-2026-stable-key-do-not-change"
    )
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=30)
    ADMIN_USERNAMES = ["shahab", "admin"]
