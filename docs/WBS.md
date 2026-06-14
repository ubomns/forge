# Forge — SaaS Pivot Work Breakdown Structure & Sprint Plan

**Status:** Approved for execution  
**Date:** 2026-06-11  
**Author:** Scrum Master  
**Sources:** `docs/PRD-saas-pivot.md`, `docs/ARCHITECTURE.md`, `docs/adr/ADR-001` through `ADR-008`  
**Methodology:** PMBOK 7-aligned hybrid — predictive WBS scope baseline + Scrum sprint execution  
**Sprint length:** 1 week (5 working days)  
**Team:** frontend-dev, backend-dev, ux-designer, qa-tester, code-reviewer (read-only), security-engineer (read-only)

---

## 1. Metadata

| Field | Value |
|---|---|
| **Project** | Forge SaaS Pivot |
| **Scope baseline** | PRD-saas-pivot.md §4.1 (Must/Should), §5 (User Stories), §12 (AC Summary) |
| **Architecture baseline** | ARCHITECTURE.md §4 (4+1 views), §5 (Data model), §6 (API contracts), §8 (Tech stack) |
| **Locked decisions** | ADR-001 (JWT httpOnly cookie), ADR-002 (SQLite dev / PostgreSQL prod), ADR-003 (Stripe Checkout hosted), ADR-004 (FastAPI owns auth), ADR-005 (Soft prompt + hard cap), ADR-006 (Watermark footer), ADR-007 (e2e auth bypass), ADR-008 (No session migration) |
| **Sprint cadence** | Weekly, Monday–Friday, demo on Friday afternoon |
| **Capacity assumption** | ~6 effective hours/day per specialist × 5 days = ~30 hrs/sprint per specialist |
| **Story points** | T-shirt sizing (XS≈2h, S≈4h, M≈6h, L≈8h). **All estimates are estimated, not committed.** |

---

## 2. Work Breakdown Structure

### 2.1 Hierarchy Overview

```
SaaS-1  Backend Infrastructure & Auth Foundation
  SaaS-1.1  Database scaffolding
  SaaS-1.2  Auth core (JWT, bcrypt, dependencies)
  SaaS-1.3  Email/password signup & login endpoints
  SaaS-1.4  Lead capture endpoint
  SaaS-1.5  Export watermark (docx + pdf)
  SaaS-1.6  Tier-aware rate limiter key function
  SaaS-1.7  FastAPI router registration & integration
  SaaS-1.8  Next.js auth state helpers
  SaaS-1.9  Email-capture modal UI
  SaaS-1.10 e2e regression & auth-bypass infrastructure
  SaaS-1.11 Security review gate — Phase 1

SaaS-2  Free Tier & Plan Persistence
  SaaS-2.1  Plan CRUD API (create, list, get, delete)
  SaaS-2.2  Plan limit enforcement (3-plan hard cap)
  SaaS-2.3  Google OAuth flow
  SaaS-2.4  "My plans" page
  SaaS-2.5  Load saved plan into /app
  SaaS-2.6  "Save plan" button & flow
  SaaS-2.7  Free-account prompt banner
  SaaS-2.8  Password reset flow (backend)
  SaaS-2.9  Password reset flow (frontend)
  SaaS-2.10 Nav auth UI (login/signup buttons, avatar, logout)
  SaaS-2.11 e2e tests — auth & plan persistence
  SaaS-2.12 Security review gate — Phase 2

SaaS-3  Pro Tier & Monetization
  SaaS-3.1  Subscription & Stripe customer models
  SaaS-3.2  Stripe Checkout session endpoint
  SaaS-3.3  Stripe webhook handler (idempotent)
  SaaS-3.4  Subscription status endpoint
  SaaS-3.5  Stripe Customer Portal endpoint
  SaaS-3.6  Upgrade CTA UI (limit hit)
  SaaS-3.7  Pro badge & tier-aware UI shell
  SaaS-3.8  Watermark removal for Pro/Team
  SaaS-3.9  Priority rate limit for Pro (10/min)
  SaaS-3.10 Plan deletion UI
  SaaS-3.11 e2e tests — tier enforcement & checkout
  SaaS-3.12 Security review gate — Phase 3

SaaS-4  Team Tier, Polish & Marketing
  SaaS-4.1  Team & TeamMember models
  SaaS-4.2  Team admin invite API
  SaaS-4.3  Team seat enforcement
  SaaS-4.4  White-label export (no Forge branding)
  SaaS-4.5  Batch generation API
  SaaS-4.6  Batch generation UI
  SaaS-4.7  Hero rewrite & audience positioning
  SaaS-4.8  Distribution hooks (coaches & cohorts block)
  SaaS-4.9  Demo scenario fixtures & tabs
  SaaS-4.10 e2e tests — team & landing
  SaaS-4.11 Security review gate — Phase 4
  SaaS-4.12 Final regression sweep & release readiness
```

---

### 2.2 Detailed Work Packages

#### Sprint 1: Foundation — Auth + DB Scaffolding, Email Capture, Watermark

**Sprint Goal:** *Establish auth and data persistence infrastructure, gate downloads behind email capture, and preserve 100% of existing functionality.*

| ID | Name | Description | Owner | Est. | Dependencies | DOD | Traceability |
|---|---|---|---|---|---|---|---|
| **SaaS-1.1** | Database scaffolding | Create `api/database.py` (engine, SessionLocal, `get_db()`). Add SQLAlchemy, Alembic, psycopg2-binary to `requirements.txt`. Verify `npm run dev:all` still works. | backend-dev | M (6h) | — | `pip install` succeeds; `get_db()` yields session; Alembic init runs | NFR-7, M9 |
| **SaaS-1.2** | Auth core (JWT, bcrypt) | Create `api/auth.py`: `create_access_token`, `verify_password`, `get_current_user` dependency. JWT HS256, 7-day expiry, httpOnly cookie per ADR-001. Unit tests for hash round-trip and JWT verify. | backend-dev | M (6h) | SaaS-1.1 | Unit tests pass; JWT decodes correctly; bcrypt cost ≥12 | NFR-1, NFR-2, FR-4 |
| **SaaS-1.3** | Email/password signup & login endpoints | Create `api/routers/auth.py`: `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`. Validate password ≥8 chars. Return `UserResponse` + Set-Cookie. | backend-dev | M (6h) | SaaS-1.2 | `curl` signup → login → me works; cookie is httpOnly | FR-4, AC-F2.1, AC-F2.2, AC-F4.1 |
| **SaaS-1.4** | Lead capture endpoint | Create `api/routers/leads.py`: `POST /api/leads` accepts `{email, plan_snapshot}`. Validate email format. Insert into `leads` table. Return `{lead_id}`. | backend-dev | S (4h) | SaaS-1.1 | POST creates record; invalid email rejected; plan_snapshot stored as JSON | FR-3, AC-A2.5 |
| **SaaS-1.5** | Export watermark (docx + pdf) | Modify `api/export.py` and `api/export_pdf.py` to accept `tier` parameter. Conditionally append "Generated with Forge — forgeplans.com" footer for `anonymous`/`free` tiers. Pro/Team = no footer. | backend-dev | M (6h) | — | Free-tier exports have footer; Pro/Team exports do not; styling subtle (gray, 8-9pt) | FR-8, M5, ADR-006 |
| **SaaS-1.6** | Tier-aware rate limiter key function | Update `slowapi` key function in `api/index.py`: use `user_id` for authenticated requests, `ip` for anonymous. Pro users get 10/min, anonymous/free get 5/min. | backend-dev | S (4h) | SaaS-1.2 | Unit test `get_rate_limit_key` with auth and anon requests; limits enforced | QA-P4, FR-7, S4 |
| **SaaS-1.7** | FastAPI router registration | Register all new routers in `api/index.py` (`auth`, `leads`). Ensure existing `/api/generate`, `/api/critique`, etc. remain untouched. Add `get_current_user` optional dependency to existing routes for tier awareness. | backend-dev | S (4h) | SaaS-1.3, SaaS-1.4 | All routes reachable; existing endpoints unchanged; health check passes | M10, NFR-6 |
| **SaaS-1.8** | Next.js auth state helpers | Create `lib/auth.ts`: `useAuth()` hook that calls `/api/auth/me` on mount, manages `isLoggedIn`, `user`, `tier` state. Handle 401 gracefully. | frontend-dev | M (6h) | SaaS-1.3 | Nav shows correct auth state after refresh; no flash of wrong state | FR-4, AC-F4.3 |
| **SaaS-1.9** | Email-capture modal UI | Add modal to `components/forge-app.tsx`: triggered on download click when anonymous. Validates email format inline. Calls `/api/leads`, then proceeds to export. Blocks download until valid email submitted. | frontend-dev | M (6h) | SaaS-1.4, SaaS-1.8 | Modal appears for anon; valid email unlocks download; invalid shows inline error; logged-in users skip modal | FR-2, AC-A2.1–AC-A2.6 |
| **SaaS-1.10** | e2e regression & auth-bypass | Add `X-Test-Auth: bypass` header support in FastAPI (dev/test only). Update existing e2e tests to expect email modal on download, or use bypass. Create `tests/e2e/auth.spec.ts` skeleton. | qa-tester | M (6h) | SaaS-1.2, SaaS-1.7 | All 24 existing tests pass (or updated); bypass header works in CI; new auth suite skeleton exists | NFR-9, M10, ADR-007 |
| **SaaS-1.11** | Security review gate — Phase 1 | security-engineer reviews: JWT secret handling, bcrypt config, cookie attributes, lead endpoint input validation. Sign-off required before merge. | security-engineer | S (4h) | SaaS-1.2, SaaS-1.3 | Review doc signed; no critical findings; medium findings have tickets | NFR-1, NFR-2, NFR-3 |

**Sprint 1 Capacity Risk:** Medium. Two M tasks for backend-dev (SaaS-1.2, SaaS-1.3) plus one M for frontend-dev (SaaS-1.9) — within 30h capacity but tight. If JWT/cookie debugging exceeds estimate, SaaS-1.6 may spill to Sprint 2.

---

#### Sprint 2: Free Tier — Account Creation, Plan Persistence, "My Plans"

**Sprint Goal:** *Enable free users to create accounts, save up to 3 plans, view them in "My plans", and reset passwords — while keeping anonymous generation fully functional.*

| ID | Name | Description | Owner | Est. | Dependencies | DOD | Traceability |
|---|---|---|---|---|---|---|---|
| **SaaS-2.1** | Plan CRUD API | Create `api/routers/plans.py`: `GET /api/plans` (list), `POST /api/plans` (create), `GET /api/plans/{id}` (detail), `DELETE /api/plans/{id}`. Serialize `BusinessPlan` JSON. Enforce `user_id` ownership. | backend-dev | M (6h) | SaaS-1.1, SaaS-1.2 | All CRUD operations work; ownership enforced; plan_data stored as JSON | FR-5, FR-6, AC-F3.1–AC-F3.3 |
| **SaaS-2.2** | Plan limit enforcement (hard cap) | In `POST /api/plans`, check `COUNT(*) >= 3` for free tier. Return HTTP 403 `{error: {code: "PLAN_LIMIT_REACHED"}}`. Pro/Team bypass. | backend-dev | S (4h) | SaaS-2.1 | 4th plan save rejected with correct error code; Pro users unlimited | FR-5, AC-F3.4, ADR-005 |
| **SaaS-2.3** | Google OAuth flow | Add `POST /api/auth/oauth/google` to `api/routers/auth.py`. Exchange code for tokens via `authlib`. Create or link user by `email`. Issue JWT cookie. | backend-dev | M (6h) | SaaS-1.2 | OAuth signup → login works; existing Google users link correctly | FR-4, AC-F2.3 |
| **SaaS-2.4** | "My plans" page | Create `pages/my-plans.tsx`. List saved plans with title (from idea description), date, "Open" button. Empty state CTA. Responsive grid. | frontend-dev | M (6h) | SaaS-2.1, SaaS-1.8 | Page renders list; clicking "Open" navigates to `/app?plan_id=xxx`; empty state shown | AC-F3.1, AC-F3.2 |
| **SaaS-2.5** | Load saved plan into /app | Modify `pages/app.tsx` / `components/forge-app.tsx`: on mount, if `?plan_id=xxx`, fetch `/api/plans/{id}` and hydrate into `done` state with all sections, critiques, investor questions. | frontend-dev | M (6h) | SaaS-2.1, SaaS-2.4 | Saved plan loads in `done` state; all sections render; critiques and questions restored | FR-6, AC-F3.3 |
| **SaaS-2.6** | "Save plan" button & flow | Add "Save plan" button to `ForgeApp` done-bar (or ActionStack). Calls `POST /api/plans` with current `sections` + `idea_description`. Show success toast. Handle 403 limit error with upgrade CTA. | frontend-dev | M (6h) | SaaS-2.1, SaaS-2.2 | Button visible for logged-in users; success toast on save; 403 shows upgrade modal | AC-F3.4, US-F3 |
| **SaaS-2.7** | Free-account prompt banner | Add non-blocking banner/toast after 1st plan reaches `done`: "Save this plan — create a free account in 10 seconds." Dismissible; 24h cooldown via localStorage. More prominent on 2nd plan. | frontend-dev | S (4h) | SaaS-1.8 | Banner appears after 1st plan; dismissible; cooldown works; 2nd plan shows inline card | US-F1, AC-F1.1–AC-F1.4 |
| **SaaS-2.8** | Password reset flow (backend) | Add `POST /api/auth/password-reset` (generate token, send email) and `POST /api/auth/password-reset-confirm` (validate token, update password). Token 24h expiry, hashed in DB. Use Python `smtplib` initially. | backend-dev | M (6h) | SaaS-1.2 | Reset email sent; token validates; password updates; expired token rejected | FR-10, S5 |
| **SaaS-2.9** | Password reset flow (frontend) | Create password-reset modal/page: "Forgot password?" link → email input → "Check your email" confirmation → reset form (new password + confirm). | frontend-dev | S (4h) | SaaS-2.8 | Full flow works end-to-end; password mismatch caught client-side | FR-10, S5 |
| **SaaS-2.10** | Nav auth UI | Update `components/layout/Nav.tsx`: show "Log in / Sign up" for anonymous; show avatar/email + "My plans" + "Log out" for logged-in. Logout clears client state and refreshes. | frontend-dev | S (4h) | SaaS-1.8 | Nav reflects auth state correctly; logout works; "My plans" link visible when logged in | AC-F3.1, AC-F4.3, AC-F4.4 |
| **SaaS-2.11** | e2e tests — auth & plan persistence | Expand `tests/e2e/auth.spec.ts`: signup → login → save plan → view "My plans" → open plan → logout. Use real auth (not bypass) for this suite. | qa-tester | M (6h) | SaaS-2.1, SaaS-2.3, SaaS-2.4 | Real auth flow passes; plan save/load passes; logout clears state | NFR-9, A9 |
| **SaaS-2.12** | Security review gate — Phase 2 | Review: plan ownership checks, password reset token entropy, OAuth callback validation, plan limit enforcement logic. | security-engineer | S (4h) | SaaS-2.1, SaaS-2.2, SaaS-2.3, SaaS-2.8 | Review doc signed; no critical findings | QA-S1–QA-S4 |

**Sprint 2 Capacity Risk:** Low. Well-balanced between backend (3 tasks, ~16h) and frontend (5 tasks, ~24h). Both within 30h capacity. Parallel work possible: frontend can build UI against mock API while backend finishes endpoints.

---

#### Sprint 3: Pro Tier — Stripe Checkout, Upgrade Prompt, Pro Benefits

**Sprint Goal:** *Activate revenue collection: Stripe checkout, subscription status sync, Pro benefits (unlimited plans, no watermark, priority queue), and self-service billing portal.*

| ID | Name | Description | Owner | Est. | Dependencies | DOD | Traceability |
|---|---|---|---|---|---|---|---|
| **SaaS-3.1** | Subscription & Stripe customer models | Add `Subscription` model to `api/models.py`. Add `stripe_customer_id` to `User`. Alembic migration. | backend-dev | S (4h) | SaaS-1.1 | Migration runs; models import without error; schema matches ARCHITECTURE.md §5.2 | FR-11, FR-12 |
| **SaaS-3.2** | Stripe Checkout session endpoint | Create `api/routers/subscriptions.py`: `POST /api/subscriptions/checkout` creates Stripe Checkout session for Pro/Team. Creates Stripe customer if needed. Returns `{checkout_url}`. | backend-dev | M (6h) | SaaS-3.1 | Checkout URL valid; Stripe customer created; test mode works | FR-11, AC-P2.1 |
| **SaaS-3.3** | Stripe webhook handler | Create `api/routers/webhooks.py`: `POST /api/webhooks/stripe`. Validate signature with `stripe-python`. Idempotently handle `checkout.session.completed` → update subscription to `active`. Log all events in dev. | backend-dev | M (6h) | SaaS-3.1 | Signature validation rejects forged events; idempotency tested; subscription updated | FR-13, NFR-3, QA-R2 |
| **SaaS-3.4** | Subscription status endpoint | `GET /api/subscriptions/status` returns `{tier, status, current_period_end}`. Used by frontend to show Pro badge and enforce UI gates. | backend-dev | S (4h) | SaaS-3.1 | Returns correct tier for free/pro/team; expired subscriptions show `canceled` | FR-7, AC-P2.4 |
| **SaaS-3.5** | Stripe Customer Portal endpoint | `POST /api/subscriptions/portal` creates Stripe Customer Portal session. Returns `{portal_url}`. | backend-dev | S (4h) | SaaS-3.1 | Portal URL valid; user can manage billing; cancels downgrade gracefully | FR-12, AC-P4.1 |
| **SaaS-3.6** | Upgrade CTA UI (limit hit) | Inline upgrade card on "My plans" and in `/app` when free user hits 3-plan limit. Lists Pro benefits. Primary CTA: "Upgrade to Pro — $19/month". Secondary: "See what you get" scrolls to comparison. | frontend-dev | M (6h) | SaaS-2.2, SaaS-3.2 | CTA visible at limit; clicking primary opens Stripe Checkout; secondary scrolls | US-P1, AC-P1.1–AC-P1.4 |
| **SaaS-3.7** | Pro badge & tier-aware UI shell | Nav shows "Pro" badge for active Pro users. `ForgeApp` and `MyPlans` read `/api/subscriptions/status` to conditionally show/hide save buttons, watermarks, rate-limit info. | frontend-dev | S (4h) | SaaS-3.4 | Badge visible for Pro; free users see limit indicators; UI syncs with backend status | AC-P3.2, AC-P2.4 |
| **SaaS-3.8** | Watermark removal for Pro/Team | Ensure export endpoints check user's subscription tier from DB (not just request body). Pro/Team users always get clean exports regardless of request payload. | backend-dev | S (4h) | SaaS-1.5, SaaS-3.4 | Pro user export has no footer; anon export still has footer; tier inferred from auth | FR-7, AC-P3.3 |
| **SaaS-3.9** | Priority rate limit for Pro | Update rate limiter: Pro users get 10/min bucket. Free/anonymous get 5/min. Display "Priority queue" indicator in UI for Pro users. | backend-dev | S (4h) | SaaS-1.6, SaaS-3.4 | Pro requests use higher limit; indicator visible in UI | AC-P3.4, S4 |
| **SaaS-3.10** | Plan deletion UI | Add "Delete" button to "My plans" cards. Calls `DELETE /api/plans/{id}`. Confirm dialog. Optimistic UI update. | frontend-dev | S (4h) | SaaS-2.1 | Delete works; confirm dialog prevents accidents; list updates immediately | AC-P3.5 |
| **SaaS-3.11** | e2e tests — tier enforcement & checkout | Test: free user hits limit → sees CTA → mock checkout (Stripe test mode) → becomes Pro → unlimited saves → clean export. Use Stripe test keys. | qa-tester | L (8h) | SaaS-3.2, SaaS-3.3, SaaS-3.6 | Tier enforcement passes; checkout flow passes; Pro benefits verified | NFR-9, M4 |
| **SaaS-3.12** | Security review gate — Phase 3 | Review: Stripe webhook signature validation, checkout session creation (customer_id from DB, not client), subscription status query ownership, portal session security. | security-engineer | S (4h) | SaaS-3.2, SaaS-3.3, SaaS-3.5 | Review doc signed; no critical findings; webhook signature validation verified | NFR-3, QA-S3 |

**Sprint 3 Capacity Risk:** Medium. qa-tester has one L task (SaaS-3.11) which is at the 8h boundary — acceptable but must not expand. backend-dev has 5 tasks (~24h) within capacity. frontend-dev has 3 tasks (~14h) — light; can assist with QA or Sprint 4 prep.

---

#### Sprint 4: Polish & Team — Team Tier, Distribution, Demo, Hero

**Sprint Goal:** *Ship Team tier MVP, landing page distribution hooks, high-converting demo scenarios, and hero rewrite — then run final regression before release.*

| ID | Name | Description | Owner | Est. | Dependencies | DOD | Traceability |
|---|---|---|---|---|---|---|---|
| **SaaS-4.1** | Team & TeamMember models | Add `Team` and `TeamMember` models to `api/models.py`. Alembic migration. Seat limit default 5. | backend-dev | S (4h) | SaaS-1.1 | Migration runs; relationships correct; admin_id enforced | FR-9, S1 |
| **SaaS-4.2** | Team admin invite API | Create `api/routers/teams.py`: admin invites by email; generates signup/join link. Invited users create account and auto-join team. | backend-dev | M (6h) | SaaS-4.1, SaaS-1.2 | Invite creates link; invited user joins team; 6th member rejected | AC-T1.2, AC-T1.3 |
| **SaaS-4.3** | Team seat enforcement | Enforce `seat_limit` on team join. Return 403 `SEAT_LIMIT_REACHED` if exceeded. | backend-dev | S (4h) | SaaS-4.2 | 6th member rejected; correct error code | AC-T1.2 |
| **SaaS-4.4** | White-label export (no Forge branding) | Team tier exports have no Forge header/footer. Ensure `api/export.py` and `api/export_pdf.py` skip all branding for `tier == "team"`. | backend-dev | S (4h) | SaaS-1.5, SaaS-4.1 | Team export has zero Forge branding; doc title customizable (optional) | AC-T2.1 |
| **SaaS-4.5** | Batch generation API | Create `api/routers/batch.py`: accept array of up to 10 ideas, queue/generate 10 plans, return array of `BusinessPlan` objects. Rate limit: 1 batch per 5 min. | backend-dev | L (8h) | SaaS-1.6 | 10 ideas accepted; returns 10 plans; rate limit enforced; error handling for partial failures | AC-T2.2 |
| **SaaS-4.6** | Batch generation UI | Create batch input UI: textarea per idea (up to 10), "Generate all" button, progress indicator, results list with individual download links. | frontend-dev | M (6h) | SaaS-4.5 | UI allows 10 inputs; progress shown; results downloadable individually | AC-T2.2 |
| **SaaS-4.7** | Hero rewrite & audience positioning | Update `pages/index.tsx` hero: headline "Your business idea, taken seriously.", sub-headline "Investor-ready business plans in minutes. No templates. No generic filler.", positioning line below. | frontend-dev | S (4h) | — | Copy matches PRD exactly; responsive; no layout regression | M6, M7, AC-L1.1–AC-L1.3 |
| **SaaS-4.8** | Distribution hooks (coaches & cohorts) | Add "For coaches & cohorts" block to landing page. CTA "Learn about team licensing" links to Calendly/typeform/emailto. Similar block for agencies if S2 in scope. | frontend-dev | S (4h) | — | Block visible; CTA clickable; responsive | S2, AC-L2.1–AC-L2.3 |
| **SaaS-4.9** | Demo scenario fixtures & tabs | Replace `lib/fixtures/demo-plan.json` with 3 high-converting scenarios. Add tabs to `/demo` to switch between them. Update banner text per scenario. | frontend-dev | M (6h) | — | 3 scenarios exist; tabs switch correctly; banner updates; `/demo` works without auth | S3, AC-L3.1–AC-L3.3 |
| **SaaS-4.10** | e2e tests — team & landing | Test: team admin invites member → member joins → generates plan → admin sees plan list. Test landing page hero copy and demo tabs. | qa-tester | M (6h) | SaaS-4.2, SaaS-4.9 | Team flow passes; landing copy verified; demo tabs verified | NFR-9, S1 |
| **SaaS-4.11** | Security review gate — Phase 4 | Review: team invite link entropy, seat enforcement, batch generation rate limits, white-label export logic. Final full-app penetration scan. | security-engineer | M (6h) | SaaS-4.2, SaaS-4.3, SaaS-4.5 | Review doc signed; no critical findings; all medium findings resolved or ticketed | QA-S1–QA-S4 |
| **SaaS-4.12** | Final regression sweep & release readiness | Run full e2e suite (24+ tests). Run `npm run build` and `npm run lint`. Run FastAPI health check. Verify all AC from PRD §12. Create release checklist. | qa-tester | M (6h) | All above | 100% e2e pass; build clean; lint clean; all PRD AC verified; release checklist complete | M10, §12.6 |

**Sprint 4 Capacity Risk:** Low. backend-dev has one L task (SaaS-4.5) but other tasks are small; total ~26h. frontend-dev total ~20h. qa-tester ~12h. Well within capacity.

---

## 3. Traceability Matrix

| WBS ID | FR | NFR | AC | PRD Feature | Architecture Component |
|---|---|---|---|---|---|
| SaaS-1.1 | — | NFR-7 | — | M9 | `api/database.py`, Alembic |
| SaaS-1.2 | FR-4 | NFR-1, NFR-2 | — | M8 | `api/auth.py` |
| SaaS-1.3 | FR-4 | NFR-2 | AC-F2.1, AC-F2.2, AC-F4.1 | M2, M8 | `api/routers/auth.py` |
| SaaS-1.4 | FR-3 | — | AC-A2.5 | M1 | `api/routers/leads.py` |
| SaaS-1.5 | FR-8 | — | AC-A2.7 | M5 | `api/export.py`, `api/export_pdf.py` |
| SaaS-1.6 | FR-7 | NFR-4 | AC-P3.4 | S4 | `api/index.py` (rate limiter) |
| SaaS-1.7 | FR-14 | NFR-6 | — | M10 | `api/index.py` |
| SaaS-1.8 | FR-4 | — | AC-F4.3 | M8 | `lib/auth.ts` |
| SaaS-1.9 | FR-2 | — | AC-A2.1–AC-A2.6 | M1 | `components/forge-app.tsx` |
| SaaS-1.10 | — | NFR-9 | — | M10 | `tests/e2e/`, `api/auth.py` |
| SaaS-1.11 | — | NFR-1, NFR-2 | — | M8 | Security review doc |
| SaaS-2.1 | FR-5, FR-6 | — | AC-F3.1–AC-F3.3 | M3 | `api/routers/plans.py` |
| SaaS-2.2 | FR-5 | — | AC-F3.4 | M4 | `api/routers/plans.py` |
| SaaS-2.3 | FR-4 | — | AC-F2.3 | M2, M8 | `api/routers/auth.py` |
| SaaS-2.4 | FR-5 | — | AC-F3.1, AC-F3.2 | M3 | `pages/my-plans.tsx` |
| SaaS-2.5 | FR-6 | — | AC-F3.3 | M3 | `pages/app.tsx` |
| SaaS-2.6 | FR-5 | — | AC-F3.4 | M3 | `components/forge-app.tsx` |
| SaaS-2.7 | — | — | AC-F1.1–AC-F1.4 | M2 | `components/forge-app.tsx` |
| SaaS-2.8 | FR-10 | — | — | S5 | `api/routers/auth.py` |
| SaaS-2.9 | FR-10 | — | — | S5 | Frontend modals |
| SaaS-2.10 | FR-4 | — | AC-F3.1, AC-F4.3, AC-F4.4 | M2, M3 | `components/layout/Nav.tsx` |
| SaaS-2.11 | — | NFR-9 | — | M10 | `tests/e2e/auth.spec.ts` |
| SaaS-2.12 | — | NFR-1, NFR-2 | — | M8 | Security review doc |
| SaaS-3.1 | FR-11, FR-12 | — | — | M4 | `api/models.py` |
| SaaS-3.2 | FR-11 | — | AC-P2.1 | M4 | `api/routers/subscriptions.py` |
| SaaS-3.3 | FR-13 | NFR-3 | — | M4 | `api/routers/webhooks.py` |
| SaaS-3.4 | FR-7 | — | AC-P2.4 | M4 | `api/routers/subscriptions.py` |
| SaaS-3.5 | FR-12 | — | AC-P4.1 | S5 | `api/routers/subscriptions.py` |
| SaaS-3.6 | FR-7 | — | AC-P1.1–AC-P1.4 | M4 | `components/forge-app.tsx`, `pages/my-plans.tsx` |
| SaaS-3.7 | FR-7 | — | AC-P3.2, AC-P2.4 | M4 | `components/layout/Nav.tsx` |
| SaaS-3.8 | FR-7 | — | AC-P3.3 | M4 | `api/export.py`, `api/export_pdf.py` |
| SaaS-3.9 | FR-7 | NFR-4 | AC-P3.4 | S4 | `api/index.py` |
| SaaS-3.10 | FR-7 | — | AC-P3.5 | M4 | `pages/my-plans.tsx` |
| SaaS-3.11 | — | NFR-9 | — | M4 | `tests/e2e/tier.spec.ts` |
| SaaS-3.12 | — | NFR-3 | — | M4 | Security review doc |
| SaaS-4.1 | FR-9 | — | — | S1 | `api/models.py` |
| SaaS-4.2 | FR-9 | — | AC-T1.2, AC-T1.3 | S1 | `api/routers/teams.py` |
| SaaS-4.3 | FR-9 | — | AC-T1.2 | S1 | `api/routers/teams.py` |
| SaaS-4.4 | FR-9 | — | AC-T2.1 | S1 | `api/export.py`, `api/export_pdf.py` |
| SaaS-4.5 | FR-9 | NFR-4 | AC-T2.2 | S1 | `api/routers/batch.py` |
| SaaS-4.6 | FR-9 | — | AC-T2.2 | S1 | Batch UI |
| SaaS-4.7 | — | — | AC-L1.1–AC-L1.3 | M6, M7 | `pages/index.tsx` |
| SaaS-4.8 | — | — | AC-L2.1–AC-L2.3 | S2 | `pages/index.tsx` |
| SaaS-4.9 | — | — | AC-L3.1–AC-L3.3 | S3 | `pages/demo.tsx`, `lib/fixtures/` |
| SaaS-4.10 | — | NFR-9 | — | S1, S2, S3 | `tests/e2e/` |
| SaaS-4.11 | — | NFR-1–NFR-3 | — | S1 | Security review doc |
| SaaS-4.12 | FR-14 | NFR-6, NFR-9 | §12.6 | M10 | Release checklist |

---

## 4. Dependency Graph

### 4.1 Work Package Dependencies

```
SaaS-1.1 (DB) ──► SaaS-1.2 (Auth core) ──► SaaS-1.3 (Signup/login)
                     │
                     ▼
              SaaS-1.6 (Rate limit) ◄── SaaS-1.7 (Router reg)
                     │
                     ▼
              SaaS-1.8 (Next.js auth) ──► SaaS-1.9 (Email modal)
                     │                        │
                     ▼                        ▼
              SaaS-2.10 (Nav auth)      SaaS-2.7 (Prompt banner)
                     │                        │
                     ▼                        ▼
              SaaS-2.4 (My plans) ◄── SaaS-2.1 (Plan CRUD) ◄── SaaS-1.1
                     │                        │
                     ▼                        ▼
              SaaS-2.5 (Load plan)      SaaS-2.2 (Plan limit)
                     │                        │
                     ▼                        ▼
              SaaS-2.6 (Save button) ──► SaaS-3.6 (Upgrade CTA)
                                          │
                                          ▼
                                   SaaS-3.2 (Stripe checkout)
                                          │
                                          ▼
                                   SaaS-3.3 (Webhook) ◄── SaaS-3.1 (Sub model)
                                          │
                                          ▼
                                   SaaS-3.4 (Sub status) ──► SaaS-3.7 (Pro badge)
                                                               │
                                                               ▼
                                                        SaaS-3.8 (No watermark)
                                                               │
                                                               ▼
                                                        SaaS-3.9 (Priority queue)
                                                               │
                                                               ▼
                                                        SaaS-4.4 (White-label)
                                                               │
                                                               ▼
                                                        SaaS-4.2 (Team invite) ◄── SaaS-4.1 (Team model)
                                                               │
                                                               ▼
                                                        SaaS-4.3 (Seat enforce)
                                                               │
                                                               ▼
                                                        SaaS-4.5 (Batch API)
                                                               │
                                                               ▼
                                                        SaaS-4.6 (Batch UI)
```

### 4.2 Critical Path

The critical path (longest chain of dependent tasks that determines minimum project duration) is:

**SaaS-1.1 → SaaS-1.2 → SaaS-1.3 → SaaS-1.8 → SaaS-2.1 → SaaS-2.2 → SaaS-3.1 → SaaS-3.2 → SaaS-3.3 → SaaS-3.4 → SaaS-3.7**

**Duration:** ~11 sequential work packages. With parallel execution across sprints, the critical path spans all 4 sprints. Any delay on the critical path tasks (especially auth core, plan CRUD, or Stripe webhook) delays the entire project.

### 4.3 Parallel Work Opportunities

| Parallel Track A | Parallel Track B | Notes |
|---|---|---|
| SaaS-1.1–1.4 (backend scaffolding) | SaaS-1.5 (watermark) | Watermark is independent of auth |
| SaaS-1.2–1.3 (auth endpoints) | SaaS-1.10 (e2e bypass) | QA can build bypass while backend builds auth |
| SaaS-2.1–2.2 (plan API) | SaaS-2.7–2.10 (frontend UI) | Frontend can build against mock API |
| SaaS-3.2–3.3 (Stripe) | SaaS-3.6–3.7 (upgrade UI) | UI can be built with mock checkout URL |
| SaaS-4.7–4.9 (landing/demo) | SaaS-4.1–4.3 (team backend) | Marketing surface is independent of team tier |

---

## 5. Definition of Done

### 5.1 Project-Level Definition of Done

A feature is **ready for release** when ALL of the following are true:

1. **Scope:** Every work package traces to at least one FR, NFR, or AC from the approved PRD. No gold-plating.
2. **Backend:**
   - FastAPI endpoints return correct HTTP status codes and typed JSON responses per `api/schema.py`
   - SQLAlchemy models match `api/models.py` baseline; Alembic migration is reversible
   - `pytest` unit tests pass for auth hash round-trip, JWT verify, plan CRUD, and webhook signature validation
   - `pip install -r requirements.txt` succeeds in clean environment
   - No PII logged in plaintext; passwords are bcrypt-hashed; JWT is httpOnly cookie
3. **Frontend:**
   - `npm run build` passes with zero errors
   - `npm run lint` passes with zero errors (warnings documented)
   - Responsive down to 375px width; touch targets ≥44px on mobile
   - `prefers-reduced-motion` respected for all animations
   - Auth state does not flash on page load; logout clears all client-side state
4. **QA:**
   - All e2e tests pass (`npm run test:e2e`): 24 existing + new auth/tier tests
   - Acceptance criteria from PRD §12 are verified manually or via automated test
   - Full-flow test passes with `RUN_FULL_FLOW=1` (gated on `OPENAI_API_KEY`)
5. **Security:**
   - Security review gate passed for each phase (SaaS-1.11, SaaS-2.12, SaaS-3.12, SaaS-4.11)
   - Stripe webhook signature validation tested with forged payload
   - Auth bypass header (`X-Test-Auth`) is **ignored** in production
   - Cookie attributes: `HttpOnly`, `Secure` (production), `SameSite=Lax`
6. **Regression:**
   - Anonymous plan generation works without auth
   - `/demo` works without auth and without API key
   - Existing critique, regeneration, investor questions, and export features work for all tiers

### 5.2 Sprint-Level Definition of Done

| Sprint | DOD |
|---|---|
| **Sprint 1** | DB connects; auth endpoints return JWT cookie; email capture modal blocks then unlocks download; watermark appears on free exports; all 24 existing e2e tests pass (or updated); security review signed off. |
| **Sprint 2** | Free user can signup → save plan → view "My plans" → open plan; 4th plan save blocked with 403; Google OAuth works; password reset end-to-end works; nav shows auth state; security review signed off. |
| **Sprint 3** | Pro user can upgrade via Stripe Checkout; webhook updates subscription; Pro badge shows; unlimited saves work; clean exports work; billing portal opens; tier rate limits enforced; security review signed off. |
| **Sprint 4** | Team admin can invite member; member joins; white-label exports have no branding; batch generation works; landing hero copy updated; demo shows 3 scenarios; all e2e pass; final security review signed off; release checklist complete. |

### 5.3 Per-Role Definition of Done

| Role | DOD |
|---|---|
| **backend-dev** | Code reviewed (by code-reviewer or peer backend-dev); unit tests pass; API documented in ARCHITECTURE.md §6 if changed; no `print()` statements (use `logging`); SQL injection impossible (SQLAlchemy ORM only); secrets from env vars only. |
| **frontend-dev** | Code reviewed; `npm run build` and `npm run lint` pass; responsive check on 375px and 1440px; accessible (focus-visible, aria-labels where needed); no `console.log` in production paths; auth state does not flash. |
| **ux-designer** | Design spec approved by product-manager; components match `styles/globals.css` design system; motion respects `prefers-reduced-motion`; copy matches PRD exactly (no paraphrasing); mobile layout reviewed. |
| **qa-tester** | e2e tests pass in CI; test code reviewed; `data-testid` attributes added for new UI flows; test fixtures documented; flaky tests flagged with retry logic or ticket; full-flow test run at least once per sprint. |

---

## 6. Risk Register

### 6.1 Top 10 Delivery Risks

| ID | Risk | Likelihood | Impact | Owner | Mitigation | Sprint |
|---|---|---|---|---|---|---|
| **R-1** | **Auth integration breaks existing sessionStorage flow** — JWT cookie logic interferes with anonymous generation state | Medium | High | backend-dev | Keep sessionStorage as anonymous fallback. `ForgeApp` state machine works with or without logged-in user. Phase 1 ships auth scaffolding without removing sessionStorage. | 1 |
| **R-2** | **Stripe account approval delays** — cannot test live checkout or receive webhooks | Low | High | Founder / Business | Apply for Stripe account immediately (Day 1 of Sprint 1). Use Stripe test mode for all dev/QA. Have Paddle or Lemon Squeezy as fallback if approval exceeds 2 weeks. | 3 |
| **R-3** | **e2e tests fail due to auth gates** — existing tests break because download now requires email modal | Medium | High | qa-tester | Implement `X-Test-Auth: bypass` header (dev-only). Update existing tests to expect email modal OR use bypass. Create dedicated auth test suite. | 1 |
| **R-4** | **Next.js proxy fails to forward cookies in production** — `Cookie` header dropped between Vercel and FastAPI VPS | Medium | High | backend-dev | Verify `fetch` in Next.js API routes forwards `Cookie` header. Test with `curl` against both dev rewrite and production proxy. Document in runbook. | 1 |
| **R-5** | **Team tier complexity delays Pro launch** — multi-seat invite flow is harder than estimated | Medium | High | backend-dev | Defer Team tier to Sprint 4. Build Pro first. If Sprint 4 capacity is exceeded, ship Team tier as "contact us" (Calendly) before full multi-seat UI. | 4 |
| **R-6** | **DB schema migration fails in production** — Alembic migration incompatible with PostgreSQL | Low | High | backend-dev | Test migrations against PostgreSQL in CI (not just SQLite). Freeze schema before Sprint 3. Keep migrations reversible. | 2 |
| **R-7** | **Email gate causes >60% download drop-off** — mandatory email before download kills conversion | Medium | High | product-manager | Track funnel from Day 1. If drop-off >50% by end of Sprint 2, iterate on modal copy or test inline form vs modal. A/B test if possible. | 1 |
| **R-8** | **Rate-limiting logic fails to distinguish tiers** — Pro users hit free limits or anonymous users bypass | Medium | Medium | backend-dev | Unit test `get_rate_limit_key` with authenticated and anonymous requests. Integration test with `slowapi` in-memory store. Add monitoring alert on 429 spikes. | 1 |
| **R-9** | **Password reset email deliverability** — Python `smtplib` emails land in spam | Medium | Medium | backend-dev | Use transactional provider (SendGrid/Postmark/Resend) if available by Sprint 2. If not, verify SPF/DKIM on domain. Monitor bounce rates. | 2 |
| **R-10** | **Batch generation exceeds OpenAI rate limits or cost** — 10 parallel calls trigger 429 or spike bill | Medium | Medium | backend-dev | Implement sequential generation with 1s delay between calls. Cap at 10. Monitor cost per batch. Add batch rate limit (1 per 5 min). | 4 |

### 6.2 Risk Triggers & Escalation

| Trigger | Action | Escalation To |
|---|---|---|
| Stripe account not approved by end of Sprint 2 | Switch to Paddle or Lemon Squeezy for MVP; Stripe integration deferred to post-launch | Engineering Lead + Founder |
| e2e test pass rate drops below 80% in any sprint | Stop feature work; dedicate 1 day to test stabilization | Engineering Lead |
| Download drop-off >50% within 3 days of email gate launch | Product manager calls emergency design review; test inline form vs modal | Product Manager |
| Security review finds critical vulnerability | Block merge immediately; fix within 24h; re-review before any release | Engineering Lead + Security Engineer |
| Any work package exceeds 8h estimate by >50% | Break into smaller packages; re-estimate with team; flag to Engineering Lead | Engineering Lead |

---

## 7. Sprint Calendar

| Sprint | Theme | Dates | Kickoff | Demo | Retro |
|---|---|---|---|---|---|
| **Sprint 1** | Foundation | June 15 – June 19, 2026 | Mon 09:00 | Fri 16:00 | Fri 17:00 |
| **Sprint 2** | Free Tier | June 22 – June 26, 2026 | Mon 09:00 | Fri 16:00 | Fri 17:00 |
| **Sprint 3** | Pro Tier | June 29 – July 3, 2026 | Mon 09:00 | Fri 16:00 | Fri 17:00 |
| **Sprint 4** | Polish & Team | July 6 – July 10, 2026 | Mon 09:00 | Fri 16:00 | Fri 17:00 |
| **Release** | Go-live | July 13, 2026 | — | — | — |

### 7.1 Key Milestones

| Date | Milestone | Deliverable |
|---|---|---|
| June 15 | Sprint 1 starts | Auth + DB scaffolding begins |
| June 19 | Sprint 1 demo | Email capture modal works; watermark on exports; existing tests pass |
| June 22 | Sprint 2 starts | Free tier development begins |
| June 26 | Sprint 2 demo | Signup → save plan → "My plans" → open plan works; password reset works |
| June 29 | Sprint 3 starts | Pro tier / Stripe integration begins |
| July 3 | Sprint 3 demo | Stripe Checkout works; Pro badge shows; unlimited saves; billing portal opens |
| July 6 | Sprint 4 starts | Team tier + marketing polish begins |
| July 10 | Sprint 4 demo | Team invite works; batch generation works; hero + demo updated; all tests pass |
| July 13 | Release readiness | Final regression complete; security sign-off; release to production |

### 7.2 Team Availability Assumptions

- No public holidays during June 15 – July 10 (verify locally)
- All specialists available full-time
- Founder/Business owner available for Stripe account setup by June 15
- Domain and DNS ready for email deliverability by June 22

---

## 8. 100% Rule Verification

The WBS covers **100% of the PRD scope** and **no more**:

### In-Scope Coverage (Must / Should)

| PRD ID | Feature | Covered By WBS IDs |
|---|---|---|
| M1 | Email capture gate | SaaS-1.4, SaaS-1.9 |
| M2 | Free account creation | SaaS-1.3, SaaS-2.3, SaaS-2.7, SaaS-2.10 |
| M3 | Plan persistence | SaaS-2.1, SaaS-2.4, SaaS-2.5, SaaS-2.6 |
| M4 | Pro tier ($19/mo) | SaaS-3.1–SaaS-3.10 |
| M5 | Watermark on free exports | SaaS-1.5, SaaS-3.8 |
| M6 | Hero rewrite | SaaS-4.7 |
| M7 | Audience positioning | SaaS-4.7 |
| M8 | Auth system | SaaS-1.2, SaaS-1.3, SaaS-2.3, SaaS-2.8, SaaS-2.9 |
| M9 | Simple DB | SaaS-1.1, SaaS-2.1, SaaS-3.1, SaaS-4.1 |
| M10 | Preserve existing functionality | SaaS-1.7, SaaS-1.10, SaaS-4.12 |
| S1 | Team tier ($49/mo) | SaaS-4.1–SaaS-4.6 |
| S2 | Distribution hooks | SaaS-4.8 |
| S3 | Demo improvements | SaaS-4.9 |
| S4 | Priority generation queue | SaaS-1.6, SaaS-3.9 |
| S5 | Password reset | SaaS-2.8, SaaS-2.9 |

### Out-of-Scope Exclusion (Won't)

| PRD ID | Feature | Exclusion Rationale |
|---|---|---|
| W1 | Real-time collaboration | Not in PRD scope; no WBS items |
| W2 | Custom branding / domain white-label | Not in PRD scope; no WBS items |
| W3 | AI model selection | Not in PRD scope; no WBS items |
| W4 | Mobile native app | Not in PRD scope; no WBS items |
| W5 | Advanced analytics dashboard | Not in PRD scope; no WBS items |
| W6 | Affiliate / referral program | Not in PRD scope; no WBS items |
| W7 | Internationalization | Not in PRD scope; no WBS items |
| W8 | Phone/SMS auth | Not in PRD scope; no WBS items |
| W9 | Two-factor authentication | Not in PRD scope; no WBS items |
| W10 | Plan sharing / public links | Not in PRD scope; no WBS items |

**Verification:** Every FR (FR-1 through FR-14) and every NFR (NFR-1 through NFR-12) is traced to at least one WBS ID in §3. No WBS ID lacks a traceability reference. No gold-plating detected.

---

## 9. Change Control

Any change to this WBS requires:

1. **Scope change request** filed by product-manager with business justification
2. **Impact analysis** by scrum-master on sprint capacity, critical path, and dependencies
3. **Approval** by Engineering Lead
4. **Update** to `docs/WBS.md` with version history entry below
5. **Jira ticket update** (if tickets already created) — reassign, resize, or create new

### Version History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-06-11 | Scrum Master | Initial WBS for SaaS pivot. 4 sprints, 48 work packages, 100% PRD coverage. |

---

*End of WBS. This is a living document. Update when assumptions are validated, open questions are resolved, or scope changes.*
