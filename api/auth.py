"""
JWT + bcrypt authentication helpers for Forge.

Provides:
  - Password hashing (bcrypt, cost >= 12)    — NFR-1
  - JWT creation / verification (HS256)      — NFR-2, ADR-001
  - FastAPI dependencies: get_current_user, get_optional_user
  - Dev-only auth bypass via X-Test-Auth header (NFR-9, ADR-007)

All secrets read from environment variables — nothing hardcoded.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Cookie, Depends, HTTPException, Request
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from api.database import get_db
from api.models import User

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration (all from env vars)
# ---------------------------------------------------------------------------

JWT_SECRET: str = os.environ.get("JWT_SECRET", "")
JWT_ALGORITHM: str = "HS256"
JWT_EXPIRY_DAYS: int = 7

COOKIE_NAME: str = "forge_session"
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
# JWT helpers
# ---------------------------------------------------------------------------

def create_access_token(user: User) -> str:
    """Create a signed JWT for the given user (HS256, 7-day expiry per ADR-001)."""
    if not JWT_SECRET:
        raise RuntimeError("JWT_SECRET environment variable is not set")

    now = datetime.now(timezone.utc)
    payload = {
        "sub": user.id,
        "email": user.email,
        "tier": user.tier,
        "iat": now,
        "exp": now + timedelta(days=JWT_EXPIRY_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and verify a JWT. Raises JWTError on failure."""
    if not JWT_SECRET:
        raise RuntimeError("JWT_SECRET environment variable is not set")

    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


# ---------------------------------------------------------------------------
# Cookie helpers
# ---------------------------------------------------------------------------

def build_cookie_kwargs(token: str) -> dict:
    """Return keyword arguments for Response.set_cookie per ADR-001.

    HttpOnly, SameSite=Lax, Secure only in production, 7-day max-age.
    """
    is_prod = ENVIRONMENT == "production"
    return {
        "key": COOKIE_NAME,
        "value": token,
        "httponly": True,
        "samesite": "lax",
        "secure": is_prod,
        "max_age": JWT_EXPIRY_DAYS * 86400,
        "path": "/",
    }


def clear_cookie_kwargs() -> dict:
    """Return keyword arguments for Response.delete_cookie."""
    is_prod = ENVIRONMENT == "production"
    return {
        "key": COOKIE_NAME,
        "httponly": True,
        "samesite": "lax",
        "secure": is_prod,
        "path": "/",
    }


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------

def _extract_token(request: Request) -> Optional[str]:
    """Extract the JWT from the forge_session cookie."""
    return request.cookies.get(COOKIE_NAME)


def _resolve_user_from_token(token: str, db: Session) -> Optional[User]:
    """Decode JWT and load the corresponding User from DB. Returns None on any failure."""
    try:
        payload = decode_token(token)
    except JWTError:
        return None

    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        return None

    user = db.query(User).filter(User.id == user_id).first()
    return user


def _try_test_bypass(request: Request, db: Session) -> Optional[User]:
    """Dev-only auth bypass via X-Test-Auth header (ADR-007, NFR-9).

    Only active when ENVIRONMENT == 'test'. Returns a mock Pro user so that
    e2e tests can exercise auth-gated endpoints without real credentials.
    In any other environment this header is silently ignored.
    """
    if ENVIRONMENT != "test":
        return None

    bypass_header = request.headers.get("x-test-auth")
    if bypass_header != "bypass":
        return None

    # Return a deterministic mock user (not persisted) for test assertions.
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
    """Require an authenticated user. Returns 401 if no valid session.

    Checks:
      1. Dev-only X-Test-Auth bypass (test env only, silently ignored elsewhere).
      2. forge_session cookie JWT.
    """
    # 1. Test bypass
    bypass_user = _try_test_bypass(request, db)
    if bypass_user is not None:
        return bypass_user

    # 2. Cookie JWT
    token = _extract_token(request)
    if not token:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "UNAUTHENTICATED", "message": "Authentication required"}},
        )

    user = _resolve_user_from_token(token, db)
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
    """Optionally resolve the current user. Returns None for unauthenticated requests.

    Used on endpoints that work for both anonymous and authenticated users
    (e.g. /api/generate for tier-aware rate limiting).
    """
    bypass_user = _try_test_bypass(request, db)
    if bypass_user is not None:
        return bypass_user

    token = _extract_token(request)
    if not token:
        return None

    return _resolve_user_from_token(token, db)
