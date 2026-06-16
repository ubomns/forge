"""
Database engine, session factory, and dependency for FastAPI.

Connection string read from DATABASE_URL env var.
  - Dev default:  sqlite:///./forge.db
  - Production:   postgresql+psycopg2://...  (with sslmode=require)

Supports both SQLite (dev/test) and PostgreSQL (staging/prod) per ADR-002.
"""

from __future__ import annotations

import os
from typing import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker, DeclarativeBase

DATABASE_URL: str = os.environ.get(
    "DATABASE_URL",
    "sqlite:///./forge.db",
)

_is_sqlite: bool = DATABASE_URL.startswith("sqlite")

# SQLite needs check_same_thread=False for FastAPI's async thread usage.
# PostgreSQL uses connection pooling defaults.
_connect_args: dict = {"check_same_thread": False} if _is_sqlite else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=_connect_args,
    echo=False,
    pool_pre_ping=True,
)

# Enable WAL mode and foreign key enforcement for SQLite.
if _is_sqlite:
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_conn, connection_record):  # type: ignore[no-untyped-def]
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""
    pass


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a DB session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables (dev/SQLite bootstrap).

    Production uses Alembic migrations (ADR-002); this create_all path is for
    local dev and tests where running migrations is unnecessary. Importing the
    models module registers every table on Base.metadata before create_all.
    """
    from api import models  # noqa: F401 — register models on Base.metadata

    Base.metadata.create_all(bind=engine)
