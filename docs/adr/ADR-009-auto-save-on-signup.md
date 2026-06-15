# ADR-009: Auto-Save Session Plan on Signup

**Date:** 2026-06-15
**Status:** Accepted
**Supersedes:** ADR-008 (No Migration of Anonymous Session Plans on Signup)

## Context

ADR-008 deferred migrating the anonymous in-session plan into a new account on
signup, requiring the user to click an explicit "Save plan" CTA. At Gate G1 the
product owner re-decided this: when a visitor generates a plan and then signs up,
the in-session plan **must** be attached to the new account automatically. This
re-aligns the implementation with the original PRD acceptance criterion
**AC-F2.4** (PRD-saas-pivot), which ADR-008 had overridden, and removes a
known conversion-loss point (a user who generated value, signed up, then lost
their plan because they did not notice the Save CTA).

This decision is **locked at G1**. This ADR designs *how*, not *whether*.

## Decision

**Auto-save the current session plan into the new account during signup**, when
a plan is present and valid.

Mechanism (session plan handoff → persisted record):

1. **Handoff source.** The client already persists the completed plan in
   `sessionStorage` (anonymous session, per the existing `ForgeApp` state
   machine). On signup/OAuth the client reads that object and includes it in the
   auth request body as an optional `current_plan` field (shape:
   `{ plan_data: BusinessPlan, idea_description: string, title?: string }`).
2. **Server validation.** `api/routers/auth.py` signup / OAuth-callback handlers
   validate `current_plan.plan_data` with `BusinessPlan.model_validate()`. An
   invalid or absent plan is **non-fatal**: the account is still created; the
   plan is simply skipped (see error handling below).
3. **Atomic persistence.** User row + Plan row are inserted in a **single DB
   transaction**. Either both commit or neither does; signup never half-succeeds.
4. **Title derivation.** If `title` is omitted, derive it from
   `idea_description` (first ~60 chars) so the saved plan is identifiable in
   "My plans".
5. **Idempotency / double-submit.** If the same plan is submitted twice (e.g.
   retried OAuth callback), de-duplicate within the signup transaction window by
   `(user_id, idea_description, created_at within request)`; a returning user
   logging in (not signing up) never triggers auto-save.
6. **Limit interaction.** Auto-save counts as the user's **first** saved plan
   (1 of the free-tier 3-plan cap per ADR-005). Because a brand-new account has
   zero plans, auto-save can never exceed the cap, so no 403 path applies here.
7. **Client reconciliation.** After signup returns the persisted plan id, the
   client swaps its `sessionStorage` working copy for the server `plan_id` so a
   subsequent edit/save updates the same record rather than creating a duplicate.

The `current_plan` field is **optional** end-to-end: signup with no generated
plan (e.g. a user who came straight to `/pricing` then created an account) works
unchanged.

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| Keep ADR-008 (explicit Save only) | Simplest; no signup-path DB write | Re-litigated and rejected at G1; documented conversion loss; conflicts with AC-F2.4 |
| Auto-save on signup (chosen) | Seamless; honours AC-F2.4; removes work-loss drop-off | Adds plan validation + transactional write to signup; must handle invalid/absent plan gracefully |
| Prompt "Save current plan?" mid-signup | User choice | Adds a UI step to the signup flow the PM explicitly wanted frictionless; rejected at G1 |
| Server-side anonymous session store, claimed on signup | No client handoff payload | Requires anonymous persistence + a claim token = a whole new trust boundary; over-engineered for one plan |

## Consequences

**Positive:**
- Restores AC-F2.4; the generated plan survives the signup transition.
- Single transaction keeps user/plan consistency; no orphaned half-states.
- Optional field means the no-plan signup path is untouched.

**Negative:**
- Signup handlers now depend on the `BusinessPlan` schema and the DB session
  (small coupling; both already imported elsewhere in the API).
- A larger signup request body (the full plan JSON). Mitigation: enforce the
  existing request-size limit; the plan is already bounded by the 10-section
  schema.
- New trust-boundary surface: plan JSON now enters on an **unauthenticated**
  endpoint (signup). Mitigation: validate with Pydantic before persistence;
  never echo it back unsanitised; same STRIDE controls as `/api/plans`
  (see ARCHITECTURE §7.x).

## Requirement traceability

- AC-F2.4 (PRD-saas-pivot): "any plan in the current session is auto-saved to
  their account" — **now honoured** (was overridden by ADR-008).
- PRD-conversion-playbook §8.1 Q-P5 and §8.2 Q-P5: resolves the AC-F2.4 ↔
  ADR-008 conflict in favour of auto-save.
- Locked decision (task.md §2 #2, OVERRIDDEN 2026-06-11): persistence + accounts.
- QA-P1 / conversion: removes a work-loss drop-off at the highest-intent moment.
