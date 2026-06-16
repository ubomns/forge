"""
JWT + bcrypt authentication helpers for Forge (Option B: Refresh Token Architecture).

Provides:
  - Password hashing (bcrypt, cost >= 12)                    — NFR-1
  - Access token creation (HS256, 15-min expiry)             — NFR-2
  - Refresh token creation / verification / rotation / revoke — Option B
  - FastAPI dependencies: get_current_user, get_optional_user
  - Dev-only auth bypass via X-Test-Auth header              — NFR-9, ADR-007

All secrets read from environment variables — nothing hardcoded.
"""

from __future__ import annotations

import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, Request
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from api.database import get_db
from api.models import RefreshToken, User

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration (all from env vars)
# ---------------------------------------------------------------------------

JWT_SECRET: str = os.environ.get("JWT_SECRET", "")
JWT_ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRY_MINUTES: int = 15
REFRESH_TOKEN_EXPIRY_DAYS: int = 7

ACCESS_COOKIE_NAME: str = "forge_session"
REFRESH_COOKIE_NAME: str = "forge_refresh"
ENVIRONMENT: str = os.environ.get("ENVIRONMENT", "development")

# Bcrypt cost factor (>= 12 per NFR-1)
BCRYPT_ROUNDS: int = 12


# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------

def hash_password(plain: str) -> str:
    """Hash a plaintext password with bcrypt (cost >= 12)."""
    salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    return bcrypt.hashpw(plain.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ---------------------------------------------------------------------------
# Access token helpers (short-lived, 15 minutes)
# ---------------------------------------------------------------------------

def create_access_token(user: User) -> str:
    """Create a short-lived access token (HS256, 15-minute expiry)."""
    if not JWT_SECRET:
        raise RuntimeError("JWT_SECRET environment variable is not set")

    now = datetime.now(timezone.utc)
    payload = {
        "sub": user.id,
        "email": user.email,
        "tier": user.tier,
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRY_MINUTES),
        "jti": secrets.token_urlsafe(16),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and verify an access token. Raises JWTError on failure."""
    if not JWT_SECRET:
        raise RuntimeError("JWT_SECRET environment variable is not set")

    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


# ---------------------------------------------------------------------------
# Refresh token helpers (long-lived, 7 days, stored in DB)
# ---------------------------------------------------------------------------

def _hash_refresh_token(plain: str) -> str:
    """Hash a refresh token with bcrypt (same cost as passwords)."""
    salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    return bcrypt.hashpw(plain.encode("utf-8"), salt).decode("utf-8")


def _verify_refresh_token(plain: str, hashed: str) -> bool:
    """Verify a plaintext refresh token against its hash."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_refresh_token(user: User, db: Session) -> str:
    """Create a long-lived refresh token, store hash in DB, return plaintext."""
    plain_token = secrets.token_urlsafe(32)
    token_hash = _hash_refresh_token(plain_token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRY_DAYS)

    refresh = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(refresh)
    db.commit()

    return plain_token


def verify_refresh_token(plain_token: str, db: Session) -> Optional[RefreshToken]:
    """Verify a refresh token: find by hash, check not revoked, not expired."""
    # We can't query by hash directly (bcrypt hashes are non-deterministic),
    # so we query by user and verify. For production, consider indexing by
    # a truncated hash or token family ID.
    # Simplification: iterate recent tokens (acceptable for small scale).
    refresh_tokens = (
        db.query(RefreshToken)
        .filter(RefreshToken.revoked_at.is_(None))
        .filter(RefreshToken.expires_at > datetime.now(timezone.utc))
        .order_by(RefreshToken.created_at.desc())
        .limit(50)
        .all()
    )

    for refresh in refresh_tokens:
        if _verify_refresh_token(plain_token, refresh.token_hash):
            return refresh

    return None


def revoke_refresh_token(refresh: RefreshToken, db: Session) -> None:
    """Revoke a refresh token (called on logout)."""
    refresh.revoked_at = datetime.now(timezone.utc)
    db.commit()


def rotate_refresh_token(old_refresh: RefreshToken, user: User, db: Session) -> str:
    """Rotate a refresh token: revoke old, create new."""
    revoke_refresh_token(old_refresh, db)
    return create_refresh_token(user, db)


# ---------------------------------------------------------------------------
# Cookie helpers
# ---------------------------------------------------------------------------

def _is_prod() -> bool:
    return ENVIRONMENT == "production"


def build_access_cookie_kwargs(token: str) -> dict:
    """Return kwargs for setting the access token cookie (15-min expiry)."""
    return {
        "key": ACCESS_COOKIE_NAME,
        "value": token,
        "httponly": True,
        "samesite": "lax",
        "secure": _is_prod(),
        "max_age": ACCESS_TOKEN_EXPIRY_MINUTES * 60,
        "path": "/",
    }


def build_refresh_cookie_kwargs(token: str) -> dict:
    """Return kwargs for setting the refresh token cookie (7-day expiry)."""
    return {
        "key": REFRESH_COOKIE_NAME,
        "value": token,
        "httponly": True,
        "samesite": "lax",
        "secure": _is_prod(),
        "max_age": REFRESH_TOKEN_EXPIRY_DAYS * 86400,
        "path": "/api/auth/refresh",  # Restrict to refresh endpoint
    }


def clear_access_cookie_kwargs() -> dict:
    """Return kwargs for clearing the access token cookie."""
    return {
        "key": ACCESS_COOKIE_NAME,
        "httponly": True,
        "samesite": "lax",
        "secure": _is_prod(),
        "path": "/",
    }


def clear_refresh_cookie_kwargs() -> dict:
    """Return kwargs for clearing the refresh token cookie."""
    return {
        "key": REFRESH_COOKIE_NAME,
        "httponly": True,
        "samesite": "lax",
        "secure": _is_prod(),
        "path": "/api/auth/refresh",
    }


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------

def _extract_access_token(request: Request) -> Optional[str]:
    """Extract the access token from the forge_session cookie."""
    return request.cookies.get(ACCESS_COOKIE_NAME)


def _extract_refresh_token(request: Request) -> Optional[str]:
    """Extract the refresh token from the forge_refresh cookie."""
    return request.cookies.get(REFRESH_COOKIE_NAME)


def _resolve_user_from_access_token(token: str, db: Session) -> Optional[User]:
    """Decode access token and load the corresponding User from DB."""
    try:
        payload = decode_access_token(token)
    except JWTError:
        return None

    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        return None

    user = db.query(User).filter(User.id == user_id).first()
    return user


def _try_test_bypass(request: Request, db: Session) -> Optional[User]:
    """Dev-only auth bypass via X-Test-Auth header (ADR-007, NFR-9)."""
    if ENVIRONMENT != "test":
        return None

    bypass_header = request.headers.get("x-test-auth")
    if bypass_header != "bypass":
        return None

    mock = User(
        id="test-user-00000000-0000-0000-0000-000000000000",
        email="test@forge.dev",
        tier="pro",
    )
    logger.info("Auth bypassed via X-Test-Auth header (test environment)")
    return mock


async def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """Require an authenticated user. Returns 401 if no valid access token."""
    # 1. Test bypass
    bypass_user = _try_test_bypass(request, db)
    if bypass_user is not None:
        return bypass_user

    # 2. Access token from cookie
    token = _extract_access_token(request)
    if not token:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "UNAUTHENTICATED", "message": "Authentication required"}},
        )

    user = _resolve_user_from_access_token(token, db)
    if user is None:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "UNAUTHENTICATED", "message": "Invalid or expired session"}},
        )

    return user


async def get_optional_user(
    request: Request,
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Optionally resolve the current user. Returns None for unauthenticated requests."""
    bypass_user = _try_test_bypass(request, db)
    if bypass_user is not None:
        return bypass_user

    token = _extract_access_token(request)
    if not token:
        return None

    return _resolve_user_from_access_token(token, db)
