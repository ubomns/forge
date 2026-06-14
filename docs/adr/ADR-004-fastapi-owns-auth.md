# ADR-004: FastAPI Owns Auth and Business Logic

**Date:** 2026-06-11
**Status:** Proposed

## Context

The pre-pivot architecture has FastAPI as the orchestration layer (OpenAI calls, schema validation, export generation) and Next.js as the UI + thin proxy. The pivot adds auth, persistence, payments, and tier enforcement.

We must decide where these new concerns live:
1. Next.js (using NextAuth.js or custom auth)
2. FastAPI (extending the existing orchestration layer)
3. Split (auth in Next.js, business logic in FastAPI)

## Decision

**FastAPI owns all auth, persistence, payment, and tier enforcement logic.** Next.js remains a UI layer and thin proxy.

- Auth endpoints: `api/routers/auth.py` (signup, login, OAuth, password reset)
- Plan endpoints: `api/routers/plans.py` (CRUD, limits)
- Subscription endpoints: `api/routers/subscriptions.py` (checkout, portal, status)
- Webhook endpoints: `api/routers/webhooks.py` (Stripe events)
- Next.js `pages/api/*.ts` (or rewrites in dev) forward requests and cookies but contain zero business logic
- Tier checks happen in FastAPI, not in Next.js or the browser

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| NextAuth.js in Next.js | Mature OAuth; easy session management in React | Ties auth to Next.js; our orchestration is in FastAPI; duplicate user state across two runtimes |
| Split: Next.js auth + FastAPI business logic | Next.js handles OAuth UI; FastAPI handles data | Complex cookie sharing; two sources of truth for user state; harder to reason about |
| FastAPI owns everything (chosen) | Single source of truth; existing architecture preserved; security logic centralized; easy to test | Next.js needs proxy routes or rewrites; one extra network hop |

## Consequences

**Positive:**
- Security logic (password hashing, JWT validation, tier checks) lives in one place
- Existing FastAPI test patterns extend naturally
- No risk of Next.js and FastAPI having inconsistent user state
- Can swap Next.js for a different frontend later without touching auth

**Negative:**
- Every authenticated request goes Browser → Next.js → FastAPI (latency ~5-10ms on same host)
- Next.js cannot perform server-side rendering that depends on auth state without a prefetch call
- In production, must ensure Next.js proxy correctly forwards `Cookie` headers

## Requirement traceability

- M8: Lightweight auth system
- M10: Preserve existing two-process architecture
- NFR-2: JWT validation centralized
- QA-M3: Maintainability via single source of truth
