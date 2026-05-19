"""Tests for JWT revocation, is_admin flag, and other security additions."""
import pytest


class TestJWTRevocation:
    def test_banned_user_token_is_rejected(self, client, app):
        """A token issued before a ban must be rejected after the ban is applied."""
        from extensions import db
        from models import User

        # Register and get a token
        resp = client.post("/api/auth/register", json={
            "username": "tobebanned", "email": "tobebanned@test.com", "password": "pass1234"
        })
        assert resp.status_code == 201
        token = resp.get_json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Token works before ban
        r = client.get("/api/auth/me", headers=headers)
        assert r.status_code == 200

        # Apply ban
        with app.app_context():
            u = User.query.filter_by(username="tobebanned").first()
            u.is_banned = True
            db.session.commit()

        # Same token must now be rejected
        r = client.get("/api/auth/me", headers=headers)
        assert r.status_code == 403

    def test_unbanned_user_token_works_again(self, client, app):
        from extensions import db
        from models import User

        resp = client.post("/api/auth/register", json={
            "username": "unbanneduser", "email": "unban@test.com", "password": "pass1234"
        })
        token = resp.get_json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        with app.app_context():
            u = User.query.filter_by(username="unbanneduser").first()
            u.is_banned = True
            db.session.commit()

        assert client.get("/api/auth/me", headers=headers).status_code == 403

        with app.app_context():
            u = User.query.filter_by(username="unbanneduser").first()
            u.is_banned = False
            db.session.commit()

        assert client.get("/api/auth/me", headers=headers).status_code == 200

    def test_deleted_user_token_is_rejected(self, client, app):
        from extensions import db
        from models import User, Game

        resp = client.post("/api/auth/register", json={
            "username": "deleteduser99", "email": "deleted99@test.com", "password": "pass1234"
        })
        token = resp.get_json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        with app.app_context():
            u = User.query.filter_by(username="deleteduser99").first()
            Game.query.filter_by(user_id=u.id).delete()
            db.session.delete(u)
            db.session.commit()

        r = client.get("/api/auth/me", headers=headers)
        assert r.status_code == 403


class TestIsAdminFlag:
    def test_non_admin_user_cannot_access_admin_routes(self, client, auth_headers):
        resp = client.get("/api/admin/users", headers=auth_headers)
        assert resp.status_code == 403

    def test_is_admin_flag_grants_access(self, client, app):
        from extensions import db
        from models import User

        resp = client.post("/api/auth/register", json={
            "username": "flagadmin", "email": "flagadmin@test.com", "password": "admin1234"
        })
        token = resp.get_json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # No access before flag
        assert client.get("/api/admin/users", headers=headers).status_code == 403

        # Set the flag
        with app.app_context():
            u = User.query.filter_by(username="flagadmin").first()
            u.is_admin = True
            db.session.commit()

        # Access granted
        assert client.get("/api/admin/users", headers=headers).status_code == 200

    def test_is_admin_false_by_default(self, client, app):
        from models import User
        with app.app_context():
            u = User.query.filter_by(username="testuser").first()
            assert u.is_admin is False

    def test_user_object_no_password_in_admin_list(self, client, app):
        from models import User
        with app.app_context():
            u = User.query.filter_by(username="flagadmin").first()
            if u:
                d = u.to_dict()
                assert "password_hash" not in d
                assert "is_admin" not in d  # admin flag must NOT be exposed via API


class TestAdminBootstrapFallback:
    """Config ADMIN_USERNAMES should auto-promote the first time they log in."""

    def test_config_admin_username_gets_promoted(self, client, app):
        from extensions import db
        from models import User
        from config.settings import Config

        if not Config.ADMIN_USERNAMES:
            pytest.skip("No ADMIN_USERNAMES configured")

        admin_name = Config.ADMIN_USERNAMES[0]

        with app.app_context():
            u = User.query.filter_by(username=admin_name).first()
            if not u:
                u = User(username=admin_name, email=f"{admin_name}@test.com")
                u.set_password("adminpass123")
                db.session.add(u)
                db.session.commit()
            # Ensure flag is False before the test
            u.is_admin = False
            db.session.commit()

        login = client.post("/api/auth/login", json={"identifier": admin_name, "password": "adminpass123"})
        token = login.get_json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # The bootstrap in is_admin() should auto-set the flag and allow access
        resp = client.get("/api/admin/users", headers=headers)
        assert resp.status_code == 200

        # Verify DB flag was actually set
        with app.app_context():
            u = User.query.filter_by(username=admin_name).first()
            assert u.is_admin is True


class TestSocketIOCORS:
    """SocketIO should also restrict origins."""

    def test_socketio_cors_not_wildcard(self, app):
        from extensions import socketio
        origins = socketio.server.eio.cors_allowed_origins
        assert origins != "*", "SocketIO CORS must not be wildcard"
