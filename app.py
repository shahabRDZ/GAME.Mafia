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
        "player_count": len(players), "max_players": 10
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
