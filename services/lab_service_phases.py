import time as _time_module
import threading
import random
from datetime import datetime, timezone, timedelta

from extensions import db, socketio
from models import LabRoom, LabPlayer, LabMessage, User, Game, BotMemory
from services.state import (
    lab_votes, lab_revotes, lab_bazpors_votes, lab_night_actions,
    user_to_sid,
)
from services.lab_service import (
    get_alive_sorted, check_win_condition, emit_game_result,
    find_player_by_role, get_mafia_players, emit_to_player,
    get_player_public_info, start_day_talk, schedule_turn_timer,
    start_sequential_voting, schedule_vote_advance,
    schedule_revote_advance, schedule_night_sub_advance,
    schedule_phase_timer,
)


# ── Night Order Constant ─────────────────────────────────────────────────

NIGHT_ORDER = ["night_hunter", "night_shayad", "night_mafia", "night_detective", "night_doctor", "night_bazpors"]


# ── Vote Counts ──────────────────────────────────────────────────────────

def get_vote_counts(code, day_number):
    """Get vote counts per candidate slot"""
    room_key = f"{code}_{day_number}"
    return lab_votes.get(room_key, {})


# ── Resolve Voting ───────────────────────────────────────────────────────

def resolve_voting(app, code):
    """Check if anyone got 4+ votes, if so go to defense, else night"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    room_key = f"{code}_{room.day_number}"
    vote_counts = lab_votes.get(room_key, {})  # {candidate_slot: count}

    # Find player with most votes
    max_voted_slot = None
    max_count = 0
    if vote_counts:
        max_voted_slot = max(vote_counts, key=vote_counts.get)
        max_count = vote_counts[max_voted_slot]

    if max_count >= 4:
        # Go to defense phase
        defense_player = LabPlayer.query.filter_by(room_id=room.id, slot=max_voted_slot).first()
        if defense_player:
            start_defense(app, code, defense_player, max_count)
            return

    # No one has 4+ votes - go to night
    socketio.emit("lab_phase_change", {
        "phase": "voting_result",
        "day_number": room.day_number,
        "message": "هیچکس رأی کافی نگرفت",
        "vote_counts": {str(k): v for k, v in vote_counts.items()}
    }, room=f"lab_{code}")

    # Clean up votes
    lab_votes.pop(room_key, None)

    # Start night after 3 seconds
    def go_night():
        _time_module.sleep(3)
        with app.app_context():
            r = LabRoom.query.filter_by(code=code).first()
            if r and r.status == "playing":
                start_night(app, code)
    threading.Thread(target=go_night, daemon=True).start()


# ── Defense Phase ──────────────────────────────────────────────────────────

def start_defense(app, code, defense_player, vote_count):
    """Player with 4+ votes gets 30s to defend"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    room.phase = "defense"
    room.defense_player_id = defense_player.id
    room.current_turn = defense_player.slot
    room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=40)
    db.session.commit()

    socketio.emit("lab_phase_change", {
        "phase": "defense",
        "day_number": room.day_number,
        "defense_player": get_player_public_info(defense_player),
        "vote_count": vote_count,
        "turn_end_at": room.turn_end_at.isoformat()
    }, room=f"lab_{code}")

    # Bot defense
    if defense_player.is_bot:
        generate_bot_defense(app, code, defense_player)

    schedule_phase_timer(app, code, "defense", room.day_number, 30)


def generate_bot_defense(app, code, bot_player):
    """Bot sends a defense message"""
    def send():
        _time_module.sleep(random.uniform(3, 10))
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.phase != "defense":
                return

            defense_msgs = [
                "من بی\u200cگناهم! من شهروندم!",
                "دارین اشتباه میکنین، من مافیا نیستم",
                "بذارین توضیح بدم، اشتباه میکنید",
                "اگه منو بندازین بیرون ضرر میکنین",
                "من کارآگاهم، نندازینم!",
                "به خدا اشتباه میکنید، مافیا داره گولتون میزنه",
                "یکی داره منو قربانی میکنه",
                "صبر کنید، من میتونم ثابت کنم"
            ]
            content = random.choice(defense_msgs)

            msg = LabMessage(room_id=room.id, player_id=bot_player.id, content=content, msg_type="defense")
            db.session.add(msg)
            db.session.commit()

            socketio.emit("lab_new_message", {
                "id": msg.id,
                "player": get_player_public_info(bot_player),
                "content": content,
                "msg_type": "defense",
                "time": msg.created_at.isoformat()
            }, room=f"lab_{code}")

    threading.Thread(target=send, daemon=True).start()


# ── Revote Phase ──────────────────────────────────────────────────────────

def start_revote(app, code):
    """Each alive player votes eliminate or keep"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    alive = get_alive_sorted(room)
    if not alive:
        return

    room.phase = "revote"
    room.current_turn = alive[0].slot
    room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=5)
    db.session.commit()

    room_key = f"{code}_{room.day_number}"
    lab_revotes[room_key] = {}

    defense_player = LabPlayer.query.get(room.defense_player_id) if room.defense_player_id else None

    socketio.emit("lab_phase_change", {
        "phase": "revote",
        "day_number": room.day_number,
        "defense_player": get_player_public_info(defense_player),
        "current_turn": alive[0].slot,
        "turn_player": get_player_public_info(alive[0]),
        "turn_end_at": room.turn_end_at.isoformat(),
        "alive_players": [get_player_public_info(p) for p in alive]
    }, room=f"lab_{code}")

    if alive[0].is_bot:
        bot_sequential_revote(app, code, alive[0])

    schedule_revote_advance(app, code, alive[0].slot, room.day_number)


def advance_sequential_revote(app, code):
    """Move to next revote voter or resolve"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room or room.phase != "revote":
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
        resolve_revote(app, code)
    else:
        room.current_turn = next_slot
        room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=5)
        db.session.commit()

        player = LabPlayer.query.filter_by(room_id=room.id, slot=next_slot).first()
        socketio.emit("lab_phase_change", {
            "phase": "revote",
            "day_number": room.day_number,
            "current_turn": next_slot,
            "turn_player": get_player_public_info(player),
            "turn_end_at": room.turn_end_at.isoformat()
        }, room=f"lab_{code}")

        if player and player.is_bot:
            bot_sequential_revote(app, code, player)

        schedule_revote_advance(app, code, next_slot, room.day_number)


def bot_sequential_revote(app, code, bot_player):
    """Bot votes in revote"""
    def vote():
        _time_module.sleep(random.uniform(0.5, 2))
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.phase != "revote":
                return
            if room.current_turn != bot_player.slot:
                return

            defense_player = LabPlayer.query.get(room.defense_player_id) if room.defense_player_id else None
            if not defense_player:
                return

            # Mafia bots protect their own, citizen bots vote to eliminate
            if bot_player.team == "mafia" and defense_player.team == "mafia":
                decision = "keep"
            elif bot_player.team == "mafia" and defense_player.team == "citizen":
                decision = "eliminate"
            else:
                decision = random.choice(["eliminate", "eliminate", "keep"])  # citizens lean eliminate

            room_key = f"{code}_{room.day_number}"
            if room_key not in lab_revotes:
                lab_revotes[room_key] = {}
            lab_revotes[room_key][bot_player.id] = decision

            socketio.emit("lab_revote_cast", {
                "voter": get_player_public_info(bot_player),
                "decision": decision
            }, room=f"lab_{code}")

    threading.Thread(target=vote, daemon=True).start()


def resolve_revote(app, code):
    """Count revotes - majority eliminate = player eliminated"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    room_key = f"{code}_{room.day_number}"
    revotes = lab_revotes.get(room_key, {})

    eliminate_count = sum(1 for d in revotes.values() if d == "eliminate")
    keep_count = sum(1 for d in revotes.values() if d == "keep")

    defense_player = LabPlayer.query.get(room.defense_player_id) if room.defense_player_id else None

    if eliminate_count > keep_count and defense_player:
        # Eliminate
        defense_player.is_alive = False
        defense_player.is_eliminated = True
        room.eliminated_today = defense_player.id
        db.session.commit()

        socketio.emit("lab_elimination", {
            "eliminated": get_player_public_info(defense_player),
            "eliminated_role": defense_player.role_name,
            "eliminate_votes": eliminate_count,
            "keep_votes": keep_count
        }, room=f"lab_{code}")

        # Check win
        winner = check_win_condition(room)
        if winner:
            emit_game_result(code, room, winner, defense_player)
            lab_revotes.pop(room_key, None)
            lab_votes.pop(f"{code}_{room.day_number}", None)
            return
    else:
        socketio.emit("lab_elimination", {
            "eliminated": None,
            "message": "بازیکن ابقا شد",
            "eliminate_votes": eliminate_count,
            "keep_votes": keep_count
        }, room=f"lab_{code}")

    # Clean up
    lab_revotes.pop(room_key, None)
    lab_votes.pop(f"{code}_{room.day_number}", None)
    room.defense_player_id = None
    db.session.commit()

    # Go to night after 3 seconds
    def go_night():
        _time_module.sleep(3)
        with app.app_context():
            r = LabRoom.query.filter_by(code=code).first()
            if r and r.status == "playing":
                start_night(app, code)
    threading.Thread(target=go_night, daemon=True).start()


# ── Night Phase (sub-phases) ──────────────────────────────────────────────

def start_night(app, code):
    """Begin night with first sub-phase"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    # Reset night targets
    room.night_kill_target = None
    room.doctor_save_target = None
    room.hunter_block_target = None
    room.detective_result = None

    room_key = f"{code}_{room.day_number}"
    lab_night_actions[room_key] = {}

    db.session.commit()

    start_night_sub(app, code, NIGHT_ORDER[0])


def start_night_sub(app, code, sub_phase):
    """Start a night sub-phase"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room or room.status != "playing":
        return

    room.phase = sub_phase
    room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=10)
    db.session.commit()

    alive = get_alive_sorted(room)
    alive_info = [get_player_public_info(p) for p in alive]

    # Notify everyone about the sub-phase (without revealing who acts)
    socketio.emit("lab_phase_change", {
        "phase": sub_phase,
        "day_number": room.day_number,
        "turn_end_at": room.turn_end_at.isoformat()
    }, room=f"lab_{code}")

    # Send action prompt to the relevant player(s)
    if sub_phase == "night_detective":
        detective = find_player_by_role(room, "کارآگاه")
        if detective:
            emit_to_player(detective, "lab_night_action_prompt", {
                "sub_phase": sub_phase,
                "role": "کارآگاه",
                "targets": [p for p in alive_info if p and p["id"] != detective.id],
                "turn_end_at": room.turn_end_at.isoformat()
            })
            if detective.is_bot:
                bot_night_action(app, code, detective, sub_phase)

    elif sub_phase == "night_shayad":
        shayad = find_player_by_role(room, "شیاد")
        if shayad:
            emit_to_player(shayad, "lab_night_action_prompt", {
                "sub_phase": sub_phase,
                "role": "شیاد",
                "description": "یک بازیکن انتخاب کنید — اگر کارآگاه باشد، استعلامش منفی می\u200cشود",
                "targets": [p for p in alive_info if p and p["id"] != shayad.id],
                "turn_end_at": room.turn_end_at.isoformat()
            })
            if shayad.is_bot:
                bot_night_action(app, code, shayad, sub_phase)

    elif sub_phase == "night_bazpors":
        bazpors = find_player_by_role(room, "بازپرس")
        if bazpors and not room.bazpors_ability_used:
            emit_to_player(bazpors, "lab_night_action_prompt", {
                "sub_phase": sub_phase,
                "role": "بازپرس",
                "description": "۲ بازیکن انتخاب کنید — فردا این ۲ نفر دفاع می\u200cکنند و بین آنها رأی\u200cگیری می\u200cشود",
                "select_count": 2,
                "targets": [p for p in alive_info if p and p["id"] != bazpors.id],
                "turn_end_at": room.turn_end_at.isoformat()
            })
            if bazpors.is_bot:
                bot_night_action(app, code, bazpors, sub_phase)
        # If ability already used, skip

    elif sub_phase == "night_doctor":
        doctor = find_player_by_role(room, "دکتر")
        if doctor:
            emit_to_player(doctor, "lab_night_action_prompt", {
                "sub_phase": sub_phase,
                "role": "دکتر",
                "targets": alive_info,
                "can_self_save": not room.doctor_self_save_used,
                "turn_end_at": room.turn_end_at.isoformat()
            })
            if doctor.is_bot:
                bot_night_action(app, code, doctor, sub_phase)

    elif sub_phase == "night_hunter":
        hunter = find_player_by_role(room, "هانتر")
        if hunter:
            emit_to_player(hunter, "lab_night_action_prompt", {
                "sub_phase": sub_phase,
                "role": "هانتر",
                "targets": [p for p in alive_info if p and p["id"] != hunter.id],
                "turn_end_at": room.turn_end_at.isoformat()
            })
            if hunter.is_bot:
                bot_night_action(app, code, hunter, sub_phase)

    elif sub_phase == "night_mafia":
        mafia_players = get_mafia_players(room)
        non_mafia = [p for p in alive_info if p and p["id"] not in [m.id for m in mafia_players]]
        for mp in mafia_players:
            emit_to_player(mp, "lab_night_action_prompt", {
                "sub_phase": sub_phase,
                "role": mp.role_name,
                "is_boss": mp.role_name == "رئیس مافیا",
                "targets": non_mafia,
                "mafia_team": [get_player_public_info(m) for m in mafia_players],
                "turn_end_at": room.turn_end_at.isoformat()
            })
        # Bot mafia boss chooses kill
        boss = find_player_by_role(room, "رئیس مافیا")
        if boss and boss.is_bot:
            bot_night_action(app, code, boss, sub_phase)

    schedule_night_sub_advance(app, code, sub_phase, room.day_number)


def bot_night_action(app, code, bot_player, sub_phase):
    """Bot performs a night action"""
    def act():
        _time_module.sleep(random.uniform(2, 6))
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.phase != sub_phase:
                return

            alive = [p for p in room.players if p.is_alive]
            targets = [p for p in alive if p.id != bot_player.id]

            if not targets:
                return

            room_key = f"{code}_{room.day_number}"
            if room_key not in lab_night_actions:
                lab_night_actions[room_key] = {}

            if sub_phase == "night_detective":
                target = random.choice(targets)
                lab_night_actions[room_key]["detective"] = target.id
                result = "مافیا" if target.team == "mafia" else "شهروند"
                room.detective_result = result
                db.session.commit()
                emit_to_player(bot_player, "lab_detective_result", {
                    "target": get_player_public_info(target),
                    "result": result
                })

            elif sub_phase == "night_doctor":
                # Can save self once
                if not room.doctor_self_save_used:
                    all_targets = alive
                else:
                    all_targets = targets
                target = random.choice(all_targets) if all_targets else None
                if target:
                    lab_night_actions[room_key]["doctor"] = target.id
                    room.doctor_save_target = target.id
                    if target.id == bot_player.id:
                        room.doctor_self_save_used = True
                    db.session.commit()

            elif sub_phase == "night_hunter":
                target = random.choice(targets)
                lab_night_actions[room_key]["hunter"] = target.id
                room.hunter_block_target = target.id
                db.session.commit()

            elif sub_phase == "night_mafia":
                citizens = [p for p in targets if p.team == "citizen"]
                target = random.choice(citizens if citizens else targets)
                lab_night_actions[room_key]["mafia"] = target.id
                room.night_kill_target = target.id
                db.session.commit()

            elif sub_phase == "night_shayad":
                # Shayad picks a random target, hoping to find detective
                target = random.choice(targets)
                lab_night_actions[room_key]["shayad"] = target.id
                db.session.commit()

            elif sub_phase == "night_bazpors":
                if room.bazpors_ability_used:
                    return
                if len(targets) < 2:
                    return
                chosen = random.sample(targets, 2)
                room.bazpors_ability_used = True
                room.bazpors_target1 = chosen[0].id
                room.bazpors_target2 = chosen[1].id
                lab_night_actions[room_key]["bazpors"] = [chosen[0].id, chosen[1].id]
                db.session.commit()

    threading.Thread(target=act, daemon=True).start()


def advance_night(app, code):
    """Move to next night sub-phase or resolve"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room or room.status != "playing":
        return

    current_phase = room.phase
    if current_phase not in NIGHT_ORDER:
        return

    idx = NIGHT_ORDER.index(current_phase)
    if idx < len(NIGHT_ORDER) - 1:
        start_night_sub(app, code, NIGHT_ORDER[idx + 1])
    else:
        resolve_night(app, code)


def resolve_night(app, code):
    """Resolve all night actions"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    room_key = f"{code}_{room.day_number}"
    actions = lab_night_actions.get(room_key, {})

    kill_target_id = actions.get("mafia") or room.night_kill_target
    save_target_id = actions.get("doctor") or room.doctor_save_target
    # hunter blocks target's ability, not mafia kill

    killed_player = None
    saved = False

    if kill_target_id:
        if save_target_id and kill_target_id == save_target_id:
            saved = True
        else:
            killed_player = LabPlayer.query.get(kill_target_id)
            if killed_player:
                killed_player.is_alive = False
                killed_player.is_eliminated = True

    room.phase = "night_resolve"
    db.session.commit()

    if saved:
        saved_player = LabPlayer.query.get(kill_target_id)
        socketio.emit("lab_night_result", {
            "killed": None,
            "saved": get_player_public_info(saved_player) if saved_player else None,
            "message": "دکتر نجاتش داد! 🩺",
            "day_number": room.day_number
        }, room=f"lab_{code}")
    elif killed_player:
        socketio.emit("lab_night_result", {
            "killed": get_player_public_info(killed_player),
            "killed_role": killed_player.role_name,
            "saved": None,
            "message": None,
            "day_number": room.day_number
        }, room=f"lab_{code}")
    else:
        socketio.emit("lab_night_result", {
            "killed": None,
            "saved": None,
            "message": "شب بدون تلفات گذشت",
            "day_number": room.day_number
        }, room=f"lab_{code}")

    # Clean up night actions
    lab_night_actions.pop(room_key, None)

    # Check win condition
    winner = check_win_condition(room)
    if winner:
        emit_game_result(code, room, winner, killed_player)
        return

    # Start next day after 5 seconds
    def next_day():
        _time_module.sleep(5)
        with app.app_context():
            r = LabRoom.query.filter_by(code=code).first()
            if r and r.status == "playing":
                # Check if bazpors selected 2 targets last night
                if r.bazpors_target1 and r.bazpors_target2:
                    t1 = LabPlayer.query.get(r.bazpors_target1)
                    t2 = LabPlayer.query.get(r.bazpors_target2)
                    if t1 and t1.is_alive and t2 and t2.is_alive:
                        start_bazpors_trial(app, code, r.day_number + 1)
                        return
                    # Clear if targets are dead
                    r.bazpors_target1 = None
                    r.bazpors_target2 = None
                    db.session.commit()
                start_day_talk(app, code, r.day_number + 1)
    threading.Thread(target=next_day, daemon=True).start()


# ── Bazpors Trial Phase ──────────────────────────────────────────────────────

def start_bazpors_trial(app, code, day_number):
    """Bazpors selected 2 players: they defend, then vote between them"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    room.phase = "bazpors_defense1"
    room.day_number = day_number
    room.current_turn = 0

    t1 = LabPlayer.query.get(room.bazpors_target1)
    t2 = LabPlayer.query.get(room.bazpors_target2)

    # First target defends for 30s
    room.defense_player_id = t1.id
    room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=40)
    db.session.commit()

    t1_info = get_player_public_info(t1)
    t2_info = get_player_public_info(t2)

    socketio.emit("lab_phase_change", {
        "phase": "bazpors_defense1",
        "day_number": day_number,
        "defense_player": t1_info,
        "defense_player2": t2_info,
        "turn_end_at": room.turn_end_at.isoformat(),
        "message": f"🔍 بازپرس ۲ نفر را انتخاب کرده! اول {t1_info['name']} دفاع می\u200cکند (۳۰ ثانیه)"
    }, room=f"lab_{code}")

    # Bot defense
    if t1.is_bot:
        generate_bot_defense_bazpors(app, code, t1)

    # After 30s, switch to second player
    def switch_to_defense2():
        _time_module.sleep(41)
        with app.app_context():
            r = LabRoom.query.filter_by(code=code).first()
            if not r or r.phase != "bazpors_defense1":
                return
            r.phase = "bazpors_defense2"
            r.defense_player_id = r.bazpors_target2
            r.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=40)
            db.session.commit()

            t2_p = LabPlayer.query.get(r.bazpors_target2)
            socketio.emit("lab_phase_change", {
                "phase": "bazpors_defense2",
                "day_number": day_number,
                "defense_player": get_player_public_info(t2_p),
                "turn_end_at": r.turn_end_at.isoformat(),
                "message": f"حالا {get_player_public_info(t2_p)['name']} دفاع می\u200cکند (۳۰ ثانیه)"
            }, room=f"lab_{code}")

            if t2_p.is_bot:
                generate_bot_defense_bazpors(app, code, t2_p)

            # After 30s, start bazpors vote
            def start_bvote():
                _time_module.sleep(41)
                with app.app_context():
                    r2 = LabRoom.query.filter_by(code=code).first()
                    if not r2 or r2.phase != "bazpors_defense2":
                        return
                    start_bazpors_vote(app, code)
            threading.Thread(target=start_bvote, daemon=True).start()

    threading.Thread(target=switch_to_defense2, daemon=True).start()


def generate_bot_defense_bazpors(app, code, bot_player):
    """Bot generates a defense message for bazpors trial"""
    def send():
        _time_module.sleep(random.uniform(3, 10))
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or "bazpors_defense" not in room.phase:
                return
            if room.defense_player_id != bot_player.id:
                return
            from services.bot_service import get_fallback_bot_message
            content = get_fallback_bot_message(bot_player.role_name, bot_player.team, room.day_number)
            msg = LabMessage(room_id=room.id, player_id=bot_player.id, content=content)
            db.session.add(msg)
            db.session.commit()
            socketio.emit("lab_new_message", {
                "id": msg.id,
                "player": get_player_public_info(bot_player),
                "content": content,
                "msg_type": "chat",
                "time": msg.created_at.isoformat()
            }, room=f"lab_{code}")
    threading.Thread(target=send, daemon=True).start()


# ── Bazpors Vote ─────────────────────────────────────────────────────────────

def start_bazpors_vote(app, code):
    """Vote between the 2 bazpors targets"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    room.phase = "bazpors_vote"
    alive = get_alive_sorted(room)
    room.current_turn = alive[0].slot if alive else 0
    room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=5)
    db.session.commit()

    t1 = LabPlayer.query.get(room.bazpors_target1)
    t2 = LabPlayer.query.get(room.bazpors_target2)

    room_key = f"{code}_{room.day_number}_bvote"
    lab_votes[room_key] = {}

    socketio.emit("lab_phase_change", {
        "phase": "bazpors_vote",
        "day_number": room.day_number,
        "current_turn": alive[0].slot if alive else 0,
        "turn_player": get_player_public_info(alive[0]) if alive else None,
        "turn_end_at": room.turn_end_at.isoformat(),
        "candidate1": get_player_public_info(t1),
        "candidate2": get_player_public_info(t2),
        "message": "بین این ۲ نفر رأی بدهید"
    }, room=f"lab_{code}")

    # Bot votes
    if alive and alive[0].is_bot:
        bot_bazpors_vote(app, code, alive[0], t1, t2)

    schedule_bazpors_vote_advance(app, code, alive[0].slot if alive else 0, room.day_number)


def schedule_bazpors_vote_advance(app, code, current_slot, day_number):
    """Auto-advance bazpors vote after 3s"""
    def advance():
        _time_module.sleep(6)
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.phase != "bazpors_vote" or room.day_number != day_number:
                return
            if room.current_turn != current_slot:
                return
            advance_bazpors_vote(app, code)
    threading.Thread(target=advance, daemon=True).start()


def advance_bazpors_vote(app, code):
    """Move to next voter in bazpors vote"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room or room.phase != "bazpors_vote":
        return

    alive = get_alive_sorted(room)
    current = room.current_turn
    alive_slots = [p.slot for p in alive]

    next_slot = None
    for s in alive_slots:
        if s > current:
            next_slot = s
            break

    if next_slot is None:
        # All voted - resolve
        resolve_bazpors_vote(app, code)
    else:
        room.current_turn = next_slot
        room.turn_end_at = datetime.now(timezone.utc) + timedelta(seconds=5)
        db.session.commit()

        player = next((p for p in alive if p.slot == next_slot), None)
        socketio.emit("lab_phase_change", {
            "phase": "bazpors_vote",
            "day_number": room.day_number,
            "current_turn": next_slot,
            "turn_player": get_player_public_info(player),
            "turn_end_at": room.turn_end_at.isoformat()
        }, room=f"lab_{code}")

        if player and player.is_bot:
            t1 = LabPlayer.query.get(room.bazpors_target1)
            t2 = LabPlayer.query.get(room.bazpors_target2)
            bot_bazpors_vote(app, code, player, t1, t2)

        schedule_bazpors_vote_advance(app, code, next_slot, room.day_number)


def bot_bazpors_vote(app, code, bot_player, t1, t2):
    """Bot votes in bazpors vote"""
    def vote():
        _time_module.sleep(random.uniform(0.5, 2))
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if not room or room.phase != "bazpors_vote":
                return
            room_key = f"{code}_{room.day_number}_bvote"
            if room_key not in lab_votes:
                lab_votes[room_key] = {}
            # Mafia bots vote for citizens, citizen bots vote randomly
            if bot_player.team == "mafia":
                target = t1 if t1.team == "citizen" else t2
            else:
                target = random.choice([t1, t2])
            lab_votes[room_key][bot_player.id] = target.id
            socketio.emit("lab_vote_cast", {
                "voter": get_player_public_info(bot_player),
                "target_id": target.id,
                "vote_results": count_bazpors_votes(room_key, t1.id, t2.id)
            }, room=f"lab_{code}")
    threading.Thread(target=vote, daemon=True).start()


def count_bazpors_votes(room_key, t1_id, t2_id):
    """Count votes for bazpors candidates"""
    votes = lab_votes.get(room_key, {})
    return {
        str(t1_id): sum(1 for v in votes.values() if v == t1_id),
        str(t2_id): sum(1 for v in votes.values() if v == t2_id)
    }


def resolve_bazpors_vote(app, code):
    """Resolve bazpors vote - eliminate the one with more votes"""
    room = LabRoom.query.filter_by(code=code).first()
    if not room:
        return

    room_key = f"{code}_{room.day_number}_bvote"
    votes = lab_votes.get(room_key, {})

    t1_id = room.bazpors_target1
    t2_id = room.bazpors_target2
    t1_votes = sum(1 for v in votes.values() if v == t1_id)
    t2_votes = sum(1 for v in votes.values() if v == t2_id)

    # Eliminate the one with more votes (tie = no elimination)
    eliminated = None
    if t1_votes > t2_votes:
        eliminated = LabPlayer.query.get(t1_id)
    elif t2_votes > t1_votes:
        eliminated = LabPlayer.query.get(t2_id)

    if eliminated:
        eliminated.is_alive = False
        eliminated.is_eliminated = True

    # Clear bazpors targets
    room.bazpors_target1 = None
    room.bazpors_target2 = None

    db.session.commit()
    lab_votes.pop(room_key, None)

    # Announce result with team reveal
    if eliminated:
        team_label = "مافیا 🔴" if eliminated.team == "mafia" else "شهروند 🟢"
        socketio.emit("lab_phase_change", {
            "phase": "bazpors_result",
            "eliminated": get_player_public_info(eliminated),
            "eliminated_role": eliminated.role_name,
            "eliminated_team": eliminated.team,
            "team_label": team_label,
            "message": f"{get_player_public_info(eliminated)['name']} با رأی حذف شد — ساید: {team_label}",
            "day_number": room.day_number
        }, room=f"lab_{code}")
    else:
        socketio.emit("lab_phase_change", {
            "phase": "bazpors_result",
            "eliminated": None,
            "message": "تساوی آرا! کسی حذف نشد",
            "day_number": room.day_number
        }, room=f"lab_{code}")

    # Check win condition
    winner = check_win_condition(room)
    if winner:
        emit_game_result(code, room, winner, eliminated)
        return

    # Continue to normal day_talk after 5s
    def continue_day():
        _time_module.sleep(5)
        with app.app_context():
            r = LabRoom.query.filter_by(code=code).first()
            if r and r.status == "playing":
                start_day_talk(app, code, r.day_number)
    threading.Thread(target=continue_day, daemon=True).start()
