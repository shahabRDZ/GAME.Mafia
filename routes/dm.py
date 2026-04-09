"""Direct message routes."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db, socketio
from models import User, DirectMessage
from services.state import user_to_sid, online_users

bp = Blueprint("dm", __name__, url_prefix="/api/dm")


@bp.route("/unread", methods=["GET"])
@jwt_required()
def get_dm_unread():
    user = db.session.get(User, int(get_jwt_identity()))
    count = DirectMessage.query.filter_by(receiver_id=user.id, seen=False).count()
    return jsonify({"count": count}), 200


@bp.route("/conversations", methods=["GET"])
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
                unseen = DirectMessage.query.filter_by(
                    sender_id=other_id, receiver_id=me_id, seen=False
                ).count()
                convos[other_id] = {
                    "user_id": other_id, "username": other.username,
                    "avatar": other.avatar_emoji, "online": other_id in online_users,
                    "last_message": m.content[:50], "last_time": m.sent_at.strftime("%H:%M"),
                    "unseen": unseen
                }
    return jsonify(list(convos.values())), 200


@bp.route("/<int:other_id>", methods=["GET"])
@jwt_required()
def get_dm_messages(other_id):
    me_id = int(get_jwt_identity())
    msgs = DirectMessage.query.filter(
        ((DirectMessage.sender_id == me_id) & (DirectMessage.receiver_id == other_id)) |
        ((DirectMessage.sender_id == other_id) & (DirectMessage.receiver_id == me_id))
    ).order_by(DirectMessage.sent_at.asc()).limit(100).all()
    # Mark as seen
    DirectMessage.query.filter_by(
        sender_id=other_id, receiver_id=me_id, seen=False
    ).update({"seen": True})
    db.session.commit()
    return jsonify([{
        "id": m.id, "sender_id": m.sender_id, "content": m.content,
        "time": m.sent_at.strftime("%H:%M"), "is_me": m.sender_id == me_id
    } for m in msgs]), 200


@bp.route("/<int:other_id>", methods=["POST"])
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
