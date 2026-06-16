"""
Auth router: signup, login, logout, refresh, /api/auth/me.

Endpoints:
  POST /api/auth/signup   — email + password signup (+ optional current_plan auto-save)
  POST /api/auth/login    — email + password login
  POST /api/auth/logout   — revoke refresh token, clear both cookies
  POST /api/auth/refresh  — rotate refresh token, issue new access token
  GET  /api/auth/me       — return current user info

Cookie contract (Option B):
  - Access token:  forge_session cookie, 15-min expiry, httpOnly, SameSite=Lax
  - Refresh token: forge_refresh cookie, 7-day expiry, httpOnly, SameSite=Lax, path=/api/auth/refresh

Password validation: >= 8 characters (NFR-1).
Duplicate email returns generic 200 (prevents enumeration).
Auto-save on signup per ADR-009 (optional current_plan field).
"""

from __future__ import annotations

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from api.auth import (
    build_access_cookie_kwargs,
    build_refresh_cookie_kwargs,
    clear_access_cookie_kwargs,
    clear_refresh_cookie_kwargs,
    create_access_token,
    create_refresh_token,
    get_current_user,
    hash_password,
    revoke_refresh_token,
    rotate_refresh_token,
    verify_password,
    verify_refresh_token,
)
from api.database import get_db
from api.models import PasswordResetToken, Plan, User
from api.schema import BusinessPlan

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

PASSWORD_MIN_LENGTH = 8


class CurrentPlanPayload(BaseModel):
    """Shape of the optional current_plan for auto-save on signup (ADR-009)."""
    plan_data: BusinessPlan
    idea_description: str = Field(min_length=1)
    title: Optional[str] = Field(default=None, max_length=255)


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=PASSWORD_MIN_LENGTH)
    current_plan: Optional[CurrentPlanPayload] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    tier: str
    created_at: str
    saved_plan_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user_response(user: User, saved_plan_id: Optional[str] = None) -> dict:
    """Build the standard user response dict."""
    return {
        "id": user.id,
        "email": user.email,
        "tier": user.tier,
        "created_at": user.created_at.isoformat() if user.created_at else "",
        "saved_plan_id": saved_plan_id,
    }


def _derive_title(idea_description: str) -> str:
    """Derive a plan title from the idea description (first ~60 chars)."""
    truncated = idea_description[:60].strip()
    if len(idea_description) > 60:
        truncated += "..."
    return truncated


def _try_auto_save_plan(
    db: Session, user: User, current_plan: Optional[CurrentPlanPayload],
) -> Optional[str]:
    """Attempt to auto-save the current plan on signup (ADR-009).

    Returns the saved plan ID on success, None if skipped or invalid.
    The account is always created regardless of plan validity.
    """
    if current_plan is None:
        return None

    try:
        plan_dict = current_plan.plan_data.model_dump()
        title = current_plan.title or _derive_title(current_plan.idea_description)

        plan = Plan(
            user_id=user.id,
            title=title,
            plan_data=json.dumps(plan_dict),
            idea_description=current_plan.idea_description,
        )
        db.add(plan)
        logger.info(
            "Auto-saved plan for new user (plan_id=%s, user_id=%s)",
            plan.id, user.id,
        )
        return plan.id
    except Exception:
        logger.warning(
            "Failed to auto-save plan on signup for user_id=%s — skipping",
            user.id,
            exc_info=True,
        )
        return None


def _set_auth_cookies(response: JSONResponse, user: User, db: Session) -> None:
    """Set both access and refresh token cookies on the response."""
    access_token = create_access_token(user)
    refresh_token = create_refresh_token(user, db)
    response.set_cookie(**build_access_cookie_kwargs(access_token))
    response.set_cookie(**build_refresh_cookie_kwargs(refresh_token))


def _clear_auth_cookies(response: JSONResponse) -> None:
    """Clear both access and refresh token cookies."""
    response.delete_cookie(**clear_access_cookie_kwargs())
    response.delete_cookie(**clear_refresh_cookie_kwargs())


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/signup")
async def signup(
    request: Request,
    body: SignupRequest,
    db: Session = Depends(get_db),
) -> JSONResponse:
    """Create a new user account with email + password.

    - Password must be >= 8 characters (422 if shorter).
    - Duplicate email returns generic 200 (prevents enumeration).
    - Optionally auto-saves the current_plan to the new account (ADR-009).
    - Sets both access and refresh token cookies on success.
    """
    existing = db.query(User).filter(User.email == body.email).first()
    if existing is not None:
        return {"message": "If this email is not registered, an account has been created"}

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        tier="free",
    )
    db.add(user)

    saved_plan_id = _try_auto_save_plan(db, user, body.current_plan)

    db.commit()
    db.refresh(user)

    response = JSONResponse(content=_user_response(user, saved_plan_id))
    _set_auth_cookies(response, user, db)

    logger.info("User signed up (user_id=%s, auto_save=%s)", user.id, saved_plan_id is not None)
    return response


@router.post("/login")
async def login(
    request: Request,
    body: LoginRequest,
    db: Session = Depends(get_db),
) -> JSONResponse:
    """Authenticate with email + password and set both cookies.

    Returns 401 if credentials are invalid.
    """
    user = db.query(User).filter(User.email == body.email).first()
    if user is None or user.password_hash is None:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "INVALID_CREDENTIALS", "message": "Invalid email or password"}},
        )

    if not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "INVALID_CREDENTIALS", "message": "Invalid email or password"}},
        )

    response = JSONResponse(content=_user_response(user))
    _set_auth_cookies(response, user, db)

    logger.info("User logged in (user_id=%s)", user.id)
    return response


@router.post("/logout")
async def logout(
    request: Request,
    db: Session = Depends(get_db),
) -> JSONResponse:
    """Revoke refresh token and clear both cookies."""
    refresh_token_plain = request.cookies.get("forge_refresh")
    if refresh_token_plain:
        refresh = verify_refresh_token(refresh_token_plain, db)
        if refresh:
            revoke_refresh_token(refresh, db)
            logger.info("Refresh token revoked (user_id=%s)", refresh.user_id)

    response = JSONResponse(content={"message": "Logged out"})
    _clear_auth_cookies(response)
    return response


@router.post("/refresh")
async def refresh(
    request: Request,
    db: Session = Depends(get_db),
) -> JSONResponse:
    """Rotate refresh token and issue a new access token.

    Called by the frontend when the access token expires (401 on /api/auth/me).
    The refresh token is sent automatically via the httpOnly cookie.
    """
    refresh_token_plain = request.cookies.get("forge_refresh")
    if not refresh_token_plain:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "UNAUTHENTICATED", "message": "No refresh token"}},
        )

    old_refresh = verify_refresh_token(refresh_token_plain, db)
    if not old_refresh:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "UNAUTHENTICATED", "message": "Invalid or expired refresh token"}},
        )

    user = db.query(User).filter(User.id == old_refresh.user_id).first()
    if not user:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "UNAUTHENTICATED", "message": "User not found"}},
        )

    # Rotate: revoke old, create new
    new_refresh_plain = rotate_refresh_token(old_refresh, user, db)

    response = JSONResponse(content=_user_response(user))
    access_token = create_access_token(user)
    response.set_cookie(**build_access_cookie_kwargs(access_token))
    response.set_cookie(**build_refresh_cookie_kwargs(new_refresh_plain))

    logger.info("Token rotated (user_id=%s)", user.id)
    return response


@router.get("/me")
async def me(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Return the current authenticated user's info.

    Returns 401 if not authenticated (via get_current_user dependency).
    """
    return _user_response(current_user)


# ---------------------------------------------------------------------------
# Password reset
# ---------------------------------------------------------------------------

import secrets
from datetime import datetime, timedelta, timezone


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=1)
    new_password: str = Field(min_length=8)


@router.post("/password-reset")
async def password_reset(
    body: PasswordResetRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Request a password reset token.

    Returns generic 200 regardless of whether email exists (prevents enumeration).
    Token valid for 24 hours, single-use.
    """
    user = db.query(User).filter(User.email == body.email).first()
    if user is None:
        return {"message": "If this email is registered, a reset link has been sent"}

    # Generate token
    plain_token = secrets.token_urlsafe(32)
    token_hash = hash_password(plain_token)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    # Invalidate any existing tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
    ).update({"used_at": datetime.now(timezone.utc)})

    reset_token = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(reset_token)
    db.commit()

    # TODO: Send email with reset link containing plain_token
    # For now, log the token (dev only — never log in production)
    logger.info("Password reset token created (user_id=%s)", user.id)

    return {"message": "If this email is registered, a reset link has been sent"}


@router.post("/password-reset-confirm")
async def password_reset_confirm(
    body: PasswordResetConfirm,
    db: Session = Depends(get_db),
) -> dict:
    """Confirm password reset with token and new password."""
    # Find valid token (not used, not expired)
    now = datetime.now(timezone.utc)
    tokens = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.used_at.is_(None))
        .filter(PasswordResetToken.expires_at > now)
        .all()
    )

    valid_token = None
    for t in tokens:
        if verify_password(body.token, t.token_hash):
            valid_token = t
            break

    if not valid_token:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_TOKEN", "message": "Invalid or expired reset token"}},
        )

    user = db.query(User).filter(User.id == valid_token.user_id).first()
    if not user:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_TOKEN", "message": "User not found"}},
        )

    # Update password and mark token as used
    user.password_hash = hash_password(body.new_password)
    valid_token.used_at = now
    db.commit()

    logger.info("Password reset completed (user_id=%s)", user.id)
    return {"message": "Password updated successfully"}
