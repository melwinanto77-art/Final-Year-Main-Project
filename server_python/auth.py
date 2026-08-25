"""Authentication: password hashing, signed tokens, and access dependencies.

Deliberately dependency-free — PBKDF2 and HMAC come from the standard
library, so no new package is needed and nothing has to be installed on a
teammate's machine for login to work.

The security model:

* Passwords are stored as `pbkdf2_sha256$iterations$salt$hash`, never plaintext.
* A token is `base64(payload).base64(hmac_sha256(payload, secret))` — signed,
  not encrypted, so it is tamper-evident but must never carry a secret.
* **The caller's identity always comes from the token**, never from a query
  parameter or body field. That is the whole point: before this, any client
  could read another client's documents by passing their email.

Env:
  AUTH_SECRET        — signing key. A random one is generated per process if
                       unset, which invalidates tokens on restart; set it in
                       .env for stable sessions.
  TOKEN_TTL_HOURS    — session lifetime, default 12.
"""
import base64
import hashlib
import hmac
import json
import os
import secrets
import time

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from database import get_db
from errors import ApiError

PBKDF2_ITERATIONS = 240_000
_FALLBACK_SECRET = secrets.token_hex(32)


def _secret():
    return os.getenv("AUTH_SECRET") or _FALLBACK_SECRET


def _ttl_seconds():
    try:
        return int(float(os.getenv("TOKEN_TTL_HOURS", "12")) * 3600)
    except ValueError:
        return 12 * 3600


# ---------------------------------------------------------------- passwords

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), PBKDF2_ITERATIONS
    ).hex()
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    """Constant-time check against a stored hash. False on anything malformed."""
    try:
        algorithm, iterations, salt, expected = (stored or "").split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt.encode("utf-8"), int(iterations)
        ).hex()
        return hmac.compare_digest(digest, expected)
    except (ValueError, AttributeError):
        return False


# ------------------------------------------------------------------ tokens

def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def create_token(user) -> str:
    payload = {
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "name": user.full_name,
        "exp": int(time.time()) + _ttl_seconds(),
    }
    body = _b64(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(_secret().encode("utf-8"), body.encode("utf-8"), hashlib.sha256).digest()
    return f"{body}.{_b64(signature)}"


def decode_token(token: str):
    """Return the payload, or None when missing, tampered with or expired."""
    try:
        body, signature = (token or "").split(".")
        expected = hmac.new(
            _secret().encode("utf-8"), body.encode("utf-8"), hashlib.sha256
        ).digest()
        if not hmac.compare_digest(_unb64(signature), expected):
            return None
        payload = json.loads(_unb64(body))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except (ValueError, AttributeError, json.JSONDecodeError):
        return None


# ------------------------------------------------------------ dependencies

def _bearer(request: Request):
    header = request.headers.get("authorization") or ""
    if header.lower().startswith("bearer "):
        return header[7:].strip()
    return None


def current_user(request: Request):
    """The signed-in user, or None. Use for endpoints that adapt to the caller."""
    return decode_token(_bearer(request))


def require_user(request: Request):
    """Any authenticated caller."""
    user = current_user(request)
    if not user:
        raise ApiError(401, "Sign in to continue.")
    return user


def require_admin(request: Request):
    """Administrator only — processing, reviewing, approving, deleting."""
    user = require_user(request)
    if user.get("role") != "admin":
        raise ApiError(403, "This action is restricted to administrators.")
    return user


def is_admin(user) -> bool:
    return bool(user) and user.get("role") == "admin"


def owner_email(user) -> str:
    """The email a client's data is filtered by — taken from the token only."""
    return (user or {}).get("email", "").strip().lower()


# ------------------------------------------------------------------- seeding

DEFAULT_ACCOUNTS = [
    {
        "email": "admin@ventureorbital.com",
        "password": "admin123",
        "role": "admin",
        "full_name": "Administrator",
    },
    {
        "email": "founder@ventureorbital.com",
        "password": "password123",
        "role": "client",
        "full_name": "Venture Founder",
    },
]


def seed_default_users(db: Session):
    """Create the two known accounts on first run.

    These keep the existing demo logins working. They are development
    credentials — change them before this is exposed to anything real.
    """
    from models import UserModel  # imported here to avoid a circular import

    created = []
    for account in DEFAULT_ACCOUNTS:
        exists = db.query(UserModel).filter(UserModel.email == account["email"]).first()
        if exists:
            continue
        db.add(UserModel(
            id=f"u_{secrets.token_hex(6)}",
            email=account["email"],
            password_hash=hash_password(account["password"]),
            role=account["role"],
            full_name=account["full_name"],
        ))
        created.append(account["email"])
    if created:
        db.commit()
    return created
