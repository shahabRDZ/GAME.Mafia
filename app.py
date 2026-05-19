"""ShowShung Mafia — thin application entry point."""
import eventlet
eventlet.monkey_patch()

import os
import time
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify
from flask_cors import CORS

from config.settings import Config
from extensions import db, jwt, socketio, migrate
from utils.rate_limiter import check_rate_limit
from routes import register_blueprints
from sockets import register_socket_handlers
import models  # noqa: F401 — ensure all models are registered with SQLAlchemy


# ── Create App ────────────────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__, static_folder=BASE_DIR, static_url_path="")
app.config.from_object(Config)
_allowed_origins = [
    os.environ.get("BASE_URL", "https://showshung.com"),
    "http://localhost:5000",
    "http://localhost:5001",
]
CORS(app, origins=_allowed_origins, supports_credentials=True)

# ── Initialize Extensions ────────────────────────────────────────────────────

db.init_app(app)
jwt.init_app(app)
migrate.init_app(app, db)
socketio.init_app(app)

# ── Rate Limiter ──────────────────────────────────────────────────────────────

app.before_request(check_rate_limit)

# ── JWT: revoke tokens of banned users ───────────────────────────────────────

@jwt.token_in_blocklist_loader
def check_if_user_is_banned(_jwt_header, jwt_payload):
    """Return True to treat this token as revoked (banned user)."""
    uid = jwt_payload.get("sub")
    if not uid:
        return False
    from models import User
    user = db.session.get(User, int(uid))
    return user is None or user.is_banned


@jwt.revoked_token_loader
def revoked_token_response(_jwt_header, _jwt_payload):
    return jsonify({"error": "حساب شما مسدود شده است"}), 403

# ── Register Blueprints & Socket Handlers ─────────────────────────────────────

register_blueprints(app)
register_socket_handlers(socketio, app)

# ── Error Handlers ────────────────────────────────────────────────────────────

@app.errorhandler(404)
def page_not_found(e):
    if request.path.startswith('/api/'):
        return jsonify({"error": "مسیر یافت نشد"}), 404
    return '''<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>۴۰۴ — شوشانگ</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#000;color:#eaeaf5;font-family:system-ui,sans-serif;
display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:20px}
.e{max-width:360px}.e .n{font-size:6rem;font-weight:900;background:linear-gradient(120deg,#ff2244,#f5a623);
-webkit-background-clip:text;-webkit-text-fill-color:transparent}.e p{color:rgba(255,255,255,.4);margin:12px 0 24px;font-size:.9rem}
.e a{display:inline-block;padding:12px 28px;background:#e94560;color:#fff;border-radius:12px;text-decoration:none;
font-weight:700;font-size:.9rem}</style></head><body><div class="e"><div class="n">۴۰۴</div>
<div style="font-size:2rem;margin-bottom:8px">🎭</div><p>صفحه‌ای که دنبالش بودی پیدا نشد!</p>
<a href="/">بازگشت به شوشانگ</a></div></body></html>''', 404


@app.errorhandler(429)
def too_many_requests(e):
    return jsonify({"error": "تعداد درخواست‌ها بیش از حد مجاز. کمی صبر کنید."}), 429


# ── Bootstrap: DB migrations ─────────────────────────────────────────────────

_SCHEMA_MIGRATIONS = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_emoji VARCHAR(10) DEFAULT '🎭'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS bio VARCHAR(200) DEFAULT ''",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS chaos_wins INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS chaos_losses INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS device_fingerprint VARCHAR(100)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(64)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT",
    "ALTER TABLE game_events ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0",
    "ALTER TABLE game_events ADD COLUMN IF NOT EXISTS event_name VARCHAR(100) DEFAULT ''",
    "ALTER TABLE game_events ADD COLUMN IF NOT EXISTS host_display_name VARCHAR(50) DEFAULT ''",
    "ALTER TABLE game_events ADD COLUMN IF NOT EXISTS address VARCHAR(300) DEFAULT ''",
    "ALTER TABLE game_events ADD COLUMN IF NOT EXISTS lat FLOAT",
    "ALTER TABLE game_events ADD COLUMN IF NOT EXISTS lng FLOAT",
    "ALTER TABLE game_events ADD COLUMN IF NOT EXISTS price VARCHAR(50) DEFAULT ''",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE",
]

if not os.environ.get("FLASK_SKIP_DB_CREATE"):
    for _attempt in range(10):
        try:
            with app.app_context():
                db.create_all()
                for _sql in _SCHEMA_MIGRATIONS:
                    try:
                        db.session.execute(db.text(_sql))
                        db.session.commit()
                    except Exception:
                        db.session.rollback()
                print("DB ready")
            break
        except Exception as e:
            if _attempt < 9:
                print(f"DB not ready ({e}), retrying in 3s...")
                time.sleep(3)
            else:
                raise

# ── Resume in-progress chaos rooms after restart ─────────────────────────────
try:
    from services.chaos_service import resume_active_rooms
    resume_active_rooms(app)
except Exception as _e:
    print(f"[chaos] Could not resume active rooms: {_e}")


# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port, debug=False, allow_unsafe_werkzeug=True)
