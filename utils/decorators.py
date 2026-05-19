"""Reusable decorators for route protection."""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from extensions import db
from config.settings import Config


def is_admin() -> bool:
    """Return True if the current JWT user has admin rights.

    Checks the DB flag first; falls back to ADMIN_USERNAMES for initial
    bootstrap before the flag is explicitly set.
    """
    try:
        uid = int(get_jwt_identity())
        from models import User
        user = db.session.get(User, uid)
        if not user:
            return False
        if user.is_admin:
            return True
        # Bootstrap fallback: auto-promote users in the config list
        if user.username.lower() in [u.lower() for u in Config.ADMIN_USERNAMES]:
            user.is_admin = True
            db.session.commit()
            return True
        return False
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
