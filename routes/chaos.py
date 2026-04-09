"""Chaos room REST routes."""
import secrets
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models import User, ChaosRoom

bp = Blueprint("chaos", __name__, url_prefix="/api/chaos")


@bp.route("/create", methods=["POST"])
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


@bp.route("/room/<code>", methods=["GET"])
@jwt_required()
def get_chaos_room(code):
    room = ChaosRoom.query.filter_by(code=code.upper()).first()
    if not room:
        return jsonify({"error": "اتاق یافت نشد"}), 404
    players = [{
        "user_id": p.user_id, "username": p.user.username,
        "avatar": p.user.avatar_emoji,
        "role": p.role if room.phase == "result" else None
    } for p in room.players]
    return jsonify({
        "code": room.code, "status": room.status, "phase": room.phase,
        "host_id": room.host_id, "players": players, "winner": room.winner,
        "phase_end_at": room.phase_end_at.isoformat() if room.phase_end_at else None
    }), 200
