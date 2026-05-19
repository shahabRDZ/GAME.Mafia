"""Profile blueprint — view/update profile, search users."""
import base64
import re
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models import User

bp = Blueprint("profile", __name__)

_AVATAR_B64_MAX = 400_000   # ~300KB raw bytes after decoding
_ALLOWED_MIME   = {"image/jpeg", "image/png", "image/webp"}
_DATA_URI_RE    = re.compile(r"^data:(image/[a-zA-Z+]+);base64,(.+)$", re.DOTALL)


def _validate_avatar(url: str):
    """Return None if valid, else an error string."""
    m = _DATA_URI_RE.match(url)
    if not m:
        return "فرمت عکس نامعتبر است (data URI مورد نیاز است)"
    mime, b64_data = m.group(1), m.group(2)
    if mime not in _ALLOWED_MIME:
        return f"نوع فایل پشتیبانی نمی‌شود. فقط JPEG، PNG یا WebP مجاز است"
    try:
        raw = base64.b64decode(b64_data, validate=True)
    except Exception:
        return "داده base64 نامعتبر است"
    if len(raw) > _AVATAR_B64_MAX:
        return "عکس پروفایل خیلی بزرگ است (حداکثر ۳۰۰KB)"
    return None


@bp.route("/api/profile/<int:user_id>", methods=["GET"])
def get_profile(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "کاربر یافت نشد"}), 404
    return jsonify(user.to_dict()), 200


@bp.route("/api/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    user = db.session.get(User, int(get_jwt_identity()))
    data = request.get_json(silent=True) or {}
    if "avatar" in data:
        user.avatar_emoji = (data["avatar"] or "")[:10]
    if "bio" in data:
        user.bio = (data["bio"] or "")[:200]
    if "avatar_url" in data:
        url = data["avatar_url"] or ""
        if url:
            err = _validate_avatar(url)
            if err:
                return jsonify({"error": err}), 400
        user.avatar_url = url or None
    db.session.commit()
    return jsonify(user.to_dict()), 200


@bp.route("/api/users/search", methods=["GET"])
@jwt_required()
def search_users():
    q = request.args.get("q", "").strip()
    if len(q) < 2:
        return jsonify([]), 200
    users = User.query.filter(User.username.ilike(f"%{q}%")).limit(20).all()
    me_id = int(get_jwt_identity())
    return jsonify([u.to_dict() for u in users if u.id != me_id]), 200
