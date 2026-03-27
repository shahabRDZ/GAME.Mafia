import os
import bcrypt
from datetime import datetime, timedelta, timezone
from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
from flask_cors import CORS

app = Flask(__name__, static_folder=".")
CORS(app)

# ── Config ──────────────────────────────────────────────────────────────────
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL",
    "postgresql://mafia:mafia123@localhost:5432/mafiadb"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET", "super-secret-key-change-in-prod")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=30)

db = SQLAlchemy(app)
jwt = JWTManager(app)


# ── Models ───────────────────────────────────────────────────────────────────
class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.LargeBinary, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    games = db.relationship("Game", backref="user", lazy=True, cascade="all, delete-orphan")

    def set_password(self, password: str):
        self.password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

    def check_password(self, password: str) -> bool:
        return bcrypt.checkpw(password.encode(), self.password_hash)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "created_at": self.created_at.isoformat(),
            "total_games": len(self.games)
        }


class Game(db.Model):
    __tablename__ = "games"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    group_name = db.Column(db.String(100), nullable=False)
    total = db.Column(db.Integer, nullable=False)
    mafia = db.Column(db.Integer, nullable=False)
    citizen = db.Column(db.Integer, nullable=False)
    played_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "group": self.group_name,
            "count": self.total,
            "mafia": self.mafia,
            "citizen": self.citizen,
            "date": self.played_at.strftime("%Y-%m-%d %H:%M")
        }


# ── Routes: Static ────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory(".", "mafia.html")


# ── Routes: Auth ─────────────────────────────────────────────────────────────
@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json()
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not username or not email or not password:
        return jsonify({"error": "همه فیلدها الزامی هستند"}), 400
    if len(password) < 6:
        return jsonify({"error": "رمز عبور باید حداقل ۶ کاراکتر باشد"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "این نام کاربری قبلاً ثبت شده"}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "این ایمیل قبلاً ثبت شده"}), 409

    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    identifier = (data.get("identifier") or "").strip()
    password = data.get("password") or ""

    user = User.query.filter(
        (User.username == identifier) | (User.email == identifier.lower())
    ).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "نام کاربری یا رمز عبور اشتباه است"}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 200


@app.route("/api/auth/me", methods=["GET"])
@jwt_required()
def me():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "کاربر یافت نشد"}), 404
    return jsonify(user.to_dict()), 200


# ── Routes: Games ─────────────────────────────────────────────────────────────
@app.route("/api/games", methods=["GET"])
@jwt_required()
def get_games():
    user = db.session.get(User, int(get_jwt_identity()))
    games = Game.query.filter_by(user_id=user.id).order_by(Game.played_at.desc()).all()
    return jsonify([g.to_dict() for g in games]), 200


@app.route("/api/games", methods=["POST"])
@jwt_required()
def save_game():
    user = db.session.get(User, int(get_jwt_identity()))
    data = request.get_json()

    game = Game(
        user_id=user.id,
        group_name=data.get("group", "نامشخص"),
        total=data.get("count", 0),
        mafia=data.get("mafia", 0),
        citizen=data.get("citizen", 0),
    )
    db.session.add(game)
    db.session.commit()
    return jsonify(game.to_dict()), 201


@app.route("/api/games", methods=["DELETE"])
@jwt_required()
def clear_games():
    user = db.session.get(User, int(get_jwt_identity()))
    Game.query.filter_by(user_id=user.id).delete()
    db.session.commit()
    return jsonify({"message": "تاریخچه پاک شد"}), 200


# ── Bootstrap ─────────────────────────────────────────────────────────────────
with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
