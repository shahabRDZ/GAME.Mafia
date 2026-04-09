from datetime import datetime, timezone, timedelta

from flask_socketio import emit

from extensions import db, socketio
from models import ChaosRoom, ChaosPlayer, User, Game
from services.state import end_discussion_votes, disconnected_players


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


def run_phase_timer(app, code):
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
        resolve_votes(app, code)


def resolve_votes(app, code):
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
            end_game(app, code, "mafia")
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

        end_game(app, code, winner, eliminated_id, eliminated_role)


def end_game(app, code, winner, eliminated_id=None, eliminated_role=None):
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
