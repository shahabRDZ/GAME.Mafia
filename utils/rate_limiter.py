"""Simple in-memory rate limiter."""
import time
from collections import defaultdict
from flask import request, jsonify

_rate_store = defaultdict(list)


def rate_limit(key, max_requests=30, window=60):
    """Returns True if rate limit exceeded."""
    now = time.time()
    _rate_store[key] = [t for t in _rate_store[key] if now - t < window]
    if len(_rate_store[key]) >= max_requests:
        return True
    _rate_store[key].append(now)
    return False


def check_rate_limit():
    """Flask before_request hook — apply to API routes."""
    if request.path.startswith('/api/'):
        ip = request.remote_addr or "unknown"
        if rate_limit(f"ip:{ip}", max_requests=60, window=60):
            return jsonify({"error": "تعداد درخواست‌ها بیش از حد مجاز"}), 429
