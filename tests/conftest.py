"""Shared fixtures for the test suite."""
import os
import pytest

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-key-not-for-production")
os.environ.setdefault("BASE_URL", "http://localhost:5000")


@pytest.fixture(scope="session")
def app():
    from app import app as flask_app
    flask_app.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
        JWT_SECRET_KEY="test-secret-key-not-for-production",
        WTF_CSRF_ENABLED=False,
    )
    from extensions import db
    with flask_app.app_context():
        db.create_all()
        yield flask_app
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def db_session(app):
    from extensions import db
    with app.app_context():
        yield db
        db.session.rollback()


@pytest.fixture()
def user(app):
    """A registered user with a known password."""
    from extensions import db
    from models import User
    with app.app_context():
        u = User.query.filter_by(username="testuser").first()
        if not u:
            u = User(username="testuser", email="testuser@example.com")
            u.set_password("password123")
            db.session.add(u)
            db.session.commit()
        return {"id": u.id, "username": u.username, "email": u.email, "password": "password123"}


@pytest.fixture()
def second_user(app):
    from extensions import db
    from models import User
    with app.app_context():
        u = User.query.filter_by(username="otheruser").first()
        if not u:
            u = User(username="otheruser", email="otheruser@example.com")
            u.set_password("password456")
            db.session.add(u)
            db.session.commit()
        return {"id": u.id, "username": u.username, "email": u.email, "password": "password456"}


@pytest.fixture()
def auth_headers(client, user):
    """JWT auth headers for the primary test user."""
    resp = client.post("/api/auth/login", json={
        "identifier": user["username"],
        "password": user["password"],
    })
    assert resp.status_code == 200
    token = resp.get_json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def second_auth_headers(client, second_user):
    resp = client.post("/api/auth/login", json={
        "identifier": second_user["username"],
        "password": second_user["password"],
    })
    assert resp.status_code == 200
    token = resp.get_json()["token"]
    return {"Authorization": f"Bearer {token}"}
