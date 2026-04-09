"""WebRTC voice signaling socket handlers."""
from flask import request
from flask_socketio import emit

from services.state import sid_to_user, user_to_sid


def register_voice_handlers(socketio, app):
    """Register voice signaling socket events."""

    @socketio.on("voice_join")
    def handle_voice_join(data):
        code = (data.get("code") or "").upper()
        info = sid_to_user.get(request.sid)
        if not info:
            return
        emit("voice_peer_joined", {
            "user_id": info["user_id"],
            "username": info["username"]
        }, to=code, include_self=False)

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
