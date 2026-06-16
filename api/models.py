"""
SQLAlchemy ORM models for Forge SaaS.

Entities: User, Plan, Lead, PasswordResetToken, Subscription, Team, TeamMember.

All UUIDs stored as CHAR(36) strings so the schema is portable across
SQLite (dev) and PostgreSQL (prod) per ADR-002.  Enums use SQLAlchemy's
generic Enum backed by VARCHAR, which works identically on both dialects.

Data model follows ARCHITECTURE.md §5.1/§5.2 and the §9A.12.6 billing
delta (provider discriminator + generalised external IDs per ADR-013).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from api.database import Base


def _utcnow() -> datetime:
    """Return a timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


def _new_uuid() -> str:
    """Return a new UUID4 as a string (portable across SQLite/PostgreSQL)."""
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

USER_TIER_ENUM = Enum(
    "anonymous", "free", "pro", "team",
    name="user_tier",
)

SUB_STATUS_ENUM = Enum(
    "incomplete", "active", "canceled", "past_due",
    name="sub_status",
)

SUB_TIER_ENUM = Enum(
    "pro", "team",
    name="sub_tier",
)

BILLING_PROVIDER_ENUM = Enum(
    "stripe", "paystack",
    name="billing_provider",
)

CURRENCY_ENUM = Enum(
    "USD", "NGN",
    name="currency",
)

LEAD_SOURCE_ENUM = Enum(
    "download", "signup",
    name="lead_source",
)

TEAM_ROLE_ENUM = Enum(
    "admin", "member",
    name="team_role",
)


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=_new_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    tier = Column(USER_TIER_ENUM, default="free", nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False,
    )

    # Relationships
    plans = relationship("Plan", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user")
    team_memberships = relationship("TeamMember", back_populates="user")


# ---------------------------------------------------------------------------
# Plan  (ADR-009 auto-save shape; counts toward ADR-005 free-tier cap)
# ---------------------------------------------------------------------------

class Plan(Base):
    __tablename__ = "plans"

    id = Column(String(36), primary_key=True, default=_new_uuid)
    user_id = Column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    title = Column(String(255), nullable=False)
    plan_data = Column(Text, nullable=False)  # JSON blob of BusinessPlan
    idea_description = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False,
    )

    user = relationship("User", back_populates="plans")


# ---------------------------------------------------------------------------
# Subscription  (§9A.12.6 — provider discriminator + generalised ext IDs)
# ---------------------------------------------------------------------------

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String(36), primary_key=True, default=_new_uuid)
    user_id = Column(
        String(36), ForeignKey("users.id"), nullable=True, index=True,
    )
    team_id = Column(
        String(36), ForeignKey("teams.id"), nullable=True, index=True,
    )

    # ADR-013 multi-provider fields
    provider = Column(BILLING_PROVIDER_ENUM, nullable=False)
    currency = Column(CURRENCY_ENUM, nullable=False)
    external_customer_id = Column(String(255), nullable=True, index=True)
    external_subscription_id = Column(String(255), unique=True, nullable=False)
    external_price_id = Column(String(255), nullable=True)

    status = Column(SUB_STATUS_ENUM, default="incomplete", nullable=False)
    tier = Column(SUB_TIER_ENUM, nullable=False)
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False,
    )

    user = relationship("User", back_populates="subscriptions")
    team = relationship("Team", back_populates="subscriptions")


# ---------------------------------------------------------------------------
# Team  (Sprint 5 — schema only for now)
# ---------------------------------------------------------------------------

class Team(Base):
    __tablename__ = "teams"

    id = Column(String(36), primary_key=True, default=_new_uuid)
    name = Column(String(255), nullable=False)
    admin_id = Column(
        String(36), ForeignKey("users.id"), nullable=False,
    )
    seat_limit = Column(Integer, default=5, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False,
    )

    members = relationship(
        "TeamMember", back_populates="team", cascade="all, delete-orphan",
    )
    subscriptions = relationship("Subscription", back_populates="team")


# ---------------------------------------------------------------------------
# TeamMember
# ---------------------------------------------------------------------------

class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(String(36), primary_key=True, default=_new_uuid)
    team_id = Column(
        String(36), ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    user_id = Column(
        String(36), ForeignKey("users.id"),
        nullable=False, index=True,
    )
    role = Column(TEAM_ROLE_ENUM, default="member", nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    team = relationship("Team", back_populates="members")
    user = relationship("User", back_populates="team_memberships")


# ---------------------------------------------------------------------------
# Lead  (FR-3 — lightweight lead record for email capture)
# ---------------------------------------------------------------------------

class Lead(Base):
    __tablename__ = "leads"

    id = Column(String(36), primary_key=True, default=_new_uuid)
    email = Column(String(255), nullable=False, index=True)
    plan_snapshot = Column(Text, nullable=True)  # JSON blob, optional
    source = Column(LEAD_SOURCE_ENUM, default="download", nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)


# ---------------------------------------------------------------------------
# PasswordResetToken  (FR-10 — single-use, 24h expiry, hashed token)
# ---------------------------------------------------------------------------

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(String(36), primary_key=True, default=_new_uuid)
    user_id = Column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)


# ---------------------------------------------------------------------------
# RefreshToken  (Option B: short-lived access + long-lived refresh tokens)
# ---------------------------------------------------------------------------

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String(36), primary_key=True, default=_new_uuid)
    user_id = Column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    user = relationship("User")
