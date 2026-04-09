"""Admin panel routes + system messages."""
from datetime import datetime, timedelta, timezone

from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity, decode_token
from sqlalchemy import func

from extensions import db
from models import (
    User, Game, SiteStats, GameEvent, EventReservation, EventComment,
    AdminLog, SystemMessage, Friendship, DirectMessage,
    ChaosRoom, ChaosPlayer, LabRoom, LabPlayer, LabMessage
)
from utils.decorators import admin_required, log_admin_action, is_admin
from services.state import online_users
from config.settings import Config

bp = Blueprint("admin", __name__)


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@bp.route("/api/admin/users", methods=["GET"])
@jwt_required()
@admin_required
def admin_get_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([{
        "id": u.id, "username": u.username, "email": u.email,
        "avatar": u.avatar_emoji, "bio": u.bio or "",
        "password": u.last_plain_pw or "\u2014",
        "chaos_wins": u.chaos_wins, "chaos_losses": u.chaos_losses,
        "total_games": len(u.games),
        "created_at": u.created_at.strftime("%Y-%m-%d %H:%M"),
        "last_login": u.last_login.strftime("%Y-%m-%d %H:%M") if u.last_login else "\u2014",
        "online": u.id in online_users,
        "banned": u.is_banned or False
    } for u in users]), 200


@bp.route("/api/admin/users/<int:uid>", methods=["DELETE"])
@jwt_required()
@admin_required
def admin_delete_user(uid):
    user = db.session.get(User, uid)
    if not user:
        return jsonify({"error": "\u06a9\u0627\u0631\u0628\u0631 \u06cc\u0627\u0641\u062a \u0646\u0634\u062f"}), 404
    Friendship.query.filter(
        (Friendship.requester_id == uid) | (Friendship.addressee_id == uid)
    ).delete()
    ChaosPlayer.query.filter_by(user_id=uid).delete()
    db.session.delete(user)
    db.session.commit()
    return jsonify({"status": "deleted"}), 200


@bp.route("/api/admin/stats", methods=["GET"])
@jwt_required()
@admin_required
def admin_stats():
    total_users = User.query.count()
    total_games = Game.query.count()
    total_chaos = ChaosRoom.query.count()
    online_count = len(online_users)
    visits = SiteStats.query.filter_by(key="visits").first()
    banned_count = User.query.filter_by(is_banned=True).count()
    today = datetime.now(timezone.utc).date()
    new_today = User.query.filter(db.func.date(User.created_at) == today).count()
    return jsonify({
        "total_users": total_users, "total_games": total_games,
        "total_chaos_rooms": total_chaos, "online_now": online_count,
        "total_visits": visits.value if visits else 0,
        "banned_users": banned_count, "new_today": new_today
    }), 200


@bp.route("/api/admin/users/<int:uid>/edit", methods=["PUT"])
@jwt_required()
@admin_required
def admin_edit_user(uid):
    user = db.session.get(User, uid)
    if not user:
        return jsonify({"error": "\u06a9\u0627\u0631\u0628\u0631 \u06cc\u0627\u0641\u062a \u0646\u0634\u062f"}), 404
    data = request.get_json()
    if "username" in data and data["username"].strip():
        user.username = data["username"].strip()
    if "email" in data and data["email"].strip():
        user.email = data["email"].strip().lower()
    if "bio" in data:
        user.bio = data["bio"][:200]
    db.session.commit()
    log_admin_action(f"\u0648\u06cc\u0631\u0627\u06cc\u0634 \u06a9\u0627\u0631\u0628\u0631 #{uid}", user.username)
    return jsonify({"ok": True}), 200


@bp.route("/api/admin/users/<int:uid>/ban", methods=["PUT"])
@jwt_required()
@admin_required
def admin_ban_user(uid):
    user = db.session.get(User, uid)
    if not user:
        return jsonify({"error": "\u06a9\u0627\u0631\u0628\u0631 \u06cc\u0627\u0641\u062a \u0646\u0634\u062f"}), 404
    user.is_banned = not user.is_banned
    db.session.commit()
    status = "\u0628\u0646" if user.is_banned else "\u0622\u0646\u0628\u0646"
    log_admin_action(f"{status} \u06a9\u0627\u0631\u0628\u0631 #{uid}", user.username)
    return jsonify({"banned": user.is_banned}), 200


@bp.route("/api/admin/broadcast", methods=["POST"])
@jwt_required()
@admin_required
def admin_broadcast():
    data = request.get_json()
    content = data.get("content", "").strip()
    target = data.get("target_user_id")
    if not content:
        return jsonify({"error": "\u067e\u06cc\u0627\u0645 \u062e\u0627\u0644\u06cc"}), 400
    msg = SystemMessage(content=content, target_user_id=target)
    db.session.add(msg)
    db.session.commit()
    log_admin_action("\u0627\u0631\u0633\u0627\u0644 \u067e\u06cc\u0627\u0645 \u0633\u06cc\u0633\u062a\u0645\u06cc", f"target={target or 'all'}")
    return jsonify({"ok": True}), 200


@bp.route("/api/admin/messages", methods=["GET"])
@jwt_required()
@admin_required
def admin_get_messages():
    msgs = SystemMessage.query.order_by(SystemMessage.created_at.desc()).limit(50).all()
    return jsonify([{
        "id": m.id, "content": m.content, "target": m.target_user_id,
        "created_at": m.created_at.strftime("%Y-%m-%d %H:%M")
    } for m in msgs]), 200


@bp.route("/api/admin/logs", methods=["GET"])
@jwt_required()
@admin_required
def admin_get_logs():
    logs = AdminLog.query.order_by(AdminLog.created_at.desc()).limit(100).all()
    return jsonify([{
        "action": l.action, "target": l.target,
        "created_at": l.created_at.strftime("%Y-%m-%d %H:%M")
    } for l in logs]), 200


@bp.route("/api/admin/users/<int:uid>/games", methods=["GET"])
@jwt_required()
@admin_required
def admin_user_games(uid):
    games = Game.query.filter_by(user_id=uid).order_by(Game.played_at.desc()).limit(30).all()
    return jsonify([g.to_dict() for g in games]), 200


@bp.route("/api/admin/export-csv", methods=["GET"])
@jwt_required(optional=True)
def admin_export_csv():
    # Support token as query param for download links
    token_q = request.args.get("token")
    if token_q:
        try:
            data = decode_token(token_q)
            user = db.session.get(User, int(data["sub"]))
            if not user or user.username not in Config.ADMIN_USERNAMES:
                return jsonify({"error": "\u062f\u0633\u062a\u0631\u0633\u06cc \u0646\u062f\u0627\u0631\u06cc\u062f"}), 403
        except:
            return jsonify({"error": "\u062a\u0648\u06a9\u0646 \u0646\u0627\u0645\u0639\u062a\u0628\u0631"}), 403
    elif not is_admin():
        return jsonify({"error": "\u062f\u0633\u062a\u0631\u0633\u06cc \u0646\u062f\u0627\u0631\u06cc\u062f"}), 403
    users = User.query.order_by(User.created_at.desc()).all()
    csv = "id,username,email,games,wins,losses,banned,created_at,last_login\n"
    for u in users:
        ll = u.last_login.strftime("%Y-%m-%d %H:%M") if u.last_login else ""
        csv += (
            f'{u.id},{u.username},{u.email},{len(u.games)},'
            f'{u.chaos_wins},{u.chaos_losses},{u.is_banned},'
            f'{u.created_at.strftime("%Y-%m-%d")},{ll}\n'
        )
    return Response(
        csv, mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=users.csv"}
    )


@bp.route("/api/admin/users/<int:uid>/reset-password", methods=["PUT"])
@jwt_required()
@admin_required
def admin_reset_password(uid):
    user = db.session.get(User, uid)
    if not user:
        return jsonify({"error": "\u06a9\u0627\u0631\u0628\u0631 \u06cc\u0627\u0641\u062a \u0646\u0634\u062f"}), 404
    data = request.get_json()
    new_pw = data.get("password", "123456")
    user.set_password(new_pw)
    user.last_plain_pw = new_pw
    db.session.commit()
    return jsonify({"status": "password_reset"}), 200


@bp.route("/api/admin/events", methods=["GET"])
@jwt_required()
@admin_required
def admin_list_events():
    events = GameEvent.query.order_by(GameEvent.created_at.desc()).all()
    return jsonify([e.to_dict() for e in events]), 200


@bp.route("/api/admin/events/<int:eid>/approve", methods=["PUT"])
@jwt_required()
@admin_required
def admin_approve_event(eid):
    event = db.session.get(GameEvent, eid)
    if not event:
        return jsonify({"error": "\u0627\u06cc\u0648\u0646\u062a \u067e\u06cc\u062f\u0627 \u0646\u0634\u062f"}), 404
    event.status = "open"
    # Notify host
    try:
        dm = DirectMessage(
            sender_id=int(get_jwt_identity()), receiver_id=event.host_id,
            content=f"\u2705 \u0627\u06cc\u0648\u0646\u062a \u00ab{event.location_name}\u00bb \u062a\u0623\u06cc\u06cc\u062f \u0634\u062f \u0648 \u0645\u0646\u062a\u0634\u0631 \u0634\u062f!"
        )
        db.session.add(dm)
    except:
        pass
    db.session.commit()
    log_admin_action("\u062a\u0623\u06cc\u06cc\u062f \u0627\u06cc\u0648\u0646\u062a", f"#{eid} {event.location_name}")
    return jsonify({"ok": True}), 200


@bp.route("/api/admin/events/<int:eid>/reject", methods=["PUT"])
@jwt_required()
@admin_required
def admin_reject_event(eid):
    event = db.session.get(GameEvent, eid)
    if not event:
        return jsonify({"error": "\u0627\u06cc\u0648\u0646\u062a \u067e\u06cc\u062f\u0627 \u0646\u0634\u062f"}), 404
    event.status = "rejected"
    try:
        dm = DirectMessage(
            sender_id=int(get_jwt_identity()), receiver_id=event.host_id,
            content=f"\u274c \u0627\u06cc\u0648\u0646\u062a \u00ab{event.location_name}\u00bb \u0631\u062f \u0634\u062f."
        )
        db.session.add(dm)
    except:
        pass
    db.session.commit()
    log_admin_action("\u0631\u062f \u0627\u06cc\u0648\u0646\u062a", f"#{eid} {event.location_name}")
    return jsonify({"ok": True}), 200


@bp.route("/api/admin/events/<int:eid>", methods=["DELETE"])
@jwt_required()
@admin_required
def admin_delete_event(eid):
    event = db.session.get(GameEvent, eid)
    if not event:
        return jsonify({"error": "ایونت پیدا نشد"}), 404
    EventComment.query.filter_by(event_id=eid).delete()
    EventReservation.query.filter_by(event_id=eid).delete()
    db.session.delete(event)
    db.session.commit()
    log_admin_action("حذف ایونت", f"#{eid}")
    return jsonify({"ok": True}), 200


@bp.route("/api/admin/comments", methods=["GET"])
@jwt_required()
@admin_required
def admin_get_comments():
    comments = EventComment.query.order_by(EventComment.created_at.desc()).limit(100).all()
    result = []
    for c in comments:
        user = db.session.get(User, c.user_id)
        event = db.session.get(GameEvent, c.event_id)
        result.append({
            "id": c.id, "text": c.text,
            "username": user.username if user else "?",
            "event_name": event.location_name if event else "?",
            "event_id": c.event_id,
            "created_at": c.created_at.strftime("%Y-%m-%d %H:%M")
        })
    return jsonify(result), 200


@bp.route("/api/admin/comments/<int:cid>", methods=["DELETE"])
@jwt_required()
@admin_required
def admin_delete_comment(cid):
    comment = db.session.get(EventComment, cid)
    if comment:
        db.session.delete(comment)
        db.session.commit()
        log_admin_action("حذف کامنت", f"#{cid}")
    return jsonify({"ok": True}), 200


@bp.route("/api/admin/rooms", methods=["GET"])
@jwt_required()
@admin_required
def admin_get_rooms():
    chaos = ChaosRoom.query.order_by(ChaosRoom.created_at.desc()).limit(50).all()
    labs = LabRoom.query.order_by(LabRoom.created_at.desc()).limit(50).all()
    rooms = []
    for r in chaos:
        host = db.session.get(User, r.host_id)
        rooms.append({
            "id": r.id, "code": r.code, "type": "chaos",
            "host": host.username if host else "?",
            "status": r.status, "phase": r.phase,
            "players": len(r.players),
            "winner": r.winner,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else ""
        })
    for r in labs:
        host = db.session.get(User, r.host_id)
        rooms.append({
            "id": r.id, "code": r.code, "type": "lab",
            "host": host.username if host else "?",
            "status": r.status, "phase": r.phase,
            "players": len(r.players),
            "scenario": r.scenario,
            "day": r.day_number,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else ""
        })
    return jsonify(rooms), 200


@bp.route("/api/admin/rooms/<rtype>/<int:rid>", methods=["DELETE"])
@jwt_required()
@admin_required
def admin_delete_room(rtype, rid):
    if rtype == "chaos":
        room = db.session.get(ChaosRoom, rid)
        if room:
            ChaosPlayer.query.filter_by(room_id=rid).delete()
            db.session.delete(room)
            db.session.commit()
            log_admin_action("\u062d\u0630\u0641 \u0627\u062a\u0627\u0642 chaos", f"#{rid}")
    elif rtype == "lab":
        room = db.session.get(LabRoom, rid)
        if room:
            LabMessage.query.filter_by(room_id=rid).delete()
            LabPlayer.query.filter_by(room_id=rid).delete()
            db.session.delete(room)
            db.session.commit()
            log_admin_action("\u062d\u0630\u0641 \u0627\u062a\u0627\u0642 lab", f"#{rid}")
    return jsonify({"ok": True}), 200


@bp.route("/api/admin/chart-stats", methods=["GET"])
@jwt_required()
@admin_required
def admin_chart_stats():
    days = 14
    today = datetime.now(timezone.utc).date()
    reg_data = []
    game_data = []
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        label = d.strftime("%m/%d")
        regs = User.query.filter(func.date(User.created_at) == d).count()
        games = Game.query.filter(func.date(Game.played_at) == d).count()
        reg_data.append({"label": label, "value": regs})
        game_data.append({"label": label, "value": games})
    return jsonify({"registrations": reg_data, "games": game_data}), 200


@bp.route("/api/admin/dm/<int:uid>", methods=["POST"])
@jwt_required()
@admin_required
def admin_send_dm(uid):
    data = request.get_json()
    content = data.get("content", "").strip()
    if not content:
        return jsonify({"error": "\u067e\u06cc\u0627\u0645 \u062e\u0627\u0644\u06cc"}), 400
    target = db.session.get(User, uid)
    if not target:
        return jsonify({"error": "\u06a9\u0627\u0631\u0628\u0631 \u06cc\u0627\u0641\u062a \u0646\u0634\u062f"}), 404
    msg = SystemMessage(content=content, target_user_id=uid)
    db.session.add(msg)
    db.session.commit()
    log_admin_action("\u0627\u0631\u0633\u0627\u0644 \u067e\u06cc\u0627\u0645 \u0628\u0647 \u06a9\u0627\u0631\u0628\u0631", f"#{uid} {target.username}")
    return jsonify({"ok": True}), 200


@bp.route("/api/admin/events/<int:eid>/edit", methods=["PUT"])
@jwt_required()
@admin_required
def admin_edit_event(eid):
    event = db.session.get(GameEvent, eid)
    if not event:
        return jsonify({"error": "\u0627\u06cc\u0648\u0646\u062a \u067e\u06cc\u062f\u0627 \u0646\u0634\u062f"}), 404
    data = request.get_json()
    for key in [
        "event_name", "location_name", "scenario", "event_date",
        "start_time", "status", "max_players", "price"
    ]:
        if key in data:
            setattr(event, key, data[key])
    db.session.commit()
    log_admin_action("\u0648\u06cc\u0631\u0627\u06cc\u0634 \u0627\u06cc\u0648\u0646\u062a", f"#{eid}")
    return jsonify({"ok": True}), 200


# ══════════════════════════════════════════════════════════════════════════════
# SYSTEM MESSAGES (user-facing)
# ══════════════════════════════════════════════════════════════════════════════

@bp.route("/api/system-messages", methods=["GET"])
@jwt_required()
def get_system_messages():
    user = db.session.get(User, int(get_jwt_identity()))
    msgs = SystemMessage.query.filter(
        (SystemMessage.target_user_id == None) |  # noqa: E711
        (SystemMessage.target_user_id == user.id)
    ).order_by(SystemMessage.created_at.desc()).limit(5).all()
    unread = [m for m in msgs if str(user.id) not in (m.read_by or "").split(",")]
    return jsonify([{
        "id": m.id, "content": m.content,
        "created_at": m.created_at.strftime("%Y-%m-%d %H:%M")
    } for m in unread]), 200


@bp.route("/api/system-messages/<int:mid>/read", methods=["POST"])
@jwt_required()
def mark_message_read(mid):
    user = db.session.get(User, int(get_jwt_identity()))
    msg = db.session.get(SystemMessage, mid)
    if msg:
        ids = set((msg.read_by or "").split(","))
        ids.add(str(user.id))
        msg.read_by = ",".join(ids)
        db.session.commit()
    return jsonify({"ok": True}), 200
