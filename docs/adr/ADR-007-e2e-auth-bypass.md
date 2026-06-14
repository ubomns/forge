# ADR-007: Dev-Only e2e Auth Bypass

**Date:** 2026-06-11
**Status:** Proposed

## Context

The pivot introduces auth gates (email capture before download, login required for "My plans") that will break existing e2e tests. We need a testing strategy that:
1. Allows existing tests to run without modification (or minimal modification)
2. Enables testing of auth flows themselves
3. Does not introduce security holes in production
4. Works in CI (GitHub Actions or equivalent)

## Decision

Implement a **dev-only auth bypass** via `X-Test-Auth: bypass` header.

- FastAPI `get_current_user` dependency checks for `X-Test-Auth: bypass` header **only when `ENVIRONMENT=test` or `ENVIRONMENT=development`**
- When bypass is active, `get_current_user` returns a mock user with `tier = "pro"` and a fixed UUID
- This allows e2e tests to call authenticated endpoints without real login
- Playwright tests can set the header via `page.setExtraHTTPHeaders()` or route interception
- In production (`ENVIRONMENT=production`), the header is ignored
- A separate suite of real-auth tests exercises the actual signup/login flow

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| Create real test user in CI | Tests real auth flow | Slower (requires signup on every run); may hit rate limits; needs cleanup |
| Mock auth service | Fast; isolated | Does not test integration with real JWT/cookie logic |
| Seed DB with test user + known password | Tests real login | Requires DB seeding step; password in CI secrets |
| Dev-only bypass header (chosen) | Fast; tests real middleware; no DB seeding; secure in prod | Slightly unrealistic (bypasses password check); need separate real-auth tests |

## Consequences

**Positive:**
- Existing e2e tests continue to work with minimal changes
- FastAPI middleware and route handlers are still exercised (bypass happens at auth dependency level)
- Zero production security impact (header ignored in prod)
- CI runs are fast (no real login latency)

**Negative:**
- Bypass tests do not catch auth-specific bugs (e.g., password validation, JWT expiry)
- Need a second test suite for real auth flows
- Developers must remember that bypassed auth is not real auth

## Requirement traceability

- NFR-9: e2e tests can bypass auth gates via dev-only header
- PRD Q8: Dev auth resolved as `X-Test-Auth: bypass`
- PRD A9: Existing e2e tests can be updated to handle auth gates
