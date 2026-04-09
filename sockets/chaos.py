"""Chaos room WebSocket handlers and helpers."""
import random
import time as _time
from datetime import datetime, timezone, timedelta

from flask import request
from flask_socketio import emit, join_room, leave_room

from extensions import db
from models import User, ChaosRoom, ChaosPlayer
from services.state import (
    sid_to_user, user_to_sid, online_users,
    end_discussion_votes, disconnected_players,
)

# Module-level reference to the Flask app, set during registration
_flask_app = None


def _get_app():
    """Get the Flask app for background threads."""
    if _flask_app is not None:
        return _flask_app
    from flask import current_app
    return current_app._get_current_object()


# ── Helpers ────────────────────────────────────────────────────────────────

def emit_room_update(code):
    """Broadcast current room state to all members."""
    from extensions import socketio
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
    """Background task: discussion -> voting -> resolve."""
    app = _get_app()
    with app.app_context():
        # Discussion: 5 minutes
        _time.sleep(300)
        room = ChaosRoom.query.filter_by(code=code, status="playing").first()
        if not room or room.phase != "discussion":
            return
        room.phase = "voting"
        room.phase_end_at = datetime.now(timezone.utc) + timedelta(seconds=30)
        for p in room.players:
            p.vote_target_id = None
        db.session.commit()
        from extensions import socketio
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
    """Tally chaos votes and determine winner."""
    app = _get_app()
    with app.app_context():
        room = ChaosRoom.query.filter_by(code=code, status="playing").first()
        if not room:
            return

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

        citizen1_vote = citizen_players[0].vote_target_id
        citizen2_vote = citizen_players[1].vote_target_id

        both_found_mafia = (citizen1_vote == mafia_player.user_id and citizen2_vote == mafia_player.user_id)

        if both_found_mafia:
            winner = "citizen"
        else:
            winner = "mafia"

        vote_counts = {}
        for p in room.players:
            if p.vote_target_id:
                vote_counts[p.vote_target_id] = vote_counts.get(p.vote_target_id, 0) + 1

        eliminated_id = None
        eliminated_role = None
        if vote_counts:
            max_votes = max(vote_counts.values())
            most_voted = [uid for uid, c in vote_counts.items() if c == max_votes]
            eliminated_id = random.choice(most_voted)
            ep = ChaosPlayer.query.filter_by(room_id=room.id, user_id=eliminated_id).first()
            eliminated_role = ep.role if ep else None

        end_game(code, winner, eliminated_id, eliminated_role)


def end_game(code, winner, eliminated_id=None, eliminated_role=None):
    """Finish chaos game, update stats, and broadcast result."""
    from extensions import socketio
    app = _get_app()
    with app.app_context():
        room = ChaosRoom.query.filter_by(code=code).first()
        if not room:
            return
        room.status = "finished"
        end_discussion_votes.pop(code, None)
        disconnected_players.pop(code, None)
        room.phase = "result"
        room.winner = winner
        for p in room.players:
            user = db.session.get(User, p.user_id)
            if user:
                if (p.role == "mafia" and winner == "mafia") or (p.role == "citizen" and winner == "citizen"):
                    user.chaos_wins += 1
                else:
                    user.chaos_losses += 1
        db.session.commit()
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


# ── Handler registration ──────────────────────────────────────────────────

def register_chaos_handlers(socketio, app):
    """Register all chaos room socket events."""
    global _flask_app
    _flask_app = app

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
            emit("error", {"msg": "فقط میزبان می\u200cتواند بازی را شروع کند"}); return
        if len(room.players) != 3:
            emit("error", {"msg": "باید دقیقاً ۳ بازیکن باشد"}); return
        players = list(room.players)
        roles = ["mafia", "citizen", "citizen"]
        random.shuffle(roles)
        for i, p in enumerate(players):
            p.role = roles[i]
        room.status = "playing"
        room.phase = "discussion"
        room.phase_end_at = datetime.now(timezone.utc) + timedelta(minutes=5)
        db.session.commit()
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
        if room.status == "playing" and room.phase == "voting":
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
        voted = sum(1 for p in room.players if p.vote_target_id is not None)
        emit("vote_update", {"voted": voted, "total": len(room.players)}, to=code)
        connected = sum(1 for p in room.players if p.user_id in online_users)
        needed = max(connected, 2)
        if voted >= needed:
            resolve_votes(code)

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
        if count >= 2:
            end_discussion_votes.pop(code, None)
            room.phase = "voting"
            room.phase_end_at = datetime.now(timezone.utc) + timedelta(seconds=30)
            for p in room.players:
                p.vote_target_id = None
            db.session.commit()
            socketio.emit("phase_change", {
                "phase": "voting",
                "phase_end_at": room.phase_end_at.isoformat()
            }, to=code)

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
