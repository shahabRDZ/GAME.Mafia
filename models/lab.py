from datetime import datetime, timezone
from extensions import db


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
