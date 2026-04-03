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
    uid = int(get_jwt_identity())
    # Clean up old waiting rooms by this user
    LabRoom.query.filter_by(host_id=uid, status="waiting").delete()
    db.session.commit()

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
        "turn_end_at": room.turn_end_at.isoformat() if room.turn_end_at else None
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

lab_votes = {}  # Global: {room_code_day: {player_id: target_player_id}}


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


def schedule_turn_timer(code, current_slot, day_number):
    """Schedule auto-advance after 20 seconds"""
    import threading, time
    def advance():
        time.sleep(21)
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.status != "playing" or room.phase != "day_talk":
                return
            if room.current_turn != current_slot or room.day_number != day_number:
                return
            advance_turn(code)
    threading.Thread(target=advance, daemon=True).start()


def advance_turn(code):
    """Move to next player's turn"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room or room.phase != "day_talk":
        return

    current = room.current_turn
    players = sorted(room.players, key=lambda x: x.slot)
    alive_players = [p for p in players if p.is_alive]
    alive_slots = [p.slot for p in alive_players]

    # Find next alive player after current
    next_slot = None
    for s in alive_slots:
        if s > current:
            next_slot = s
            break

    if next_slot is None:
        # All players have spoken - move to voting
        room.phase = "voting"
        room.current_turn = 0
        room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=30)
        db.session.commit()

        # Get alive players for voting
        vote_players = [get_player_public_info(p) for p in alive_players]
        socketio.emit("lab_phase_change", {
            "phase": "voting",
            "day_number": room.day_number,
            "players": vote_players,
            "turn_end_at": room.turn_end_at.isoformat()
        }, room=f"lab_{code}")

        # Schedule voting end
        schedule_voting_end(code, room.day_number)

        # Bots vote
        bot_vote(code)
    else:
        room.current_turn = next_slot
        room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=20)
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

        schedule_turn_timer(code, next_slot, room.day_number)

        # If it's a bot's turn, generate a message
        if player and player.is_bot:
            generate_bot_message(code, player)


def schedule_voting_end(code, day_number):
    import threading, time
    def end_voting():
        time.sleep(31)
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.phase != "voting" or room.day_number != day_number:
                return
            resolve_lab_votes(code)
    threading.Thread(target=end_voting, daemon=True).start()


def resolve_lab_votes(code):
    """Count votes and eliminate most voted player"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    room_key = f"{code}_{room.day_number}"
    votes = lab_votes.get(room_key, {})

    # Count votes per target
    vote_counts = {}
    for voter_id, target_id in votes.items():
        vote_counts[target_id] = vote_counts.get(target_id, 0) + 1

    eliminated_id = None
    max_votes = 0
    if vote_counts:
        eliminated_id = max(vote_counts, key=vote_counts.get)
        max_votes = vote_counts[eliminated_id]

    eliminated_player = None
    if eliminated_id:
        eliminated_player = LabPlayer.query.get(eliminated_id)
        if eliminated_player:
            eliminated_player.is_alive = False
            eliminated_player.is_eliminated = True

    db.session.commit()

    # Check win condition
    alive_players = [p for p in room.players if p.is_alive]
    alive_mafia = [p for p in alive_players if p.team == "mafia"]
    alive_citizens = [p for p in alive_players if p.team == "citizen"]

    winner = None
    if len(alive_mafia) == 0:
        winner = "citizen"
    elif len(alive_mafia) >= len(alive_citizens):
        winner = "mafia"

    if winner:
        room.status = "finished"
        room.phase = "result"
        db.session.commit()

        # Reveal all roles
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
            "players": all_players,
            "votes": {str(k): v for k, v in votes.items()}
        }, room=f"lab_{code}")
    else:
        # Night phase - show who was eliminated, then start next day
        elim_info = get_player_public_info(eliminated_player) if eliminated_player else None
        socketio.emit("lab_phase_change", {
            "phase": "night",
            "day_number": room.day_number,
            "eliminated": elim_info,
            "eliminated_role": eliminated_player.role_name if eliminated_player else None,
            "eliminated_votes": max_votes
        }, room=f"lab_{code}")

        room.phase = "night"
        db.session.commit()

        # After 5 seconds, start next day
        import threading, time
        def next_day():
            time.sleep(5)
            with app.app_context():
                r = LabRoom.query.filter_by(code=code).first()
                if not r or r.status != "playing":
                    return
                r.phase = "day_talk"
                r.day_number += 1

                alive = sorted([p for p in r.players if p.is_alive], key=lambda x: x.slot)
                if alive:
                    r.current_turn = alive[0].slot
                    r.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=20)
                    db.session.commit()

                    player_info = get_player_public_info(alive[0])
                    socketio.emit("lab_phase_change", {
                        "phase": "day_talk",
                        "day_number": r.day_number,
                        "current_turn": alive[0].slot,
                        "turn_player": player_info,
                        "turn_end_at": r.turn_end_at.isoformat()
                    }, room=f"lab_{code}")

                    schedule_turn_timer(code, alive[0].slot, r.day_number)

                    if alive[0].is_bot:
                        generate_bot_message(code, alive[0])

        threading.Thread(target=next_day, daemon=True).start()

    # Clean up votes
    if room_key in lab_votes:
        del lab_votes[room_key]


def save_to_bot_memory(role_name, team, phase, message, room_id):
    """Save real player messages for bot learning"""
    # Get recent messages for context
    recent = LabMessage.query.filter_by(room_id=room_id).order_by(LabMessage.id.desc()).limit(3).all()
    context = " | ".join([m.content for m in reversed(recent)])

    # Check if similar message already exists
    existing = BotMemory.query.filter_by(role_name=role_name, team=team, phase=phase, message=message).first()
    if existing:
        existing.times_used += 1
    else:
        mem = BotMemory(role_name=role_name, team=team, phase=phase, message=message, context=context)
        db.session.add(mem)
    db.session.commit()


def generate_bot_message(code, bot_player):
    """Generate a message for a bot player using learned memories"""
    import threading, time, random

    def send():
        time.sleep(random.uniform(2, 8))  # Natural delay
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.phase != "day_talk" or room.current_turn != bot_player.slot:
                return

            # Try to find a learned message
            memories = BotMemory.query.filter_by(
                role_name=bot_player.role_name,
                team=bot_player.team,
                phase="day_talk"
            ).order_by(BotMemory.effectiveness.desc(), BotMemory.times_used.desc()).limit(20).all()

            if memories and random.random() < 0.7:  # 70% chance to use learned message
                # Weight by effectiveness
                weights = [max(m.effectiveness + 5, 1) for m in memories]
                chosen = random.choices(memories, weights=weights, k=1)[0]
                content = chosen.message
                chosen.times_used += 1
            else:
                # Fallback: generic messages based on role/team
                content = get_fallback_bot_message(bot_player.role_name, bot_player.team, room.day_number)

            msg = LabMessage(room_id=room.id, player_id=bot_player.id, content=content)
            db.session.add(msg)
            db.session.commit()

            player_info = get_player_public_info(bot_player)
            socketio.emit("lab_new_message", {
                "id": msg.id,
                "player": player_info,
                "content": content,
                "msg_type": "chat",
                "time": msg.created_at.isoformat()
            }, room=f"lab_{code}")

    threading.Thread(target=send, daemon=True).start()


def get_fallback_bot_message(role_name, team, day_number):
    """Generic bot messages when no learned data is available"""
    import random

    citizen_msgs = [
        "من شهروندم، باید مافیاها رو پیدا کنیم",
        "یکی اینجا مشکوک رفتار میکنه...",
        "بیاین منطقی فکر کنیم، کی تا الان مشکوک بوده؟",
        "من به حرف\u200cهای قبلی دقت کردم، یه نفر داره دروغ میگه",
        "باید دقت کنیم کی داره از بحث فرار میکنه",
        "من نقشم مثبته، اعتماد کنید",
        "فکر میکنم باید بیشتر به رفتارها دقت کنیم",
        "من پاکم، بیاین با هم مافیا رو پیدا کنیم",
        "دیشب اتفاقات مهمی افتاد، باید تحلیل کنیم",
        "من به یکی شک دارم ولی مطمئن نیستم هنوز"
    ]

    mafia_msgs = [
        "من شهروندم، بیاین مافیا رو پیدا کنیم",
        "فکر میکنم اون یکی مشکوکه، نظرتون چیه؟",
        "من پاکم، دارم کمک میکنم مافیا رو پیدا کنیم",
        "بیاین رأی بدیم، وقت تلف نکنیم",
        "من به اون نفر شک دارم",
        "من نقش مثبت دارم، بهم اعتماد کنید",
        "فکر میکنم باید روی رفتارها تمرکز کنیم",
        "من هیچ مشکلی ندارم، سؤال دارین بپرسین",
        "بیاین با منطق پیش بریم",
        "من تا آخر بازی کنار شهروندام"
    ]

    if team == "mafia":
        return random.choice(mafia_msgs)
    return random.choice(citizen_msgs)


def bot_vote(code):
    """Make bots vote during voting phase"""
    import threading, time, random

    def do_vote():
        time.sleep(random.uniform(3, 15))
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.phase != "voting":
                return

            alive_bots = [p for p in room.players if p.is_bot and p.is_alive]
            alive_players = [p for p in room.players if p.is_alive]

            room_key = f"{code}_{room.day_number}"
            if room_key not in lab_votes:
                lab_votes[room_key] = {}

            for bot in alive_bots:
                # Bots vote for someone else (not themselves)
                targets = [p for p in alive_players if p.id != bot.id]

                if bot.team == "mafia":
                    # Mafia bots prefer voting for citizens
                    citizen_targets = [p for p in targets if p.team == "citizen"]
                    target = random.choice(citizen_targets if citizen_targets else targets)
                else:
                    # Citizen bots vote somewhat randomly (they don't know roles)
                    target = random.choice(targets)

                lab_votes[room_key][bot.id] = target.id

            voted_count = len(lab_votes[room_key])
            alive_count = len(alive_players)

            socketio.emit("lab_vote_update", {
                "voted": voted_count,
                "total": alive_count
            }, room=f"lab_{code}")

    threading.Thread(target=do_vote, daemon=True).start()


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
    import random
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
    import threading
    def start_day_after_intro():
        import time
        time.sleep(5)
        with app.app_context():
            r = LabRoom.query.filter_by(code=code).first()
            if r and r.status == "playing":
                r.phase = "day_talk"
                r.day_number = 1
                r.current_turn = 1
                r.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=20)
                db.session.commit()

                player = LabPlayer.query.filter_by(room_id=r.id, slot=1).first()
                player_info = get_player_public_info(player)
                socketio.emit("lab_phase_change", {
                    "phase": "day_talk",
                    "day_number": 1,
                    "current_turn": 1,
                    "turn_player": player_info,
                    "turn_end_at": r.turn_end_at.isoformat()
                }, room=f"lab_{code}")

                # Schedule turn timer
                schedule_turn_timer(code, 1, 1)

    threading.Thread(target=start_day_after_intro, daemon=True).start()


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

    # Check it's this player's turn
    if player.slot != room.current_turn:
        emit("error", {"msg": "الان نوبت شما نیست"})
        return

    # Save message
    msg = LabMessage(room_id=room.id, player_id=player.id, content=content)
    db.session.add(msg)
    db.session.commit()

    # Save to bot memory (real player messages for learning)
    save_to_bot_memory(player.role_name, player.team, room.phase, content, room.id)

    # Broadcast
    player_info = get_player_public_info(player)
    socketio.emit("lab_new_message", {
        "id": msg.id,
        "player": player_info,
        "content": content,
        "msg_type": "chat",
        "time": msg.created_at.isoformat()
    }, room=f"lab_{code}")


@socketio.on("lab_reaction")
def handle_lab_reaction(data):
    code = data.get("code", "").upper()
    message_id = data.get("message_id")
    reaction = data.get("reaction")  # "like" or "dislike"

    if reaction not in ("like", "dislike"):
        return

    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    uid = sid_to_user.get(request.sid, {}).get("user_id")
    username = sid_to_user.get(request.sid, {}).get("username", "?")

    # Update bot memory effectiveness if the message was from a bot that learned from memory
    msg = LabMessage.query.get(message_id)
    if msg:
        # Update effectiveness in bot_memories for matching content
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


@socketio.on("lab_vote")
def handle_lab_vote(data):
    code = data.get("code", "").upper()
    target_player_id = data.get("target_player_id")

    room = LabRoom.query.filter_by(code=code).first()
    if not room or room.phase != "voting":
        return

    uid = sid_to_user.get(request.sid, {}).get("user_id")
    if not uid:
        return

    player = LabPlayer.query.filter_by(room_id=room.id, user_id=uid).first()
    if not player or not player.is_alive:
        return

    # Store vote in global lab_votes dict
    room_key = f"{code}_{room.day_number}"
    if room_key not in lab_votes:
        lab_votes[room_key] = {}

    lab_votes[room_key][player.id] = target_player_id

    voted_count = len(lab_votes[room_key])
    alive_count = len([p for p in room.players if p.is_alive])

    socketio.emit("lab_vote_update", {
        "voted": voted_count,
        "total": alive_count
    }, room=f"lab_{code}")


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
