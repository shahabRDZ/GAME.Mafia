"""Nearby players — location-based role distribution."""
import random
import time

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models import User, DirectMessage
from utils.helpers import haversine
from services.state import nearby_players, nearby_roles, active_hosts

bp = Blueprint("nearby", __name__, url_prefix="/api/nearby")


@bp.route("/host-register", methods=["POST"])
@jwt_required()
def register_host():
    user = db.session.get(User, int(get_jwt_identity()))
    data = request.get_json()
    lat = data.get("lat")
    lng = data.get("lng")
    if lat is None or lng is None:
        return jsonify({"error": "لوکیشن نامعتبر"}), 400
    active_hosts[user.id] = {
        "username": user.username, "user_id": user.id,
        "lat": float(lat), "lng": float(lng),
        "ts": time.time(),
        "group": data.get("group", ""),
        "count": data.get("count", 0)
    }
    return jsonify({"ok": True}), 200


@bp.route("/hosts", methods=["POST"])
@jwt_required()
def find_hosts():
    """Player finds nearby hosts (game creators)."""
    user = db.session.get(User, int(get_jwt_identity()))
    data = request.get_json()
    my_lat = float(data.get("lat", 0))
    my_lng = float(data.get("lng", 0))
    now = time.time()
    # Clean stale hosts (older than 10 min)
    stale = [uid for uid, h in active_hosts.items() if now - h["ts"] > 600]
    for uid in stale:
        active_hosts.pop(uid, None)
    # Find nearby hosts
    results = []
    for uid, h in active_hosts.items():
        if uid == user.id:
            continue
        dist = haversine(my_lat, my_lng, h["lat"], h["lng"])
        if dist <= 500:  # 500m radius
            results.append({
                "user_id": uid, "username": h["username"],
                "group": h["group"], "count": h["count"],
                "distance": round(dist)
            })
    results.sort(key=lambda x: x["distance"])
    return jsonify(results), 200


@bp.route("/join-host/<int:host_id>", methods=["POST"])
@jwt_required()
def join_host(host_id):
    """Player joins a specific host's game."""
    user = db.session.get(User, int(get_jwt_identity()))
    data = request.get_json()
    lat = data.get("lat")
    lng = data.get("lng")
    if lat is None or lng is None:
        return jsonify({"error": "لوکیشن نامعتبر"}), 400
    display_name = data.get("displayName") or user.username
    nearby_players[user.id] = {
        "username": display_name, "lat": float(lat), "lng": float(lng),
        "ts": time.time(), "user_id": user.id, "host_id": host_id
    }
    return jsonify({"ok": True, "message": "به بازی متصل شدید"}), 200


@bp.route("/register", methods=["POST"])
@jwt_required()
def register_nearby():
    user = db.session.get(User, int(get_jwt_identity()))
    data = request.get_json()
    lat = data.get("lat")
    lng = data.get("lng")
    if lat is None or lng is None:
        return jsonify({"error": "لوکیشن نامعتبر"}), 400
    nearby_players[user.id] = {
        "username": user.username,
        "lat": float(lat), "lng": float(lng),
        "ts": time.time(),
        "user_id": user.id
    }
    return jsonify({"ok": True}), 200


@bp.route("/find", methods=["POST"])
@jwt_required()
def find_nearby():
    user = db.session.get(User, int(get_jwt_identity()))
    data = request.get_json()
    my_lat = float(data.get("lat", 0))
    my_lng = float(data.get("lng", 0))
    radius = float(data.get("radius", 200))  # meters
    now = time.time()
    # Clean stale entries (older than 5 min)
    stale = [uid for uid, p in nearby_players.items() if now - p["ts"] > 300]
    for uid in stale:
        nearby_players.pop(uid, None)
    # Find nearby — only players who joined this host
    host_id = user.id
    results = []
    for uid, p in nearby_players.items():
        if uid == user.id:
            continue
        # Show players who joined this host, or nearby unjoined players
        if p.get("host_id") and p["host_id"] != host_id:
            continue
        dist = haversine(my_lat, my_lng, p["lat"], p["lng"])
        if dist <= radius:
            results.append({
                "user_id": uid, "username": p["username"],
                "distance": round(dist), "joined": p.get("host_id") == host_id
            })
    results.sort(key=lambda x: x["distance"])
    return jsonify(results), 200


@bp.route("/assign", methods=["POST"])
@jwt_required()
def assign_nearby_roles():
    """Host assigns roles to selected nearby players."""
    data = request.get_json()
    player_ids = data.get("player_ids", [])
    roles = data.get("roles", [])
    if not player_ids or not roles:
        return jsonify({"error": "بازیکنان یا نقش‌ها خالی است"}), 400
    if len(player_ids) != len(roles):
        return jsonify({"error": "تعداد بازیکنان و نقش‌ها برابر نیست"}), 400
    # Shuffle roles
    random.shuffle(roles)
    game_id = str(int(time.time() * 1000))
    host_user = db.session.get(User, int(get_jwt_identity()))
    for i, uid in enumerate(player_ids):
        nearby_roles[uid] = {
            "role": roles[i],
            "playerNum": i + 1,
            "gameId": game_id
        }
        # Send private DM with role info
        try:
            role = roles[i]
            dm_content = (
                f"🔒 محرمانه — نقش شما: {role.get('name','?')} "
                f"({('مافیا' if role.get('team')=='mafia' else 'شهروند' if role.get('team')=='citizen' else 'مستقل')})"
            )
            dm = DirectMessage(sender_id=host_user.id, receiver_id=uid, content=dm_content)
            db.session.add(dm)
        except:
            pass
    db.session.commit()
    return jsonify({"ok": True, "gameId": game_id, "count": len(player_ids)}), 200


@bp.route("/my-role", methods=["GET"])
@jwt_required()
def get_my_nearby_role():
    """Player checks if a role has been assigned to them."""
    user = db.session.get(User, int(get_jwt_identity()))
    role_data = nearby_roles.get(user.id)
    if not role_data:
        return jsonify({"assigned": False}), 200
    return jsonify({
        "assigned": True, "confirmed": role_data.get("confirmed", False),
        **role_data
    }), 200


@bp.route("/confirm/<game_id>", methods=["POST"])
@jwt_required()
def confirm_nearby_role(game_id):
    """Player confirms they've seen their role (card flipped)."""
    user = db.session.get(User, int(get_jwt_identity()))
    role_data = nearby_roles.get(user.id)
    if not role_data or role_data.get("gameId") != game_id:
        return jsonify({"error": "نقشی پیدا نشد"}), 404
    role_data["confirmed"] = True
    return jsonify({"ok": True}), 200


@bp.route("/resend/<int:user_id>", methods=["POST"])
@jwt_required()
def resend_nearby_role(user_id):
    """Host resends role notification to a specific player."""
    role_data = nearby_roles.get(user_id)
    if not role_data:
        return jsonify({"error": "نقشی برای این بازیکن وجود ندارد"}), 404
    role_data["confirmed"] = False
    return jsonify({"ok": True}), 200


@bp.route("/reassign", methods=["POST"])
@jwt_required()
def reassign_nearby_roles():
    """Host reshuffles and reassigns roles to same players."""
    data = request.get_json()
    game_id = data.get("gameId")
    if not game_id:
        return jsonify({"error": "شناسه بازی نامعتبر"}), 400
    # Find all players in this game
    player_ids = []
    roles_list = []
    for uid, rd in nearby_roles.items():
        if rd.get("gameId") == game_id:
            player_ids.append(uid)
            roles_list.append(rd["role"])
    if not player_ids:
        return jsonify({"error": "بازیکنی پیدا نشد"}), 404
    # Reshuffle
    random.shuffle(roles_list)
    new_game_id = str(int(time.time() * 1000))
    host_user = db.session.get(User, int(get_jwt_identity()))
    for i, uid in enumerate(player_ids):
        nearby_roles[uid] = {
            "role": roles_list[i],
            "playerNum": i + 1,
            "gameId": new_game_id,
            "confirmed": False
        }
        try:
            role = roles_list[i]
            dm_content = f"🔒 محرمانه — نقش جدید: {role.get('name','?')} (ریست شد)"
            dm = DirectMessage(sender_id=host_user.id, receiver_id=uid, content=dm_content)
            db.session.add(dm)
        except:
            pass
    db.session.commit()
    return jsonify({"ok": True, "gameId": new_game_id, "count": len(player_ids)}), 200


@bp.route("/confirmations/<game_id>", methods=["GET"])
@jwt_required()
def get_confirmations(game_id):
    """Host checks which players have confirmed (flipped their card)."""
    results = []
    for uid, rd in nearby_roles.items():
        if rd.get("gameId") == game_id:
            u = db.session.get(User, uid)
            results.append({
                "user_id": uid,
                "username": u.username if u else "?",
                "playerNum": rd.get("playerNum", 0),
                "confirmed": rd.get("confirmed", False)
            })
    results.sort(key=lambda x: x["playerNum"])
    return jsonify(results), 200
