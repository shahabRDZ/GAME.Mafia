"""Auth blueprint — register, login, device auth, forgot password, me."""
import os
import re
import secrets
from datetime import datetime, timezone, timedelta

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token

from extensions import db
from models import User
from utils.rate_limiter import rate_limit

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")
_USER_RE  = re.compile(r"^[a-zA-Z0-9_؀-ۿ]{3,30}$")
_PW_MAX   = 72  # bcrypt silently truncates beyond 72 bytes


def _validate_register(username, email, password):
    if not username or not email or not password:
        return "همه فیلدها الزامی هستند"
    if not _USER_RE.match(username):
        return "نام کاربری باید ۳ تا ۳۰ کاراکتر و فقط حروف، عدد یا _ باشد"
    if not _EMAIL_RE.match(email):
        return "فرمت ایمیل نامعتبر است"
    if len(password) < 6:
        return "رمز عبور باید حداقل ۶ کاراکتر باشد"
    if len(password) > _PW_MAX:
        return f"رمز عبور نباید بیشتر از {_PW_MAX} کاراکتر باشد"
    return None


def _client_ip():
    return request.headers.get("X-Forwarded-For", request.remote_addr or "unknown").split(",")[0].strip()


def _send_email(to_addr, subject, body):
    import resend
    api_key = os.environ.get("RESEND_API_KEY", "")
    from_addr = os.environ.get("RESEND_FROM", "onboarding@resend.dev")
    if not api_key:
        return False
    resend.api_key = api_key
    resend.Emails.send({"from": from_addr, "to": [to_addr], "subject": subject, "text": body})
    return True


@bp.route("/register", methods=["POST"])
def register():
    ip = _client_ip()
    if rate_limit(f"register:{ip}", max_requests=5, window=900):
        return jsonify({"error": "تعداد درخواست‌های ثبت‌نام بیش از حد مجاز. ۱۵ دقیقه صبر کنید"}), 429

    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    err = _validate_register(username, email, password)
    if err:
        return jsonify({"error": err}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "این نام کاربری قبلاً ثبت شده"}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "این ایمیل قبلاً ثبت شده"}), 409

    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 201


@bp.route("/register-device", methods=["POST"])
@jwt_required()
def register_device():
    user = db.session.get(User, int(get_jwt_identity()))
    data = request.get_json(silent=True) or {}
    fp = (data.get("fingerprint") or "")[:100]
    if fp and user:
        user.device_fingerprint = fp
        db.session.commit()
    return jsonify({"ok": True}), 200


@bp.route("/device-login", methods=["POST"])
def device_login():
    ip = _client_ip()
    if rate_limit(f"devlogin:{ip}", max_requests=20, window=60):
        return jsonify({"error": "too many requests"}), 429

    data = request.get_json(silent=True) or {}
    fp = (data.get("fingerprint") or "")[:100]
    if not fp:
        return jsonify({"error": "no fingerprint"}), 400
    user = User.query.filter_by(device_fingerprint=fp).first()
    if not user:
        return jsonify({"error": "device not registered"}), 404
    if user.is_banned:
        return jsonify({"error": "banned"}), 403
    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 200


@bp.route("/login", methods=["POST"])
def login():
    ip = _client_ip()
    if rate_limit(f"login:{ip}", max_requests=10, window=900):
        return jsonify({"error": "تعداد تلاش‌های ورود بیش از حد مجاز. ۱۵ دقیقه صبر کنید"}), 429

    data = request.get_json(silent=True) or {}
    identifier = (data.get("identifier") or "").strip()
    password   = data.get("password") or ""

    if not identifier or not password:
        return jsonify({"error": "نام کاربری و رمز عبور الزامی است"}), 400
    if len(password) > _PW_MAX:
        return jsonify({"error": "نام کاربری یا رمز عبور اشتباه است"}), 401

    user = User.query.filter(
        (User.username == identifier) | (User.email == identifier.lower())
    ).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "نام کاربری یا رمز عبور اشتباه است"}), 401
    if user.is_banned:
        return jsonify({"error": "حساب شما مسدود شده است"}), 403

    try:
        user.last_login = datetime.now(timezone.utc)
        db.session.commit()
    except Exception:
        db.session.rollback()

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 200


@bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    ip = _client_ip()
    if rate_limit(f"forgot:{ip}", max_requests=3, window=900):
        return jsonify({"error": "تعداد درخواست‌های بازیابی بیش از حد. ۱۵ دقیقه صبر کنید"}), 429

    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if not email or not _EMAIL_RE.match(email):
        return jsonify({"error": "ایمیل معتبر وارد کنید"}), 400

    _OK = {"ok": True, "message": "اگر این ایمیل ثبت شده باشد، لینک بازیابی ارسال می‌شود"}

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify(_OK), 200

    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(minutes=30)
    db.session.commit()

    base_url = os.environ.get("BASE_URL", "https://showshung.com")
    reset_link = f"{base_url}/?reset_token={token}"
    body = (
        f"سلام {user.username}!\n\n"
        f"برای بازیابی رمز عبور روی لینک زیر کلیک کنید:\n\n"
        f"{reset_link}\n\n"
        f"این لینک ۳۰ دقیقه اعتبار دارد.\n\n"
        f"اگر این درخواست را نداده‌اید، این ایمیل را نادیده بگیرید.\n\n"
        f"شوشانگ - بازی مافیا"
    )
    try:
        _send_email(email, "🎭 بازیابی رمز عبور شوشانگ", body)
    except Exception as e:
        print(f"Email send failed: {e}")

    return jsonify(_OK), 200


@bp.route("/reset-password", methods=["POST"])
def reset_password():
    ip = _client_ip()
    if rate_limit(f"reset:{ip}", max_requests=5, window=900):
        return jsonify({"error": "تعداد تلاش‌ها بیش از حد مجاز"}), 429

    data = request.get_json(silent=True) or {}
    token  = (data.get("token") or "").strip()
    new_pw = data.get("password") or ""

    if not token or not new_pw:
        return jsonify({"error": "اطلاعات ناقص است"}), 400
    if len(new_pw) < 6:
        return jsonify({"error": "رمز عبور باید حداقل ۶ کاراکتر باشد"}), 400
    if len(new_pw) > _PW_MAX:
        return jsonify({"error": f"رمز عبور نباید بیشتر از {_PW_MAX} کاراکتر باشد"}), 400

    user = User.query.filter_by(reset_token=token).first()
    if not user:
        return jsonify({"error": "لینک نامعتبر است"}), 400

    expires = user.reset_token_expires
    if expires is None:
        return jsonify({"error": "لینک منقضی شده است"}), 400
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires:
        return jsonify({"error": "لینک منقضی شده است. دوباره درخواست دهید"}), 400

    user.set_password(new_pw)
    user.reset_token = None
    user.reset_token_expires = None
    db.session.commit()

    jwt_token = create_access_token(identity=str(user.id))
    return jsonify({"ok": True, "token": jwt_token, "user": user.to_dict(),
                    "message": "رمز عبور با موفقیت تغییر کرد"}), 200


@bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "کاربر یافت نشد"}), 404
    return jsonify(user.to_dict()), 200
