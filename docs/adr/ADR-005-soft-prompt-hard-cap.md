# ADR-005: Soft UI Prompt + Hard API Cap for Tier Enforcement

**Date:** 2026-06-11
**Status:** Proposed

## Context

The free tier is limited to 3 saved plans (PRD resolved Q3). We need to enforce this limit in a way that:
1. Does not surprise or frustrate the user
2. Prevents abuse (API-level enforcement)
3. Is easy to maintain as tiers evolve

## Decision

Use a **two-layer enforcement**: soft UI prompt + hard API cap.

**Soft layer (UX):**
- When free user has 2 saved plans, show "approaching limit" indicator
- When free user hits 3 plans, show inline upgrade CTA on "My plans" and in `/app`
- CTA clearly lists Pro benefits and links to checkout

**Hard layer (API):**
- `POST /api/plans` checks `SELECT COUNT(*) FROM plans WHERE user_id = current_user.id`
- If count ≥ 3 and user tier is `free`, return HTTP 403 with error code `PLAN_LIMIT_REACHED`
- UI handles 403 by showing upgrade modal
- Pro/Team users bypass the count check entirely

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| Hard cap only (API rejects with no UI warning) | Simple to implement; no ambiguity | Poor UX; user surprised when save fails |
| Soft prompt only (UI warns but API allows) | Best UX; no friction | No enforcement; easy to abuse; undermines monetization |
| Soft + Hard (chosen) | User is warned before hitting limit; API guarantees enforcement | Slightly more complex; two places to maintain limit constant |

## Consequences

**Positive:**
- Users are not surprised by the limit
- API guarantees revenue protection
- Limit constant (3) is defined once in FastAPI; UI reads it from `/api/subscriptions/status` or a config endpoint

**Negative:**
- Two layers means two places to update if the limit changes
- Need to ensure UI prompt and API cap are synchronized (use shared config or API-driven UI)

## Requirement traceability

- M4: Pro tier after 3 saved plans
- FR-5: Free accounts limited to 3 plans
- US-P1: Upgrade prompt at plan limit
- PRD Q2: Plan limit enforcement resolved as soft + hard
