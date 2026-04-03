import os
import secrets
import bcrypt
from datetime import datetime, timedelta, timezone
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity, decode_token
)
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=BASE_DIR, static_url_path="")
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
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# ── In-memory state for WebSocket ────────────────────────────────────────────
sid_to_user = {}        # sid -> {user_id, username}
user_to_sid = {}        # user_id -> sid
online_users = set()    # set of user_ids


# ══════════════════════════════════════════════════════════════════════════════
# MODELS
# ══════════════════════════════════════════════════════════════════════════════

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
                "online": self.id in online_users}


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
    status = db.Column(db.String(20), default="waiting")  # waiting, playing, finished
    scenario = db.Column(db.String(50), default="تکاور")  # scenario name
    phase = db.Column(db.String(30), default="lobby")  # lobby, intro, day_talk, voting, night, result
    current_turn = db.Column(db.Integer, default=0)  # which player slot has the turn (1-10)
    turn_end_at = db.Column(db.DateTime, nullable=True)
    day_number = db.Column(db.Integer, default=0)
    eliminated_today = db.Column(db.Integer, nullable=True)  # player id eliminated in voting
    defense_player_id = db.Column(db.Integer, nullable=True)  # player in defense
    night_kill_target = db.Column(db.Integer, nullable=True)  # mafia's kill target
    doctor_save_target = db.Column(db.Integer, nullable=True)  # doctor's save target
    hunter_block_target = db.Column(db.Integer, nullable=True)  # hunter's block target
    detective_result = db.Column(db.String(50), nullable=True)  # detective inquiry result
    doctor_self_save_used = db.Column(db.Boolean, default=False)  # doctor can save self once
    bazpors_ability_used = db.Column(db.Boolean, default=False)  # bazpors can use ability once per game
    bazpors_target1 = db.Column(db.Integer, nullable=True)  # first bazpors target player id
    bazpors_target2 = db.Column(db.Integer, nullable=True)  # second bazpors target player id
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    players = db.relationship("LabPlayer", backref="room", lazy=True, cascade="all, delete-orphan")

class LabPlayer(db.Model):
    __tablename__ = "lab_players"
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey("lab_rooms.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)  # null for bots
    is_bot = db.Column(db.Boolean, default=False)
    bot_name = db.Column(db.String(50), nullable=True)
    avatar = db.Column(db.String(10), default="🤖")
    slot = db.Column(db.Integer, nullable=False)  # 1-10
    role_name = db.Column(db.String(50), nullable=True)  # e.g. "رئیس مافیا", "بازپرس"
    team = db.Column(db.String(20), nullable=True)  # "mafia" or "citizen"
    is_alive = db.Column(db.Boolean, default=True)
    is_eliminated = db.Column(db.Boolean, default=False)


class LabMessage(db.Model):
    __tablename__ = "lab_messages"
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey("lab_rooms.id"), nullable=False)
    player_id = db.Column(db.Integer, db.ForeignKey("lab_players.id"), nullable=True)
    content = db.Column(db.Text, nullable=False)
    msg_type = db.Column(db.String(20), default="chat")  # chat, system, reaction
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class BotMemory(db.Model):
    __tablename__ = "bot_memories"
    id = db.Column(db.Integer, primary_key=True)
    role_name = db.Column(db.String(50), nullable=False)  # which role was being played
    team = db.Column(db.String(20), nullable=False)  # mafia or citizen
    phase = db.Column(db.String(30), nullable=False)  # day_talk, voting, etc.
    message = db.Column(db.Text, nullable=False)  # what a real player said
    context = db.Column(db.Text, nullable=True)  # previous messages context
    effectiveness = db.Column(db.Integer, default=0)  # likes - dislikes score
    times_used = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


# ══════════════════════════════════════════════════════════════════════════════
# STATIC ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/")
def index():
    return app.send_static_file("mafia.html")

@app.route("/panel")
def admin_panel():
    return app.send_static_file("admin.html")


# ── Visit Counter ────────────────────────────────────────────────────────────
@app.route("/api/visit", methods=["POST"])
def track_visit():
    stat = SiteStats.query.filter_by(key="visits").first()
    if not stat:
        stat = SiteStats(key="visits", value=0)
        db.session.add(stat)
    stat.value += 1
    db.session.commit()
    return jsonify({"visits": stat.value}), 200

@app.route("/api/version", methods=["GET"])
def get_version():
    return jsonify({"v": "2.0"}), 200

@app.route("/api/visit", methods=["GET"])
def get_visits():
    stat = SiteStats.query.filter_by(key="visits").first()
    return jsonify({"visits": stat.value if stat else 0}), 200


# ══════════════════════════════════════════════════════════════════════════════
# AUTH ROUTES
# ══════════════════════════════════════════════════════════════════════════════

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
    user = User(username=username, email=email, last_plain_pw=password)
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


# ══════════════════════════════════════════════════════════════════════════════
# PROFILE & SEARCH ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/profile/<int:user_id>", methods=["GET"])
def get_profile(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "کاربر یافت نشد"}), 404
    return jsonify(user.to_dict()), 200

@app.route("/api/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    user = db.session.get(User, int(get_jwt_identity()))
    data = request.get_json()
    if "avatar" in data:
        user.avatar_emoji = data["avatar"][:10]
    if "bio" in data:
        user.bio = data["bio"][:200]
    db.session.commit()
    return jsonify(user.to_dict()), 200

@app.route("/api/users/search", methods=["GET"])
@jwt_required()
def search_users():
    q = request.args.get("q", "").strip()
    if len(q) < 2:
        return jsonify([]), 200
    users = User.query.filter(User.username.ilike(f"%{q}%")).limit(20).all()
    me_id = int(get_jwt_identity())
    return jsonify([u.to_dict() for u in users if u.id != me_id]), 200


# ══════════════════════════════════════════════════════════════════════════════
# FRIEND ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/friends/request", methods=["POST"])
@jwt_required()
def send_friend_request():
    me_id = int(get_jwt_identity())
    target_id = request.get_json().get("user_id")
    if me_id == target_id:
        return jsonify({"error": "نمی‌توانید به خودتان درخواست بدهید"}), 400
    existing = Friendship.query.filter(
        ((Friendship.requester_id == me_id) & (Friendship.addressee_id == target_id)) |
        ((Friendship.requester_id == target_id) & (Friendship.addressee_id == me_id))
    ).first()
    if existing:
        return jsonify({"error": "درخواست قبلاً ارسال شده"}), 409
    f = Friendship(requester_id=me_id, addressee_id=target_id)
    db.session.add(f)
    db.session.commit()
    # Notify target via WebSocket
    target_sid = user_to_sid.get(target_id)
    if target_sid:
        user = db.session.get(User, me_id)
        emit("friend_request", {"from": user.to_dict(), "friendship_id": f.id}, to=target_sid, namespace="/")
    return jsonify({"id": f.id, "status": "pending"}), 201

@app.route("/api/friends/<int:fid>/accept", methods=["PUT"])
@jwt_required()
def accept_friend(fid):
    f = db.session.get(Friendship, fid)
    if not f or f.addressee_id != int(get_jwt_identity()):
        return jsonify({"error": "درخواست یافت نشد"}), 404
    f.status = "accepted"
    db.session.commit()
    return jsonify({"status": "accepted"}), 200

@app.route("/api/friends/<int:fid>/reject", methods=["PUT"])
@jwt_required()
def reject_friend(fid):
    f = db.session.get(Friendship, fid)
    if not f or f.addressee_id != int(get_jwt_identity()):
        return jsonify({"error": "درخواست یافت نشد"}), 404
    db.session.delete(f)
    db.session.commit()
    return jsonify({"status": "rejected"}), 200

@app.route("/api/friends", methods=["GET"])
@jwt_required()
def get_friends():
    me_id = int(get_jwt_identity())
    friends = Friendship.query.filter(
        ((Friendship.requester_id == me_id) | (Friendship.addressee_id == me_id)),
        Friendship.status == "accepted"
    ).all()
    result = []
    for f in friends:
        other_id = f.addressee_id if f.requester_id == me_id else f.requester_id
        user = db.session.get(User, other_id)
        if user:
            d = user.to_dict()
            d["friendship_id"] = f.id
            result.append(d)
    return jsonify(result), 200

@app.route("/api/friends/requests", methods=["GET"])
@jwt_required()
def get_friend_requests():
    me_id = int(get_jwt_identity())
    reqs = Friendship.query.filter_by(addressee_id=me_id, status="pending").all()
    result = []
    for f in reqs:
        user = db.session.get(User, f.requester_id)
        if user:
            d = user.to_dict()
            d["friendship_id"] = f.id
            result.append(d)
    return jsonify(result), 200

@app.route("/api/friends/<int:fid>", methods=["DELETE"])
@jwt_required()
def remove_friend(fid):
    me_id = int(get_jwt_identity())
    f = db.session.get(Friendship, fid)
    if not f or (f.requester_id != me_id and f.addressee_id != me_id):
        return jsonify({"error": "یافت نشد"}), 404
    db.session.delete(f)
    db.session.commit()
    return jsonify({"status": "removed"}), 200


# ══════════════════════════════════════════════════════════════════════════════
# DIRECT MESSAGE ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/dm/conversations", methods=["GET"])
@jwt_required()
def get_conversations():
    me_id = int(get_jwt_identity())
    msgs = DirectMessage.query.filter(
        (DirectMessage.sender_id == me_id) | (DirectMessage.receiver_id == me_id)
    ).order_by(DirectMessage.sent_at.desc()).all()
    convos = {}
    for m in msgs:
        other_id = m.receiver_id if m.sender_id == me_id else m.sender_id
        if other_id not in convos:
            other = db.session.get(User, other_id)
            if other:
                unseen = DirectMessage.query.filter_by(sender_id=other_id, receiver_id=me_id, seen=False).count()
                convos[other_id] = {
                    "user_id": other_id, "username": other.username,
                    "avatar": other.avatar_emoji, "online": other_id in online_users,
                    "last_message": m.content[:50], "last_time": m.sent_at.strftime("%H:%M"),
                    "unseen": unseen
                }
    return jsonify(list(convos.values())), 200

@app.route("/api/dm/<int:other_id>", methods=["GET"])
@jwt_required()
def get_dm_messages(other_id):
    me_id = int(get_jwt_identity())
    msgs = DirectMessage.query.filter(
        ((DirectMessage.sender_id == me_id) & (DirectMessage.receiver_id == other_id)) |
        ((DirectMessage.sender_id == other_id) & (DirectMessage.receiver_id == me_id))
    ).order_by(DirectMessage.sent_at.asc()).limit(100).all()
    # Mark as seen
    DirectMessage.query.filter_by(sender_id=other_id, receiver_id=me_id, seen=False).update({"seen": True})
    db.session.commit()
    return jsonify([{
        "id": m.id, "sender_id": m.sender_id, "content": m.content,
        "time": m.sent_at.strftime("%H:%M"), "is_me": m.sender_id == me_id
    } for m in msgs]), 200

@app.route("/api/dm/<int:other_id>", methods=["POST"])
@jwt_required()
def send_dm(other_id):
    me_id = int(get_jwt_identity())
    content = (request.get_json().get("content") or "").strip()[:1000]
    if not content:
        return jsonify({"error": "پیام خالی"}), 400
    msg = DirectMessage(sender_id=me_id, receiver_id=other_id, content=content)
    db.session.add(msg)
    db.session.commit()
    sender = db.session.get(User, me_id)
    # Real-time delivery via WebSocket
    target_sid = user_to_sid.get(other_id)
    if target_sid:
        socketio.emit("dm_received", {
            "from_user_id": me_id, "from_username": sender.username,
            "from_avatar": sender.avatar_emoji, "content": content,
            "time": msg.sent_at.strftime("%H:%M")
        }, to=target_sid)
    return jsonify({"id": msg.id, "time": msg.sent_at.strftime("%H:%M")}), 201


# ══════════════════════════════════════════════════════════════════════════════
# CHAOS ROOM REST ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/chaos/create", methods=["POST"])
@jwt_required()
def create_chaos_room():
    me_id = int(get_jwt_identity())
    code = secrets.token_hex(3).upper()[:6]
    while ChaosRoom.query.filter_by(code=code, status="waiting").first():
        code = secrets.token_hex(3).upper()[:6]
    room = ChaosRoom(code=code, host_id=me_id)
    db.session.add(room)
    db.session.commit()
    return jsonify({"code": code, "room_id": room.id}), 201

@app.route("/api/chaos/room/<code>", methods=["GET"])
@jwt_required()
def get_chaos_room(code):
    room = ChaosRoom.query.filter_by(code=code.upper()).first()
    if not room:
        return jsonify({"error": "اتاق یافت نشد"}), 404
    players = [{"user_id": p.user_id, "username": p.user.username,
                "avatar": p.user.avatar_emoji, "role": p.role if room.phase == "result" else None}
               for p in room.players]
    return jsonify({"code": room.code, "status": room.status, "phase": room.phase,
                    "host_id": room.host_id, "players": players, "winner": room.winner,
                    "phase_end_at": room.phase_end_at.isoformat() if room.phase_end_at else None}), 200


# ══════════════════════════════════════════════════════════════════════════════
# LAB MODE REST ROUTES
# ══════════════════════════════════════════════════════════════════════════════

BOT_NAMES = ["آرش", "سارا", "مهدی", "نازنین", "امیر", "لیلا", "رضا", "مریم", "حسین"]
BOT_AVATARS = ["🤖", "👾", "🎮", "🕹️", "💀", "👻", "🦊", "🐺", "🦇"]

LAB_ROLES = {
    "بازپرس": {
        "mafia": ["رئیس مافیا", "ناتو", "شیاد"],
        "citizen": ["بازپرس", "کارآگاه", "هانتر", "دکتر", "رویین‌تن", "شهروند ساده", "شهروند ساده"]
    }
}

ROLE_ICONS = {
    "رئیس مافیا": "👑", "ناتو": "🔫", "شیاد": "🃏", "مافیا ساده": "😈",
    "شهروند ساده": "😇", "بازپرس": "🔍", "کارآگاه": "🕵️", "هانتر": "🏹",
    "دکتر": "⚕️", "رویین‌تن": "🛡️", "تک‌تیرانداز": "🎯"
}

@app.route("/api/lab/create", methods=["POST"])
@jwt_required()
def create_lab_room():
    try:
        uid = int(get_jwt_identity())
        # Clean up old waiting rooms by this user
        try:
            LabRoom.query.filter_by(host_id=uid, status="waiting").delete()
            db.session.commit()
        except Exception:
            db.session.rollback()

        code = secrets.token_hex(3).upper()[:6]
        while LabRoom.query.filter_by(code=code).first():
            code = secrets.token_hex(3).upper()[:6]

        data = request.get_json() or {}
        scenario = data.get("scenario", "تکاور")

        room = LabRoom(code=code, host_id=uid, scenario=scenario)
        db.session.add(room)
        db.session.flush()

        # Add host as first player
        user = User.query.get(uid)
        host_player = LabPlayer(room_id=room.id, user_id=uid, is_bot=False, slot=1, avatar=user.avatar_emoji)
        db.session.add(host_player)
        db.session.commit()

        return jsonify({"code": code, "room_id": room.id, "scenario": scenario})
    except Exception as e:
        db.session.rollback()
        print(f"[LAB ERROR] create_lab_room: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"خطای سرور: {str(e)}"}), 500

@app.route("/api/lab/room/<code>")
@jwt_required()
def get_lab_room(code):
    room = LabRoom.query.filter_by(code=code.upper()).first()
    if not room:
        return jsonify({"error": "اتاق پیدا نشد"}), 404

    players = []
    for p in sorted(room.players, key=lambda x: x.slot):
        if p.is_bot:
            players.append({
                "slot": p.slot, "is_bot": True, "bot_name": p.bot_name,
                "avatar": p.avatar, "id": p.id
            })
        else:
            u = User.query.get(p.user_id)
            players.append({
                "slot": p.slot, "is_bot": False, "user_id": p.user_id,
                "username": u.username if u else "?", "avatar": u.avatar_emoji if u else "🎭",
                "id": p.id
            })

    return jsonify({
        "code": room.code, "status": room.status, "scenario": room.scenario,
        "host_id": room.host_id, "players": players,
        "player_count": len(players), "max_players": 10
    })


# ── Lab REST: Add Bot & Remove Player ─────────────────────────────────────────

@app.route("/api/lab/room/<code>/add-bot", methods=["POST"])
@jwt_required()
def api_add_bot(code):
    uid = int(get_jwt_identity())
    room = LabRoom.query.filter_by(code=code.upper()).first()
    if not room:
        return jsonify({"error": "اتاق پیدا نشد"}), 404
    if room.host_id != uid:
        return jsonify({"error": "فقط میزبان می‌تواند بات اضافه کند"}), 403
    if len(room.players) >= 10:
        return jsonify({"error": "اتاق پر است"}), 400

    taken = {p.slot for p in room.players}
    slot = next(s for s in range(1, 11) if s not in taken)

    used_names = {p.bot_name for p in room.players if p.is_bot}
    available_names = [n for n in BOT_NAMES if n not in used_names]
    bot_name = available_names[0] if available_names else f"بات {slot}"

    bot_idx = len([p for p in room.players if p.is_bot])
    avatar = BOT_AVATARS[bot_idx % len(BOT_AVATARS)]

    bot = LabPlayer(room_id=room.id, is_bot=True, bot_name=bot_name, avatar=avatar, slot=slot)
    db.session.add(bot)
    db.session.commit()

    # Notify via socket if available
    try:
        room_data = get_lab_room_data(room)
        socketio.emit("lab_update", room_data, room=f"lab_{code.upper()}")
    except Exception:
        pass

    return get_lab_room(code)


@app.route("/api/lab/room/<code>/remove-player/<int:player_id>", methods=["DELETE"])
@jwt_required()
def api_remove_player(code, player_id):
    uid = int(get_jwt_identity())
    room = LabRoom.query.filter_by(code=code.upper()).first()
    if not room:
        return jsonify({"error": "اتاق پیدا نشد"}), 404
    if room.host_id != uid:
        return jsonify({"error": "فقط میزبان می‌تواند حذف کند"}), 403

    player = LabPlayer.query.get(player_id)
    if player and player.room_id == room.id and player.user_id != uid:
        db.session.delete(player)
        db.session.commit()

    try:
        room_data = get_lab_room_data(room)
        socketio.emit("lab_update", room_data, room=f"lab_{code.upper()}")
    except Exception:
        pass

    return get_lab_room(code)


# ══════════════════════════════════════════════════════════════════════════════
# GAME HISTORY ROUTES
# ══════════════════════════════════════════════════════════════════════════════

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
    game = Game(user_id=user.id, group_name=data.get("group", "نامشخص"),
                total=data.get("count", 0), mafia=data.get("mafia", 0), citizen=data.get("citizen", 0))
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


# ══════════════════════════════════════════════════════════════════════════════
# WEBSOCKET EVENTS
# ══════════════════════════════════════════════════════════════════════════════

def get_user_from_token(token_str):
    try:
        data = decode_token(token_str)
        return db.session.get(User, int(data["sub"]))
    except Exception:
        return None


@socketio.on("connect")
def handle_connect():
    token = request.args.get("token")
    user = get_user_from_token(token) if token else None
    if not user:
        return False  # reject connection
    sid_to_user[request.sid] = {"user_id": user.id, "username": user.username}
    user_to_sid[user.id] = request.sid
    online_users.add(user.id)


@socketio.on("disconnect")
def handle_disconnect():
    info = sid_to_user.pop(request.sid, None)
    if info:
        uid = info["user_id"]
        user_to_sid.pop(uid, None)
        online_users.discard(uid)
        # Leave any chaos room
        with app.app_context():
            player = ChaosPlayer.query.filter_by(user_id=uid).join(ChaosRoom).filter(
                ChaosRoom.status.in_(["waiting"])
            ).first()
            if player:
                room = player.room
                db.session.delete(player)
                db.session.commit()
                emit_room_update(room.code)


@socketio.on("join_chaos")
def handle_join_chaos(data):
    code = (data.get("code") or "").upper()
    info = sid_to_user.get(request.sid)
    if not info:
        emit("error", {"msg": "لطفاً وارد شوید"}); return
    room = ChaosRoom.query.filter_by(code=code, status="waiting").first()
    if not room:
        emit("error", {"msg": "اتاق یافت نشد"}); return
    if len(room.players) >= 3:
        emit("error", {"msg": "اتاق پر است"}); return
    if any(p.user_id == info["user_id"] for p in room.players):
        join_room(code)
        emit_room_update(code)
        return
    player = ChaosPlayer(room_id=room.id, user_id=info["user_id"])
    db.session.add(player)
    db.session.commit()
    join_room(code)
    emit_room_update(code)


@socketio.on("leave_chaos")
def handle_leave_chaos(data):
    code = (data.get("code") or "").upper()
    info = sid_to_user.get(request.sid)
    if not info:
        return
    room = ChaosRoom.query.filter_by(code=code).first()
    if not room:
        return
    player = ChaosPlayer.query.filter_by(room_id=room.id, user_id=info["user_id"]).first()
    if player:
        db.session.delete(player)
        db.session.commit()
    leave_room(code)
    emit_room_update(code)


@socketio.on("start_chaos")
def handle_start_chaos(data):
    code = (data.get("code") or "").upper()
    info = sid_to_user.get(request.sid)
    if not info:
        return
    room = ChaosRoom.query.filter_by(code=code, status="waiting").first()
    if not room or room.host_id != info["user_id"]:
        emit("error", {"msg": "فقط میزبان می‌تواند بازی را شروع کند"}); return
    if len(room.players) != 3:
        emit("error", {"msg": "باید دقیقاً ۳ بازیکن باشد"}); return
    # Assign roles randomly: 1 mafia, 2 citizen
    import random
    players = list(room.players)
    roles = ["mafia", "citizen", "citizen"]
    random.shuffle(roles)
    for i, p in enumerate(players):
        p.role = roles[i]
    room.status = "playing"
    room.phase = "discussion"
    room.phase_end_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    db.session.commit()
    # Send role to each player individually
    for p in players:
        psid = user_to_sid.get(p.user_id)
        if psid:
            emit("game_started", {
                "your_role": p.role,
                "phase": "discussion",
                "phase_end_at": room.phase_end_at.isoformat(),
                "players": [{"user_id": pp.user_id, "username": pp.user.username,
                             "avatar": pp.user.avatar_emoji} for pp in players]
            }, to=psid)
    # Start phase timer
    socketio.start_background_task(run_phase_timer, code)


@socketio.on("chat_message")
def handle_chat(data):
    code = (data.get("code") or "").upper()
    content = (data.get("content") or "").strip()[:500]
    info = sid_to_user.get(request.sid)
    if not info or not content:
        return
    room = ChaosRoom.query.filter_by(code=code).first()
    if not room:
        return
    # Chat works in lobby (waiting) and discussion phase
    if room.status == "playing" and room.phase == "voting":
        return  # No chat during voting
    emit("new_message", {
        "username": info["username"],
        "user_id": info["user_id"],
        "content": content,
        "time": datetime.now(timezone.utc).strftime("%H:%M")
    }, to=code)


@socketio.on("cast_vote")
def handle_vote(data):
    code = (data.get("code") or "").upper()
    target_id = data.get("target_user_id")
    info = sid_to_user.get(request.sid)
    if not info:
        return
    room = ChaosRoom.query.filter_by(code=code, status="playing").first()
    if not room or room.phase != "voting":
        return
    player = ChaosPlayer.query.filter_by(room_id=room.id, user_id=info["user_id"]).first()
    if not player or player.user_id == target_id:
        return
    player.vote_target_id = target_id
    db.session.commit()
    # Check if all voted
    voted = sum(1 for p in room.players if p.vote_target_id is not None)
    emit("vote_update", {"voted": voted, "total": len(room.players)}, to=code)
    # Count only connected players for vote threshold
    connected = sum(1 for p in room.players if p.user_id in online_users)
    needed = max(connected, 2)  # At least 2 votes needed
    if voted >= needed:
        resolve_votes(code)


# ── End Discussion Vote ──────────────────────────────────────────────────────

end_discussion_votes = {}  # room_code -> set of user_ids
disconnected_players = {}  # room_code -> set of user_ids (grace period)

@socketio.on("vote_end_discussion")
def handle_vote_end(data):
    code = (data.get("code") or "").upper()
    info = sid_to_user.get(request.sid)
    if not info:
        return
    room = ChaosRoom.query.filter_by(code=code, status="playing").first()
    if not room or room.phase != "discussion":
        return
    if code not in end_discussion_votes:
        end_discussion_votes[code] = set()
    end_discussion_votes[code].add(info["user_id"])
    count = len(end_discussion_votes[code])
    socketio.emit("end_vote_update", {"count": count}, to=code)
    # If 2 out of 3 voted, skip to voting phase
    if count >= 2:
        end_discussion_votes.pop(code, None)
        # Force transition to voting
        room.phase = "voting"
        room.phase_end_at = datetime.now(timezone.utc) + timedelta(seconds=30)
        for p in room.players:
            p.vote_target_id = None
        db.session.commit()
        socketio.emit("phase_change", {
            "phase": "voting",
            "phase_end_at": room.phase_end_at.isoformat()
        }, to=code)


# ── Room Invitation ──────────────────────────────────────────────────────────

@socketio.on("invite_to_room")
def handle_invite(data):
    code = (data.get("code") or "").upper()
    target_id = data.get("target_user_id")
    info = sid_to_user.get(request.sid)
    if not info or not target_id:
        return
    target_sid = user_to_sid.get(target_id)
    if target_sid:
        emit("room_invite", {
            "from_user_id": info["user_id"],
            "from_username": info["username"],
            "room_code": code
        }, to=target_sid)
        emit("invite_sent", {"username": db.session.get(User, target_id).username}, to=request.sid)


# ── WebRTC Voice Signaling ────────────────────────────────────────────────────

@socketio.on("voice_join")
def handle_voice_join(data):
    code = (data.get("code") or "").upper()
    info = sid_to_user.get(request.sid)
    if not info:
        return
    # Notify others in the room that this user joined voice
    emit("voice_peer_joined", {"user_id": info["user_id"], "username": info["username"]}, to=code, include_self=False)


# ── WebRTC Voice Signaling (relay) ────────────────────────────────────────────────────

@socketio.on("voice_offer")
def handle_voice_offer(data):
    target_sid = user_to_sid.get(data.get("target_user_id"))
    info = sid_to_user.get(request.sid)
    if target_sid and info:
        emit("voice_offer", {"from_user_id": info["user_id"], "offer": data["offer"]}, to=target_sid)

@socketio.on("voice_answer")
def handle_voice_answer(data):
    target_sid = user_to_sid.get(data.get("target_user_id"))
    info = sid_to_user.get(request.sid)
    if target_sid and info:
        emit("voice_answer", {"from_user_id": info["user_id"], "answer": data["answer"]}, to=target_sid)

@socketio.on("voice_ice")
def handle_voice_ice(data):
    target_sid = user_to_sid.get(data.get("target_user_id"))
    info = sid_to_user.get(request.sid)
    if target_sid and info:
        emit("voice_ice", {"from_user_id": info["user_id"], "candidate": data["candidate"]}, to=target_sid)


# ── Lab Socket Events ──────────────────────────────────────────────────────

def get_lab_room_data(room):
    """Helper to serialize lab room data"""
    players = []
    for p in sorted(room.players, key=lambda x: x.slot):
        if p.is_bot:
            players.append({
                "slot": p.slot, "is_bot": True, "bot_name": p.bot_name,
                "avatar": p.avatar, "id": p.id
            })
        else:
            u = User.query.get(p.user_id)
            players.append({
                "slot": p.slot, "is_bot": False, "user_id": p.user_id,
                "username": u.username if u else "?", "avatar": u.avatar_emoji if u else "🎭",
                "id": p.id
            })
    return {
        "code": room.code, "status": room.status, "scenario": room.scenario,
        "host_id": room.host_id, "players": players,
        "player_count": len(players), "max_players": 10,
        "phase": room.phase, "current_turn": room.current_turn,
        "day_number": room.day_number,
        "turn_end_at": room.turn_end_at.isoformat() if room.turn_end_at else None,
        "defense_player_id": room.defense_player_id,
        "night_kill_target": room.night_kill_target,
        "doctor_save_target": room.doctor_save_target,
        "hunter_block_target": room.hunter_block_target,
        "detective_result": room.detective_result
    }

@socketio.on("join_lab")
def handle_join_lab(data):
    code = data.get("code", "").upper()
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        emit("error", {"msg": "اتاق پیدا نشد"})
        return
    if room.status != "waiting":
        emit("error", {"msg": "بازی شروع شده"})
        return

    uid = sid_to_user.get(request.sid, {}).get("user_id")
    if not uid:
        emit("error", {"msg": "لطفاً وارد شوید"})
        return

    # Check if already in room
    existing = LabPlayer.query.filter_by(room_id=room.id, user_id=uid).first()
    if not existing:
        if len(room.players) >= 10:
            emit("error", {"msg": "اتاق پر است"})
            return
        # Find next available slot
        taken = {p.slot for p in room.players}
        slot = next(s for s in range(1, 11) if s not in taken)
        user = User.query.get(uid)
        player = LabPlayer(room_id=room.id, user_id=uid, is_bot=False, slot=slot, avatar=user.avatar_emoji)
        db.session.add(player)
        db.session.commit()

    join_room(f"lab_{code}")

    # Broadcast updated room
    room_data = get_lab_room_data(room)
    emit("lab_update", room_data, room=f"lab_{code}")

@socketio.on("leave_lab")
def handle_leave_lab(data):
    code = data.get("code", "").upper()
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    uid = sid_to_user.get(request.sid, {}).get("user_id")
    if not uid:
        return

    player = LabPlayer.query.filter_by(room_id=room.id, user_id=uid).first()
    if player:
        db.session.delete(player)
        db.session.commit()

    leave_room(f"lab_{code}")

    # If host left, delete room
    if room.host_id == uid:
        db.session.delete(room)
        db.session.commit()
        emit("lab_closed", {}, room=f"lab_{code}")
    else:
        room_data = get_lab_room_data(room)
        emit("lab_update", room_data, room=f"lab_{code}")

@socketio.on("add_bot")
def handle_add_bot(data):
    code = data.get("code", "").upper()
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    uid = sid_to_user.get(request.sid, {}).get("user_id")
    if room.host_id != uid:
        emit("error", {"msg": "فقط میزبان می‌تواند بات اضافه کند"})
        return

    if len(room.players) >= 10:
        emit("error", {"msg": "اتاق پر است"})
        return

    taken = {p.slot for p in room.players}
    slot = next(s for s in range(1, 11) if s not in taken)

    # Pick a bot name not already used
    used_names = {p.bot_name for p in room.players if p.is_bot}
    available_names = [n for n in BOT_NAMES if n not in used_names]
    bot_name = available_names[0] if available_names else f"بات {slot}"

    bot_idx = len([p for p in room.players if p.is_bot])
    avatar = BOT_AVATARS[bot_idx % len(BOT_AVATARS)]

    bot = LabPlayer(room_id=room.id, is_bot=True, bot_name=bot_name, avatar=avatar, slot=slot)
    db.session.add(bot)
    db.session.commit()

    room_data = get_lab_room_data(room)
    emit("lab_update", room_data, room=f"lab_{code}")

@socketio.on("remove_player")
def handle_remove_player(data):
    code = data.get("code", "").upper()
    player_id = data.get("player_id")
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    uid = sid_to_user.get(request.sid, {}).get("user_id")
    if room.host_id != uid:
        emit("error", {"msg": "فقط میزبان می‌تواند حذف کند"})
        return

    player = LabPlayer.query.get(player_id)
    if player and player.room_id == room.id and player.user_id != uid:
        db.session.delete(player)
        db.session.commit()
        room_data = get_lab_room_data(room)
        emit("lab_update", room_data, room=f"lab_{code}")

@socketio.on("invite_lab")
def handle_invite_lab(data):
    code = data.get("code", "").upper()
    target_id = data.get("target_user_id")
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    uid = sid_to_user.get(request.sid, {}).get("user_id")
    username = sid_to_user.get(request.sid, {}).get("username", "?")

    target_sid = user_to_sid.get(target_id)
    if target_sid:
        emit("lab_invite", {
            "from_user_id": uid, "from_username": username,
            "room_code": code, "scenario": room.scenario
        }, room=target_sid)
        emit("invite_sent", {"username": User.query.get(target_id).username if User.query.get(target_id) else "?"})


# ── Lab Game Engine ──────────────────────────────────────────────────────────

import random
import threading
import time as _time_module

lab_votes = {}          # {room_code_day: {voter_player_id: target_player_id}}
lab_revotes = {}        # {room_code_day: {voter_player_id: "eliminate" | "keep"}}
lab_night_actions = {}  # {room_code_day: {role: target_player_id}}


def get_player_public_info(player):
    """Get public info for a player (no role reveal)"""
    if not player:
        return None
    if player.is_bot:
        return {
            "id": player.id, "slot": player.slot, "is_bot": True,
            "name": player.bot_name, "avatar": player.avatar,
            "is_alive": player.is_alive
        }
    else:
        u = User.query.get(player.user_id)
        return {
            "id": player.id, "slot": player.slot, "is_bot": False,
            "user_id": player.user_id,
            "name": u.username if u else "?", "avatar": u.avatar_emoji if u else "🎭",
            "is_alive": player.is_alive
        }


def get_alive_sorted(room):
    """Return alive players sorted by slot"""
    return sorted([p for p in room.players if p.is_alive], key=lambda x: x.slot)


def check_win_condition(room):
    """Return 'mafia', 'citizen', or None"""
    alive = [p for p in room.players if p.is_alive]
    alive_mafia = [p for p in alive if p.team == "mafia"]
    alive_citizens = [p for p in alive if p.team == "citizen"]
    if len(alive_mafia) == 0:
        return "citizen"
    if len(alive_mafia) >= len(alive_citizens):
        return "mafia"
    return None


def emit_game_result(code, room, winner, eliminated_player=None):
    """End game and reveal roles"""
    room.status = "finished"
    room.phase = "result"
    db.session.commit()

    all_players = []
    for p in sorted(room.players, key=lambda x: x.slot):
        info = get_player_public_info(p)
        info["role_name"] = p.role_name
        info["team"] = p.team
        info["is_alive"] = p.is_alive
        all_players.append(info)

    socketio.emit("lab_game_result", {
        "winner": winner,
        "eliminated": get_player_public_info(eliminated_player) if eliminated_player else None,
        "eliminated_role": eliminated_player.role_name if eliminated_player else None,
        "players": all_players
    }, room=f"lab_{code}")


def find_player_by_role(room, role_name):
    """Find alive player with given role_name"""
    for p in room.players:
        if p.role_name == role_name and p.is_alive:
            return p
    return None


def get_mafia_players(room, alive_only=True):
    """Return mafia team players"""
    if alive_only:
        return [p for p in room.players if p.team == "mafia" and p.is_alive]
    return [p for p in room.players if p.team == "mafia"]


def emit_to_player(player, event, data):
    """Emit event to a specific player (skip bots)"""
    if player.is_bot or not player.user_id:
        return
    sid = user_to_sid.get(player.user_id)
    if sid:
        socketio.emit(event, data, to=sid)


# ── Timer Scheduling ──────────────────────────────────────────────────────

def schedule_turn_timer(code, current_slot, day_number):
    """Schedule auto-advance for day_talk after 30 seconds"""
    def advance():
        _time_module.sleep(31)
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.status != "playing" or room.phase != "day_talk":
                return
            if room.current_turn != current_slot or room.day_number != day_number:
                return
            advance_turn(code)
    threading.Thread(target=advance, daemon=True).start()


def schedule_phase_timer(code, phase, day_number, seconds):
    """Generic phase timer - after seconds, call phase_timeout"""
    def timeout():
        _time_module.sleep(seconds + 1)
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.status != "playing":
                return
            if room.phase != phase or room.day_number != day_number:
                return
            handle_phase_timeout(code, phase)
    threading.Thread(target=timeout, daemon=True).start()


def schedule_vote_advance(code, current_slot, day_number):
    """Advance sequential voting after 3 seconds"""
    def advance():
        _time_module.sleep(4)
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.status != "playing":
                return
            if room.phase != "voting" or room.day_number != day_number:
                return
            if room.current_turn != current_slot:
                return
            advance_sequential_vote(code)
    threading.Thread(target=advance, daemon=True).start()


def schedule_revote_advance(code, current_slot, day_number):
    """Advance sequential revote after 3 seconds"""
    def advance():
        _time_module.sleep(4)
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.status != "playing":
                return
            if room.phase != "revote" or room.day_number != day_number:
                return
            if room.current_turn != current_slot:
                return
            advance_sequential_revote(code)
    threading.Thread(target=advance, daemon=True).start()


def schedule_night_sub_advance(code, sub_phase, day_number):
    """Advance night sub-phase after 10 seconds"""
    def advance():
        _time_module.sleep(11)
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.status != "playing":
                return
            if room.phase != sub_phase or room.day_number != day_number:
                return
            advance_night(code)
    threading.Thread(target=advance, daemon=True).start()


# ── Phase Timeout Handler ──────────────────────────────────────────────────

def handle_phase_timeout(code, phase):
    """Handle when a phase timer expires"""
    if phase == "mafia_chat":
        start_sequential_voting(code)
    elif phase == "defense":
        start_revote(code)


# ── Day Talk ──────────────────────────────────────────────────────────────

def start_day_talk(code, day_number):
    """Start day_talk phase for a new day"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room or room.status != "playing":
        return

    room.phase = "day_talk"
    room.day_number = day_number

    alive = get_alive_sorted(room)
    if not alive:
        return

    room.current_turn = alive[0].slot
    room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=30)
    db.session.commit()

    player_info = get_player_public_info(alive[0])
    socketio.emit("lab_phase_change", {
        "phase": "day_talk",
        "day_number": day_number,
        "current_turn": alive[0].slot,
        "turn_player": player_info,
        "turn_end_at": room.turn_end_at.isoformat(),
        "alive_players": [get_player_public_info(p) for p in alive]
    }, room=f"lab_{code}")

    if alive[0].is_bot:
        generate_bot_message(code, alive[0])
    else:
        schedule_turn_timer(code, alive[0].slot, day_number)


def advance_turn(code):
    """Move to next player's turn in day_talk"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room or room.phase != "day_talk":
        return

    current = room.current_turn
    alive = get_alive_sorted(room)
    alive_slots = [p.slot for p in alive]

    next_slot = None
    for s in alive_slots:
        if s > current:
            next_slot = s
            break

    if next_slot is None:
        # All players have spoken - move to mafia_chat
        start_mafia_chat(code)
    else:
        room.current_turn = next_slot
        room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=30)
        db.session.commit()

        player = LabPlayer.query.filter_by(room_id=room.id, slot=next_slot).first()
        player_info = get_player_public_info(player)
        socketio.emit("lab_phase_change", {
            "phase": "day_talk",
            "day_number": room.day_number,
            "current_turn": next_slot,
            "turn_player": player_info,
            "turn_end_at": room.turn_end_at.isoformat()
        }, room=f"lab_{code}")

        if player and player.is_bot:
            generate_bot_message(code, player)
        else:
            schedule_turn_timer(code, next_slot, room.day_number)


# ── Mafia Chat ──────────────────────────────────────────────────────────────

def start_mafia_chat(code):
    """Start 15s private mafia chat phase"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    room.phase = "mafia_chat"
    room.current_turn = 0
    room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=15)
    db.session.commit()

    mafia_players = get_mafia_players(room)

    # Notify all players that mafia_chat phase started (they see "شب مافیا")
    socketio.emit("lab_phase_change", {
        "phase": "mafia_chat",
        "day_number": room.day_number,
        "turn_end_at": room.turn_end_at.isoformat()
    }, room=f"lab_{code}")

    # Send private mafia chat notification to mafia players only
    mafia_info = [get_player_public_info(p) for p in mafia_players]
    for p in mafia_players:
        emit_to_player(p, "lab_mafia_chat_start", {
            "mafia_team": mafia_info,
            "turn_end_at": room.turn_end_at.isoformat()
        })

    # Bot mafia send short messages
    for p in mafia_players:
        if p.is_bot:
            generate_bot_mafia_chat(code, p)

    schedule_phase_timer(code, "mafia_chat", room.day_number, 15)


def generate_bot_mafia_chat(code, bot_player):
    """Bot mafia sends a short message during mafia_chat"""
    def send():
        _time_module.sleep(random.uniform(2, 8))
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.phase != "mafia_chat":
                return

            msgs = [
                "بزنیم اون شهروند رو",
                "کارآگاه رو بزنیم بهتره",
                "دکتر خطرناکه",
                "موافقم",
                "باشه همونو میزنیم",
                "حواسمون به هانتر باشه",
                "من فردا از اون دفاع میکنم",
                "رأی رو بندازیم رو یکی دیگه"
            ]
            content = random.choice(msgs)

            mafia_players = get_mafia_players(room)
            player_info = get_player_public_info(bot_player)
            for mp in mafia_players:
                emit_to_player(mp, "lab_mafia_message", {
                    "player": player_info,
                    "content": content,
                    "time": datetime.now(timezone.utc).isoformat()
                })

    threading.Thread(target=send, daemon=True).start()


# ── Sequential Voting ──────────────────────────────────────────────────────

def start_sequential_voting(code):
    """Start voting: each alive player votes in turn, 3s each"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    alive = get_alive_sorted(room)
    if not alive:
        return

    room.phase = "voting"
    room.current_turn = alive[0].slot
    room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=3)
    db.session.commit()

    room_key = f"{code}_{room.day_number}"
    lab_votes[room_key] = {}

    socketio.emit("lab_phase_change", {
        "phase": "voting",
        "day_number": room.day_number,
        "current_turn": alive[0].slot,
        "turn_player": get_player_public_info(alive[0]),
        "turn_end_at": room.turn_end_at.isoformat(),
        "alive_players": [get_player_public_info(p) for p in alive]
    }, room=f"lab_{code}")

    if alive[0].is_bot:
        bot_sequential_vote(code, alive[0])

    schedule_vote_advance(code, alive[0].slot, room.day_number)


def advance_sequential_vote(code):
    """Move to next voter or resolve votes"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room or room.phase != "voting":
        return

    current = room.current_turn
    alive = get_alive_sorted(room)
    alive_slots = [p.slot for p in alive]

    next_slot = None
    for s in alive_slots:
        if s > current:
            next_slot = s
            break

    if next_slot is None:
        # All voted - resolve
        resolve_voting(code)
    else:
        room.current_turn = next_slot
        room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=3)
        db.session.commit()

        player = LabPlayer.query.filter_by(room_id=room.id, slot=next_slot).first()
        socketio.emit("lab_phase_change", {
            "phase": "voting",
            "day_number": room.day_number,
            "current_turn": next_slot,
            "turn_player": get_player_public_info(player),
            "turn_end_at": room.turn_end_at.isoformat()
        }, room=f"lab_{code}")

        if player and player.is_bot:
            bot_sequential_vote(code, player)

        schedule_vote_advance(code, next_slot, room.day_number)


def bot_sequential_vote(code, bot_player):
    """Bot votes during sequential voting"""
    def vote():
        _time_module.sleep(random.uniform(0.5, 2))
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.phase != "voting":
                return
            if room.current_turn != bot_player.slot:
                return

            alive = [p for p in room.players if p.is_alive and p.id != bot_player.id]
            if not alive:
                return

            brain = get_bot_brain(code, bot_player.id)

            if bot_player.team == "mafia":
                # Mafia: coordinate to vote citizens, prefer dangerous roles
                citizens = [p for p in alive if p.team == "citizen"]
                dangerous = [p for p in citizens if p.role_name in ("کارآگاه", "بازپرس", "دکتر")]
                if dangerous and random.random() < 0.6:
                    target = random.choice(dangerous)
                elif citizens:
                    target = random.choice(citizens)
                else:
                    target = random.choice(alive)
            else:
                # Citizen: vote based on suspicion analysis
                sus_scores = [(p, brain["suspicion"].get(p.id, 0) - brain["trust"].get(p.id, 0)) for p in alive]
                sus_scores.sort(key=lambda x: x[1], reverse=True)
                if sus_scores and sus_scores[0][1] > 0:
                    # Vote for most suspicious, with some randomness
                    top_sus = [s for s in sus_scores if s[1] > 0][:3]
                    target = random.choice(top_sus)[0]
                else:
                    target = random.choice(alive)

            room_key = f"{code}_{room.day_number}"
            if room_key not in lab_votes:
                lab_votes[room_key] = {}
            lab_votes[room_key][bot_player.id] = target.id

            socketio.emit("lab_vote_cast", {
                "voter": get_player_public_info(bot_player),
                "target": get_player_public_info(target),
                "vote_counts": get_vote_counts(code, room.day_number)
            }, room=f"lab_{code}")

    threading.Thread(target=vote, daemon=True).start()


def get_vote_counts(code, day_number):
    """Get current vote counts per target"""
    room_key = f"{code}_{day_number}"
    votes = lab_votes.get(room_key, {})
    counts = {}
    for voter_id, target_id in votes.items():
        counts[str(target_id)] = counts.get(str(target_id), 0) + 1
    return counts


def resolve_voting(code):
    """Check if anyone got 4+ votes, if so go to defense, else night"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    room_key = f"{code}_{room.day_number}"
    votes = lab_votes.get(room_key, {})

    vote_counts = {}
    for voter_id, target_id in votes.items():
        vote_counts[target_id] = vote_counts.get(target_id, 0) + 1

    # Find player with most votes
    max_voted_id = None
    max_count = 0
    if vote_counts:
        max_voted_id = max(vote_counts, key=vote_counts.get)
        max_count = vote_counts[max_voted_id]

    if max_count >= 4:
        # Go to defense phase
        defense_player = LabPlayer.query.get(max_voted_id)
        if defense_player:
            start_defense(code, defense_player, max_count)
            return

    # No one has 4+ votes - go to night
    socketio.emit("lab_phase_change", {
        "phase": "voting_result",
        "day_number": room.day_number,
        "message": "هیچکس رأی کافی نگرفت",
        "vote_counts": {str(k): v for k, v in vote_counts.items()}
    }, room=f"lab_{code}")

    # Clean up votes
    lab_votes.pop(room_key, None)

    # Start night after 3 seconds
    def go_night():
        _time_module.sleep(3)
        with app.app_context():
            r = LabRoom.query.filter_by(code=code).first()
            if r and r.status == "playing":
                start_night(code)
    threading.Thread(target=go_night, daemon=True).start()


# ── Defense Phase ──────────────────────────────────────────────────────────

def start_defense(code, defense_player, vote_count):
    """Player with 4+ votes gets 30s to defend"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    room.phase = "defense"
    room.defense_player_id = defense_player.id
    room.current_turn = defense_player.slot
    room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=30)
    db.session.commit()

    socketio.emit("lab_phase_change", {
        "phase": "defense",
        "day_number": room.day_number,
        "defense_player": get_player_public_info(defense_player),
        "vote_count": vote_count,
        "turn_end_at": room.turn_end_at.isoformat()
    }, room=f"lab_{code}")

    # Bot defense
    if defense_player.is_bot:
        generate_bot_defense(code, defense_player)

    schedule_phase_timer(code, "defense", room.day_number, 30)


def generate_bot_defense(code, bot_player):
    """Bot sends a defense message"""
    def send():
        _time_module.sleep(random.uniform(3, 10))
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.phase != "defense":
                return

            defense_msgs = [
                "من بی\u200cگناهم! من شهروندم!",
                "دارین اشتباه میکنین، من مافیا نیستم",
                "بذارین توضیح بدم، من نقش مثبت دارم",
                "اگه منو بندازین بیرون ضرر میکنین",
                "من کارآگاهم، نندازینم!",
                "به خدا من پاکم، مافیا داره گولتون میزنه",
                "یکی داره منو قربانی میکنه",
                "صبر کنید، من میتونم ثابت کنم"
            ]
            content = random.choice(defense_msgs)

            msg = LabMessage(room_id=room.id, player_id=bot_player.id, content=content, msg_type="defense")
            db.session.add(msg)
            db.session.commit()

            socketio.emit("lab_new_message", {
                "id": msg.id,
                "player": get_player_public_info(bot_player),
                "content": content,
                "msg_type": "defense",
                "time": msg.created_at.isoformat()
            }, room=f"lab_{code}")

    threading.Thread(target=send, daemon=True).start()


# ── Revote Phase ──────────────────────────────────────────────────────────

def start_revote(code):
    """Each alive player votes eliminate or keep"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    alive = get_alive_sorted(room)
    if not alive:
        return

    room.phase = "revote"
    room.current_turn = alive[0].slot
    room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=3)
    db.session.commit()

    room_key = f"{code}_{room.day_number}"
    lab_revotes[room_key] = {}

    defense_player = LabPlayer.query.get(room.defense_player_id) if room.defense_player_id else None

    socketio.emit("lab_phase_change", {
        "phase": "revote",
        "day_number": room.day_number,
        "defense_player": get_player_public_info(defense_player),
        "current_turn": alive[0].slot,
        "turn_player": get_player_public_info(alive[0]),
        "turn_end_at": room.turn_end_at.isoformat(),
        "alive_players": [get_player_public_info(p) for p in alive]
    }, room=f"lab_{code}")

    if alive[0].is_bot:
        bot_sequential_revote(code, alive[0])

    schedule_revote_advance(code, alive[0].slot, room.day_number)


def advance_sequential_revote(code):
    """Move to next revote voter or resolve"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room or room.phase != "revote":
        return

    current = room.current_turn
    alive = get_alive_sorted(room)
    alive_slots = [p.slot for p in alive]

    next_slot = None
    for s in alive_slots:
        if s > current:
            next_slot = s
            break

    if next_slot is None:
        resolve_revote(code)
    else:
        room.current_turn = next_slot
        room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=3)
        db.session.commit()

        player = LabPlayer.query.filter_by(room_id=room.id, slot=next_slot).first()
        socketio.emit("lab_phase_change", {
            "phase": "revote",
            "day_number": room.day_number,
            "current_turn": next_slot,
            "turn_player": get_player_public_info(player),
            "turn_end_at": room.turn_end_at.isoformat()
        }, room=f"lab_{code}")

        if player and player.is_bot:
            bot_sequential_revote(code, player)

        schedule_revote_advance(code, next_slot, room.day_number)


def bot_sequential_revote(code, bot_player):
    """Bot votes in revote"""
    def vote():
        _time_module.sleep(random.uniform(0.5, 2))
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.phase != "revote":
                return
            if room.current_turn != bot_player.slot:
                return

            defense_player = LabPlayer.query.get(room.defense_player_id) if room.defense_player_id else None
            if not defense_player:
                return

            # Mafia bots protect their own, citizen bots vote to eliminate
            if bot_player.team == "mafia" and defense_player.team == "mafia":
                decision = "keep"
            elif bot_player.team == "mafia" and defense_player.team == "citizen":
                decision = "eliminate"
            else:
                decision = random.choice(["eliminate", "eliminate", "keep"])  # citizens lean eliminate

            room_key = f"{code}_{room.day_number}"
            if room_key not in lab_revotes:
                lab_revotes[room_key] = {}
            lab_revotes[room_key][bot_player.id] = decision

            socketio.emit("lab_revote_cast", {
                "voter": get_player_public_info(bot_player),
                "decision": decision
            }, room=f"lab_{code}")

    threading.Thread(target=vote, daemon=True).start()


def resolve_revote(code):
    """Count revotes - majority eliminate = player eliminated"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    room_key = f"{code}_{room.day_number}"
    revotes = lab_revotes.get(room_key, {})

    eliminate_count = sum(1 for d in revotes.values() if d == "eliminate")
    keep_count = sum(1 for d in revotes.values() if d == "keep")

    defense_player = LabPlayer.query.get(room.defense_player_id) if room.defense_player_id else None

    if eliminate_count > keep_count and defense_player:
        # Eliminate
        defense_player.is_alive = False
        defense_player.is_eliminated = True
        room.eliminated_today = defense_player.id
        db.session.commit()

        socketio.emit("lab_elimination", {
            "eliminated": get_player_public_info(defense_player),
            "eliminated_role": defense_player.role_name,
            "eliminate_votes": eliminate_count,
            "keep_votes": keep_count
        }, room=f"lab_{code}")

        # Check win
        winner = check_win_condition(room)
        if winner:
            emit_game_result(code, room, winner, defense_player)
            lab_revotes.pop(room_key, None)
            lab_votes.pop(f"{code}_{room.day_number}", None)
            return
    else:
        socketio.emit("lab_elimination", {
            "eliminated": None,
            "message": "بازیکن ابقا شد",
            "eliminate_votes": eliminate_count,
            "keep_votes": keep_count
        }, room=f"lab_{code}")

    # Clean up
    lab_revotes.pop(room_key, None)
    lab_votes.pop(f"{code}_{room.day_number}", None)
    room.defense_player_id = None
    db.session.commit()

    # Go to night after 3 seconds
    def go_night():
        _time_module.sleep(3)
        with app.app_context():
            r = LabRoom.query.filter_by(code=code).first()
            if r and r.status == "playing":
                start_night(code)
    threading.Thread(target=go_night, daemon=True).start()


# ── Night Phase (sub-phases) ──────────────────────────────────────────────

NIGHT_ORDER = ["night_hunter", "night_shayad", "night_mafia", "night_detective", "night_doctor", "night_bazpors"]


def start_night(code):
    """Begin night with first sub-phase"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    # Reset night targets
    room.night_kill_target = None
    room.doctor_save_target = None
    room.hunter_block_target = None
    room.detective_result = None

    room_key = f"{code}_{room.day_number}"
    lab_night_actions[room_key] = {}

    db.session.commit()

    start_night_sub(code, NIGHT_ORDER[0])


def start_night_sub(code, sub_phase):
    """Start a night sub-phase"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room or room.status != "playing":
        return

    room.phase = sub_phase
    room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=10)
    db.session.commit()

    alive = get_alive_sorted(room)
    alive_info = [get_player_public_info(p) for p in alive]

    # Notify everyone about the sub-phase (without revealing who acts)
    socketio.emit("lab_phase_change", {
        "phase": sub_phase,
        "day_number": room.day_number,
        "turn_end_at": room.turn_end_at.isoformat()
    }, room=f"lab_{code}")

    # Send action prompt to the relevant player(s)
    if sub_phase == "night_detective":
        detective = find_player_by_role(room, "کارآگاه")
        if detective:
            emit_to_player(detective, "lab_night_action_prompt", {
                "sub_phase": sub_phase,
                "role": "کارآگاه",
                "targets": [p for p in alive_info if p and p["id"] != detective.id],
                "turn_end_at": room.turn_end_at.isoformat()
            })
            if detective.is_bot:
                bot_night_action(code, detective, sub_phase)

    elif sub_phase == "night_shayad":
        shayad = find_player_by_role(room, "شیاد")
        if shayad:
            emit_to_player(shayad, "lab_night_action_prompt", {
                "sub_phase": sub_phase,
                "role": "شیاد",
                "description": "یک بازیکن انتخاب کنید — اگر کارآگاه باشد، استعلامش منفی می‌شود",
                "targets": [p for p in alive_info if p and p["id"] != shayad.id],
                "turn_end_at": room.turn_end_at.isoformat()
            })
            if shayad.is_bot:
                bot_night_action(code, shayad, sub_phase)

    elif sub_phase == "night_bazpors":
        bazpors = find_player_by_role(room, "بازپرس")
        if bazpors and not room.bazpors_ability_used:
            emit_to_player(bazpors, "lab_night_action_prompt", {
                "sub_phase": sub_phase,
                "role": "بازپرس",
                "description": "۲ بازیکن انتخاب کنید — فردا این ۲ نفر دفاع می‌کنند و بین آنها رأی‌گیری می‌شود",
                "select_count": 2,
                "targets": [p for p in alive_info if p and p["id"] != bazpors.id],
                "turn_end_at": room.turn_end_at.isoformat()
            })
            if bazpors.is_bot:
                bot_night_action(code, bazpors, sub_phase)
        # If ability already used, skip

    elif sub_phase == "night_doctor":
        doctor = find_player_by_role(room, "دکتر")
        if doctor:
            emit_to_player(doctor, "lab_night_action_prompt", {
                "sub_phase": sub_phase,
                "role": "دکتر",
                "targets": alive_info,
                "can_self_save": not room.doctor_self_save_used,
                "turn_end_at": room.turn_end_at.isoformat()
            })
            if doctor.is_bot:
                bot_night_action(code, doctor, sub_phase)

    elif sub_phase == "night_hunter":
        hunter = find_player_by_role(room, "هانتر")
        if hunter:
            emit_to_player(hunter, "lab_night_action_prompt", {
                "sub_phase": sub_phase,
                "role": "هانتر",
                "targets": [p for p in alive_info if p and p["id"] != hunter.id],
                "turn_end_at": room.turn_end_at.isoformat()
            })
            if hunter.is_bot:
                bot_night_action(code, hunter, sub_phase)

    elif sub_phase == "night_mafia":
        mafia_players = get_mafia_players(room)
        non_mafia = [p for p in alive_info if p and p["id"] not in [m.id for m in mafia_players]]
        for mp in mafia_players:
            emit_to_player(mp, "lab_night_action_prompt", {
                "sub_phase": sub_phase,
                "role": mp.role_name,
                "is_boss": mp.role_name == "رئیس مافیا",
                "targets": non_mafia,
                "mafia_team": [get_player_public_info(m) for m in mafia_players],
                "turn_end_at": room.turn_end_at.isoformat()
            })
        # Bot mafia boss chooses kill
        boss = find_player_by_role(room, "رئیس مافیا")
        if boss and boss.is_bot:
            bot_night_action(code, boss, sub_phase)

    schedule_night_sub_advance(code, sub_phase, room.day_number)


def bot_night_action(code, bot_player, sub_phase):
    """Bot performs a night action"""
    def act():
        _time_module.sleep(random.uniform(2, 6))
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.phase != sub_phase:
                return

            alive = [p for p in room.players if p.is_alive]
            targets = [p for p in alive if p.id != bot_player.id]

            if not targets:
                return

            room_key = f"{code}_{room.day_number}"
            if room_key not in lab_night_actions:
                lab_night_actions[room_key] = {}

            if sub_phase == "night_detective":
                target = random.choice(targets)
                lab_night_actions[room_key]["detective"] = target.id
                result = "مافیا" if target.team == "mafia" else "شهروند"
                room.detective_result = result
                db.session.commit()
                emit_to_player(bot_player, "lab_detective_result", {
                    "target": get_player_public_info(target),
                    "result": result
                })

            elif sub_phase == "night_doctor":
                # Can save self once
                if not room.doctor_self_save_used:
                    all_targets = alive
                else:
                    all_targets = targets
                target = random.choice(all_targets) if all_targets else None
                if target:
                    lab_night_actions[room_key]["doctor"] = target.id
                    room.doctor_save_target = target.id
                    if target.id == bot_player.id:
                        room.doctor_self_save_used = True
                    db.session.commit()

            elif sub_phase == "night_hunter":
                target = random.choice(targets)
                lab_night_actions[room_key]["hunter"] = target.id
                room.hunter_block_target = target.id
                db.session.commit()

            elif sub_phase == "night_mafia":
                citizens = [p for p in targets if p.team == "citizen"]
                target = random.choice(citizens if citizens else targets)
                lab_night_actions[room_key]["mafia"] = target.id
                room.night_kill_target = target.id
                db.session.commit()

            elif sub_phase == "night_shayad":
                # Shayad picks a random target, hoping to find detective
                target = random.choice(targets)
                lab_night_actions[room_key]["shayad"] = target.id
                db.session.commit()

            elif sub_phase == "night_bazpors":
                if room.bazpors_ability_used:
                    return
                if len(targets) < 2:
                    return
                chosen = random.sample(targets, 2)
                room.bazpors_ability_used = True
                room.bazpors_target1 = chosen[0].id
                room.bazpors_target2 = chosen[1].id
                lab_night_actions[room_key]["bazpors"] = [chosen[0].id, chosen[1].id]
                db.session.commit()

    threading.Thread(target=act, daemon=True).start()


def advance_night(code):
    """Move to next night sub-phase or resolve"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room or room.status != "playing":
        return

    current_phase = room.phase
    if current_phase not in NIGHT_ORDER:
        return

    idx = NIGHT_ORDER.index(current_phase)
    if idx < len(NIGHT_ORDER) - 1:
        start_night_sub(code, NIGHT_ORDER[idx + 1])
    else:
        resolve_night(code)


def resolve_night(code):
    """Resolve all night actions"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    room_key = f"{code}_{room.day_number}"
    actions = lab_night_actions.get(room_key, {})

    kill_target_id = actions.get("mafia") or room.night_kill_target
    save_target_id = actions.get("doctor") or room.doctor_save_target
    # hunter blocks target's ability, not mafia kill

    killed_player = None
    saved = False

    if kill_target_id:
        if save_target_id and kill_target_id == save_target_id:
            saved = True
        else:
            killed_player = LabPlayer.query.get(kill_target_id)
            if killed_player:
                killed_player.is_alive = False
                killed_player.is_eliminated = True

    room.phase = "night_resolve"
    db.session.commit()

    if saved:
        saved_player = LabPlayer.query.get(kill_target_id)
        socketio.emit("lab_night_result", {
            "killed": None,
            "saved": get_player_public_info(saved_player) if saved_player else None,
            "message": "دکتر نجاتش داد! 🩺",
            "day_number": room.day_number
        }, room=f"lab_{code}")
    elif killed_player:
        socketio.emit("lab_night_result", {
            "killed": get_player_public_info(killed_player),
            "killed_role": killed_player.role_name,
            "saved": None,
            "message": None,
            "day_number": room.day_number
        }, room=f"lab_{code}")
    else:
        socketio.emit("lab_night_result", {
            "killed": None,
            "saved": None,
            "message": "شب بدون تلفات گذشت",
            "day_number": room.day_number
        }, room=f"lab_{code}")

    # Clean up night actions
    lab_night_actions.pop(room_key, None)

    # Check win condition
    winner = check_win_condition(room)
    if winner:
        emit_game_result(code, room, winner, killed_player)
        return

    # Start next day after 5 seconds
    def next_day():
        _time_module.sleep(5)
        with app.app_context():
            r = LabRoom.query.filter_by(code=code).first()
            if r and r.status == "playing":
                # Check if bazpors selected 2 targets last night
                if r.bazpors_target1 and r.bazpors_target2:
                    t1 = LabPlayer.query.get(r.bazpors_target1)
                    t2 = LabPlayer.query.get(r.bazpors_target2)
                    if t1 and t1.is_alive and t2 and t2.is_alive:
                        start_bazpors_trial(code, r.day_number + 1)
                        return
                    # Clear if targets are dead
                    r.bazpors_target1 = None
                    r.bazpors_target2 = None
                    db.session.commit()
                start_day_talk(code, r.day_number + 1)
    threading.Thread(target=next_day, daemon=True).start()


# ── Bazpors Trial Phase ──────────────────────────────────────────────────────

def start_bazpors_trial(code, day_number):
    """Bazpors selected 2 players: they defend, then vote between them"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    room.phase = "bazpors_defense1"
    room.day_number = day_number
    room.current_turn = 0

    t1 = LabPlayer.query.get(room.bazpors_target1)
    t2 = LabPlayer.query.get(room.bazpors_target2)

    # First target defends for 30s
    room.defense_player_id = t1.id
    room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=30)
    db.session.commit()

    t1_info = get_player_public_info(t1)
    t2_info = get_player_public_info(t2)

    socketio.emit("lab_phase_change", {
        "phase": "bazpors_defense1",
        "day_number": day_number,
        "defense_player": t1_info,
        "defense_player2": t2_info,
        "turn_end_at": room.turn_end_at.isoformat(),
        "message": f"🔍 بازپرس ۲ نفر را انتخاب کرده! اول {t1_info['name']} دفاع می‌کند (۳۰ ثانیه)"
    }, room=f"lab_{code}")

    # Bot defense
    if t1.is_bot:
        generate_bot_defense(code, t1)

    # After 30s, switch to second player
    def switch_to_defense2():
        _time_module.sleep(31)
        with app.app_context():
            r = LabRoom.query.filter_by(code=code).first()
            if not r or r.phase != "bazpors_defense1":
                return
            r.phase = "bazpors_defense2"
            r.defense_player_id = r.bazpors_target2
            r.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=30)
            db.session.commit()

            t2_p = LabPlayer.query.get(r.bazpors_target2)
            socketio.emit("lab_phase_change", {
                "phase": "bazpors_defense2",
                "day_number": day_number,
                "defense_player": get_player_public_info(t2_p),
                "turn_end_at": r.turn_end_at.isoformat(),
                "message": f"حالا {get_player_public_info(t2_p)['name']} دفاع می‌کند (۳۰ ثانیه)"
            }, room=f"lab_{code}")

            if t2_p.is_bot:
                generate_bot_defense(code, t2_p)

            # After 30s, start bazpors vote
            def start_bvote():
                _time_module.sleep(31)
                with app.app_context():
                    r2 = LabRoom.query.filter_by(code=code).first()
                    if not r2 or r2.phase != "bazpors_defense2":
                        return
                    start_bazpors_vote(code)
            threading.Thread(target=start_bvote, daemon=True).start()

    threading.Thread(target=switch_to_defense2, daemon=True).start()


def generate_bot_defense(code, bot_player):
    """Bot generates a defense message"""
    def send():
        _time_module.sleep(random.uniform(3, 10))
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or "bazpors_defense" not in room.phase:
                return
            if room.defense_player_id != bot_player.id:
                return
            content = get_fallback_bot_message(bot_player.role_name, bot_player.team, room.day_number)
            msg = LabMessage(room_id=room.id, player_id=bot_player.id, content=content)
            db.session.add(msg)
            db.session.commit()
            socketio.emit("lab_new_message", {
                "id": msg.id,
                "player": get_player_public_info(bot_player),
                "content": content,
                "msg_type": "chat",
                "time": msg.created_at.isoformat()
            }, room=f"lab_{code}")
    threading.Thread(target=send, daemon=True).start()


def start_bazpors_vote(code):
    """Vote between the 2 bazpors targets"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    room.phase = "bazpors_vote"
    alive = get_alive_sorted(room)
    room.current_turn = alive[0].slot if alive else 0
    room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=3)
    db.session.commit()

    t1 = LabPlayer.query.get(room.bazpors_target1)
    t2 = LabPlayer.query.get(room.bazpors_target2)

    room_key = f"{code}_{room.day_number}_bvote"
    lab_votes[room_key] = {}

    socketio.emit("lab_phase_change", {
        "phase": "bazpors_vote",
        "day_number": room.day_number,
        "current_turn": alive[0].slot if alive else 0,
        "turn_player": get_player_public_info(alive[0]) if alive else None,
        "turn_end_at": room.turn_end_at.isoformat(),
        "candidate1": get_player_public_info(t1),
        "candidate2": get_player_public_info(t2),
        "message": "بین این ۲ نفر رأی بدهید"
    }, room=f"lab_{code}")

    # Bot votes
    if alive and alive[0].is_bot:
        bot_bazpors_vote(code, alive[0], t1, t2)

    schedule_bazpors_vote_advance(code, alive[0].slot if alive else 0, room.day_number)


def schedule_bazpors_vote_advance(code, current_slot, day_number):
    """Auto-advance bazpors vote after 3s"""
    def advance():
        _time_module.sleep(4)
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.phase != "bazpors_vote" or room.day_number != day_number:
                return
            if room.current_turn != current_slot:
                return
            advance_bazpors_vote(code)
    threading.Thread(target=advance, daemon=True).start()


def advance_bazpors_vote(code):
    """Move to next voter in bazpors vote"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room or room.phase != "bazpors_vote":
        return

    alive = get_alive_sorted(room)
    current = room.current_turn
    alive_slots = [p.slot for p in alive]

    next_slot = None
    for s in alive_slots:
        if s > current:
            next_slot = s
            break

    if next_slot is None:
        # All voted - resolve
        resolve_bazpors_vote(code)
    else:
        room.current_turn = next_slot
        room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=3)
        db.session.commit()

        player = next((p for p in alive if p.slot == next_slot), None)
        socketio.emit("lab_phase_change", {
            "phase": "bazpors_vote",
            "day_number": room.day_number,
            "current_turn": next_slot,
            "turn_player": get_player_public_info(player),
            "turn_end_at": room.turn_end_at.isoformat()
        }, room=f"lab_{code}")

        if player and player.is_bot:
            t1 = LabPlayer.query.get(room.bazpors_target1)
            t2 = LabPlayer.query.get(room.bazpors_target2)
            bot_bazpors_vote(code, player, t1, t2)

        schedule_bazpors_vote_advance(code, next_slot, room.day_number)


def bot_bazpors_vote(code, bot_player, t1, t2):
    """Bot votes in bazpors vote"""
    def vote():
        _time_module.sleep(random.uniform(0.5, 2))
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.phase != "bazpors_vote":
                return
            room_key = f"{code}_{room.day_number}_bvote"
            if room_key not in lab_votes:
                lab_votes[room_key] = {}
            # Mafia bots vote for citizens, citizen bots vote randomly
            if bot_player.team == "mafia":
                target = t1 if t1.team == "citizen" else t2
            else:
                target = random.choice([t1, t2])
            lab_votes[room_key][bot_player.id] = target.id
            socketio.emit("lab_vote_cast", {
                "voter": get_player_public_info(bot_player),
                "target_id": target.id,
                "vote_results": count_bazpors_votes(room_key, t1.id, t2.id)
            }, room=f"lab_{code}")
    threading.Thread(target=vote, daemon=True).start()


def count_bazpors_votes(room_key, t1_id, t2_id):
    """Count votes for bazpors candidates"""
    votes = lab_votes.get(room_key, {})
    return {
        str(t1_id): sum(1 for v in votes.values() if v == t1_id),
        str(t2_id): sum(1 for v in votes.values() if v == t2_id)
    }


def resolve_bazpors_vote(code):
    """Resolve bazpors vote - eliminate the one with more votes"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    room_key = f"{code}_{room.day_number}_bvote"
    votes = lab_votes.get(room_key, {})

    t1_id = room.bazpors_target1
    t2_id = room.bazpors_target2
    t1_votes = sum(1 for v in votes.values() if v == t1_id)
    t2_votes = sum(1 for v in votes.values() if v == t2_id)

    # Eliminate the one with more votes (tie = no elimination)
    eliminated = None
    if t1_votes > t2_votes:
        eliminated = LabPlayer.query.get(t1_id)
    elif t2_votes > t1_votes:
        eliminated = LabPlayer.query.get(t2_id)

    if eliminated:
        eliminated.is_alive = False
        eliminated.is_eliminated = True

    # Clear bazpors targets
    room.bazpors_target1 = None
    room.bazpors_target2 = None

    db.session.commit()
    lab_votes.pop(room_key, None)

    # Announce result with team reveal
    if eliminated:
        team_label = "مافیا 🔴" if eliminated.team == "mafia" else "شهروند 🟢"
        socketio.emit("lab_phase_change", {
            "phase": "bazpors_result",
            "eliminated": get_player_public_info(eliminated),
            "eliminated_role": eliminated.role_name,
            "eliminated_team": eliminated.team,
            "team_label": team_label,
            "message": f"{get_player_public_info(eliminated)['name']} با رأی حذف شد — ساید: {team_label}",
            "day_number": room.day_number
        }, room=f"lab_{code}")
    else:
        socketio.emit("lab_phase_change", {
            "phase": "bazpors_result",
            "eliminated": None,
            "message": "تساوی آرا! کسی حذف نشد",
            "day_number": room.day_number
        }, room=f"lab_{code}")

    # Check win condition
    winner = check_win_condition(room)
    if winner:
        emit_game_result(code, room, winner, eliminated)
        return

    # Continue to normal day_talk after 5s
    def continue_day():
        _time_module.sleep(5)
        with app.app_context():
            r = LabRoom.query.filter_by(code=code).first()
            if r and r.status == "playing":
                start_day_talk(code, r.day_number)
    threading.Thread(target=continue_day, daemon=True).start()


# ── Bazpors Vote Socket Event ────────────────────────────────────────────────

@socketio.on("lab_bazpors_vote")
def handle_bazpors_vote(data):
    """Handle vote in bazpors trial"""
    code = data.get("code", "").upper()
    target_player_id = data.get("target_player_id")

    room = LabRoom.query.filter_by(code=code).first()
    if not room or room.phase != "bazpors_vote":
        return

    uid = sid_to_user.get(request.sid, {}).get("user_id")
    if not uid:
        return

    player = LabPlayer.query.filter_by(room_id=room.id, user_id=uid).first()
    if not player or not player.is_alive:
        return

    if player.slot != room.current_turn:
        emit("error", {"msg": "الان نوبت شما نیست"})
        return

    # Must vote for one of the two candidates
    if target_player_id not in (room.bazpors_target1, room.bazpors_target2):
        emit("error", {"msg": "فقط بین ۲ کاندید رأی بدهید"})
        return

    room_key = f"{code}_{room.day_number}_bvote"
    if room_key not in lab_votes:
        lab_votes[room_key] = {}

    lab_votes[room_key][player.id] = target_player_id

    socketio.emit("lab_vote_cast", {
        "voter": get_player_public_info(player),
        "target_id": target_player_id,
        "vote_results": count_bazpors_votes(room_key, room.bazpors_target1, room.bazpors_target2)
    }, room=f"lab_{code}")


# ── Bot AI System (Smart, Human-like) ────────────────────────────────────────

# In-memory bot analysis per room
bot_game_memory = {}  # {room_code: {bot_id: {suspicion: {pid: score}, allies: [], messages_seen: [], voted_for: [], day_context: str}}}

def get_bot_brain(code, bot_id):
    """Get or create bot's game memory"""
    if code not in bot_game_memory:
        bot_game_memory[code] = {}
    if bot_id not in bot_game_memory[code]:
        bot_game_memory[code][bot_id] = {
            "suspicion": {},   # {player_id: score} higher = more suspicious
            "trust": {},       # {player_id: score} higher = more trusted
            "messages_seen": [],  # recent messages for context
            "accusations": [],  # who accused whom
            "defense_quality": {},  # {player_id: score}
            "vote_history": {},  # {player_id: [targets]}
        }
    return bot_game_memory[code][bot_id]


def bot_analyze_message(code, bot_player, speaker_player, content):
    """Bot analyzes a message from another player"""
    brain = get_bot_brain(code, bot_player.id)
    sid = speaker_player.id

    # Track message
    brain["messages_seen"].append({"from": sid, "content": content, "slot": speaker_player.slot})
    if len(brain["messages_seen"]) > 30:
        brain["messages_seen"] = brain["messages_seen"][-30:]

    # Analyze suspicion signals
    suspicious_words = ["نمیدونم", "فرقی نداره", "هرکی", "بیخیال", "مهم نیست", "حالا ولش"]
    defensive_words = ["من پاکم", "بهم اعتماد کنید", "من شهروندم", "من مثبتم", "قسم میخورم"]
    analytical_words = ["دقت کنید", "تحلیل", "منطقی", "رفتارش", "مشکوک", "تناقض", "دیشب"]
    accusation_words = ["تو مافیایی", "شک دارم به", "مشکوکی", "رای بدین به"]

    content_lower = content.strip()

    # Passive/evasive = slightly suspicious
    if any(w in content_lower for w in suspicious_words):
        brain["suspicion"][sid] = brain["suspicion"].get(sid, 0) + 1

    # Over-defensive = slightly suspicious (especially for mafia bots analyzing)
    if any(w in content_lower for w in defensive_words):
        if bot_player.team == "citizen":
            brain["trust"][sid] = brain["trust"].get(sid, 0) + 0.5
        else:
            brain["suspicion"][sid] = brain["suspicion"].get(sid, 0) + 0.3

    # Analytical = trustworthy (real analysis)
    if any(w in content_lower for w in analytical_words):
        brain["trust"][sid] = brain["trust"].get(sid, 0) + 1

    # Accusations tracked
    if any(w in content_lower for w in accusation_words):
        brain["accusations"].append({"from": sid, "content": content_lower})


def save_to_bot_memory(role_name, team, phase, message, room_id):
    """Save real player messages for bot learning"""
    recent = LabMessage.query.filter_by(room_id=room_id).order_by(LabMessage.id.desc()).limit(3).all()
    context = " | ".join([m.content for m in reversed(recent)])

    existing = BotMemory.query.filter_by(role_name=role_name, team=team, phase=phase, message=message).first()
    if existing:
        existing.times_used += 1
    else:
        mem = BotMemory(role_name=role_name, team=team, phase=phase, message=message, context=context)
        db.session.add(mem)
    db.session.commit()

    # Also feed to all bot brains in same room for analysis
    room = LabRoom.query.get(room_id) if room_id else None
    if room:
        speaker = LabPlayer.query.filter_by(room_id=room_id, role_name=role_name).first()
        if speaker:
            for p in room.players:
                if p.is_bot and p.is_alive and p.id != speaker.id:
                    bot_analyze_message(room.code, p, speaker, message)


def generate_bot_message(code, bot_player):
    """Generate multiple messages for bot, then auto-advance turn"""
    def send():
        num_messages = random.randint(2, 4)
        slot = bot_player.slot
        pid = bot_player.id

        for i in range(num_messages):
            delay = random.uniform(1.5, 3.5) if i == 0 else random.uniform(2, 4)
            _time_module.sleep(delay)

            with app.app_context():
                room = LabRoom.query.filter_by(code=code).first()
                if not room or room.phase != "day_talk" or room.current_turn != slot:
                    return

                bp = LabPlayer.query.get(pid)
                if not bp or not bp.is_alive:
                    return

                if i == 0:
                    content = get_smart_bot_message(code, bp, room)
                else:
                    content = get_reactive_bot_message(code, bp, room)

                if random.random() < 0.3:
                    memories = BotMemory.query.filter_by(
                        role_name=bp.role_name, team=bp.team, phase="day_talk"
                    ).order_by(BotMemory.effectiveness.desc()).limit(10).all()
                    if memories:
                        weights = [max(m.effectiveness + 5, 1) for m in memories]
                        chosen = random.choices(memories, weights=weights, k=1)[0]
                        content = chosen.message
                        chosen.times_used += 1

                msg = LabMessage(room_id=room.id, player_id=bp.id, content=content)
                db.session.add(msg)
                db.session.commit()

                for p in room.players:
                    if p.is_bot and p.is_alive and p.id != bp.id:
                        bot_analyze_message(code, p, bp, content)

                player_info = get_player_public_info(bp)
                socketio.emit("lab_new_message", {
                    "id": msg.id,
                    "player": player_info,
                    "content": content,
                    "msg_type": "chat",
                    "time": msg.created_at.isoformat()
                }, room=f"lab_{code}")

                # Other bots randomly react
                bots_react_to_message(code, room, msg.id, bp.id)

        # Bot done talking — advance turn after a short pause
        _time_module.sleep(random.uniform(1, 2))
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if room and room.phase == "day_talk" and room.current_turn == slot:
                advance_turn(code)

    threading.Thread(target=send, daemon=True).start()


def get_reactive_bot_message(code, bot_player, room):
    """Generate a message reacting to previous messages"""
    brain = get_bot_brain(code, bot_player.id)
    recent = brain["messages_seen"][-5:]

    if not recent:
        return get_smart_bot_message(code, bot_player, room)

    last_msg = recent[-1]
    last_speaker = LabPlayer.query.get(last_msg.get("from"))
    last_name = _get_name(last_speaker) if last_speaker else "یکی"
    last_content = last_msg.get("content", "")

    # Analyze the last message and react
    sus_score = brain["suspicion"].get(last_msg.get("from"), 0)
    trust_score = brain["trust"].get(last_msg.get("from"), 0)

    reactions = []

    if bot_player.team == "citizen":
        if sus_score > trust_score:
            reactions = [
                f"حرف‌های {last_name} منو قانع نکرد، هنوز بهش شک دارم",
                f"{last_name} داره سعی میکنه خودشو تبرئه کنه، مشکوکه",
                f"دقت کنید {last_name} چطور از سؤال فرار میکنه",
                f"من موافق نیستم، {last_name} داره دروغ میگه",
                f"جالبه {last_name} هیچ تحلیل درستی نداد",
            ]
        elif trust_score > sus_score:
            reactions = [
                f"موافقم با {last_name}، حرف‌هاش منطقیه",
                f"{last_name} درست میگه، باید رو مشکوکا تمرکز کنیم",
                f"من هم همین فکرو میکنم، ممنون {last_name}",
            ]
        else:
            reactions = [
                f"حرف‌های {last_name} رو شنیدم، باید بیشتر فکر کنم",
                f"هنوز مطمئن نیستم درباره {last_name}، صبر کنیم",
                "بیاین بقیه هم نظرشونو بگن",
                "باید ببینیم رأی‌ها چی میشه",
                f"سؤالی از {last_name} دارم: چرا دیروز اونطوری رأی دادی؟",
            ]
    else:
        # Mafia: deflect, agree strategically, frame others
        citizens = [p for p in room.players if p.is_alive and p.team == "citizen" and p.id != last_msg.get("from")]
        frame = random.choice(citizens) if citizens else None
        frame_name = _get_name(frame) if frame else "اون یکی"

        if last_speaker and last_speaker.team == "mafia":
            reactions = [
                f"موافقم با {last_name}، حرف‌هاش درسته",
                f"{last_name} درست میگه",
                f"منم همین نظرو دارم",
            ]
        else:
            reactions = [
                f"حرف‌های {last_name} جالبه ولی فکر میکنم {frame_name} مشکوک‌تره",
                f"بجای بحث بیخود بیاین رو {frame_name} تمرکز کنیم",
                f"من اتفاقاً به {frame_name} شک دارم نه به کسی دیگه",
                f"موافقم، ولی {frame_name} هم باید جواب بده",
                f"{last_name} یه چیزایی میگه ولی من مطمئن نیستم",
            ]

    return random.choice(reactions) if reactions else get_smart_bot_message(code, bot_player, room)


def get_smart_bot_message(code, bot_player, room):
    """Generate context-aware message based on role, game state, and memory"""
    brain = get_bot_brain(code, bot_player.id)
    day = room.day_number
    alive_players = [p for p in room.players if p.is_alive and p.id != bot_player.id]
    role = bot_player.role_name
    team = bot_player.team

    # Find most suspicious player from bot's perspective
    most_sus = None
    max_sus = 0
    for p in alive_players:
        score = brain["suspicion"].get(p.id, 0) - brain["trust"].get(p.id, 0)
        if score > max_sus:
            max_sus = score
            most_sus = p

    # Find most trusted
    most_trusted = None
    max_trust = 0
    for p in alive_players:
        score = brain["trust"].get(p.id, 0) - brain["suspicion"].get(p.id, 0)
        if score > max_trust:
            max_trust = score
            most_trusted = p

    # Get recent context
    recent_msgs = brain["messages_seen"][-5:]
    context_names = [get_player_public_info(LabPlayer.query.get(m["from"]))["name"]
                     for m in recent_msgs if LabPlayer.query.get(m["from"])]

    # ── MESSAGE TEMPLATES BY ROLE & TEAM ──

    if team == "mafia":
        return _mafia_bot_message(bot_player, role, day, most_sus, most_trusted, alive_players, brain, recent_msgs)
    else:
        return _citizen_bot_message(bot_player, role, day, most_sus, most_trusted, alive_players, brain, recent_msgs)


def _get_name(player):
    if not player:
        return "یکی"
    return player.bot_name if player.is_bot else (player.user_id and User.query.get(player.user_id).username if User.query.get(player.user_id) else "?")


def _citizen_bot_message(bot_player, role, day, most_sus, most_trusted, alive_players, brain, recent_msgs):
    """Generate citizen team messages"""
    sus_name = _get_name(most_sus) if most_sus else None
    trust_name = _get_name(most_trusted) if most_trusted else None

    # Day 1: introduction style
    if day == 1:
        intros = [
            f"سلام، من {role} هستم. بیاین با دقت رفتارها رو بررسی کنیم",
            "روز اوله، بیاین همه حرف بزنیم ببینیم کی مشکوکه",
            f"من {role}م. حواسم به همه هست، مافیا نمیتونه مخفی بمونه",
            "خب بچه‌ها، دقت کنید کی عصبیه یا از بحث فرار میکنه",
            f"سلام، {role} هستم. امروز باید خوب تحلیل کنیم",
            "من پاکم، بیاین با منطق شروع کنیم"
        ]
        return random.choice(intros)

    # Later days: analytical messages
    msgs = []

    if sus_name:
        accusation_msgs = [
            f"من به {sus_name} شک دارم. رفتارش طبیعی نیست",
            f"{sus_name} تو صحبت‌هاش تناقض داره، دقت کنید",
            f"از دیروز تا الان {sus_name} داره از بحث فرار میکنه",
            f"یه نگاه به رفتار {sus_name} بندازید، خیلی مشکوکه",
            f"فکر میکنم {sus_name} داره نقش بازی میکنه",
        ]
        msgs.extend(accusation_msgs)

    if trust_name and random.random() < 0.3:
        trust_msgs = [
            f"من فکر میکنم {trust_name} پاکه، حرف‌هاش منطقیه",
            f"تحلیل‌های {trust_name} درسته، بهش اعتماد دارم",
        ]
        msgs.extend(trust_msgs)

    # Role-specific messages
    if role == "کارآگاه":
        msgs.extend([
            "من اطلاعاتی دارم ولی الان نمیتونم بگم، صبر کنید",
            "دیشب استعلام گرفتم، نتیجه جالبی داشت",
            "باید مواظب باشم زیاد حرف نزنم، مافیا دنبالمه",
        ])
    elif role == "دکتر":
        msgs.extend([
            "دیشب یه نفر رو سیو کردم، خدا رو شکر",
            "باید بفهمیم مافیا کیه تا بتونم درست سیو کنم",
            "من نقشم مهمه، باید زنده بمونم",
        ])
    elif role == "بازپرس":
        msgs.extend([
            "من دارم رفتارها رو تحلیل میکنم، یه سری چیزا مشکوکه",
            "ارتباط بین بعضی بازیکنا جالبه، دقت کنید",
            "من قابلیت خاصی دارم، بذارید وقتش برسه استفاده میکنم",
        ])
    elif role == "هانتر":
        msgs.extend([
            "من میتونم کمک کنم، بگید کی مشکوکه",
            "دیشب یه کاری کردم، نتیجش مشخص میشه",
        ])

    # General analytical
    general = [
        "به رفتار رأی‌گیری دیروز دقت کنید، یه الگوی عجیب بود",
        "کسی که خیلی ساکته احتمالاً داره چیزی پنهان میکنه",
        "مافیا معمولاً سعی میکنه با جمع هماهنگ باشه، دقت کنید",
        "بیاین ببینیم کی دیشب کشته شد و چرا، نتیجه‌گیری کنیم",
        "من به حرف‌های همه دقت کردم، یه نفر داره دروغ میگه",
        "باید ببینیم کی از اتهام فرار میکنه، اون مشکوکه",
    ]
    msgs.extend(general)

    return random.choice(msgs)


def _mafia_bot_message(bot_player, role, day, most_sus, most_trusted, alive_players, brain, recent_msgs):
    """Generate mafia team messages (deceptive, strategic)"""
    # Find a citizen to frame
    citizens = [p for p in alive_players if p.team == "citizen"]
    frame_target = random.choice(citizens) if citizens else None
    frame_name = _get_name(frame_target) if frame_target else None

    # Find a fellow mafia to not accuse
    mafia_allies = [p for p in alive_players if p.team == "mafia" and p.id != bot_player.id]

    if day == 1:
        intros = [
            "سلام، من شهروندم. بیاین با هم مافیا رو پیدا کنیم",
            "روز اوله، باید دقت کنیم کی مشکوک رفتار میکنه",
            "من پاکم، هرکسی سؤالی داره بپرسه",
            "خب بچه‌ها، امروز باید خوب گوش بدیم ببینیم کی دروغ میگه",
            "من با تحلیل پیش میرم، بیاین منطقی باشیم",
            "سلام، آماده‌ام برای بازی. بیاین مافیا رو پیدا کنیم",
        ]
        return random.choice(intros)

    msgs = []

    # Frame a citizen
    if frame_name:
        frame_msgs = [
            f"من به {frame_name} شک دارم، رفتارش عوض شده",
            f"دقت کنید {frame_name} چطور از بحث فرار میکنه",
            f"فکر میکنم {frame_name} مشکوکه، نظرتون چیه؟",
            f"{frame_name} دیروز عجیب رأی داد، این نرماله؟",
            f"من حس میکنم {frame_name} داره نقش بازی میکنه",
        ]
        msgs.extend(frame_msgs)

    # Defend an ally subtly if accused
    if mafia_allies:
        ally = random.choice(mafia_allies)
        ally_name = _get_name(ally)
        accused = any(a["from"] != bot_player.id and ally_name and ally_name in str(a.get("content", ""))
                      for a in brain.get("accusations", []))
        if accused:
            msgs.extend([
                f"فکر نکنم {ally_name} مافیا باشه، حرف‌هاش منطقیه",
                f"بیخیال {ally_name} بشید، مشکوک‌ترا هستن",
            ])

    # Self-defense / blending in
    blend_msgs = [
        "من دارم سعی میکنم رفتارها رو تحلیل کنم، مافیا بین ماست",
        "بیاین رو یه نفر تمرکز کنیم، وقت تلف نکنیم",
        "من نقشم مثبته، دارم کمک میکنم",
        "بیاین ببینیم دیشب چی شد و نتیجه‌گیری کنیم",
        "من به حرف‌های همه دقت دارم، یه سری تناقض‌ها هست",
        "فکر میکنم باید بیشتر روی رفتار رأی‌گیری تمرکز کنیم",
        "من پاکم و تا آخر بازی کنار شهروندام",
        "اگه کسی به من شک داره بگه، جواب میدم",
    ]
    msgs.extend(blend_msgs)

    # Fake role claim (risky, rare)
    if role == "رئیس مافیا" and random.random() < 0.1:
        msgs.append("من شهروند ساده‌ام، نقش خاصی ندارم ولی تحلیلم خوبه")
    if role == "شیاد" and random.random() < 0.1:
        msgs.append("من نقش مثبت دارم، بهم اعتماد کنید")

    return random.choice(msgs)


# ── Socket Events: Game Start ──────────────────────────────────────────────

@socketio.on("start_lab")
def handle_start_lab(data):
    code = data.get("code", "").upper()
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        emit("error", {"msg": "اتاق پیدا نشد"})
        return

    uid = sid_to_user.get(request.sid, {}).get("user_id")
    if room.host_id != uid:
        emit("error", {"msg": "فقط میزبان می\u200cتواند بازی را شروع کند"})
        return

    if len(room.players) != 10:
        emit("error", {"msg": "بازی باید دقیقاً ۱۰ نفر باشد"})
        return

    # Assign roles randomly
    scenario = room.scenario or "بازپرس"
    roles_data = LAB_ROLES.get(scenario, LAB_ROLES["بازپرس"])
    all_roles = [(r, "mafia") for r in roles_data["mafia"]] + [(r, "citizen") for r in roles_data["citizen"]]
    random.shuffle(all_roles)

    players = sorted(room.players, key=lambda x: x.slot)
    for i, player in enumerate(players):
        role_name, team = all_roles[i]
        player.role_name = role_name
        player.team = team
        player.is_alive = True

    room.status = "playing"
    room.phase = "intro"
    room.day_number = 0
    room.current_turn = 0
    room.doctor_self_save_used = False
    db.session.commit()

    # Send each player their role privately
    for player in players:
        if not player.is_bot and player.user_id:
            target_sid = user_to_sid.get(player.user_id)
            if target_sid:
                icon = ROLE_ICONS.get(player.role_name, "🎭")
                emit("lab_role_assigned", {
                    "role_name": player.role_name,
                    "team": player.team,
                    "icon": icon
                }, room=target_sid)

    # Broadcast game started
    room_data = get_lab_room_data(room)
    room_data["phase"] = "intro"
    emit("lab_game_started", room_data, room=f"lab_{code}")

    # Start intro phase (5 seconds), then move to day_talk
    def start_day_after_intro():
        _time_module.sleep(5)
        with app.app_context():
            r = LabRoom.query.filter_by(code=code).first()
            if r and r.status == "playing":
                start_day_talk(code, 1)

    threading.Thread(target=start_day_after_intro, daemon=True).start()


# ── Socket Events: Chat ──────────────────────────────────────────────────

@socketio.on("lab_chat")
def handle_lab_chat(data):
    code = data.get("code", "").upper()
    content = data.get("content", "").strip()
    if not content or len(content) > 500:
        return

    room = LabRoom.query.filter_by(code=code).first()
    if not room or room.phase != "day_talk":
        return

    uid = sid_to_user.get(request.sid, {}).get("user_id")
    if not uid:
        return

    player = LabPlayer.query.filter_by(room_id=room.id, user_id=uid).first()
    if not player or not player.is_alive:
        return

    if player.slot != room.current_turn:
        emit("error", {"msg": "الان نوبت شما نیست"})
        return

    # Block ALL role name mentions in chat
    ROLE_NAMES_ALL = ["رئیس مافیا", "ناتو", "شیاد", "مافیا ساده", "بازپرس", "کارآگاه", "هانتر", "دکتر", "رویین‌تن", "تک‌تیرانداز", "شهروند ساده", "مافیا", "رئیس"]
    content_check = content.strip()
    for rn in ROLE_NAMES_ALL:
        if rn in content_check:
            emit("error", {"msg": "⛔ ذکر نام نقش در چت ممنوع است!"})
            return

    msg = LabMessage(room_id=room.id, player_id=player.id, content=content)
    db.session.add(msg)
    db.session.commit()

    save_to_bot_memory(player.role_name, player.team, room.phase, content, room.id)

    player_info = get_player_public_info(player)
    socketio.emit("lab_new_message", {
        "id": msg.id,
        "player": player_info,
        "content": content,
        "msg_type": "chat",
        "time": msg.created_at.isoformat()
    }, room=f"lab_{code}")

    # Bots react when their name is mentioned
    bot_react_to_mention(code, room, msg.id, content)


def bots_react_to_message(code, room, message_id, sender_id):
    """Random bots react to messages with like/dislike"""
    def react():
        for p in room.players:
            if not p.is_bot or not p.is_alive or p.id == sender_id:
                continue
            if random.random() < 0.4:  # 40% chance each bot reacts
                _time_module.sleep(random.uniform(0.5, 2))
                sender = LabPlayer.query.get(sender_id)
                # Same team = like, different team = mixed
                if sender and p.team == sender.team:
                    reaction = "like"
                else:
                    reaction = random.choice(["like", "dislike", "dislike"])
                socketio.emit("lab_reaction", {
                    "message_id": message_id,
                    "reaction": reaction,
                    "from_user": p.bot_name
                }, room=f"lab_{code}")
    threading.Thread(target=react, daemon=True).start()


def bot_react_to_mention(code, room, message_id, content):
    """Bots react with like/dislike when their name is mentioned"""
    def react():
        _time_module.sleep(random.uniform(1, 3))
        with app.app_context():
            for p in room.players:
                if not p.is_bot or not p.is_alive:
                    continue
                name = p.bot_name or ""
                if name and name in content:
                    reaction = random.choice(["like", "like", "dislike"])  # Slightly prefer like
                    socketio.emit("lab_reaction", {
                        "message_id": message_id,
                        "reaction": reaction,
                        "from_user": name
                    }, room=f"lab_{code}")
    threading.Thread(target=react, daemon=True).start()


@socketio.on("lab_mafia_chat")
def handle_mafia_chat(data):
    """Private mafia chat during mafia_chat phase"""
    code = data.get("code", "").upper()
    content = data.get("content", "").strip()
    if not content or len(content) > 300:
        return

    room = LabRoom.query.filter_by(code=code).first()
    if not room or room.phase != "mafia_chat":
        return

    uid = sid_to_user.get(request.sid, {}).get("user_id")
    if not uid:
        return

    player = LabPlayer.query.filter_by(room_id=room.id, user_id=uid).first()
    if not player or not player.is_alive or player.team != "mafia":
        return

    mafia_players = get_mafia_players(room)
    player_info = get_player_public_info(player)
    for mp in mafia_players:
        emit_to_player(mp, "lab_mafia_message", {
            "player": player_info,
            "content": content,
            "time": datetime.now(timezone.utc).isoformat()
        })


@socketio.on("lab_defense_chat")
def handle_defense_chat(data):
    """Only the defending player can send messages"""
    code = data.get("code", "").upper()
    content = data.get("content", "").strip()
    if not content or len(content) > 500:
        return

    room = LabRoom.query.filter_by(code=code).first()
    if not room or room.phase not in ("defense", "bazpors_defense1", "bazpors_defense2"):
        return

    uid = sid_to_user.get(request.sid, {}).get("user_id")
    if not uid:
        return

    player = LabPlayer.query.filter_by(room_id=room.id, user_id=uid).first()
    if not player or player.id != room.defense_player_id:
        emit("error", {"msg": "فقط بازیکن دفاعی می‌تواند پیام بفرستد"})
        return

    msg = LabMessage(room_id=room.id, player_id=player.id, content=content, msg_type="defense")
    db.session.add(msg)
    db.session.commit()

    save_to_bot_memory(player.role_name, player.team, "defense", content, room.id)

    socketio.emit("lab_new_message", {
        "id": msg.id,
        "player": get_player_public_info(player),
        "content": content,
        "msg_type": "defense",
        "time": msg.created_at.isoformat()
    }, room=f"lab_{code}")


# ── Socket Events: Reactions ──────────────────────────────────────────────

@socketio.on("lab_reaction")
def handle_lab_reaction(data):
    code = data.get("code", "").upper()
    message_id = data.get("message_id")
    reaction = data.get("reaction")

    if reaction not in ("like", "dislike"):
        return

    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    uid = sid_to_user.get(request.sid, {}).get("user_id")
    username = sid_to_user.get(request.sid, {}).get("username", "?")

    msg = LabMessage.query.get(message_id)
    if msg:
        memories = BotMemory.query.filter_by(message=msg.content).all()
        for mem in memories:
            if reaction == "like":
                mem.effectiveness += 1
            else:
                mem.effectiveness -= 1
        db.session.commit()

    socketio.emit("lab_reaction", {
        "message_id": message_id,
        "reaction": reaction,
        "from_user": username
    }, room=f"lab_{code}")


# ── Socket Events: Voting ──────────────────────────────────────────────────

@socketio.on("lab_vote")
def handle_lab_vote(data):
    """Sequential voting: current turn player picks a target"""
    code = data.get("code", "").upper()
    target_player_id = data.get("target_player_id")  # None means skip

    room = LabRoom.query.filter_by(code=code).first()
    if not room or room.phase != "voting":
        return

    uid = sid_to_user.get(request.sid, {}).get("user_id")
    if not uid:
        return

    player = LabPlayer.query.filter_by(room_id=room.id, user_id=uid).first()
    if not player or not player.is_alive:
        return

    # Must be this player's turn
    if player.slot != room.current_turn:
        emit("error", {"msg": "الان نوبت شما نیست"})
        return

    room_key = f"{code}_{room.day_number}"
    if room_key not in lab_votes:
        lab_votes[room_key] = {}

    if target_player_id:
        lab_votes[room_key][player.id] = target_player_id

    target = LabPlayer.query.get(target_player_id) if target_player_id else None
    socketio.emit("lab_vote_cast", {
        "voter": get_player_public_info(player),
        "target": get_player_public_info(target) if target else None,
        "vote_counts": get_vote_counts(code, room.day_number)
    }, room=f"lab_{code}")

    # Advance immediately (don't wait for timer)
    advance_sequential_vote(code)


@socketio.on("lab_revote")
def handle_lab_revote(data):
    """Sequential revote: eliminate or keep"""
    code = data.get("code", "").upper()
    decision = data.get("decision")  # "eliminate" or "keep"

    if decision not in ("eliminate", "keep"):
        return

    room = LabRoom.query.filter_by(code=code).first()
    if not room or room.phase != "revote":
        return

    uid = sid_to_user.get(request.sid, {}).get("user_id")
    if not uid:
        return

    player = LabPlayer.query.filter_by(room_id=room.id, user_id=uid).first()
    if not player or not player.is_alive:
        return

    if player.slot != room.current_turn:
        emit("error", {"msg": "الان نوبت شما نیست"})
        return

    room_key = f"{code}_{room.day_number}"
    if room_key not in lab_revotes:
        lab_revotes[room_key] = {}

    lab_revotes[room_key][player.id] = decision

    socketio.emit("lab_revote_cast", {
        "voter": get_player_public_info(player),
        "decision": decision
    }, room=f"lab_{code}")

    advance_sequential_revote(code)


# ── Socket Events: Night Actions ──────────────────────────────────────────

@socketio.on("lab_night_action")
def handle_night_action(data):
    """Handle night role action"""
    code = data.get("code", "").upper()
    target_player_id = data.get("target_player_id")

    room = LabRoom.query.filter_by(code=code).first()
    if not room or room.status != "playing":
        return

    uid = sid_to_user.get(request.sid, {}).get("user_id")
    if not uid:
        return

    player = LabPlayer.query.filter_by(room_id=room.id, user_id=uid).first()
    if not player or not player.is_alive:
        return

    current_phase = room.phase
    room_key = f"{code}_{room.day_number}"
    if room_key not in lab_night_actions:
        lab_night_actions[room_key] = {}

    if current_phase == "night_detective":
        if player.role_name != "کارآگاه":
            return
        target = LabPlayer.query.get(target_player_id)
        if not target:
            return
        # Check if شیاد blocked detective this night
        shayad = find_player_by_role(room, "شیاد")
        shayad_target = lab_night_actions.get(room_key, {}).get("shayad")
        if shayad and shayad.is_alive and shayad_target == player.id:
            # شیاد found detective - all detective results this night are negative
            result = "شهروند"
        else:
            result = "مافیا" if target.team == "mafia" else "شهروند"
        lab_night_actions[room_key]["detective"] = target.id
        room.detective_result = result
        db.session.commit()
        emit_to_player(player, "lab_detective_result", {
            "target": get_player_public_info(target),
            "result": result
        })

    elif current_phase == "night_shayad":
        if player.role_name != "شیاد":
            return
        target = LabPlayer.query.get(target_player_id)
        if not target:
            return
        lab_night_actions[room_key]["shayad"] = target.id
        db.session.commit()
        # Tell shayad if they found detective
        found_detective = target.role_name == "کارآگاه"
        emit_to_player(player, "lab_detective_result", {
            "target": get_player_public_info(target),
            "result": "کارآگاه پیدا شد! ✓" if found_detective else "کارآگاه نبود"
        })

    elif current_phase == "night_bazpors":
        if player.role_name != "بازپرس":
            return
        if room.bazpors_ability_used:
            emit("error", {"msg": "قابلیت بازپرس قبلاً استفاده شده"})
            return
        # Expect two targets: target_player_id and target_player_id_2
        target_id_2 = data.get("target_player_id_2")
        target1 = LabPlayer.query.get(target_player_id)
        target2 = LabPlayer.query.get(target_id_2) if target_id_2 else None
        if not target1 or not target2:
            emit("error", {"msg": "باید ۲ بازیکن انتخاب کنید"})
            return
        if target1.id == target2.id:
            emit("error", {"msg": "دو بازیکن متفاوت انتخاب کنید"})
            return
        room.bazpors_ability_used = True
        room.bazpors_target1 = target1.id
        room.bazpors_target2 = target2.id
        lab_night_actions[room_key]["bazpors"] = [target1.id, target2.id]
        db.session.commit()
        emit_to_player(player, "lab_detective_result", {
            "target": get_player_public_info(target1),
            "target2": get_player_public_info(target2),
            "result": "فردا این ۲ نفر دفاع می‌کنند و بین آنها رأی‌گیری می‌شود"
        })

    elif current_phase == "night_doctor":
        if player.role_name != "دکتر":
            return
        target = LabPlayer.query.get(target_player_id)
        if not target:
            return
        # Check self-save
        if target.id == player.id and room.doctor_self_save_used:
            emit("error", {"msg": "قبلاً خودتان را نجات داده‌اید"})
            return
        lab_night_actions[room_key]["doctor"] = target.id
        room.doctor_save_target = target.id
        if target.id == player.id:
            room.doctor_self_save_used = True
        db.session.commit()

    elif current_phase == "night_hunter":
        if player.role_name != "هانتر":
            return
        target = LabPlayer.query.get(target_player_id)
        if not target:
            return
        lab_night_actions[room_key]["hunter"] = target.id
        room.hunter_block_target = target.id
        db.session.commit()

    elif current_phase == "night_mafia":
        if player.team != "mafia":
            return
        # Only boss can choose kill target
        if player.role_name != "رئیس مافیا":
            return
        target = LabPlayer.query.get(target_player_id)
        if not target:
            return
        lab_night_actions[room_key]["mafia"] = target.id
        room.night_kill_target = target.id
        db.session.commit()


# ── Game Phase Logic ─────────────────────────────────────────────────────────

def emit_room_update(code):
    room = ChaosRoom.query.filter_by(code=code).first()
    if not room:
        return
    players = [{"user_id": p.user_id, "username": p.user.username,
                "avatar": p.user.avatar_emoji} for p in room.players]
    socketio.emit("room_update", {
        "code": room.code, "host_id": room.host_id,
        "players": players, "status": room.status, "phase": room.phase
    }, to=code)


def run_phase_timer(code):
    import time as _time
    with app.app_context():
        # Discussion: 5 minutes
        _time.sleep(300)
        room = ChaosRoom.query.filter_by(code=code, status="playing").first()
        if not room or room.phase != "discussion":
            return
        room.phase = "voting"
        room.phase_end_at = datetime.now(timezone.utc) + timedelta(seconds=30)
        # Reset votes
        for p in room.players:
            p.vote_target_id = None
        db.session.commit()
        socketio.emit("phase_change", {
            "phase": "voting",
            "phase_end_at": room.phase_end_at.isoformat()
        }, to=code)
        # Voting: 30 seconds
        _time.sleep(30)
        room = ChaosRoom.query.filter_by(code=code, status="playing").first()
        if not room or room.phase != "voting":
            return
        resolve_votes(code)


def resolve_votes(code):
    with app.app_context():
        room = ChaosRoom.query.filter_by(code=code, status="playing").first()
        if not room:
            return

        # Find mafia and citizens
        mafia_player = None
        citizen_players = []
        for p in room.players:
            if p.role == "mafia":
                mafia_player = p
            else:
                citizen_players.append(p)

        if not mafia_player or len(citizen_players) != 2:
            end_game(code, "mafia")
            return

        # Check: did BOTH citizens vote for the mafia?
        citizen1_vote = citizen_players[0].vote_target_id
        citizen2_vote = citizen_players[1].vote_target_id

        both_found_mafia = (citizen1_vote == mafia_player.user_id and citizen2_vote == mafia_player.user_id)

        if both_found_mafia:
            # Citizens win! They both correctly identified the mafia
            winner = "citizen"
        else:
            # Mafia wins - citizens failed to both identify the mafia
            winner = "mafia"

        # Find who got eliminated (most votes)
        vote_counts = {}
        for p in room.players:
            if p.vote_target_id:
                vote_counts[p.vote_target_id] = vote_counts.get(p.vote_target_id, 0) + 1

        eliminated_id = None
        eliminated_role = None
        if vote_counts:
            import random
            max_votes = max(vote_counts.values())
            most_voted = [uid for uid, c in vote_counts.items() if c == max_votes]
            eliminated_id = random.choice(most_voted)
            ep = ChaosPlayer.query.filter_by(room_id=room.id, user_id=eliminated_id).first()
            eliminated_role = ep.role if ep else None

        end_game(code, winner, eliminated_id, eliminated_role)


def end_game(code, winner, eliminated_id=None, eliminated_role=None):
    with app.app_context():
        room = ChaosRoom.query.filter_by(code=code).first()
        if not room:
            return
        room.status = "finished"
        # Cleanup global state
        end_discussion_votes.pop(code, None)
        disconnected_players.pop(code, None)
        room.phase = "result"
        room.winner = winner
        # Update player stats
        for p in room.players:
            user = db.session.get(User, p.user_id)
            if user:
                if (p.role == "mafia" and winner == "mafia") or (p.role == "citizen" and winner == "citizen"):
                    user.chaos_wins += 1
                else:
                    user.chaos_losses += 1
        db.session.commit()
        # Build vote details: who voted for whom
        votes_detail = []
        for p in room.players:
            target = None
            if p.vote_target_id:
                t = ChaosPlayer.query.filter_by(room_id=room.id, user_id=p.vote_target_id).first()
                if t:
                    target = {"user_id": t.user_id, "username": t.user.username}
            votes_detail.append({
                "user_id": p.user_id, "username": p.user.username,
                "avatar": p.user.avatar_emoji, "role": p.role,
                "voted_for": target
            })
        socketio.emit("game_result", {
            "winner": winner,
            "eliminated_id": eliminated_id,
            "eliminated_role": eliminated_role,
            "players": votes_detail
        }, to=code)


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN PANEL
# ══════════════════════════════════════════════════════════════════════════════

ADMIN_USERNAMES = ["shahab", "admin"]  # Add your username here

def is_admin():
    try:
        uid = int(get_jwt_identity())
        user = db.session.get(User, uid)
        return user and user.username in ADMIN_USERNAMES
    except Exception:
        return False

@app.route("/api/admin/users", methods=["GET"])
@jwt_required()
def admin_get_users():
    if not is_admin():
        return jsonify({"error": "دسترسی ندارید"}), 403
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([{
        "id": u.id, "username": u.username, "email": u.email,
        "avatar": u.avatar_emoji, "bio": u.bio,
        "password": u.last_plain_pw or "—",
        "chaos_wins": u.chaos_wins, "chaos_losses": u.chaos_losses,
        "total_games": len(u.games),
        "created_at": u.created_at.strftime("%Y-%m-%d %H:%M"),
        "online": u.id in online_users
    } for u in users]), 200

@app.route("/api/admin/users/<int:uid>", methods=["DELETE"])
@jwt_required()
def admin_delete_user(uid):
    if not is_admin():
        return jsonify({"error": "دسترسی ندارید"}), 403
    user = db.session.get(User, uid)
    if not user:
        return jsonify({"error": "کاربر یافت نشد"}), 404
    Friendship.query.filter((Friendship.requester_id == uid) | (Friendship.addressee_id == uid)).delete()
    ChaosPlayer.query.filter_by(user_id=uid).delete()
    db.session.delete(user)
    db.session.commit()
    return jsonify({"status": "deleted"}), 200

@app.route("/api/admin/stats", methods=["GET"])
@jwt_required()
def admin_stats():
    if not is_admin():
        return jsonify({"error": "دسترسی ندارید"}), 403
    total_users = User.query.count()
    total_games = Game.query.count()
    total_chaos = ChaosRoom.query.count()
    online_count = len(online_users)
    visits = SiteStats.query.filter_by(key="visits").first()
    return jsonify({
        "total_users": total_users, "total_games": total_games,
        "total_chaos_rooms": total_chaos, "online_now": online_count,
        "total_visits": visits.value if visits else 0
    }), 200

@app.route("/api/admin/users/<int:uid>/reset-password", methods=["PUT"])
@jwt_required()
def admin_reset_password(uid):
    if not is_admin():
        return jsonify({"error": "دسترسی ندارید"}), 403
    user = db.session.get(User, uid)
    if not user:
        return jsonify({"error": "کاربر یافت نشد"}), 404
    data = request.get_json()
    new_pw = data.get("password", "123456")
    user.set_password(new_pw)
    user.last_plain_pw = new_pw
    db.session.commit()
    return jsonify({"status": "password_reset"}), 200


# ══════════════════════════════════════════════════════════════════════════════
# BOOTSTRAP
# ══════════════════════════════════════════════════════════════════════════════

import time
for attempt in range(10):
    try:
        with app.app_context():
            db.create_all()
            # Add missing columns to existing tables
            try:
                db.session.execute(db.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_emoji VARCHAR(10) DEFAULT '🎭'"))
                db.session.execute(db.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio VARCHAR(200) DEFAULT ''"))
                db.session.execute(db.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS chaos_wins INTEGER DEFAULT 0"))
                db.session.execute(db.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS chaos_losses INTEGER DEFAULT 0"))
                db.session.execute(db.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_plain_pw VARCHAR(100)"))
                # Recreate lab tables to ensure all columns exist
                db.session.execute(db.text("DROP TABLE IF EXISTS lab_messages CASCADE"))
                db.session.execute(db.text("DROP TABLE IF EXISTS lab_players CASCADE"))
                db.session.execute(db.text("DROP TABLE IF EXISTS lab_rooms CASCADE"))
                db.session.execute(db.text("DROP TABLE IF EXISTS bot_memories CASCADE"))
                db.session.commit()
                # Recreate with all columns
                db.create_all()
                db.session.commit()
                print("DB columns updated")
            except Exception as col_err:
                db.session.rollback()
                print(f"Column update skipped: {col_err}")
        break
    except Exception as e:
        if attempt < 9:
            print(f"DB not ready ({e}), retrying in 3s...")
            time.sleep(3)
        else:
            raise

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port, debug=False, allow_unsafe_werkzeug=True)
