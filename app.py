"""ShowShung Mafia — thin application entry point."""
import os
import time

from flask import Flask, request, jsonify
from flask_cors import CORS

from config.settings import Config
from extensions import db, jwt, socketio
from utils.rate_limiter import check_rate_limit
from routes import register_blueprints
from sockets import register_socket_handlers
import models  # noqa: F401 — ensure all models are registered with SQLAlchemy


# ── Create App ────────────────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__, static_folder=BASE_DIR, static_url_path="")
app.config.from_object(Config)
CORS(app)

# ── Initialize Extensions ────────────────────────────────────────────────────

db.init_app(app)
jwt.init_app(app)
socketio.init_app(app)

# ── Rate Limiter ──────────────────────────────────────────────────────────────

app.before_request(check_rate_limit)

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

for _attempt in range(10):
    try:
        with app.app_context():
            db.create_all()
            try:
                db.session.execute(db.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_emoji VARCHAR(10) DEFAULT '🎭'"))
                db.session.execute(db.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio VARCHAR(200) DEFAULT ''"))
                db.session.execute(db.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS chaos_wins INTEGER DEFAULT 0"))
                db.session.execute(db.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS chaos_losses INTEGER DEFAULT 0"))
                db.session.execute(db.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_plain_pw VARCHAR(100)"))
                db.session.execute(db.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE"))
                db.session.execute(db.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP"))
                db.session.execute(db.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0"))
                db.session.execute(db.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS device_fingerprint VARCHAR(100)"))
                for col in ["event_name VARCHAR(100) DEFAULT ''", "host_display_name VARCHAR(50) DEFAULT ''",
                    "address VARCHAR(300) DEFAULT ''", "lat FLOAT", "lng FLOAT"]:
                    try: db.session.execute(db.text(f"ALTER TABLE game_events ADD COLUMN IF NOT EXISTS {col}")); db.session.commit()
                    except: db.session.rollback()
                try: db.session.execute(db.text("ALTER TABLE game_events ADD COLUMN IF NOT EXISTS price VARCHAR(50) DEFAULT ''")); db.session.commit()
                except: db.session.rollback()
                db.session.execute(db.text("DROP TABLE IF EXISTS lab_messages CASCADE"))
                db.session.execute(db.text("DROP TABLE IF EXISTS lab_players CASCADE"))
                db.session.execute(db.text("DROP TABLE IF EXISTS lab_rooms CASCADE"))
                db.session.execute(db.text("DROP TABLE IF EXISTS bot_memories CASCADE"))
                db.session.commit()
                db.create_all()
                db.session.commit()
                print("DB columns updated")
            except Exception as col_err:
                db.session.rollback()
                print(f"Column update skipped: {col_err}")
        break
    except Exception as e:
        if _attempt < 9:
            print(f"DB not ready ({e}), retrying in 3s...")
            time.sleep(3)
        else:
            raise


# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port, debug=False, allow_unsafe_werkzeug=True)
