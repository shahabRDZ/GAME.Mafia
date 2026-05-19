"""Rate limiter — uses Redis when REDIS_URL is set, falls back to thread-safe in-memory."""
import os
import time
import threading
from collections import defaultdict
from flask import request, jsonify, current_app

# ── In-memory backend ──────────────────────────────────────────────────────────
_lock = threading.Lock()
_rate_store: dict[str, list[float]] = defaultdict(list)


def reset_for_testing():
    """Clear all in-memory rate limit state. Call this between tests."""
    with _lock:
        _rate_store.clear()


def _mem_rate_limit(key: str, max_requests: int, window: int) -> bool:
    now = time.monotonic()
    with _lock:
        timestamps = _rate_store[key]
        cutoff = now - window
        while timestamps and timestamps[0] < cutoff:
            timestamps.pop(0)
        if len(timestamps) >= max_requests:
            return True
        timestamps.append(now)
        return False


# ── Redis backend (optional) ───────────────────────────────────────────────────
_redis_client = None
_redis_checked = False


def _get_redis():
    global _redis_client, _redis_checked
    if _redis_checked:
        return _redis_client
    _redis_checked = True
    url = os.environ.get("REDIS_URL", "")
    if not url:
        return None
    try:
        import redis
        client = redis.from_url(url, socket_connect_timeout=2, socket_timeout=2)
        client.ping()
        _redis_client = client
    except Exception:
        _redis_client = None
    return _redis_client


def _redis_rate_limit(client, key: str, max_requests: int, window: int) -> bool:
    """Sliding-window rate limit via Redis sorted set."""
    try:
        now = time.time()
        pipe = client.pipeline()
        pipe.zremrangebyscore(key, 0, now - window)
        pipe.zcard(key)
        pipe.zadd(key, {str(now): now})
        pipe.expire(key, window + 1)
        _, count, _, _ = pipe.execute()
        return count >= max_requests
    except Exception:
        # Redis error — fall back to allowing the request rather than blocking
        return False


# ── Public API ─────────────────────────────────────────────────────────────────

def rate_limit(key: str, max_requests: int = 30, window: int = 60) -> bool:
    """Return True if the key has exceeded max_requests within window seconds."""
    client = _get_redis()
    if client is not None:
        return _redis_rate_limit(client, f"rl:{key}", max_requests, window)
    return _mem_rate_limit(key, max_requests, window)


def check_rate_limit():
    """Flask before_request hook — 60 req/min per IP on all /api/ routes."""
    if current_app.config.get("TESTING"):
        return None
    if request.path.startswith("/api/"):
        ip = request.headers.get(
            "X-Forwarded-For", request.remote_addr or "unknown"
        ).split(",")[0].strip()
        if rate_limit(f"ip:{ip}", max_requests=60, window=60):
            return jsonify({"error": "تعداد درخواست‌ها بیش از حد مجاز"}), 429
