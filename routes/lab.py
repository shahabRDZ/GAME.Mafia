"""Lab mode REST routes."""
import secrets
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db, socketio
from models import User, LabRoom, LabPlayer

bp = Blueprint("lab", __name__, url_prefix="/api/lab")

# ── Constants ──

BOT_NAMES = ["آرش", "سارا", "مهدی", "نازنین", "امیر", "لیلا", "رضا", "مریم", "حسین"]
BOT_AVATARS = ["🤖", "👾", "🎮", "🕹️", "💀", "👻", "🦊", "🐺", "🦇"]


def get_lab_room_data(room):
    """Helper to serialize lab room data."""
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
                "username": u.username if u else "?",
                "avatar": u.avatar_emoji if u else "🎭",
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


@bp.route("/create", methods=["POST"])
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
        host_player = LabPlayer(
            room_id=room.id, user_id=uid, is_bot=False,
            slot=1, avatar=user.avatar_emoji
        )
        db.session.add(host_player)
        db.session.commit()

        return jsonify({"code": code, "room_id": room.id, "scenario": scenario})
    except Exception as e:
        db.session.rollback()
        print(f"[LAB ERROR] create_lab_room: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"خطای سرور: {str(e)}"}), 500


@bp.route("/room/<code>")
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
                "username": u.username if u else "?",
                "avatar": u.avatar_emoji if u else "🎭",
                "id": p.id
            })

    return jsonify({
        "code": room.code, "status": room.status, "scenario": room.scenario,
        "host_id": room.host_id, "players": players,
        "player_count": len(players), "max_players": 10
    })


@bp.route("/room/<code>/add-bot", methods=["POST"])
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

    bot = LabPlayer(
        room_id=room.id, is_bot=True, bot_name=bot_name,
        avatar=avatar, slot=slot
    )
    db.session.add(bot)
    db.session.commit()

    # Notify via socket if available
    try:
        room_data = get_lab_room_data(room)
        socketio.emit("lab_update", room_data, room=f"lab_{code.upper()}")
    except Exception:
        pass

    return get_lab_room(code)


@bp.route("/room/<code>/remove-player/<int:player_id>", methods=["DELETE"])
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
