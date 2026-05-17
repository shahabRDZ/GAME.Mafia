from datetime import datetime, timezone
from extensions import db


class GameEvent(db.Model):
    __tablename__ = "game_events"

    id = db.Column(db.Integer, primary_key=True)
    host_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    country = db.Column(db.String(50), nullable=False)
    city = db.Column(db.String(50), nullable=False)
    event_name = db.Column(db.String(100), default="")
    host_display_name = db.Column(db.String(50), default="")
    location_name = db.Column(db.String(150), nullable=False)
    address = db.Column(db.String(300), default="")
    lat = db.Column(db.Float, nullable=True)
    lng = db.Column(db.Float, nullable=True)
    price = db.Column(db.String(50), default="")
    scenario = db.Column(db.String(50), default="")
    player_count = db.Column(db.Integer, default=10)
    event_date = db.Column(db.String(20), default="")
    start_time = db.Column(db.String(10), default="")
    end_time = db.Column(db.String(10), default="")
    description = db.Column(db.String(500), default="")
    max_players = db.Column(db.Integer, default=10)
    status = db.Column(db.String(20), default="open")
    views = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    host = db.relationship("User", foreign_keys=[host_id])

    def to_dict(self, include_reservations=True):
        reservations = EventReservation.query.filter_by(event_id=self.id).all() if include_reservations else []
        reviews = EventReview.query.filter_by(event_id=self.id).all()
        avg_rating = round(sum(r.rating for r in reviews) / len(reviews), 1) if reviews else 0
        follow_count = EventFollow.query.filter_by(event_id=self.id).count()
        return {
            "id": self.id, "host_id": self.host_id,
            "host_name": self.host.username if self.host else "?",
            "host_avatar": self.host.avatar_emoji if self.host else "🎭",
            "event_name": self.event_name or "",
            "host_display_name": self.host_display_name or "",
            "country": self.country, "city": self.city,
            "location_name": self.location_name,
            "address": self.address or "",
            "price": self.price or "",
            "lat": self.lat, "lng": self.lng,
            "scenario": self.scenario, "player_count": self.player_count,
            "event_date": self.event_date, "start_time": self.start_time,
            "end_time": self.end_time, "description": self.description,
            "max_players": self.max_players, "status": self.status,
            "views": self.views or 0,
            "reserved_count": len(reservations),
            "avg_rating": avg_rating,
            "review_count": len(reviews),
            "follow_count": follow_count,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M"),
            "reservations": [
                {"user_id": r.user_id, "username": r.user.username if r.user else "?", "status": r.status}
                for r in reservations
            ] if include_reservations else [],
        }


class EventReservation(db.Model):
    __tablename__ = "event_reservations"

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("game_events.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    status = db.Column(db.String(20), default="pending")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    user = db.relationship("User", foreign_keys=[user_id])
    event = db.relationship("GameEvent", foreign_keys=[event_id])


class EventComment(db.Model):
    __tablename__ = "event_comments"

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("game_events.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    content = db.Column(db.String(500), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    user = db.relationship("User", foreign_keys=[user_id])


class EventReview(db.Model):
    __tablename__ = "event_reviews"

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("game_events.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1-5
    content = db.Column(db.String(500), default="")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    user = db.relationship("User", foreign_keys=[user_id])


class EventFollow(db.Model):
    __tablename__ = "event_follows"

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("game_events.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    user = db.relationship("User", foreign_keys=[user_id])
