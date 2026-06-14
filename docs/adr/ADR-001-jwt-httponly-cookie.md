# ADR-001: JWT in httpOnly Cookie Session

**Date:** 2026-06-11
**Status:** Proposed

## Context

The SaaS pivot requires authentication for free accounts, Pro subscribers, and Team members. We need a session mechanism that:
1. Survives page refreshes
2. Is secure against XSS
3. Works seamlessly with the existing Next.js → FastAPI proxy architecture
4. Does not require complex token refresh logic for a v1 product

Two primary options were considered: JWT in `localStorage` (client-side) vs JWT in `httpOnly` cookie (server-side).

## Decision

Use **JWT stored in an httpOnly cookie** (`forge_session`).

- Cookie attributes: `HttpOnly`, `Secure` (production), `SameSite=Lax`, 7-day expiry
- JWT payload contains `sub` (user UUID), `email`, `tier`, `iat`, `exp`
- Signed with HS256 using a 256-bit secret from environment variable
- Next.js proxy routes forward the `Cookie` header to FastAPI on every request
- FastAPI `get_current_user` dependency decodes and verifies the JWT

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| JWT in `localStorage` | Easy to read auth state in React; no extra round-trip for user info | Vulnerable to XSS theft; requires `Authorization` header management on every fetch; CORS preflight on every request |
| Session ID in cookie + server-side session store (Redis) | Revocable sessions; no JWT secret rotation complexity | Adds Redis infrastructure; more complex for v1 |
| NextAuth.js | Full-featured; handles OAuth providers | Heavy abstraction; ties auth to Next.js; our orchestration lives in FastAPI |
| JWT in httpOnly cookie (chosen) | XSS-resistant; automatic browser transmission; aligns with FastAPI as source of truth | Requires `/api/auth/me` call for client-side auth state; cross-domain complexity if Next.js and FastAPI diverge |

## Consequences

**Positive:**
- XSS cannot steal the auth token via `document.cookie` (HttpOnly)
- Browser automatically sends cookie on every request to the domain
- FastAPI remains the source of truth for auth; Next.js is thin proxy
- No token refresh complexity for v1 (7-day expiry is acceptable)

**Negative:**
- Next.js cannot read JWT claims client-side; must call `/api/auth/me` to know if user is logged in
- If Next.js and FastAPI are on different domains in production, `SameSite` and CORS require careful configuration
- JWT secret rotation invalidates all active sessions immediately

## Requirement traceability

- NFR-2: JWT signed with HS256, stored in httpOnly cookie, 7-day expiry
- QA-S4: XSS cannot steal auth token
- FR-4: Auth system for free accounts
