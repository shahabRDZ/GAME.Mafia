"""Game history and leaderboard routes."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models import User, Game

bp = Blueprint("games", __name__)


@bp.route("/api/leaderboard", methods=["GET"])
@jwt_required(optional=True)
def get_leaderboard():
    lb_type = request.args.get("type", "wins")
    if lb_type == "wins":
        users = User.query.order_by(User.chaos_wins.desc()).limit(20).all()
    else:
        users = User.query.all()
        users.sort(key=lambda u: len(u.games), reverse=True)
        users = users[:20]
    return jsonify([{
        "id": u.id, "username": u.username,
        "chaos_wins": u.chaos_wins, "chaos_losses": u.chaos_losses,
        "total_games": len(u.games)
    } for u in users]), 200


@bp.route("/api/games", methods=["GET"])
@jwt_required()
def get_games():
    user = db.session.get(User, int(get_jwt_identity()))
    games = Game.query.filter_by(user_id=user.id).order_by(Game.played_at.desc()).all()
    return jsonify([g.to_dict() for g in games]), 200


@bp.route("/api/games", methods=["POST"])
@jwt_required()
def save_game():
    user = db.session.get(User, int(get_jwt_identity()))
    data = request.get_json()
    game = Game(
        user_id=user.id, group_name=data.get("group", "نامشخص"),
        total=data.get("count", 0), mafia=data.get("mafia", 0),
        citizen=data.get("citizen", 0)
    )
    db.session.add(game)
    # Award XP: 10 per game, bonus for larger games
    xp_gain = 10 + (data.get("count", 0) // 5) * 5
    user.xp = (user.xp or 0) + xp_gain
    db.session.commit()
    return jsonify(game.to_dict()), 201


@bp.route("/api/games", methods=["DELETE"])
@jwt_required()
def clear_games():
    user = db.session.get(User, int(get_jwt_identity()))
    keep_last = 10
    try:
        data = request.get_json(silent=True)
        if data and "keep_last" in data:
            keep_last = int(data["keep_last"])
    except:
        pass
    if keep_last > 0:
        # Keep the last N games, delete the rest
        recent = Game.query.filter_by(user_id=user.id).order_by(
            Game.played_at.desc()
        ).limit(keep_last).all()
        recent_ids = [g.id for g in recent]
        if recent_ids:
            Game.query.filter(
                Game.user_id == user.id, Game.id.notin_(recent_ids)
            ).delete(synchronize_session=False)
        else:
            Game.query.filter_by(user_id=user.id).delete()
    else:
        Game.query.filter_by(user_id=user.id).delete()
    db.session.commit()
    remaining = Game.query.filter_by(user_id=user.id).count()
    return jsonify({"message": "تاریخچه پاک شد", "remaining": remaining}), 200
