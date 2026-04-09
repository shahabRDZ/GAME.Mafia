"""Event routes — create, list, reserve, comment on game meetups."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models import (
    User, GameEvent, EventReservation, EventComment, DirectMessage
)
from utils.decorators import is_admin

bp = Blueprint("events", __name__, url_prefix="/api/events")


@bp.route("", methods=["POST"])
@jwt_required()
def create_event():
    user = db.session.get(User, int(get_jwt_identity()))
    data = request.get_json()
    required = ["country", "city", "location_name"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"{field} الزامی است"}), 400
    event = GameEvent(
        host_id=user.id,
        event_name=data.get("event_name", "").strip()[:100],
        host_display_name=data.get("host_display_name", "").strip()[:50],
        country=data["country"].strip(),
        city=data["city"].strip(),
        location_name=data["location_name"].strip(),
        address=data.get("address", "").strip()[:300],
        lat=float(data["lat"]) if data.get("lat") else None,
        lng=float(data["lng"]) if data.get("lng") else None,
        price=data.get("price", "").strip()[:50],
        scenario=data.get("scenario", ""),
        player_count=int(data.get("player_count", 10)),
        event_date=data.get("event_date", ""),
        start_time=data.get("start_time", ""),
        end_time=data.get("end_time", ""),
        description=data.get("description", "")[:500],
        max_players=int(data.get("max_players", 10))
    )
    event.status = "pending"  # needs admin approval
    db.session.add(event)
    db.session.commit()
    return jsonify({
        "ok": True,
        "message": "ایونت ثبت شد — منتظر تأیید ادمین باشید",
        "event": event.to_dict()
    }), 201


@bp.route("", methods=["GET"])
def list_events():
    country = request.args.get("country", "").strip()
    city = request.args.get("city", "").strip()
    q = GameEvent.query.filter(GameEvent.status.in_(["open", "full", "approved"]))
    if country:
        q = q.filter(GameEvent.country.ilike(f"%{country}%"))
    if city:
        q = q.filter(GameEvent.city.ilike(f"%{city}%"))
    events = q.order_by(
        GameEvent.event_date.asc(), GameEvent.start_time.asc()
    ).limit(50).all()
    return jsonify([e.to_dict() for e in events]), 200


@bp.route("/<int:eid>", methods=["GET"])
def get_event(eid):
    event = db.session.get(GameEvent, eid)
    if not event:
        return jsonify({"error": "ایونت پیدا نشد"}), 404
    return jsonify(event.to_dict()), 200


@bp.route("/<int:eid>", methods=["PUT"])
@jwt_required()
def update_event(eid):
    user = db.session.get(User, int(get_jwt_identity()))
    event = db.session.get(GameEvent, eid)
    if not event or event.host_id != user.id:
        return jsonify({"error": "دسترسی ندارید"}), 403
    data = request.get_json()
    for field in [
        "country", "city", "location_name", "scenario",
        "event_date", "start_time", "end_time", "description",
        "max_players", "status"
    ]:
        if field in data:
            setattr(event, field, data[field])
    db.session.commit()
    return jsonify(event.to_dict()), 200


@bp.route("/<int:eid>", methods=["DELETE"])
@jwt_required()
def delete_event(eid):
    user = db.session.get(User, int(get_jwt_identity()))
    event = db.session.get(GameEvent, eid)
    if not event:
        return jsonify({"error": "ایونت پیدا نشد"}), 404
    if event.host_id != user.id and not is_admin():
        return jsonify({"error": "دسترسی ندارید"}), 403
    EventComment.query.filter_by(event_id=eid).delete()
    EventReservation.query.filter_by(event_id=eid).delete()
    db.session.delete(event)
    db.session.commit()
    return jsonify({"ok": True}), 200


@bp.route("/<int:eid>/reserve", methods=["POST"])
@jwt_required()
def reserve_event(eid):
    user = db.session.get(User, int(get_jwt_identity()))
    event = db.session.get(GameEvent, eid)
    if not event:
        return jsonify({"error": "ایونت پیدا نشد"}), 404
    if event.host_id == user.id:
        return jsonify({"error": "گرداننده نمی\u200cتواند رزرو کند"}), 400
    existing = EventReservation.query.filter_by(
        event_id=eid, user_id=user.id
    ).first()
    if existing:
        return jsonify({"error": "قبلاً رزرو کرده\u200cاید"}), 400
    count = EventReservation.query.filter_by(event_id=eid).count()
    if count >= event.max_players:
        event.status = "full"
        db.session.commit()
        return jsonify({"error": "ظرفیت تکمیل شده"}), 400
    res = EventReservation(event_id=eid, user_id=user.id)
    db.session.add(res)
    if count + 1 >= event.max_players:
        event.status = "full"
    # Send DM to host
    try:
        dm = DirectMessage(
            sender_id=user.id, receiver_id=event.host_id,
            content=f"📋 درخواست رزرو ایونت «{event.location_name}» از طرف {user.username} — {count+1}/{event.max_players} نفر"
        )
        db.session.add(dm)
    except:
        pass
    db.session.commit()
    return jsonify({"ok": True, "status": res.status}), 201


@bp.route("/<int:eid>/reservations/<int:rid>", methods=["PUT"])
@jwt_required()
def manage_reservation(eid, rid):
    user = db.session.get(User, int(get_jwt_identity()))
    event = db.session.get(GameEvent, eid)
    if not event or event.host_id != user.id:
        return jsonify({"error": "فقط گرداننده می\u200cتواند"}), 403
    data = request.get_json()
    # Support by ID or by user_id
    if rid == 0:
        uid = data.get("user_id")
        res = EventReservation.query.filter_by(
            event_id=eid, user_id=uid
        ).first() if uid else None
    else:
        res = db.session.get(EventReservation, rid)
    if not res or res.event_id != eid:
        return jsonify({"error": "رزرو پیدا نشد"}), 404
    res.status = data.get("status", res.status)
    # Send DM to player
    try:
        status_text = "✅ تأیید شد" if res.status == "accepted" else "❌ رد شد"
        dm = DirectMessage(
            sender_id=user.id, receiver_id=res.user_id,
            content=f"🏠 رزرو ایونت «{event.location_name}»: {status_text}"
        )
        db.session.add(dm)
    except:
        pass
    db.session.commit()
    return jsonify({"ok": True}), 200


@bp.route("/my", methods=["GET"])
@jwt_required()
def my_events():
    user = db.session.get(User, int(get_jwt_identity()))
    hosted = GameEvent.query.filter_by(host_id=user.id).order_by(
        GameEvent.created_at.desc()
    ).all()
    reserved = EventReservation.query.filter_by(user_id=user.id).all()
    reserved_events = [r.event.to_dict() for r in reserved if r.event]
    return jsonify({
        "hosted": [e.to_dict() for e in hosted],
        "reserved": reserved_events
    }), 200


# ── Event Comments ──

@bp.route("/<int:eid>/comments", methods=["GET"])
def get_event_comments(eid):
    comments = EventComment.query.filter_by(event_id=eid).order_by(
        EventComment.created_at.desc()
    ).all()
    return jsonify([{
        "id": c.id, "username": c.user.username if c.user else "?",
        "content": c.content,
        "created_at": c.created_at.strftime("%Y-%m-%d %H:%M")
    } for c in comments]), 200


@bp.route("/<int:eid>/comments", methods=["POST"])
@jwt_required()
def add_event_comment(eid):
    user = db.session.get(User, int(get_jwt_identity()))
    # Only users with accepted reservation can comment
    res = EventReservation.query.filter_by(
        event_id=eid, user_id=user.id, status="accepted"
    ).first()
    if not res:
        return jsonify({"error": "فقط شرکت\u200cکنندگان تأیید شده می\u200cتوانند نظر بدهند"}), 403
    data = request.get_json()
    content = (data.get("content") or "").strip()[:500]
    if not content:
        return jsonify({"error": "نظر خالی است"}), 400
    comment = EventComment(event_id=eid, user_id=user.id, content=content)
    db.session.add(comment)
    db.session.commit()
    return jsonify({"ok": True}), 201
