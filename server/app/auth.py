"""
SportSphere auth — JWT (httpOnly cookie) + bcrypt password hashing.
"""
from __future__ import annotations
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Cookie, Depends, HTTPException, Request, status
from jose import JWTError, jwt
import bcrypt

from .store import STORE

SECRET_KEY = os.getenv("JWT_SECRET", "sportsphere-dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))  # 7 days


def hash_password(password: str) -> str:
    pw = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(subject: str, extra: Optional[dict] = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": subject, "exp": expire}
    if extra:
        payload.update(extra)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc


def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token)
    user_id = payload.get("sub")
    user = STORE.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_current_profile(request: Request) -> dict:
    """Resolve the current user's athlete profile, creating one lazily on first login."""
    user = get_current_user(request)
    if user.get("profile_id") and STORE.get_profile(user["profile_id"]):
        return STORE.get_profile(user["profile_id"])
    profile = STORE.create_profile({
        "id": f"ath-{user['id'].split('-')[-1]}",
        "name": user["display_name"],
        "handle": "@" + user["display_name"].lower().replace(" ", "_"),
        "primary_sport": "Football",
        "skill_level": "intermediate",
    })
    user["profile_id"] = profile["id"]
    return profile
