"""WebSocket connect / disconnect handlers."""
from flask import request
from extensions import db
from models import ChaosRoom, ChaosPlayer
from services.state import sid_to_user, user_to_sid, online_users
from utils.helpers import get_user_from_token


def register_connection_handlers(socketio, app):
    """Register connect and disconnect socket events."""

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
            # Leave any chaos room in waiting state
            with app.app_context():
                player = ChaosPlayer.query.filter_by(user_id=uid).join(ChaosRoom).filter(
                    ChaosRoom.status.in_(["waiting"])
                ).first()
                if player:
                    room = player.room
                    db.session.delete(player)
                    db.session.commit()
                    from sockets.chaos import emit_room_update
                    emit_room_update(room.code)
