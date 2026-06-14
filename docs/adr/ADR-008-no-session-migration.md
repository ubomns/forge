# ADR-008: No Migration of Anonymous Session Plans on Signup

**Date:** 2026-06-11
**Status:** Proposed

## Context

When an anonymous user generates a plan and then signs up for a free account, we must decide whether to automatically migrate their current session plan into their new account.

## Decision

**Do not migrate anonymous session plans on signup.**

- User signs up with email + password or Google OAuth
- A new user record is created; a JWT cookie is issued
- The current plan remains in `sessionStorage` only
- User must explicitly click "Save plan" to persist it to their new account
- This is a deliberate v1 simplification; migration can be added later if user feedback demands it

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| Auto-migrate current plan on signup | Seamless UX; user doesn't lose work | Adds complexity to signup flow; plan may be incomplete or unwanted; increases DB write on signup |
| Prompt user: "Save current plan to account?" | User choice; clear value prop | Adds UI step to signup flow; more code |
| No migration (chosen) | Simplest implementation; no surprise DB writes; aligns with PRD assumption A10 | User may lose plan if they don't explicitly save; requires clear "Save plan" CTA |

## Consequences

**Positive:**
- Signup flow is fast and simple (no plan serialization, validation, or DB write)
- No risk of saving incomplete or test plans to a new account
- Clear mental model: `sessionStorage` = temporary; "Save" = persistent

**Negative:**
- Some users may expect their plan to auto-save and be frustrated
- Need prominent "Save this plan" CTA immediately after signup
- May require revisiting if feedback shows it's a real pain point

## Requirement traceability

- M2: Free account creation
- PRD Q6: Session-to-account migration resolved as "no"
- PRD A10: SessionStorage plans can be lost when user creates an account
- US-F2.4: On successful signup, user is logged in and any plan in current session is auto-saved — **OVERRIDDEN by this ADR.** The PRD AC says auto-save, but we defer it to v1.1 to reduce signup friction. If this ADR is rejected, implement auto-save in `api/routers/auth.py` signup handler.

## Note on PRD Conflict

The PRD acceptance criterion AC-F2.4 states: "On successful signup, user is logged in, a user record is created in the DB, and any plan in the current session is auto-saved to their account."

This ADR explicitly overrides AC-F2.4 for v1 to reduce engineering risk. The override is flagged here for product manager review. If the product manager insists on auto-save, the implementation is:

1. Frontend sends `current_plan` in signup request body
2. `api/routers/auth.py` signup handler validates the plan with `BusinessPlan.model_validate()`
3. Inserts user + plan in a single DB transaction
4. Returns user with plan count

This adds ~1 day of work and is not blocked by any other Phase 1 task.
