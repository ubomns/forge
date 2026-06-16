# ADR-002: SQLite Dev / PostgreSQL Prod with SQLAlchemy + Alembic

**Date:** 2026-06-11
**Status:** Proposed

## Context

The pivot requires a database to store users, plans, subscriptions, and leads. We need:
1. Zero-setup local development (developers should run `npm run dev:all` and have a working system)
2. Production-grade reliability and concurrency
3. A migration path as the schema evolves across 4 phases
4. Minimal operational overhead for a small team

## Decision

Use **SQLAlchemy 2.x as the ORM** with **SQLite for development** and **PostgreSQL for production**.

- `api/database.py` creates the engine from `DATABASE_URL` env var
- Default dev URL: `sqlite:///./forge.db`
- Production URL: `postgresql+psycopg2://...`
- Alembic manages schema migrations
- All models use SQLAlchemy generic types (no PostgreSQL-only features in v1)
- `psycopg2-binary` added to `requirements.txt`

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| PostgreSQL for dev (Docker) | Dev/prod parity | Requires Docker; adds setup friction for new developers |
| SQLite for both dev and prod | Zero setup; single file | Not suitable for concurrent writes; no JSONB; no connection pooling |
| MongoDB / DynamoDB | Schema flexibility; horizontal scaling | Adds operational complexity; no mature migration tool; overkill for relational data |
| Prisma (TypeScript) | Great DX; type-safe | Ties ORM to Next.js; our data layer lives in FastAPI/Python |
| SQLAlchemy + SQLite/PostgreSQL (chosen) | Standard Python stack; supports both DBs; Alembic for migrations; minimal setup | Minor dev/prod parity risk (SQLite lacks some PostgreSQL features) |

## Consequences

**Positive:**
- New developers can run the app immediately without Docker or external services
- SQLAlchemy is the Python standard; extensive documentation and community
- Alembic provides versioned, reversible migrations
- PostgreSQL in production handles concurrency, JSONB (if needed later), and connection pooling

**Negative:**
- SQLite does not enforce all PostgreSQL constraints identically; some edge cases may only surface in production
- JSON fields stored as `JSON` (SQLAlchemy generic) work in both, but PostgreSQL `JSONB` indexing is unavailable
- Need to test migrations against PostgreSQL in CI (not just SQLite)

## Requirement traceability

- NFR-7: SQLite dev, PostgreSQL prod
- M9: Simple DB storing users, plans, subscriptions
- QA-M1: Maintainability via centralized schema
