"""Tests for profile routes and cross-cutting security concerns."""
import pytest


class TestProfile:
    def test_get_own_profile(self, client, auth_headers, user):
        resp = client.get(f"/api/profile/{user['id']}", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["username"] == user["username"]

    def test_get_profile_unauthenticated(self, client, user):
        """Profile is publicly readable."""
        resp = client.get(f"/api/profile/{user['id']}")
        assert resp.status_code == 200

    def test_get_nonexistent_profile(self, client):
        resp = client.get("/api/profile/999999")
        assert resp.status_code == 404

    def test_update_bio(self, client, auth_headers):
        resp = client.put("/api/profile", json={"bio": "Test bio text"}, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.get_json()["bio"] == "Test bio text"

    def test_update_bio_truncates_at_200(self, client, auth_headers):
        long_bio = "x" * 300
        resp = client.put("/api/profile", json={"bio": long_bio}, headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.get_json()["bio"]) <= 200

    def test_update_profile_unauthenticated(self, client):
        resp = client.put("/api/profile", json={"bio": "hacker"})
        assert resp.status_code == 401

    def test_profile_does_not_expose_password_hash(self, client, user):
        resp = client.get(f"/api/profile/{user['id']}")
        data = resp.get_json()
        assert "password_hash" not in data
        assert "password" not in data
        assert "last_plain_pw" not in data

    def test_update_avatar_emoji(self, client, auth_headers):
        resp = client.put("/api/profile", json={"avatar": "🎭"}, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.get_json()["avatar"] == "🎭"

    def test_update_avatar_url_too_large(self, client, auth_headers):
        big_image = "data:image/png;base64," + "A" * 400_001
        resp = client.put("/api/profile", json={"avatar_url": big_image}, headers=auth_headers)
        assert resp.status_code == 400

    def test_update_avatar_url_invalid_format(self, client, auth_headers):
        resp = client.put("/api/profile",
                          json={"avatar_url": "https://evil.com/xss.js"},
                          headers=auth_headers)
        assert resp.status_code == 400


class TestUserSearch:
    def test_search_requires_auth(self, client):
        resp = client.get("/api/users/search?q=test")
        assert resp.status_code == 401

    def test_search_too_short_query(self, client, auth_headers):
        resp = client.get("/api/users/search?q=a", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.get_json() == []

    def test_search_finds_user(self, client, auth_headers, second_user):
        resp = client.get(f"/api/users/search?q={second_user['username'][:4]}", headers=auth_headers)
        assert resp.status_code == 200
        results = resp.get_json()
        assert any(u["username"] == second_user["username"] for u in results)

    def test_search_excludes_self(self, client, auth_headers, user):
        resp = client.get(f"/api/users/search?q={user['username']}", headers=auth_headers)
        assert resp.status_code == 200
        for u in resp.get_json():
            assert u["id"] != user["id"]


class TestSecurityHeaders:
    def test_no_last_plain_pw_in_any_response(self, client, auth_headers):
        """Verify the dangerous plaintext password field is gone everywhere."""
        endpoints = [
            ("/api/auth/me", "GET"),
            ("/api/auth/login", "POST"),
        ]
        for path, method in endpoints:
            if method == "GET":
                resp = client.get(path, headers=auth_headers)
            else:
                resp = client.post(path, json={"identifier": "testuser", "password": "password123"})
            text = resp.get_data(as_text=True)
            assert "last_plain_pw" not in text, f"last_plain_pw exposed at {path}"

    def test_rate_limiter_keys_are_ip_based(self, app):
        """Verify rate limiter does not share state across different IPs."""
        from utils.rate_limiter import rate_limit
        key1 = "ip:1.2.3.4"
        key2 = "ip:5.6.7.8"
        for _ in range(5):
            rate_limit(key1, max_requests=10, window=60)
        assert rate_limit(key2, max_requests=10, window=60) is False

    def test_rate_limiter_blocks_after_limit(self, app):
        from utils.rate_limiter import rate_limit
        key = "test:ratelimit:block"
        for _ in range(5):
            rate_limit(key, max_requests=5, window=60)
        assert rate_limit(key, max_requests=5, window=60) is True

    def test_cors_wildcard_not_allowed(self, client):
        """CORS must not be open to all origins."""
        resp = client.options("/api/auth/login",
                              headers={"Origin": "https://evil.com",
                                       "Access-Control-Request-Method": "POST"})
        # An open CORS would echo back the evil origin
        allow_origin = resp.headers.get("Access-Control-Allow-Origin", "")
        assert allow_origin != "https://evil.com", "CORS allows arbitrary origins!"


class TestAdminProtection:
    def test_admin_route_requires_auth(self, client):
        resp = client.get("/api/admin/users")
        assert resp.status_code == 401

    def test_admin_route_rejects_non_admin(self, client, auth_headers):
        resp = client.get("/api/admin/users", headers=auth_headers)
        assert resp.status_code == 403

    def test_admin_stats_requires_admin(self, client, auth_headers):
        resp = client.get("/api/admin/stats", headers=auth_headers)
        assert resp.status_code == 403
