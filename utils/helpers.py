"""General-purpose utility functions."""
import math
import time
import random
import string
from collections import defaultdict
from flask import request, jsonify
from flask_jwt_extended import get_jwt_identity, decode_token
from extensions import db
from config.settings import Config

# ── Rate Limiter ──

_rate_store = defaultdict(list)


def rate_limit(key, max_requests=30, window=60):
    """Returns True if rate limit exceeded."""
    now = time.time()
    _rate_store[key] = [t for t in _rate_store[key] if now - t < window]
    if len(_rate_store[key]) >= max_requests:
        return True
    _rate_store[key].append(now)
    return False


# ── Admin Check ──

def is_admin():
    try:
        uid = int(get_jwt_identity())
        from models import User
        user = db.session.get(User, uid)
        return user and user.username in Config.ADMIN_USERNAMES
    except Exception:
        return False


def log_admin_action(action, target=None):
    from models import AdminLog
    try:
        uid = int(get_jwt_identity())
        log = AdminLog(admin_id=uid, action=action, target=target)
        db.session.add(log)
        db.session.commit()
    except Exception:
        db.session.rollback()


# ── Token Helper ──

def get_user_from_token(token_str):
    try:
        data = decode_token(token_str)
        from models import User
        return db.session.get(User, int(data["sub"]))
    except Exception:
        return None


# ── Geo ──

def haversine(lat1, lng1, lat2, lng2):
    """Distance in meters between two GPS points."""
    R = 6371000
    p = math.pi / 180
    a = 0.5 - math.cos((lat2 - lat1) * p) / 2 + \
        math.cos(lat1 * p) * math.cos(lat2 * p) * (1 - math.cos((lng2 - lng1) * p)) / 2
    return 2 * R * math.asin(math.sqrt(a))


# ── Code Generators ──

def gen_room_code(length=6):
    """Generate a random uppercase alphanumeric room code."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


def gen_digital_code():
    from utils.state import digital_rooms
    now = time.time()
    stale = [c for c, r in digital_rooms.items() if now - r.get("created", 0) > 3600]
    for c in stale:
        digital_rooms.pop(c, None)
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
        if code not in digital_rooms:
            return code
