"""Tests for /api/auth routes — register, login, password management, me."""
import pytest


class TestRegister:
    def test_register_success(self, client):
        resp = client.post("/api/auth/register", json={
            "username": "newuser1", "email": "newuser1@test.com", "password": "secure123"
        })
        assert resp.status_code == 201
        data = resp.get_json()
        assert "token" in data
        assert data["user"]["username"] == "newuser1"

    def test_register_missing_fields(self, client):
        resp = client.post("/api/auth/register", json={"username": "x"})
        assert resp.status_code == 400
        assert "error" in resp.get_json()

    def test_register_duplicate_username(self, client, user):
        resp = client.post("/api/auth/register", json={
            "username": user["username"], "email": "other@test.com", "password": "secure123"
        })
        assert resp.status_code == 409

    def test_register_duplicate_email(self, client, user):
        resp = client.post("/api/auth/register", json={
            "username": "uniqueuser99", "email": user["email"], "password": "secure123"
        })
        assert resp.status_code == 409

    def test_register_short_password(self, client):
        resp = client.post("/api/auth/register", json={
            "username": "validuser2", "email": "valid2@test.com", "password": "ab"
        })
        assert resp.status_code == 400

    def test_register_invalid_email(self, client):
        resp = client.post("/api/auth/register", json={
            "username": "validuser3", "email": "not-an-email", "password": "secure123"
        })
        assert resp.status_code == 400

    def test_register_invalid_username(self, client):
        resp = client.post("/api/auth/register", json={
            "username": "a!", "email": "u@test.com", "password": "secure123"
        })
        assert resp.status_code == 400

    def test_register_password_too_long(self, client):
        resp = client.post("/api/auth/register", json={
            "username": "validuser4", "email": "valid4@test.com", "password": "x" * 73
        })
        assert resp.status_code == 400


class TestLogin:
    def test_login_by_username(self, client, user):
        resp = client.post("/api/auth/login", json={
            "identifier": user["username"], "password": user["password"]
        })
        assert resp.status_code == 200
        assert "token" in resp.get_json()

    def test_login_by_email(self, client, user):
        resp = client.post("/api/auth/login", json={
            "identifier": user["email"], "password": user["password"]
        })
        assert resp.status_code == 200
        assert "token" in resp.get_json()

    def test_login_wrong_password(self, client, user):
        resp = client.post("/api/auth/login", json={
            "identifier": user["username"], "password": "wrongpassword"
        })
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, client):
        resp = client.post("/api/auth/login", json={
            "identifier": "ghost_user_xyz", "password": "anything"
        })
        assert resp.status_code == 401

    def test_login_missing_fields(self, client):
        resp = client.post("/api/auth/login", json={"identifier": "someone"})
        assert resp.status_code == 400

    def test_login_banned_user(self, client, app):
        from extensions import db
        from models import User
        with app.app_context():
            banned = User.query.filter_by(username="banneduser").first()
            if not banned:
                banned = User(username="banneduser", email="banned@test.com", is_banned=True)
                banned.set_password("pass1234")
                db.session.add(banned)
                db.session.commit()
        resp = client.post("/api/auth/login", json={
            "identifier": "banneduser", "password": "pass1234"
        })
        assert resp.status_code == 403


class TestMe:
    def test_me_authenticated(self, client, auth_headers, user):
        resp = client.get("/api/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["username"] == user["username"]

    def test_me_no_token(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_me_invalid_token(self, client):
        resp = client.get("/api/auth/me", headers={"Authorization": "Bearer invalidtoken"})
        assert resp.status_code == 422

    def test_me_does_not_expose_password_hash(self, client, auth_headers):
        resp = client.get("/api/auth/me", headers=auth_headers)
        data = resp.get_json()
        assert "password_hash" not in data
        assert "password" not in data
        assert "last_plain_pw" not in data


class TestChangePassword:
    def test_change_password_success(self, client, app, auth_headers):
        resp = client.post("/api/auth/change-password", json={
            "current_password": "password123",
            "new_password": "newpassword456"
        }, headers=auth_headers)
        assert resp.status_code == 200

        # Restore original password
        from extensions import db
        from models import User
        with app.app_context():
            u = User.query.filter_by(username="testuser").first()
            u.set_password("password123")
            db.session.commit()

    def test_change_password_wrong_current(self, client, auth_headers):
        resp = client.post("/api/auth/change-password", json={
            "current_password": "wrongcurrent",
            "new_password": "newpassword456"
        }, headers=auth_headers)
        assert resp.status_code == 401

    def test_change_password_too_short(self, client, auth_headers):
        resp = client.post("/api/auth/change-password", json={
            "current_password": "password123",
            "new_password": "ab"
        }, headers=auth_headers)
        assert resp.status_code == 400

    def test_change_password_unauthenticated(self, client):
        resp = client.post("/api/auth/change-password", json={
            "current_password": "password123",
            "new_password": "newpassword456"
        })
        assert resp.status_code == 401


class TestForgotPassword:
    def test_forgot_password_valid_email(self, client, user):
        resp = client.post("/api/auth/forgot-password", json={"email": user["email"]})
        assert resp.status_code == 200
        assert resp.get_json()["ok"] is True

    def test_forgot_password_unknown_email_same_response(self, client):
        # Must return same 200 to prevent user enumeration
        resp = client.post("/api/auth/forgot-password", json={"email": "ghost@noemail.com"})
        assert resp.status_code == 200
        assert resp.get_json()["ok"] is True

    def test_forgot_password_invalid_email(self, client):
        resp = client.post("/api/auth/forgot-password", json={"email": "not-an-email"})
        assert resp.status_code == 400
