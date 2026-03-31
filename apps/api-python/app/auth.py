"""POS Auth — JWT token va parol hash"""
import hashlib
import os
import time

import jwt
from fastapi import Header, HTTPException

JWT_SECRET = os.getenv("JWT_SECRET", "pos-jwt-secret-nonbor-2024")
JWT_EXPIRE = 3600 * 24
JWT_REFRESH_EXPIRE = 3600 * 24 * 7

# Rate limiting
_login_attempts: dict[str, list[float]] = {}
MAX_LOGIN_ATTEMPTS = 5
LOGIN_WINDOW = 300


def sha256_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def make_tokens(business_id: int, cred_id: int) -> tuple[str, str]:
    now = int(time.time())
    base = {"business_id": business_id, "cred_id": cred_id, "iat": now}
    access = jwt.encode({**base, "exp": now + JWT_EXPIRE, "type": "access"}, JWT_SECRET, algorithm="HS256")
    refresh = jwt.encode({**base, "exp": now + JWT_REFRESH_EXPIRE, "type": "refresh"}, JWT_SECRET, algorithm="HS256")
    return access, refresh


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token muddati tugagan")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token yaroqsiz")


def business_id_from_header(authorization: str = Header(None)) -> int:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization token kerak")
    payload = decode_token(authorization.split(" ", 1)[1])
    return payload["business_id"]


def check_rate_limit(key: str) -> bool:
    now = time.time()
    attempts = _login_attempts.get(key, [])
    attempts = [t for t in attempts if now - t < LOGIN_WINDOW]
    _login_attempts[key] = attempts
    return len(attempts) < MAX_LOGIN_ATTEMPTS


def record_attempt(key: str):
    now = time.time()
    if key not in _login_attempts:
        _login_attempts[key] = []
    _login_attempts[key].append(now)
