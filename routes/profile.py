"""Profile blueprint — view/update profile, search users."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models import User

bp = Blueprint("profile", __name__)


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
    data = request.get_json()
    if "avatar" in data:
        user.avatar_emoji = data["avatar"][:10]
    if "bio" in data:
        user.bio = data["bio"][:200]
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
