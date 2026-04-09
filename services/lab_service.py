import time as _time_module
import threading
import random
from datetime import datetime, timezone, timedelta

from flask_socketio import emit

from extensions import db, socketio
from models import LabRoom, LabPlayer, LabMessage, User, Game, BotMemory
from services.state import (
    sid_to_user, user_to_sid, online_users,
    lab_votes, lab_revotes, lab_bazpors_votes, lab_night_actions,
)


# ── Constants ────────────────────────────────────────────────────────────────

LAB_ROLES = {
    "\u0628\u0627\u0632\u067e\u0631\u0633": {
        "mafia": ["\u0631\u0626\u06cc\u0633 \u0645\u0627\u0641\u06cc\u0627", "\u0646\u0627\u062a\u0648", "\u0634\u06cc\u0627\u062f"],
        "citizen": ["\u0628\u0627\u0632\u067e\u0631\u0633", "\u06a9\u0627\u0631\u0622\u06af\u0627\u0647", "\u0647\u0627\u0646\u062a\u0631", "\u062f\u06a9\u062a\u0631", "\u0631\u0648\u06cc\u06cc\u0646\u200c\u062a\u0646", "\u0634\u0647\u0631\u0648\u0646\u062f \u0633\u0627\u062f\u0647", "\u0634\u0647\u0631\u0648\u0646\u062f \u0633\u0627\u062f\u0647"]
    }
}

ROLE_ICONS = {
    "\u0631\u0626\u06cc\u0633 \u0645\u0627\u0641\u06cc\u0627": "\U0001f451", "\u0646\u0627\u062a\u0648": "\U0001f52b", "\u0634\u06cc\u0627\u062f": "\U0001f0cf", "\u0645\u0627\u0641\u06cc\u0627 \u0633\u0627\u062f\u0647": "\U0001f608",
    "\u0634\u0647\u0631\u0648\u0646\u062f \u0633\u0627\u062f\u0647": "\U0001f607", "\u0628\u0627\u0632\u067e\u0631\u0633": "\U0001f50d", "\u06a9\u0627\u0631\u0622\u06af\u0627\u0647": "\U0001f575\ufe0f", "\u0647\u0627\u0646\u062a\u0631": "\U0001f3f9",
    "\u062f\u06a9\u062a\u0631": "\u2695\ufe0f", "\u0631\u0648\u06cc\u06cc\u0646\u200c\u062a\u0646": "\U0001f6e1\ufe0f", "\u062a\u06a9\u200c\u062a\u06cc\u0631\u0627\u0646\u062f\u0627\u0632": "\U0001f3af"
}


# ── Helper Functions ─────────────────────────────────────────────────────────

def get_lab_room_data(room):
    """Helper to serialize lab room data"""
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
                "username": u.username if u else "?", "avatar": u.avatar_emoji if u else "\U0001f3ad",
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


def get_player_public_info(player):
    """Get public info for a player (no role reveal)"""
    if not player:
        return None
    if player.is_bot:
        return {
            "id": player.id, "slot": player.slot, "is_bot": True,
            "name": player.bot_name, "avatar": player.avatar,
            "is_alive": player.is_alive
        }
    else:
        u = User.query.get(player.user_id)
        return {
            "id": player.id, "slot": player.slot, "is_bot": False,
            "user_id": player.user_id,
            "name": u.username if u else "?", "avatar": u.avatar_emoji if u else "\U0001f3ad",
            "is_alive": player.is_alive
        }


def get_alive_sorted(room):
    """Return alive players sorted by slot"""
    return sorted([p for p in room.players if p.is_alive], key=lambda x: x.slot)


def check_win_condition(room):
    """Return 'mafia', 'citizen', or None"""
    alive = [p for p in room.players if p.is_alive]
    alive_mafia = [p for p in alive if p.team == "mafia"]
    alive_citizens = [p for p in alive if p.team == "citizen"]
    if len(alive_mafia) == 0:
        return "citizen"
    if len(alive_mafia) >= len(alive_citizens):
        return "mafia"
    return None


def emit_game_result(code, room, winner, eliminated_player=None):
    """End game and reveal roles"""
    room.status = "finished"
    room.phase = "result"
    db.session.commit()

    all_players = []
    for p in sorted(room.players, key=lambda x: x.slot):
        info = get_player_public_info(p)
        info["role_name"] = p.role_name
        info["team"] = p.team
        info["is_alive"] = p.is_alive
        all_players.append(info)

    socketio.emit("lab_game_result", {
        "winner": winner,
        "eliminated": get_player_public_info(eliminated_player) if eliminated_player else None,
        "eliminated_role": eliminated_player.role_name if eliminated_player else None,
        "players": all_players
    }, room=f"lab_{code}")


def find_player_by_role(room, role_name):
    """Find alive player with given role_name"""
    for p in room.players:
        if p.role_name == role_name and p.is_alive:
            return p
    return None


def get_mafia_players(room, alive_only=True):
    """Return mafia team players"""
    if alive_only:
        return [p for p in room.players if p.team == "mafia" and p.is_alive]
    return [p for p in room.players if p.team == "mafia"]


def emit_to_player(player, event, data):
    """Emit event to a specific player (skip bots)"""
    if player.is_bot or not player.user_id:
        return
    sid = user_to_sid.get(player.user_id)
    if sid:
        socketio.emit(event, data, to=sid)


# ── Timer Scheduling ──────────────────────────────────────────────────────

def schedule_turn_timer(app, code, current_slot, day_number):
    """Schedule auto-advance for day_talk after 30 seconds"""
    def advance():
        _time_module.sleep(41)
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.status != "playing" or room.phase != "day_talk":
                return
            if room.current_turn != current_slot or room.day_number != day_number:
                return
            advance_turn(app, code)
    threading.Thread(target=advance, daemon=True).start()


def schedule_phase_timer(app, code, phase, day_number, seconds):
    """Generic phase timer - after seconds, call phase_timeout"""
    def timeout():
        _time_module.sleep(seconds + 1)
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.status != "playing":
                return
            if room.phase != phase or room.day_number != day_number:
                return
            handle_phase_timeout(app, code, phase)
    threading.Thread(target=timeout, daemon=True).start()


def schedule_vote_advance(app, code, current_slot, day_number):
    """Advance sequential voting after 3 seconds"""
    def advance():
        _time_module.sleep(6)
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.status != "playing":
                return
            if room.phase != "voting" or room.day_number != day_number:
                return
            if room.current_turn != current_slot:
                return
            advance_sequential_vote(app, code)
    threading.Thread(target=advance, daemon=True).start()


def schedule_revote_advance(app, code, current_slot, day_number):
    """Advance sequential revote after 3 seconds"""
    def advance():
        _time_module.sleep(6)
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.status != "playing":
                return
            if room.phase != "revote" or room.day_number != day_number:
                return
            if room.current_turn != current_slot:
                return
            from services.lab_service_2 import advance_sequential_revote
            advance_sequential_revote(app, code)
    threading.Thread(target=advance, daemon=True).start()


def schedule_night_sub_advance(app, code, sub_phase, day_number):
    """Advance night sub-phase after 10 seconds"""
    def advance():
        _time_module.sleep(11)
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.status != "playing":
                return
            if room.phase != sub_phase or room.day_number != day_number:
                return
            from services.lab_service_2 import advance_night
            advance_night(app, code)
    threading.Thread(target=advance, daemon=True).start()


# ── Phase Timeout Handler ──────────────────────────────────────────────────

def handle_phase_timeout(app, code, phase):
    """Handle when a phase timer expires"""
    if phase == "mafia_chat":
        start_sequential_voting(app, code)
    elif phase == "defense":
        from services.lab_service_2 import start_revote
        start_revote(app, code)


# ── Day Talk ──────────────────────────────────────────────────────────────

def start_day_talk(app, code, day_number):
    """Start day_talk phase for a new day"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room or room.status != "playing":
        return

    room.phase = "day_talk"
    room.day_number = day_number

    alive = get_alive_sorted(room)
    if not alive:
        return

    room.current_turn = alive[0].slot
    room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=40)
    db.session.commit()

    player_info = get_player_public_info(alive[0])
    socketio.emit("lab_phase_change", {
        "phase": "day_talk",
        "day_number": day_number,
        "current_turn": alive[0].slot,
        "turn_player": player_info,
        "turn_end_at": room.turn_end_at.isoformat(),
        "alive_players": [get_player_public_info(p) for p in alive]
    }, room=f"lab_{code}")

    if alive[0].is_bot:
        from services.bot_service import generate_bot_message
        generate_bot_message(app, code, alive[0])
    else:
        schedule_turn_timer(app, code, alive[0].slot, day_number)


def advance_turn(app, code):
    """Move to next player's turn in day_talk"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room or room.phase != "day_talk":
        return

    current = room.current_turn
    alive = get_alive_sorted(room)
    alive_slots = [p.slot for p in alive]

    next_slot = None
    for s in alive_slots:
        if s > current:
            next_slot = s
            break

    if next_slot is None:
        # All players have spoken - move to mafia_chat
        start_mafia_chat(app, code)
    else:
        room.current_turn = next_slot
        room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=40)
        db.session.commit()

        player = LabPlayer.query.filter_by(room_id=room.id, slot=next_slot).first()
        player_info = get_player_public_info(player)
        socketio.emit("lab_phase_change", {
            "phase": "day_talk",
            "day_number": room.day_number,
            "current_turn": next_slot,
            "turn_player": player_info,
            "turn_end_at": room.turn_end_at.isoformat()
        }, room=f"lab_{code}")

        if player and player.is_bot:
            from services.bot_service import generate_bot_message
            generate_bot_message(app, code, player)
        else:
            schedule_turn_timer(app, code, next_slot, room.day_number)


# ── Mafia Chat ──────────────────────────────────────────────────────────────

def start_mafia_chat(app, code):
    """Start 15s private mafia chat phase"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    room.phase = "mafia_chat"
    room.current_turn = 0
    room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=15)
    db.session.commit()

    mafia_players = get_mafia_players(room)

    # Notify all players that mafia_chat phase started
    socketio.emit("lab_phase_change", {
        "phase": "mafia_chat",
        "day_number": room.day_number,
        "turn_end_at": room.turn_end_at.isoformat()
    }, room=f"lab_{code}")

    # Send private mafia chat notification to mafia players only
    mafia_info = [get_player_public_info(p) for p in mafia_players]
    for p in mafia_players:
        emit_to_player(p, "lab_mafia_chat_start", {
            "mafia_team": mafia_info,
            "turn_end_at": room.turn_end_at.isoformat()
        })

    # Bot mafia send short messages
    for p in mafia_players:
        if p.is_bot:
            generate_bot_mafia_chat(app, code, p)

    schedule_phase_timer(app, code, "mafia_chat", room.day_number, 15)


def generate_bot_mafia_chat(app, code, bot_player):
    """Bot mafia sends a short message during mafia_chat"""
    def send():
        _time_module.sleep(random.uniform(2, 8))
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.phase != "mafia_chat":
                return

            msgs = [
                "\u0628\u0632\u0646\u06cc\u0645 \u0627\u0648\u0646 \u0634\u0647\u0631\u0648\u0646\u062f \u0631\u0648",
                "\u06a9\u0627\u0631\u0622\u06af\u0627\u0647 \u0631\u0648 \u0628\u0632\u0646\u06cc\u0645 \u0628\u0647\u062a\u0631\u0647",
                "\u062f\u06a9\u062a\u0631 \u062e\u0637\u0631\u0646\u0627\u06a9\u0647",
                "\u0645\u0648\u0627\u0641\u0642\u0645",
                "\u0628\u0627\u0634\u0647 \u0647\u0645\u0648\u0646\u0648 \u0645\u06cc\u0632\u0646\u06cc\u0645",
                "\u062d\u0648\u0627\u0633\u0645\u0648\u0646 \u0628\u0647 \u0647\u0627\u0646\u062a\u0631 \u0628\u0627\u0634\u0647",
                "\u0645\u0646 \u0641\u0631\u062f\u0627 \u0627\u0632 \u0627\u0648\u0646 \u062f\u0641\u0627\u0639 \u0645\u06cc\u06a9\u0646\u0645",
                "\u0631\u0623\u06cc \u0631\u0648 \u0628\u0646\u062f\u0627\u0632\u06cc\u0645 \u0631\u0648 \u06cc\u06a9\u06cc \u062f\u06cc\u06af\u0647"
            ]
            content = random.choice(msgs)

            mafia_players = get_mafia_players(room)
            player_info = get_player_public_info(bot_player)
            for mp in mafia_players:
                emit_to_player(mp, "lab_mafia_message", {
                    "player": player_info,
                    "content": content,
                    "time": datetime.now(timezone.utc).isoformat()
                })

    threading.Thread(target=send, daemon=True).start()


# ── Sequential Voting ──────────────────────────────────────────────────────

def start_sequential_voting(app, code):
    """Voting: for each alive player, everyone votes yes/no in 5 seconds"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    alive = get_alive_sorted(room)
    if not alive:
        return

    room.phase = "voting"
    room.current_turn = alive[0].slot  # candidate being voted on
    room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=5)
    db.session.commit()

    room_key = f"{code}_{room.day_number}"
    lab_votes[room_key] = {}  # {candidate_slot: vote_count}

    candidate = alive[0]
    candidate_info = get_player_public_info(candidate)
    candidate_name = candidate.bot_name if candidate.is_bot else (User.query.get(candidate.user_id).username if candidate.user_id else "?")

    socketio.emit("lab_phase_change", {
        "phase": "voting",
        "day_number": room.day_number,
        "current_turn": candidate.slot,
        "candidate": candidate_info,
        "candidate_name": candidate_name,
        "candidate_slot": candidate.slot,
        "turn_end_at": room.turn_end_at.isoformat(),
        "alive_players": [get_player_public_info(p) for p in alive],
        "message": f"\U0001f5f3\ufe0f \u0631\u0623\u06cc \u0628\u0631\u0627\u06cc \u0634\u0645\u0627\u0631\u0647 {candidate.slot} ({candidate_name}) \u2014 \u0645\u0648\u0627\u0641\u0642\u06cc\u062f \u062d\u0630\u0641 \u0634\u0648\u062f\u061f"
    }, room=f"lab_{code}")

    # Bots vote for this candidate
    bot_vote_for_candidate(app, code, candidate, alive)

    schedule_vote_advance(app, code, candidate.slot, room.day_number)


def advance_sequential_vote(app, code):
    """Move to next candidate or resolve"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room or room.phase != "voting":
        return

    current = room.current_turn
    alive = get_alive_sorted(room)
    alive_slots = [p.slot for p in alive]

    next_slot = None
    for s in alive_slots:
        if s > current:
            next_slot = s
            break

    if next_slot is None:
        from services.lab_service_2 import resolve_voting
        resolve_voting(app, code)
    else:
        room.current_turn = next_slot
        room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=5)
        db.session.commit()

        candidate = LabPlayer.query.filter_by(room_id=room.id, slot=next_slot).first()
        candidate_info = get_player_public_info(candidate)
        candidate_name = candidate.bot_name if candidate.is_bot else (User.query.get(candidate.user_id).username if candidate.user_id else "?")

        socketio.emit("lab_phase_change", {
            "phase": "voting",
            "day_number": room.day_number,
            "current_turn": next_slot,
            "candidate": candidate_info,
            "candidate_name": candidate_name,
            "candidate_slot": next_slot,
            "turn_end_at": room.turn_end_at.isoformat(),
            "message": f"\U0001f5f3\ufe0f \u0631\u0623\u06cc \u0628\u0631\u0627\u06cc \u0634\u0645\u0627\u0631\u0647 {next_slot} ({candidate_name}) \u2014 \u0645\u0648\u0627\u0641\u0642\u06cc\u062f \u062d\u0630\u0641 \u0634\u0648\u062f\u061f"
        }, room=f"lab_{code}")

        bot_vote_for_candidate(app, code, candidate, alive)
        schedule_vote_advance(app, code, next_slot, room.day_number)


def bot_vote_for_candidate(app, code, candidate, alive_players):
    """All bots vote yes/no for the current candidate"""
    def vote():
        _time_module.sleep(random.uniform(0.5, 1.5))
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.phase != "voting":
                return

            room_key = f"{code}_{room.day_number}"
            if room_key not in lab_votes:
                lab_votes[room_key] = {}

            for bot in alive_players:
                if not bot.is_bot or not bot.is_alive:
                    continue
                if bot.id == candidate.id:
                    continue  # Can't vote for yourself

                from services.bot_service import get_bot_brain
                brain = get_bot_brain(code, bot.id)
                should_vote_yes = False

                if bot.team == "mafia":
                    # Mafia votes yes for citizens (to eliminate them)
                    if candidate.team == "citizen":
                        dangerous = candidate.role_name in ("\u06a9\u0627\u0631\u0622\u06af\u0627\u0647", "\u0628\u0627\u0632\u067e\u0631\u0633", "\u062f\u06a9\u062a\u0631")
                        should_vote_yes = dangerous or random.random() < 0.4
                    else:
                        should_vote_yes = False  # Don't vote out fellow mafia
                else:
                    # Citizen votes based on suspicion
                    sus = brain["suspicion"].get(candidate.id, 0)
                    trust = brain["trust"].get(candidate.id, 0)
                    if sus > trust:
                        should_vote_yes = random.random() < 0.7
                    else:
                        should_vote_yes = random.random() < 0.15

                if should_vote_yes:
                    lab_votes[room_key][candidate.slot] = lab_votes[room_key].get(candidate.slot, 0) + 1

                    socketio.emit("lab_vote_cast", {
                        "voter": get_player_public_info(bot),
                        "candidate_slot": candidate.slot,
                        "vote": "yes",
                        "vote_counts": lab_votes[room_key]
                    }, room=f"lab_{code}")

    threading.Thread(target=vote, daemon=True).start()
