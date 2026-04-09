"""Database models for the ShowShung Mafia application."""
from datetime import datetime, timezone
import bcrypt
from extensions import db
from services.state import online_users


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

    def to_dict(self):
        return {"id": self.id, "username": self.username, "email": self.email,
                "avatar": self.avatar_emoji, "bio": self.bio,
                "chaos_wins": self.chaos_wins, "chaos_losses": self.chaos_losses,
                "created_at": self.created_at.isoformat(), "total_games": len(self.games),
                "online": self.id in online_users, "xp": self.xp or 0}


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
        return {"id": self.id, "group": self.group_name, "count": self.total,
                "mafia": self.mafia, "citizen": self.citizen,
                "date": self.played_at.strftime("%Y-%m-%d %H:%M")}


class SiteStats(db.Model):
    __tablename__ = "site_stats"
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), unique=True, nullable=False)
    value = db.Column(db.Integer, default=0)


class GameEvent(db.Model):
    __tablename__ = "game_events"
    id = db.Column(db.Integer, primary_key=True)
    host_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    country = db.Column(db.String(50), nullable=False)
    city = db.Column(db.String(50), nullable=False)
    event_name = db.Column(db.String(100), default="")
    host_display_name = db.Column(db.String(50), default="")
    location_name = db.Column(db.String(150), nullable=False)
    address = db.Column(db.String(300), default="")
    lat = db.Column(db.Float, nullable=True)
    lng = db.Column(db.Float, nullable=True)
    price = db.Column(db.String(50), default="")
    scenario = db.Column(db.String(50), default="")
    player_count = db.Column(db.Integer, default=10)
    event_date = db.Column(db.String(20), default="")
    start_time = db.Column(db.String(10), default="")
    end_time = db.Column(db.String(10), default="")
    description = db.Column(db.String(500), default="")
    max_players = db.Column(db.Integer, default=10)
    status = db.Column(db.String(20), default="open")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    host = db.relationship("User", foreign_keys=[host_id])

    def to_dict(self):
        reservations = EventReservation.query.filter_by(event_id=self.id).all()
        return {
            "id": self.id, "host_id": self.host_id,
            "host_name": self.host.username if self.host else "?",
            "event_name": self.event_name or "",
            "host_display_name": self.host_display_name or "",
            "country": self.country, "city": self.city,
            "location_name": self.location_name,
            "address": self.address or "",
            "price": self.price or "",
            "lat": self.lat, "lng": self.lng,
            "scenario": self.scenario, "player_count": self.player_count,
            "event_date": self.event_date, "start_time": self.start_time,
            "end_time": self.end_time, "description": self.description,
            "max_players": self.max_players, "status": self.status,
            "reserved_count": len(reservations),
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M"),
            "reservations": [{"user_id": r.user_id, "username": r.user.username if r.user else "?",
                "status": r.status} for r in reservations]
        }


class EventReservation(db.Model):
    __tablename__ = "event_reservations"
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("game_events.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    status = db.Column(db.String(20), default="pending")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    user = db.relationship("User", foreign_keys=[user_id])
    event = db.relationship("GameEvent", foreign_keys=[event_id])


class EventComment(db.Model):
    __tablename__ = "event_comments"
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("game_events.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    content = db.Column(db.String(500), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    user = db.relationship("User", foreign_keys=[user_id])


class AdminLog(db.Model):
    __tablename__ = "admin_logs"
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, nullable=False)
    action = db.Column(db.String(200), nullable=False)
    target = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class SystemMessage(db.Model):
    __tablename__ = "system_messages"
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.String(500), nullable=False)
    target_user_id = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    read_by = db.Column(db.Text, default="")


class Friendship(db.Model):
    __tablename__ = "friendships"
    id = db.Column(db.Integer, primary_key=True)
    requester_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    addressee_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    status = db.Column(db.String(20), default="pending")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (db.UniqueConstraint('requester_id', 'addressee_id'),)
    requester = db.relationship("User", foreign_keys=[requester_id])
    addressee = db.relationship("User", foreign_keys=[addressee_id])


class ChaosRoom(db.Model):
    __tablename__ = "chaos_rooms"
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(6), unique=True, nullable=False)
    host_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    status = db.Column(db.String(20), default="waiting")
    phase = db.Column(db.String(20), default="lobby")
    phase_end_at = db.Column(db.DateTime, nullable=True)
    winner = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class ChaosPlayer(db.Model):
    __tablename__ = "chaos_players"
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey("chaos_rooms.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    role = db.Column(db.String(20), nullable=True)
    vote_target_id = db.Column(db.Integer, nullable=True)
    room = db.relationship("ChaosRoom", backref="players")
    user = db.relationship("User")


class DirectMessage(db.Model):
    __tablename__ = "direct_messages"
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    content = db.Column(db.String(1000), nullable=False)
    sent_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    seen = db.Column(db.Boolean, default=False)
    sender = db.relationship("User", foreign_keys=[sender_id])


class LabRoom(db.Model):
    __tablename__ = "lab_rooms"
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(6), unique=True, nullable=False)
    host_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    status = db.Column(db.String(20), default="waiting")
    scenario = db.Column(db.String(50), default="تکاور")
    phase = db.Column(db.String(30), default="lobby")
    current_turn = db.Column(db.Integer, default=0)
    turn_end_at = db.Column(db.DateTime, nullable=True)
    day_number = db.Column(db.Integer, default=0)
    eliminated_today = db.Column(db.Integer, nullable=True)
    defense_player_id = db.Column(db.Integer, nullable=True)
    night_kill_target = db.Column(db.Integer, nullable=True)
    doctor_save_target = db.Column(db.Integer, nullable=True)
    hunter_block_target = db.Column(db.Integer, nullable=True)
    detective_result = db.Column(db.String(50), nullable=True)
    doctor_self_save_used = db.Column(db.Boolean, default=False)
    bazpors_ability_used = db.Column(db.Boolean, default=False)
    bazpors_target1 = db.Column(db.Integer, nullable=True)
    bazpors_target2 = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    players = db.relationship("LabPlayer", backref="room", lazy=True, cascade="all, delete-orphan")


class LabPlayer(db.Model):
    __tablename__ = "lab_players"
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey("lab_rooms.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    is_bot = db.Column(db.Boolean, default=False)
    bot_name = db.Column(db.String(50), nullable=True)
    avatar = db.Column(db.String(10), default="🤖")
    slot = db.Column(db.Integer, nullable=False)
    role_name = db.Column(db.String(50), nullable=True)
    team = db.Column(db.String(20), nullable=True)
    is_alive = db.Column(db.Boolean, default=True)
    is_eliminated = db.Column(db.Boolean, default=False)


class LabMessage(db.Model):
    __tablename__ = "lab_messages"
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey("lab_rooms.id"), nullable=False)
    player_id = db.Column(db.Integer, db.ForeignKey("lab_players.id"), nullable=True)
    content = db.Column(db.Text, nullable=False)
    msg_type = db.Column(db.String(20), default="chat")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class BotMemory(db.Model):
    __tablename__ = "bot_memories"
    id = db.Column(db.Integer, primary_key=True)
    role_name = db.Column(db.String(50), nullable=False)
    team = db.Column(db.String(20), nullable=False)
    phase = db.Column(db.String(30), nullable=False)
    message = db.Column(db.Text, nullable=False)
    context = db.Column(db.Text, nullable=True)
    effectiveness = db.Column(db.Integer, default=0)
    times_used = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
