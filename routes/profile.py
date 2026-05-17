"""Profile blueprint — view/update profile, search users."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models import User

bp = Blueprint("profile", __name__)

_AVATAR_URL_MAX = 400_000  # ~300KB base64


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
        if url and len(url) > _AVATAR_URL_MAX:
            return jsonify({"error": "عکس پروفایل خیلی بزرگ است (حداکثر ۳۰۰KB)"}), 400
        if url and not url.startswith("data:image/"):
            return jsonify({"error": "فرمت عکس نامعتبر است"}), 400
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
