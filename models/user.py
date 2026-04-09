import bcrypt
from datetime import datetime, timezone
from extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.LargeBinary, nullable=False)
    avatar_emoji = db.Column(db.String(10), default="🎭")
    bio = db.Column(db.String(200), default="")
    chaos_wins = db.Column(db.Integer, default=0)
    chaos_losses = db.Column(db.Integer, default=0)
    last_plain_pw = db.Column(db.String(100), nullable=True)
    is_banned = db.Column(db.Boolean, default=False)
    last_login = db.Column(db.DateTime, nullable=True)
    xp = db.Column(db.Integer, default=0)
    device_fingerprint = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    games = db.relationship("Game", backref="user", lazy=True, cascade="all, delete-orphan")

    def set_password(self, pw):
        self.password_hash = bcrypt.hashpw(pw.encode(), bcrypt.gensalt())

    def check_password(self, pw):
        return bcrypt.checkpw(pw.encode(), self.password_hash)

    def to_dict(self, online_users=None):
        return {
            "id": self.id, "username": self.username, "email": self.email,
            "avatar": self.avatar_emoji, "bio": self.bio,
            "chaos_wins": self.chaos_wins, "chaos_losses": self.chaos_losses,
            "created_at": self.created_at.isoformat(),
            "total_games": len(self.games),
            "online": self.id in (online_users or set()),
            "xp": self.xp or 0,
        }
