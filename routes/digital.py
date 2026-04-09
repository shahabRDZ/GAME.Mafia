"""Digital role distribution routes — in-memory rooms."""
import random
import threading
import time

from flask import Blueprint, request, jsonify

from utils.helpers import gen_digital_code
from services.state import digital_rooms

bp = Blueprint("digital", __name__, url_prefix="/api/digital")


@bp.route("/create", methods=["POST"])
def create_digital_room():
    data = request.get_json()
    roles = data.get("roles", [])
    group = data.get("group", "")
    if not roles or len(roles) < 3:
        return jsonify({"error": "حداقل ۳ نقش لازم است"}), 400
    # Shuffle roles
    random.shuffle(roles)
    code = gen_digital_code()
    digital_rooms[code] = {
        "roles": roles,
        "assigned": 0,
        "total": len(roles),
        "group": group,
        "lock": threading.Lock(),
        "created": time.time()
    }
    return jsonify({"code": code, "total": len(roles)}), 201


@bp.route("/info/<code>", methods=["GET"])
def digital_room_info(code):
    code = code.upper()
    room = digital_rooms.get(code)
    if not room:
        return jsonify({"error": "اتاق پیدا نشد"}), 404
    return jsonify({
        "code": code, "group": room["group"],
        "total": room["total"], "assigned": room["assigned"],
        "remaining": room["total"] - room["assigned"]
    }), 200


@bp.route("/receive/<code>", methods=["POST"])
def digital_receive_role(code):
    code = code.upper()
    room = digital_rooms.get(code)
    if not room:
        return jsonify({"error": "اتاق پیدا نشد"}), 404
    with room["lock"]:
        idx = room["assigned"]
        if idx >= room["total"]:
            return jsonify({"error": "همه نقش‌ها تقسیم شده"}), 410
        role = room["roles"][idx]
        room["assigned"] = idx + 1
        player_num = idx + 1
    return jsonify({
        "role": role, "playerNum": player_num,
        "remaining": room["total"] - room["assigned"]
    }), 200


@bp.route("/status/<code>", methods=["GET"])
def digital_room_status(code):
    code = code.upper()
    room = digital_rooms.get(code)
    if not room:
        return jsonify({"error": "اتاق پیدا نشد"}), 404
    return jsonify({
        "total": room["total"], "assigned": room["assigned"],
        "remaining": room["total"] - room["assigned"],
        "done": room["assigned"] >= room["total"]
    }), 200
