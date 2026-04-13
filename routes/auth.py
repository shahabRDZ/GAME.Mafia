"""Auth blueprint — register, login, device auth, forgot password, me."""
import os
import random
import string
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token

from extensions import db
from models import User

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not username or not email or not password:
        return jsonify({"error": "همه فیلدها الزامی هستند"}), 400
    if len(password) < 6:
        return jsonify({"error": "رمز عبور باید حداقل ۶ کاراکتر باشد"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "این نام کاربری قبلاً ثبت شده"}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "این ایمیل قبلاً ثبت شده"}), 409
    user = User(username=username, email=email, last_plain_pw=password)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 201


@bp.route("/register-device", methods=["POST"])
@jwt_required()
def register_device():
    user = db.session.get(User, int(get_jwt_identity()))
    data = request.get_json()
    fp = data.get("fingerprint", "")
    if fp and user:
        user.device_fingerprint = fp
        db.session.commit()
    return jsonify({"ok": True}), 200


@bp.route("/device-login", methods=["POST"])
def device_login():
    data = request.get_json()
    fp = data.get("fingerprint", "")
    if not fp:
        return jsonify({"error": "no fingerprint"}), 400
    user = User.query.filter_by(device_fingerprint=fp).first()
    if not user:
        return jsonify({"error": "device not registered"}), 404
    try:
        if user.is_banned:
            return jsonify({"error": "banned"}), 403
    except:
        pass
    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 200


@bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json()
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "ایمیل را وارد کنید"}), 400
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "حسابی با این ایمیل یافت نشد"}), 404
    # Generate random password
    new_pw = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
    user.set_password(new_pw)
    user.last_plain_pw = new_pw
    db.session.commit()
    # Send email
    try:
        import smtplib
        from email.mime.text import MIMEText
        smtp_user = os.environ.get("SMTP_USER", "")
        smtp_pass = os.environ.get("SMTP_PASS", "")
        smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        if smtp_user and smtp_pass:
            msg = MIMEText(f"سلام {user.username}!\n\nرمز جدید شما: {new_pw}\n\nاز شوشانگ - بازی مافیا", "plain", "utf-8")
            msg["Subject"] = "🎭 رمز جدید شوشانگ"
            msg["From"] = smtp_user
            msg["To"] = email
            with smtplib.SMTP(smtp_host, smtp_port) as s:
                s.starttls()
                s.login(smtp_user, smtp_pass)
                s.send_message(msg)
        email_sent = True
    except Exception as e:
        print(f"Email send failed: {e}")
        email_sent = False
    return jsonify({"ok": True, "new_password": new_pw, "email_sent": email_sent,
                     "message": "رمز جدید ساخته شد"}), 200


@bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    identifier = (data.get("identifier") or "").strip()
    password = data.get("password") or ""
    user = User.query.filter(
        (User.username == identifier) | (User.email == identifier.lower())
    ).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "نام کاربری یا رمز عبور اشتباه است"}), 401
    try:
        if user.is_banned:
            return jsonify({"error": "حساب شما مسدود شده است"}), 403
    except:
        pass
    try:
        user.last_login = datetime.now(timezone.utc)
        db.session.commit()
    except:
        db.session.rollback()
    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 200


@bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "کاربر یافت نشد"}), 404
    return jsonify(user.to_dict()), 200
