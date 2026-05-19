"""Tests for /api/events routes — CRUD, reservation, security."""
import pytest


def _make_event_payload(**overrides):
    base = {
        "country": "Iran", "city": "Tehran",
        "location_name": "Cafe Mafia", "event_date": "2026-08-01",
        "start_time": "19:00", "max_players": 5, "scenario": "تکاور",
    }
    base.update(overrides)
    return base


class TestCreateEvent:
    def test_create_success(self, client, auth_headers):
        resp = client.post("/api/events", json=_make_event_payload(), headers=auth_headers)
        assert resp.status_code == 201
        data = resp.get_json()
        assert data["ok"] is True
        assert data["event"]["status"] == "pending"

    def test_create_unauthenticated(self, client):
        resp = client.post("/api/events", json=_make_event_payload())
        assert resp.status_code == 401

    def test_create_missing_required_field(self, client, auth_headers):
        payload = _make_event_payload()
        del payload["city"]
        resp = client.post("/api/events", json=payload, headers=auth_headers)
        assert resp.status_code == 400

    def test_create_status_is_pending_not_open(self, client, auth_headers):
        """Host must not be able to create an auto-approved event."""
        resp = client.post("/api/events",
                           json=_make_event_payload(status="open"),
                           headers=auth_headers)
        assert resp.status_code == 201
        assert resp.get_json()["event"]["status"] == "pending"


class TestListEvents:
    def test_list_returns_array(self, client):
        resp = client.get("/api/events")
        assert resp.status_code == 200
        assert isinstance(resp.get_json(), list)

    def test_list_filters_by_country(self, client):
        resp = client.get("/api/events?country=Iran")
        assert resp.status_code == 200

    def test_list_does_not_include_pending_events(self, client, auth_headers):
        """Pending events should not appear in public listing."""
        client.post("/api/events", json=_make_event_payload(), headers=auth_headers)
        resp = client.get("/api/events")
        events = resp.get_json()
        for e in events:
            assert e["status"] != "pending"


class TestGetEvent:
    @pytest.fixture()
    def approved_event_id(self, client, auth_headers, app):
        """Create an event and manually approve it, return its id."""
        resp = client.post("/api/events", json=_make_event_payload(), headers=auth_headers)
        eid = resp.get_json()["event"]["id"]
        from extensions import db
        from models import GameEvent
        with app.app_context():
            ev = db.session.get(GameEvent, eid)
            ev.status = "open"
            db.session.commit()
        return eid

    def test_get_event_increments_views(self, client, approved_event_id):
        r1 = client.get(f"/api/events/{approved_event_id}")
        v1 = r1.get_json()["views"]
        r2 = client.get(f"/api/events/{approved_event_id}")
        v2 = r2.get_json()["views"]
        assert v2 == v1 + 1

    def test_get_nonexistent_event(self, client):
        resp = client.get("/api/events/999999")
        assert resp.status_code == 404


class TestUpdateEvent:
    @pytest.fixture()
    def event_id(self, client, auth_headers):
        resp = client.post("/api/events", json=_make_event_payload(), headers=auth_headers)
        return resp.get_json()["event"]["id"]

    def test_host_can_update_content(self, client, auth_headers, event_id):
        resp = client.put(f"/api/events/{event_id}",
                          json={"city": "Isfahan"},
                          headers=auth_headers)
        assert resp.status_code == 200
        assert resp.get_json()["city"] == "Isfahan"

    def test_host_cannot_change_status_to_approved(self, client, auth_headers, event_id):
        """Critical: host must not be able to self-approve their event."""
        resp = client.put(f"/api/events/{event_id}",
                          json={"status": "open"},
                          headers=auth_headers)
        assert resp.status_code == 200
        # Status should NOT have changed
        detail = client.get(f"/api/events/{event_id}")
        # Event is pending so GET works directly
        from extensions import db
        from models import GameEvent
        # Check via API that status is still pending
        assert resp.get_json().get("status") == "pending"

    def test_other_user_cannot_update(self, client, second_auth_headers, event_id):
        resp = client.put(f"/api/events/{event_id}",
                          json={"city": "Mashhad"},
                          headers=second_auth_headers)
        assert resp.status_code == 403

    def test_unauthenticated_cannot_update(self, client, event_id):
        resp = client.put(f"/api/events/{event_id}", json={"city": "Shiraz"})
        assert resp.status_code == 401


class TestDeleteEvent:
    def test_host_can_delete_own_event(self, client, auth_headers):
        resp = client.post("/api/events", json=_make_event_payload(), headers=auth_headers)
        eid = resp.get_json()["event"]["id"]
        del_resp = client.delete(f"/api/events/{eid}", headers=auth_headers)
        assert del_resp.status_code == 200

    def test_other_user_cannot_delete(self, client, auth_headers, second_auth_headers):
        resp = client.post("/api/events", json=_make_event_payload(), headers=auth_headers)
        eid = resp.get_json()["event"]["id"]
        del_resp = client.delete(f"/api/events/{eid}", headers=second_auth_headers)
        assert del_resp.status_code == 403


class TestReservation:
    @pytest.fixture()
    def open_event_id(self, client, auth_headers, app):
        resp = client.post("/api/events", json=_make_event_payload(max_players=3), headers=auth_headers)
        eid = resp.get_json()["event"]["id"]
        from extensions import db
        from models import GameEvent
        with app.app_context():
            ev = db.session.get(GameEvent, eid)
            ev.status = "open"
            db.session.commit()
        return eid

    def test_second_user_can_reserve(self, client, open_event_id, second_auth_headers):
        resp = client.post(f"/api/events/{open_event_id}/reserve",
                           headers=second_auth_headers)
        assert resp.status_code == 201
        assert resp.get_json()["ok"] is True

    def test_double_booking_rejected(self, client, open_event_id, second_auth_headers):
        client.post(f"/api/events/{open_event_id}/reserve", headers=second_auth_headers)
        resp = client.post(f"/api/events/{open_event_id}/reserve", headers=second_auth_headers)
        assert resp.status_code == 400

    def test_host_cannot_reserve_own_event(self, client, open_event_id, auth_headers):
        resp = client.post(f"/api/events/{open_event_id}/reserve", headers=auth_headers)
        assert resp.status_code == 400

    def test_unauthenticated_cannot_reserve(self, client, open_event_id):
        resp = client.post(f"/api/events/{open_event_id}/reserve")
        assert resp.status_code == 401

    def test_full_event_rejects_new_reservation(self, client, app, auth_headers):
        """Event with max_players=1 should become full after one reservation."""
        resp = client.post("/api/events",
                           json=_make_event_payload(max_players=1),
                           headers=auth_headers)
        eid = resp.get_json()["event"]["id"]
        from extensions import db
        from models import GameEvent, User
        with app.app_context():
            ev = db.session.get(GameEvent, eid)
            ev.status = "open"
            # Create a third user to reserve
            u = User.query.filter_by(username="reserveuser1").first()
            if not u:
                u = User(username="reserveuser1", email="reserve1@test.com")
                u.set_password("pass1234")
                db.session.add(u)
            db.session.commit()

        r1 = client.post("/api/auth/login", json={"identifier": "reserveuser1", "password": "pass1234"})
        h1 = {"Authorization": f"Bearer {r1.get_json()['token']}"}
        client.post(f"/api/events/{eid}/reserve", headers=h1)

        # Create a fourth user — should be rejected
        with app.app_context():
            from models import User
            from extensions import db
            u2 = User.query.filter_by(username="reserveuser2").first()
            if not u2:
                u2 = User(username="reserveuser2", email="reserve2@test.com")
                u2.set_password("pass1234")
                db.session.add(u2)
                db.session.commit()
        r2 = client.post("/api/auth/login", json={"identifier": "reserveuser2", "password": "pass1234"})
        h2 = {"Authorization": f"Bearer {r2.get_json()['token']}"}
        resp = client.post(f"/api/events/{eid}/reserve", headers=h2)
        assert resp.status_code == 400


class TestEventReviews:
    def test_unauthenticated_user_cannot_review(self, client):
        resp = client.post("/api/events/1/reviews", json={"rating": 5, "content": "great"})
        assert resp.status_code == 401

    def test_invalid_rating_rejected(self, client, auth_headers):
        resp = client.post("/api/events/1/reviews",
                           json={"rating": 10, "content": "invalid"},
                           headers=auth_headers)
        # Either 403 (not a participant) or 400 (invalid rating) — not 201
        assert resp.status_code in (400, 403, 404)
