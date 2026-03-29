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
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="gevent")

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


# ══════════════════════════════════════════════════════════════════════════════
# STATIC ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/")
def index():
    return app.send_static_file("mafia.html")


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
    # Assign roles: 1 mafia, 2 citizen
    import random
    players = list(room.players)
    random.shuffle(players)
    players[0].role = "mafia"
    players[1].role = "citizen"
    players[2].role = "citizen"
    room.status = "playing"
    room.phase = "discussion"
    room.phase_end_at = datetime.now(timezone.utc) + timedelta(minutes=3)
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
    room = ChaosRoom.query.filter_by(code=code, status="playing").first()
    if not room or room.phase != "discussion":
        return
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
    if voted >= len(room.players):
        resolve_votes(code)


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
        # Discussion: 3 minutes
        _time.sleep(180)
        room = ChaosRoom.query.filter_by(code=code, status="playing").first()
        if not room or room.phase != "discussion":
            return
        room.phase = "voting"
        room.phase_end_at = datetime.now(timezone.utc) + timedelta(seconds=60)
        # Reset votes
        for p in room.players:
            p.vote_target_id = None
        db.session.commit()
        socketio.emit("phase_change", {
            "phase": "voting",
            "phase_end_at": room.phase_end_at.isoformat()
        }, to=code)
        # Voting: 60 seconds
        _time.sleep(60)
        room = ChaosRoom.query.filter_by(code=code, status="playing").first()
        if not room or room.phase != "voting":
            return
        resolve_votes(code)


def resolve_votes(code):
    with app.app_context():
        room = ChaosRoom.query.filter_by(code=code, status="playing").first()
        if not room:
            return
        # Tally votes
        vote_counts = {}
        for p in room.players:
            if p.vote_target_id:
                vote_counts[p.vote_target_id] = vote_counts.get(p.vote_target_id, 0) + 1
        if not vote_counts:
            # No votes → mafia wins by default
            end_game(code, "mafia")
            return
        # Find most voted
        max_votes = max(vote_counts.values())
        most_voted = [uid for uid, count in vote_counts.items() if count == max_votes]
        # If tie, random elimination
        import random
        eliminated_id = random.choice(most_voted)
        eliminated_player = ChaosPlayer.query.filter_by(room_id=room.id, user_id=eliminated_id).first()
        eliminated_role = eliminated_player.role if eliminated_player else "citizen"
        # Determine winner
        if eliminated_role == "mafia":
            winner = "citizen"
        else:
            winner = "mafia"  # 1v1 mafia vs citizen → mafia wins
        end_game(code, winner, eliminated_id, eliminated_role)


def end_game(code, winner, eliminated_id=None, eliminated_role=None):
    with app.app_context():
        room = ChaosRoom.query.filter_by(code=code).first()
        if not room:
            return
        room.status = "finished"
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
        # Send results
        all_roles = [{"user_id": p.user_id, "username": p.user.username,
                       "avatar": p.user.avatar_emoji, "role": p.role} for p in room.players]
        socketio.emit("game_result", {
            "winner": winner,
            "eliminated_id": eliminated_id,
            "eliminated_role": eliminated_role,
            "players": all_roles
        }, to=code)


# ══════════════════════════════════════════════════════════════════════════════
# BOOTSTRAP
# ══════════════════════════════════════════════════════════════════════════════

import time
for attempt in range(10):
    try:
        with app.app_context():
            db.create_all()
        break
    except Exception as e:
        if attempt < 9:
            print(f"DB not ready ({e}), retrying in 3s...")
            time.sleep(3)
        else:
            raise

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port, debug=False)
