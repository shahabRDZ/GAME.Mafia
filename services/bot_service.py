import time as _time_module
import threading
import random

from extensions import db, socketio
from models import LabRoom, LabPlayer, LabMessage, User, BotMemory


# ── Bot Constants ───────────────────────────────────────────────────────────

BOT_NAMES = ["آرش", "سارا", "مهدی", "نازنین", "امیر", "لیلا", "رضا", "مریم", "حسین"]
BOT_AVATARS = ["🤖", "👾", "🎮", "🕹️", "💀", "👻", "🦊", "🐺", "🦇"]

# Bot personalities - each bot has a unique personality
BOT_PERSONALITIES = {
    "آرش": {"type": "angry", "label": "عصبی و تند"},
    "سارا": {"type": "smart", "label": "زیرک و باهوش"},
    "مهدی": {"type": "calm", "label": "آرام و منطقی"},
    "نازنین": {"type": "naive", "label": "ساده‌لوح و مهربون"},
    "امیر": {"type": "aggressive", "label": "تهاجمی و پرانرژی"},
    "لیلا": {"type": "detective", "label": "کنجکاو و دقیق"},
    "رضا": {"type": "funny", "label": "شوخ و خنده‌رو"},
    "مریم": {"type": "suspicious", "label": "بدبین و شکاک"},
    "حسین": {"type": "leader", "label": "رهبر و قاطع"},
}


# ── Bot Brain / Memory State ───────────────────────────────────────────────

bot_game_memory = {}  # {room_code: {bot_id: {suspicion: {pid: score}, allies: [], messages_seen: [], voted_for: [], day_context: str}}}

# Track used messages per bot to avoid repetition
bot_used_messages = {}  # {bot_id: set()}


# ── Bot Brain Functions ─────────────────────────────────────────────────────

def get_bot_brain(code, bot_id):
    """Get or create bot's game memory"""
    if code not in bot_game_memory:
        bot_game_memory[code] = {}
    if bot_id not in bot_game_memory[code]:
        bot_game_memory[code][bot_id] = {
            "suspicion": {},   # {player_id: score} higher = more suspicious
            "trust": {},       # {player_id: score} higher = more trusted
            "messages_seen": [],  # recent messages for context
            "accusations": [],  # who accused whom
            "defense_quality": {},  # {player_id: score}
            "vote_history": {},  # {player_id: [targets]}
        }
    return bot_game_memory[code][bot_id]


def bot_analyze_message(code, bot_player, speaker_player, content):
    """Bot analyzes a message from another player"""
    brain = get_bot_brain(code, bot_player.id)
    sid = speaker_player.id

    # Track message
    brain["messages_seen"].append({"from": sid, "content": content, "slot": speaker_player.slot})
    if len(brain["messages_seen"]) > 30:
        brain["messages_seen"] = brain["messages_seen"][-30:]

    # Analyze suspicion signals
    suspicious_words = ["نمیدونم", "فرقی نداره", "هرکی", "بیخیال", "مهم نیست", "حالا ولش"]
    defensive_words = ["من پاکم", "بهم اعتماد کنید", "من شهروندم", "من مثبتم", "قسم میخورم"]
    analytical_words = ["دقت کنید", "تحلیل", "منطقی", "رفتارش", "مشکوک", "تناقض", "دیشب"]
    accusation_words = ["تو مافیایی", "شک دارم به", "مشکوکی", "رای بدین به"]

    content_lower = content.strip()

    # Passive/evasive = slightly suspicious
    if any(w in content_lower for w in suspicious_words):
        brain["suspicion"][sid] = brain["suspicion"].get(sid, 0) + 1

    # Over-defensive = slightly suspicious (especially for mafia bots analyzing)
    if any(w in content_lower for w in defensive_words):
        if bot_player.team == "citizen":
            brain["trust"][sid] = brain["trust"].get(sid, 0) + 0.5
        else:
            brain["suspicion"][sid] = brain["suspicion"].get(sid, 0) + 0.3

    # Analytical = trustworthy (real analysis)
    if any(w in content_lower for w in analytical_words):
        brain["trust"][sid] = brain["trust"].get(sid, 0) + 1

    # Accusations tracked
    if any(w in content_lower for w in accusation_words):
        brain["accusations"].append({"from": sid, "content": content_lower})


def save_to_bot_memory(role_name, team, phase, message, room_id):
    """Save real player messages for bot learning"""
    recent = LabMessage.query.filter_by(room_id=room_id).order_by(LabMessage.id.desc()).limit(3).all()
    context = " | ".join([m.content for m in reversed(recent)])

    existing = BotMemory.query.filter_by(role_name=role_name, team=team, phase=phase, message=message).first()
    if existing:
        existing.times_used += 1
    else:
        mem = BotMemory(role_name=role_name, team=team, phase=phase, message=message, context=context)
        db.session.add(mem)
    db.session.commit()

    # Also feed to all bot brains in same room for analysis
    room = LabRoom.query.get(room_id) if room_id else None
    if room:
        speaker = LabPlayer.query.filter_by(room_id=room_id, role_name=role_name).first()
        if speaker:
            for p in room.players:
                if p.is_bot and p.is_alive and p.id != speaker.id:
                    bot_analyze_message(room.code, p, speaker, message)


# ── Helper Functions ────────────────────────────────────────────────────────

def _get_name(player):
    if not player:
        return "یکی"
    return player.bot_name if player.is_bot else (player.user_id and User.query.get(player.user_id).username if User.query.get(player.user_id) else "?")


def _get_personality(bot_player):
    name = bot_player.bot_name or ""
    return BOT_PERSONALITIES.get(name, {"type": "calm"})["type"]


def _personality_wrap(ptype, neutral, angry_ver, calm_ver, smart_ver, naive_ver):
    """Pick message variant based on personality"""
    variants = {"angry": angry_ver, "aggressive": angry_ver, "calm": calm_ver,
                "smart": smart_ver, "detective": smart_ver, "naive": naive_ver,
                "funny": naive_ver, "suspicious": angry_ver, "leader": calm_ver}
    return variants.get(ptype, neutral)


def _pick_unique(bot_id, messages):
    """Pick a message not used before by this bot"""
    if bot_id not in bot_used_messages:
        bot_used_messages[bot_id] = set()
    unused = [m for m in messages if m not in bot_used_messages[bot_id]]
    if not unused:
        bot_used_messages[bot_id].clear()
        unused = messages
    chosen = random.choice(unused)
    bot_used_messages[bot_id].add(chosen)
    return chosen


# ── Message Generation ──────────────────────────────────────────────────────

def get_smart_bot_message(code, bot_player, room):
    """Opening message with personality"""
    brain = get_bot_brain(code, bot_player.id)
    day = room.day_number
    alive = [p for p in room.players if p.is_alive and p.id != bot_player.id]
    ptype = _get_personality(bot_player)
    team = bot_player.team

    # Find targets
    most_sus = max(alive, key=lambda p: brain["suspicion"].get(p.id, 0) - brain["trust"].get(p.id, 0), default=None)
    sus_name = _get_name(most_sus) if most_sus else None

    # Pick a random other player to accuse
    accuse_target = random.choice(alive) if alive else None
    if team == "mafia":
        citizens = [p for p in alive if p.team == "citizen"]
        accuse_target = random.choice(citizens) if citizens else accuse_target
    accuse_name = _get_name(accuse_target) if accuse_target else "یکی"

    msgs = []

    if day == 1:
        msgs = [
            _personality_wrap(ptype,
                f"سلام، بیاین شروع کنیم",
                f"خب زود باشین، وقت تلف نکنیم! کی مشکوکه؟",
                f"سلام، بیاین آروم و منطقی بحث کنیم",
                f"سلام، من با دقت به همه گوش میدم، ادامه بدید",
                f"سلام بچه‌ها! امیدوارم بازی خوبی بشه"),
            _personality_wrap(ptype,
                f"بیاین ببینیم کی مشکوکه",
                f"یکی اینجا مشکوکه و من پیداش میکنم!",
                f"باید صبر کنیم همه حرف بزنن بعد نتیجه بگیریم",
                f"دقت کنید به لحن حرف زدن، خیلی چیزا لو میده",
                f"من هنوز کسی رو نمیشناسم، ببینیم چی میشه"),
        ]
    else:
        # Accusation messages (main content - always accuse someone)
        msgs = [
            _personality_wrap(ptype,
                f"به {accuse_name} شک دارم",
                f"{accuse_name}! تو مشکوکی! جواب بده چرا دیشب ساکت بودی؟",
                f"من با آرامش میگم، {accuse_name} رفتارش یکم عجیبه",
                f"از تحلیل رفتارها، {accuse_name} بیشترین تناقض رو داشته",
                f"نمیدونم ولی {accuse_name} یه جوری رفتار میکنه که شک میکنم"),
            _personality_wrap(ptype,
                f"{accuse_name} باید توضیح بده",
                f"من مطمئنم {accuse_name} داره دروغ میگه! رأی بدید بهش!",
                f"پیشنهاد میکنم {accuse_name} بیشتر توضیح بده، شفاف نیست",
                f"الگوی رفتاری {accuse_name} نشون میده یه چیزی پنهان میکنه",
                f"{accuse_name} چرا اینقدر عصبیه؟ مشکوکه بنظرم"),
            _personality_wrap(ptype,
                f"شماره {accuse_target.slot if accuse_target else '?'} خیلی مشکوکه",
                f"شماره {accuse_target.slot if accuse_target else '?'} رو باید بندازیمش بیرون!",
                f"اگه دقت کنید شماره {accuse_target.slot if accuse_target else '?'} از بحث فرار میکنه",
                f"تحلیلم نشون میده شماره {accuse_target.slot if accuse_target else '?'} ساید منفیه",
                f"شماره {accuse_target.slot if accuse_target else '?'} خوب حرف میزنه ولی مشکوکه"),
        ]

        if sus_name and sus_name != accuse_name:
            msgs.append(_personality_wrap(ptype,
                f"بین {sus_name} و {accuse_name} یکیشون مافیاست",
                f"یا {sus_name} یا {accuse_name}! یکیشون باید بره!",
                f"بین {sus_name} و {accuse_name} باید انتخاب کنیم",
                f"داده‌ها نشون میده {sus_name} و {accuse_name} مشکوک‌ترین‌ان",
                f"من گیجم بین {sus_name} و {accuse_name}"))

    return _pick_unique(bot_player.id, msgs)


def get_reactive_bot_message(code, bot_player, room):
    """React to previous messages with personality"""
    brain = get_bot_brain(code, bot_player.id)
    recent = brain["messages_seen"][-5:]
    ptype = _get_personality(bot_player)
    team = bot_player.team

    if not recent:
        return get_smart_bot_message(code, bot_player, room)

    last_msg = recent[-1]
    last_speaker = LabPlayer.query.get(last_msg.get("from"))
    last_name = _get_name(last_speaker) if last_speaker else "یکی"
    last_content = last_msg.get("content", "")

    # Check if bot's name was mentioned
    my_name = bot_player.bot_name or ""
    mentioned = my_name and my_name in last_content

    alive = [p for p in room.players if p.is_alive and p.id != bot_player.id]
    other_target = random.choice(alive) if alive else None
    other_name = _get_name(other_target) if other_target else "یکی"

    msgs = []

    if mentioned:
        # React to being mentioned/accused
        msgs = [
            _personality_wrap(ptype,
                f"{last_name} داری اشتباه میکنی",
                f"{last_name}!! من؟! عصبیم نکن! خودت مشکوکی!",
                f"{last_name} جان، آروم باش. من توضیح میدم، اشتباه میکنی",
                f"{last_name} دقت کن، من اتفاقاً دارم کمک میکنم. تو چرا بحث رو منحرف میکنی؟",
                f"وای {last_name} چرا منو میگی؟ من که کاری نکردم!"),
            _personality_wrap(ptype,
                f"بجای من به {other_name} نگاه کن",
                f"عوض اینکه منو متهم کنی {other_name} رو ببین! اون مشکوکه!",
                f"من مشکلی ندارم، ولی {other_name} هنوز جواب نداده",
                f"اتهامت بی‌دلیله. اگه منطقی فکر کنی {other_name} مشکوک‌تره",
                f"من؟! نه بابا! {other_name} رو ببینید چه ساکته"),
        ]
    else:
        sus_score = brain["suspicion"].get(last_msg.get("from"), 0)
        trust_score = brain["trust"].get(last_msg.get("from"), 0)

        if sus_score > trust_score:
            msgs = [
                _personality_wrap(ptype,
                    f"{last_name} داره دروغ میگه",
                    f"{last_name} حرف مفت نزن! مشخصه داری فرار میکنی!",
                    f"حرف‌های {last_name} منو قانع نکرد، یه تناقضی هست",
                    f"تحلیل حرف‌های {last_name}: تناقض با صحبت‌های قبلیش",
                    f"نمیدونم چرا ولی {last_name} یه جوری حرف میزنه که باورم نمیشه"),
                _personality_wrap(ptype,
                    f"به {last_name} رأی بدید",
                    f"من به {last_name} رأی میدم! مشکوکه!",
                    f"پیشنهادم اینه که {last_name} بیشتر توضیح بده",
                    f"از {last_name} میخوام دلیل رفتار دیشبش رو بگه",
                    f"{last_name} خیلی مشکوکه... نمیدونم فقط حسمه"),
            ]
        else:
            msgs = [
                _personality_wrap(ptype,
                    f"موافقم با {last_name}",
                    f"بالاخره یکی حرف حساب زد! {last_name} درست میگه",
                    f"نکته خوبی بود {last_name}، موافقم",
                    f"تحلیل {last_name} با داده‌های من همخوانی داره",
                    f"آره {last_name} راست میگه، منم همین فکرو میکنم"),
                _personality_wrap(ptype,
                    f"ولی {other_name} هم مشکوکه",
                    f"ولی {other_name} رو یادتون نره! اونم باید جواب بده!",
                    f"درسته، ولی {other_name} هم باید نظرشو بگه",
                    f"ضمناً {other_name} هم رفتار جالبی داشته، دقت کنید",
                    f"راستی {other_name} چرا ساکته؟"),
            ]

    return _pick_unique(bot_player.id, msgs)


def get_fallback_bot_message(role_name, team, day_number):
    """Generate a fallback message for bot defense or when no smart message is available"""
    if team == "mafia":
        msgs = [
            "من پاکم، بهم اعتماد کنید",
            "من شهروندم و دارم کمک میکنم",
            "اشتباه میکنید، من ساید مثبتم",
            "من بی‌گناهم، به کارام دقت کنید",
            "من دارم برای شهر تلاش میکنم",
        ]
    else:
        msgs = [
            "من شهروندم و حرفم راسته",
            "بهم اعتماد کنید، من پاکم",
            "من دارم کمک میکنم، اشتباه نکنید",
            "من بی‌گناهم، دلیلی نداره بهم شک کنید",
            "من ساید مثبتم، بذارید توضیح بدم",
        ]
    if day_number > 1:
        msgs.extend([
            "دیشب رو ببینید، من کاری نکردم",
            "اگه من مافیا بودم الان اینجا نبودم",
            "به رفتارم دقت کنید، من مشکلی ندارم",
        ])
    return random.choice(msgs)


# ── Bot Action Functions ────────────────────────────────────────────────────

def generate_bot_message(app, code, bot_player, get_player_public_info_fn, advance_turn_fn):
    """Generate multiple messages for bot, then auto-advance turn"""
    def send():
        num_messages = random.randint(2, 4)
        slot = bot_player.slot
        pid = bot_player.id

        for i in range(num_messages):
            delay = random.uniform(1.5, 3.5) if i == 0 else random.uniform(2, 4)
            _time_module.sleep(delay)

            with app.app_context():
                room = LabRoom.query.filter_by(code=code).first()
                if not room or room.phase != "day_talk" or room.current_turn != slot:
                    return

                bp = LabPlayer.query.get(pid)
                if not bp or not bp.is_alive:
                    return

                if i == 0:
                    content = get_smart_bot_message(code, bp, room)
                else:
                    content = get_reactive_bot_message(code, bp, room)

                if random.random() < 0.3:
                    memories = BotMemory.query.filter_by(
                        role_name=bp.role_name, team=bp.team, phase="day_talk"
                    ).order_by(BotMemory.effectiveness.desc()).limit(10).all()
                    if memories:
                        weights = [max(m.effectiveness + 5, 1) for m in memories]
                        chosen = random.choices(memories, weights=weights, k=1)[0]
                        content = chosen.message
                        chosen.times_used += 1

                msg = LabMessage(room_id=room.id, player_id=bp.id, content=content)
                db.session.add(msg)
                db.session.commit()

                for p in room.players:
                    if p.is_bot and p.is_alive and p.id != bp.id:
                        bot_analyze_message(code, p, bp, content)

                player_info = get_player_public_info_fn(bp)
                socketio.emit("lab_new_message", {
                    "id": msg.id,
                    "player": player_info,
                    "content": content,
                    "msg_type": "chat",
                    "time": msg.created_at.isoformat()
                }, room=f"lab_{code}")

                # Other bots randomly react
                bots_react_to_message(code, room, msg.id, bp.id)

        # Bot done talking — advance turn after a short pause
        _time_module.sleep(random.uniform(1, 2))
        with app.app_context():
            room = LabRoom.query.filter_by(code=code).first()
            if room and room.phase == "day_talk" and room.current_turn == slot:
                advance_turn_fn(code)

    threading.Thread(target=send, daemon=True).start()


# ── Bot Reaction Functions ──────────────────────────────────────────────────

def bots_react_to_message(code, room, message_id, sender_id):
    """Random bots react to messages with like/dislike"""
    def react():
        for p in room.players:
            if not p.is_bot or not p.is_alive or p.id == sender_id:
                continue
            if random.random() < 0.4:  # 40% chance each bot reacts
                _time_module.sleep(random.uniform(0.5, 2))
                sender = LabPlayer.query.get(sender_id)
                # Same team = like, different team = mixed
                if sender and p.team == sender.team:
                    reaction = "like"
                else:
                    reaction = random.choice(["like", "dislike", "dislike"])
                socketio.emit("lab_reaction", {
                    "message_id": message_id,
                    "reaction": reaction,
                    "from_user": p.bot_name
                }, room=f"lab_{code}")
    threading.Thread(target=react, daemon=True).start()


def bot_react_to_mention(app, code, room, message_id, content):
    """Bots react with like/dislike when their name is mentioned"""
    def react():
        _time_module.sleep(random.uniform(1, 3))
        with app.app_context():
            for p in room.players:
                if not p.is_bot or not p.is_alive:
                    continue
                name = p.bot_name or ""
                if name and name in content:
                    reaction = random.choice(["like", "like", "dislike"])  # Slightly prefer like
                    socketio.emit("lab_reaction", {
                        "message_id": message_id,
                        "reaction": reaction,
                        "from_user": name
                    }, room=f"lab_{code}")
    threading.Thread(target=react, daemon=True).start()
