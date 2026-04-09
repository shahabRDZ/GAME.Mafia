"""Static page routes and basic API endpoints."""
from flask import Blueprint, jsonify, current_app
from extensions import db
from models import SiteStats

bp = Blueprint("pages", __name__)


@bp.route("/")
def index():
    return current_app.send_static_file("mafia.html")


@bp.route("/panel")
def admin_panel():
    return current_app.send_static_file("admin.html")


@bp.route("/mafia-events")
def events_page():
    return current_app.send_static_file("ev.html")


# ── Visit Counter ──

@bp.route("/api/visit", methods=["POST"])
def track_visit():
    stat = SiteStats.query.filter_by(key="visits").first()
    if not stat:
        stat = SiteStats(key="visits", value=0)
        db.session.add(stat)
    stat.value += 1
    db.session.commit()
    return jsonify({"visits": stat.value}), 200


@bp.route("/api/version", methods=["GET"])
def get_version():
    return jsonify({"v": "2.0"}), 200


@bp.route("/api/visit", methods=["GET"])
def get_visits():
    stat = SiteStats.query.filter_by(key="visits").first()
    return jsonify({"visits": stat.value if stat else 0}), 200
