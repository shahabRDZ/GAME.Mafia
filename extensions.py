"""Shared Flask extensions — initialized once, imported everywhere."""
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_migrate import Migrate

import os

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()

_origins = [
    os.environ.get("BASE_URL", "https://showshung.com"),
    "http://localhost:5000",
    "http://localhost:5001",
]
socketio = SocketIO(cors_allowed_origins=_origins, async_mode="threading")
