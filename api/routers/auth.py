"""
Auth router: signup, login, logout, /api/auth/me.

Endpoints:
  POST /api/auth/signup   — email + password signup (+ optional current_plan auto-save)
  POST /api/auth/login    — email + password login
  POST /api/auth/logout   — clear session cookie
  GET  /api/auth/me       — return current user info

Cookie contract follows ADR-001 (httpOnly, SameSite=Lax, Secure in prod, 7d).
Password validation: >= 8 characters (NFR-1).
Duplicate email returns 409.
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
    build_cookie_kwargs,
    clear_cookie_kwargs,
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from api.database import get_db
from api.models import Plan, User
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
        # Validate plan_data with the Pydantic schema
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
        # Non-fatal: account still created, plan skipped.
        logger.warning(
            "Failed to auto-save plan on signup for user_id=%s — skipping",
            user.id,
            exc_info=True,
        )
        return None


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
    - Duplicate email returns 409.
    - Optionally auto-saves the current_plan to the new account (ADR-009).
    - Sets the forge_session cookie (httpOnly JWT) on success.
    """
    # Check for existing user
    existing = db.query(User).filter(User.email == body.email).first()
    if existing is not None:
        # Return generic 200 to prevent user enumeration (security audit)
        return {"message": "If this email is not registered, an account has been created"}

    # Create user
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        tier="free",
    )
    db.add(user)

    # Auto-save plan in the same transaction (ADR-009)
    saved_plan_id = _try_auto_save_plan(db, user, body.current_plan)

    # Commit atomically (user + optional plan)
    db.commit()
    db.refresh(user)

    # Issue JWT
    token = create_access_token(user)
    response = JSONResponse(content=_user_response(user, saved_plan_id))
    response.set_cookie(**build_cookie_kwargs(token))

    logger.info("User signed up (user_id=%s, auto_save=%s)", user.id, saved_plan_id is not None)
    return response


@router.post("/login")
async def login(
    request: Request,
    body: LoginRequest,
    db: Session = Depends(get_db),
) -> JSONResponse:
    """Authenticate with email + password and set session cookie.

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

    token = create_access_token(user)
    response = JSONResponse(content=_user_response(user))
    response.set_cookie(**build_cookie_kwargs(token))

    logger.info("User logged in (user_id=%s)", user.id)
    return response


@router.post("/logout")
async def logout(request: Request) -> JSONResponse:
    """Clear the session cookie."""
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie(**clear_cookie_kwargs())
    return response


@router.get("/me")
async def me(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Return the current authenticated user's info.

    Returns 401 if not authenticated (via get_current_user dependency).
    """
    return _user_response(current_user)
