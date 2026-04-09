"""Reusable decorators for route protection."""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from extensions import db
from config.settings import Config


def is_admin():
    """Check if the current JWT user is an admin."""
    try:
        uid = int(get_jwt_identity())
        from models import User
        user = db.session.get(User, uid)
        return user and user.username in Config.ADMIN_USERNAMES
    except Exception:
        return False


def admin_required(fn):
    """Decorator that rejects non-admin users with 403."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not is_admin():
            return jsonify({"error": "دسترسی ندارید"}), 403
        return fn(*args, **kwargs)
    return wrapper


def log_admin_action(action, target=None):
    """Log an admin action to the database."""
    from models import AdminLog
    try:
        uid = int(get_jwt_identity())
        log = AdminLog(admin_id=uid, action=action, target=target)
        db.session.add(log)
        db.session.commit()
    except Exception:
        db.session.rollback()
