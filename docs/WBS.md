# WBS: Forge — Conversion Playbook + Multi-Provider Billing

## Metadata

| Field | Value |
|---|---|
| Project | Forge SaaS Pivot — Conversion Playbook + Multi-Provider Billing |
| Version | v1.0 |
| Sources | docs/PRD-conversion-playbook.md · docs/PRD-saas-pivot.md · docs/ARCHITECTURE.md · ADR-001…ADR-013 |
| Standard | PMI WBS Practice Standard · PMBOK 7 Hybrid |
| Sprint length | 5 working days (1 week) |
| Team | backend-dev · frontend-dev · devops-engineer · qa-tester · technical-writer |
| Created | 2026-06-15 |
| Gates | G1 (Conversion Playbook) Approved · G2 (Multi-Provider Billing) Approved |
| Pre-sprint gate | DESIGN-SPEC (docs/DESIGN-SPEC.md) — not yet produced (UX-designer Gate G4); UI work packages carry explicit dependency on this gate |

> **Scope boundary.** This WBS covers 100% of the approved G1 + G2 scope as defined in
> PRD-conversion-playbook.md and PRD-saas-pivot.md, reconciled through ARCHITECTURE.md §9A and §9A.12,
> and all accepted ADRs. It does not cover previously shipped milestones (M1–M3 in task.md), any
> Could/Won't items, or any item not traceable to an FR/NFR/AC below. No gold-plating.

---

## Traceability Index

| FR/NFR | Short description |
|---|---|
| FR-1 | Anonymous plan generation without auth |
| FR-2 | Download gated by mandatory email capture |
| FR-3 | Email capture creates lead record |
| FR-4 | Free account via email+password or Google OAuth |
| FR-5 | Free accounts save up to 3 plans; "My plans" view |
| FR-6 | Saved plans load into /app in done state |
| FR-7 | Pro tier: unlimited plans, priority, watermark-free exports |
| FR-8 | Free-tier exports include watermark footer |
| FR-9 | Team tier: 5 seats, white-label, batch generation |
| FR-10 | Self-service password reset |
| FR-11' | Checkout multi-provider: Stripe (USD) + Paystack (NGN), user-selected |
| FR-12 | Subscription management portal per owning provider |
| FR-13 | Subscription status sync via provider webhooks |
| FR-14 | All existing functionality preserved |
| FR-15 | Auto-save in-session plan on signup (ADR-009) |
| FR-16 | Landing hero: three.js + GSAP, lazy + guarded (ADR-010) |
| FR-17 | Dedicated /pricing route: Free/Pro/Team with USD + NGN (ADR-012) |
| FR-18 | Watermark URL carries ?ref=export (ADR-011) |
| FR-19 | Stale "no account / no persistence" copy removed before/with auth |
| FR-20 | Landing demo preview + /demo fixture show same scenario |
| FR-21 | Paystack hosted checkout with Paystack Plans for subscriptions |
| FR-22 | Paystack webhooks sync to same internal subscription state as Stripe |
| FR-23 | Subscription records owning provider + provider-side IDs |
| NFR-1 | Passwords hashed with bcrypt cost >= 12 |
| NFR-2 | JWT HS256 in httpOnly cookie, 7-day expiry |
| NFR-3 | Stripe webhook signatures validated via stripe-python |
| NFR-7 | SQLite dev / PostgreSQL prod; Alembic migrations |
| NFR-9 | e2e tests bypass auth gates via X-Test-Auth dev header |
| NFR-13 | 3D chunk <= ~200 KB gz; initial route growth <= ~10 KB gz |
| NFR-14 | Reduced-motion / no-WebGL degrade to static hero |
| NFR-15 | Watermark ref param carries no PII |
| NFR-16 | /pricing renders statically without auth |
| NFR-17 | Paystack webhook: HMAC-SHA512 over raw body, constant-time compare |
| NFR-18 | Both webhook handlers idempotent, replay-resistant |
| NFR-19 | Adding/removing a provider localised to api/billing/* + lib/pricing |
| NFR-20 | No card data on either provider; hosted checkout both sides |

---

## WBS Hierarchy

### 1.0 Backend API

#### 1.1 Auth & Session Foundation

| ID | Work Package | Assignee | Depends On | Size (estimated) | DOD | Req. Ref |
|---|---|---|---|---|---|---|
| 1.1.1 | Database engine + Alembic scaffold (`api/database.py`, initial Alembic env, base migration) | backend-dev | — | S | `get_db()` yields a working session in both SQLite and PostgreSQL; `alembic upgrade head` succeeds; connection string reads from env var | NFR-7 |
| 1.1.2 | Core ORM models: `User`, `Plan`, `Lead`, `PasswordResetToken` (`api/models.py`) | backend-dev | 1.1.1 | M | Alembic autogenerate produces a valid migration; all FK constraints present; `User.tier` enum includes anonymous/free/pro/team | FR-3, FR-4, FR-5, NFR-7 |
| 1.1.3 | JWT + bcrypt auth helpers (`api/auth.py`: `create_access_token`, `verify_password`, `get_current_user`, `get_optional_user`) | backend-dev | 1.1.2 | S | Unit test: password hash round-trip passes; JWT encode/decode round-trip passes; forged JWT rejected; `get_optional_user` returns None for unauthenticated requests | NFR-1, NFR-2, FR-4 |
| 1.1.4 | Auth router: signup, login, logout, `/api/auth/me` (`api/routers/auth.py`) | backend-dev | 1.1.3 | M | `curl` signup/login/me works; Set-Cookie `forge_session` with HttpOnly/SameSite=Lax; duplicate email returns 409; password < 8 chars returns 422 | FR-4, AC-F2.1, AC-F2.2, NFR-2 |
| 1.1.5 | Google OAuth callback route (`api/routers/auth.py`) | backend-dev | 1.1.3 | M | OAuth code exchange completes; new user created on first call; existing user returned JWT on subsequent call; Set-Cookie present | FR-4, AC-F2.3, ADR-001 |
| 1.1.6 | Password reset flow (`api/routers/auth.py`: `password-reset` + `password-reset-confirm`) | backend-dev | 1.1.4 | M | Token valid for 24 h; token single-use; new password accepted; old password rejected after reset | FR-10, AC-S5 |
| 1.1.7 | Dev-only auth bypass middleware (`X-Test-Auth: bypass` header, `ENVIRONMENT=test` guard) | backend-dev | 1.1.3 | XS | Bypass returns mock Pro user in `test` env; header silently ignored in `production` env; integration test confirms both paths | NFR-9, ADR-007 |
| 1.1.8 | Auto-save plan on signup: accept optional `current_plan` in signup + OAuth handlers; atomic user+plan transaction (ADR-009) | backend-dev | 1.1.4, 1.1.5 | M | Signup with valid `current_plan` creates user + plan in one TX; signup with no/invalid plan creates user only (no 500); plan id returned in signup response; duplicate-submit de-duplication passes | FR-15, AC-F2.4, ADR-009 |

#### 1.2 Lead Capture API

| ID | Work Package | Assignee | Depends On | Size (estimated) | DOD | Req. Ref |
|---|---|---|---|---|---|---|
| 1.2.1 | Lead capture endpoint (`POST /api/leads`, `api/routers/leads.py`) | backend-dev | 1.1.2 | S | Valid email creates a `Lead` record; invalid email format returns 422; rate-limited 10/min per IP | FR-2, FR-3, AC-A2.5, AC-A2.3 |

#### 1.3 Plan Persistence API

| ID | Work Package | Assignee | Depends On | Size (estimated) | DOD | Req. Ref |
|---|---|---|---|---|---|---|
| 1.3.1 | Plan CRUD router with 3-plan free-tier cap (`api/routers/plans.py`, ADR-005) | backend-dev | 1.1.4, 1.1.2 | M | Auth'd user can list, create, get, and delete own plans; 4th POST by free user returns 403 `PLAN_LIMIT_REACHED`; user B cannot read user A's plan; `GET /api/plans/{id}` returns full `plan_data` | FR-5, FR-6, AC-F3.1–F3.4, ADR-005 |
| 1.3.2 | Tier-aware rate-limit key function on generation/export routes (user_id vs IP; Pro 10/min, free/anon 5/min) | backend-dev | 1.1.3 | S | Authenticated requests keyed by user_id; anonymous by IP; Pro user passes at 10 req/min; free user throttled at 6th req/min; unit test for key function | QA-P4, NFR-9, AC-P3.4 |

#### 1.4 Tiered Export (Watermark + Referral Attribution)

| ID | Work Package | Assignee | Depends On | Size (estimated) | DOD | Req. Ref |
|---|---|---|---|---|---|---|
| 1.4.1 | Watermark helper module (`api/watermark.py`: `watermark_url(tier)` returning URL with `?ref=export` for anon/free tiers) | backend-dev | — | XS | Helper returns correct URL with `?ref=export` for anonymous/free; returns empty string for pro/team; unit test covers all four tier values; no PII in URL | FR-8, FR-18, NFR-15, ADR-011 |
| 1.4.2 | Tiered docx export: accept `tier` param; conditionally append watermark footer using `api/watermark.py` (`api/export.py` modification) | backend-dev | 1.4.1 | S | Free/anon `.docx` contains footer with URL incl. `?ref=export`; pro/team `.docx` has no footer; tier inferred from auth cookie if not supplied; integration test downloads both variants | FR-8, FR-18, ADR-006, ADR-011 |
| 1.4.3 | Tiered PDF export: conditionally append watermark in `_PlanPDF.footer()` using `api/watermark.py` (`api/export_pdf.py` modification) | backend-dev | 1.4.1 | S | Free/anon `.pdf` contains footer with URL incl. `?ref=export`; pro/team `.pdf` has no footer; integration test downloads both variants | FR-8, FR-18, ADR-006, ADR-011 |

#### 1.5 Billing Abstraction — Stripe Path

| ID | Work Package | Assignee | Depends On | Size (estimated) | DOD | Req. Ref |
|---|---|---|---|---|---|---|
| 1.5.1 | `BillingProvider` interface + `BillingRegistry` (`api/billing/base.py`, `api/billing/registry.py`) | backend-dev | 1.1.2 | S | Protocol/ABC compiles; `BillingRegistry.get("stripe")` returns `StripeProvider`; `get("paystack")` returns `PaystackProvider`; `get("unknown")` raises a defined error | NFR-19, ADR-013 |
| 1.5.2 | `Subscription`, `Team`, `TeamMember` models with provider discriminator + external ID fields; Alembic migration | backend-dev | 1.5.1, 1.1.2 | M | Migration adds `provider`, `currency`, `external_customer_id`, `external_subscription_id`, `external_price_id` columns; backfill sets `provider='stripe'` for existing rows; migration reversible; Alembic upgrade + downgrade both pass | FR-23, ADR-013 §9A.12.6 |
| 1.5.3 | `StripeProvider` implementation (`api/billing/stripe_provider.py`): `create_checkout_session`, `verify_webhook` (HMAC-SHA256 via stripe lib), `handle_event` mapping to `SubscriptionDelta` | backend-dev | 1.5.1, 1.5.2 | M | `create_checkout_session` calls `checkout.sessions.create` and returns `CheckoutResult`; `verify_webhook` rejects forged signature; `handle_event` maps `checkout.session.completed` and `customer.subscription.*` to `SubscriptionDelta`; unit tests cover all three methods | FR-11', NFR-3, ADR-013 |
| 1.5.4 | Subscriptions router: `GET /api/subscriptions/status`, `POST /api/subscriptions/checkout {tier, provider}`, `POST /api/subscriptions/portal` using `BillingRegistry` | backend-dev | 1.5.3, 1.5.2 | M | Authenticated user gets checkout URL for Stripe; redirect URL returns to `/app?success=1`; `/status` returns `{tier, status, current_period_end}`; unauthenticated request returns 401 | FR-11', FR-12, AC-P2.1–P2.4, ADR-004 |
| 1.5.5 | Stripe webhook handler (`POST /api/webhooks/stripe`): idempotent upsert keyed on `stripe_subscription_id`; HMAC-SHA256 via stripe lib on raw body | backend-dev | 1.5.3, 1.5.2 | M | Valid signature accepted; forged signature returns 400 (no state change); `checkout.session.completed` activates subscription; duplicate delivery of the same event leaves state unchanged; `customer.subscription.deleted` cancels | FR-13, NFR-3, NFR-18, ADR-013, QA-R2 |
| 1.5.6 | Stripe Customer Portal route (`POST /api/subscriptions/portal`) | backend-dev | 1.5.3, 1.5.4 | S | Authenticated user receives Stripe-hosted portal URL derived from `external_customer_id` in DB; user B cannot access user A's portal | FR-12, AC-P4.1, ADR-013 |
| 1.5.7 | Pricing config single source of truth (`lib/pricing.ts` + server-side mirror): tier x provider x currency map; USD amounts set ($1900/$4900); NGN amounts marked TO CONFIRM with null sentinel; Stripe price IDs as env-var references | backend-dev + frontend-dev | 1.5.1 | S | Config file exists; `TIERS.pro.stripe.amount` = 1900; `TIERS.pro.paystack.amount` = null until product owner confirms; server-side validation rejects Paystack requests when NGN amount is null; config read by /pricing page and BillingRegistry | FR-17, ADR-012, ADR-013, QA-BL4 |

#### 1.6 Billing Abstraction — Paystack Path

> **SEQUENCING GATE:** Packages 1.6.1 and 1.6.2 MUST NOT enter a sprint until the product owner has confirmed NGN prices for Pro and Team (OD-1). Paystack CTA on /pricing is gated on NGN prices being set in `lib/pricing.ts`. Stripe-USD billing (1.5.x) ships independently and before the Paystack path.

| ID | Work Package | Assignee | Depends On | Size (estimated) | DOD | Req. Ref |
|---|---|---|---|---|---|---|
| 1.6.1 | `PaystackProvider` implementation (`api/billing/paystack_provider.py`): `create_checkout_session` (Paystack transaction init with Plan), `verify_webhook` (HMAC-SHA512 over RAW body before JSON parse, constant-time compare vs `x-paystack-signature`), `handle_event` mapping charge.success / subscription events to `SubscriptionDelta`; entitlement derived from server-side metadata + re-verified transaction amount, NOT payload amount | backend-dev | 1.5.1, 1.5.2, 1.5.7 (NGN prices confirmed per OD-1) | L | `create_checkout_session` calls Paystack transaction init API and returns `CheckoutResult{url, access_code, provider_session_ref}`; `verify_webhook` verifies HMAC-SHA512 over the raw body BEFORE JSON parse; forged/tampered request returns 400 with no state change; `handle_event` maps events to `SubscriptionDelta`; entitlement gated on re-verified transaction + config amount (not payload amount); unit tests for all three methods | FR-21, FR-22, NFR-17, ADR-013, QA-BL1, QA-BL2 |
| 1.6.2 | Paystack webhook handler (`POST /api/webhooks/paystack`): idempotent upsert keyed on provider event id; raw-body HMAC-SHA512 verified BEFORE JSON parse; constant-time compare; deduplication; security-engineer audit clear | backend-dev | 1.6.1 | M | Valid signature accepted; HMAC-SHA512 verified over raw body BEFORE JSON parse; forged signature returns 400, no state change; duplicate delivery leaves state unchanged (idempotent); `charge.success` activates subscription; `subscription.disable` cancels; integration test confirms replay safety; qa-tester forged-signature + duplicate-delivery tests pass; security-engineer audit clear (no High/Critical) | FR-22, FR-23, NFR-17, NFR-18, ADR-013, QA-BL2, QA-BL3 |

#### 1.7 Team Tier API (Should — Sprint 5)

| ID | Work Package | Assignee | Depends On | Size (estimated) | DOD | Req. Ref |
|---|---|---|---|---|---|---|
| 1.7.1 | Team router: create team, invite member by email, accept invite, enforce 5-seat cap (`api/routers/teams.py`) | backend-dev | 1.5.2, 1.5.4 | L | Admin can invite by email; invitee receives link (or is created); 6th seat rejected; team member queries work; seat count returned in subscription status | FR-9, AC-T1.1–T1.4, ADR-013 |
| 1.7.2 | White-label export for team tier: suppress all Forge branding; `watermark_url("team")` returns empty string; verify both `.docx` and `.pdf` | backend-dev | 1.4.2, 1.4.3, 1.7.1 | S | Team `.docx` and `.pdf` contain no Forge footer, header, or branding; integration test confirms | FR-9, AC-T2.1, ADR-006 |

---

### 2.0 Frontend UI

> All UI implementation packages that require visual design carry a dependency on Gate G4 (DESIGN-SPEC from UX-designer, OD-7). Packages that are structural wiring only (route scaffolding, data plumbing, copy changes to existing components) can start before the DESIGN-SPEC. Dependencies are explicit per package.

#### 2.1 Auth UI

| ID | Work Package | Assignee | Depends On | Size (estimated) | DOD | Req. Ref |
|---|---|---|---|---|---|---|
| 2.1.1 | Auth state management: `lib/auth.ts` (`useAuth` hook; `GET /api/auth/me` on page load; logout helper; no auth token in localStorage) | frontend-dev | 1.1.4 | S | `useAuth` returns `{user, tier, loading}` on every page; user is null when unauthenticated; logout clears state and refreshes; cookie is httpOnly (not readable by JS) | NFR-2, ADR-001, AC-F4.3, AC-F4.4 |
| 2.1.2 | Login/signup modal or page components (email+password form, Google OAuth button, form validation, error display) | frontend-dev | 2.1.1, DESIGN-SPEC (OD-7) | M | Signup validates password >= 8 chars inline; duplicate email shows API error; Google OAuth button redirects correctly; successful signup fires auto-save if `sessionStorage` plan present (per 1.1.8); renders without console errors | FR-4, AC-F2.1–F2.4, ADR-009 |
| 2.1.3 | Nav auth UI: login/signup buttons when anonymous; avatar + "My plans" link + logout when authenticated; "Pro" badge when tier=pro or tier=team | frontend-dev | 2.1.1, DESIGN-SPEC (OD-7) | S | Nav reflects auth state on every route; logout works; "My plans" link visible only when logged in; "Pro" badge visible for pro/team users | FR-7, AC-F4.3, AC-P3.2, AC-P3.5 |
| 2.1.4 | Password reset UI: request-reset form + confirm-reset form (token from URL param) | frontend-dev | 1.1.6, DESIGN-SPEC (OD-7) | S | Request form accepts email; success message shown; confirm form accepts new password; redirect to login on success | FR-10, AC-S5 |

#### 2.2 Email Capture Gate

| ID | Work Package | Assignee | Depends On | Size (estimated) | DOD | Req. Ref |
|---|---|---|---|---|---|---|
| 2.2.1 | Email-capture modal in `ForgeApp`: triggered on download click when unauthenticated; mandatory (cannot bypass); format validation; calls `POST /api/leads`; unlocks download on success | frontend-dev | 1.2.1, 2.1.1, DESIGN-SPEC (OD-7) | M | Modal appears on download click for unauthenticated user; invalid email rejected inline; valid email submits lead and proceeds to download; logged-in user skips modal entirely; download proceeds with correct tier watermark | FR-2, FR-3, AC-A2.1–A2.8 |

#### 2.3 Plan Persistence UI

| ID | Work Package | Assignee | Depends On | Size (estimated) | DOD | Req. Ref |
|---|---|---|---|---|---|---|
| 2.3.1 | "Save plan" button in `ForgeApp` (calls `POST /api/plans`; handles 403 `PLAN_LIMIT_REACHED` with upgrade CTA; shows loading/success/error states) | frontend-dev | 1.3.1, 2.1.1, DESIGN-SPEC (OD-7) | S | Save button visible in done state for logged-in users; 403 triggers upgrade CTA; successful save shows confirmation; button disabled during in-flight request | FR-5, AC-F3.2, ADR-005 |
| 2.3.2 | Free-account prompt banner/toast: appears after 1st plan done (anonymous); non-blocking; dismissible with 24 h suppression via localStorage; becomes inline card on 2nd plan (anonymous) | frontend-dev | 2.1.1, DESIGN-SPEC (OD-7) | S | Banner appears after 1st plan done (anonymous); dismiss sets localStorage flag; not present after 24 h suppression; inline card replaces toast on 2nd plan | FR-4, AC-F1.1–F1.4 |
| 2.3.3 | "My plans" page (`pages/my-plans.tsx`): list of saved plans with title, date, "Open" button; upgrade CTA when at 3-plan limit; requires auth | frontend-dev | 1.3.1, 2.1.1, DESIGN-SPEC (OD-7) | M | Page returns 200; redirects to login if unauthenticated; list renders plans; "Open" loads plan into `/app` in done state; plan limit CTA visible when count = 3 | FR-5, FR-6, AC-F3.1–F3.4 |
| 2.3.4 | Load saved plan from URL param (`pages/app.tsx`: read `?plan_id=xxx`, call `GET /api/plans/{id}`, hydrate ForgeApp state into done state) | frontend-dev | 1.3.1, 2.3.3 | S | `/app?plan_id=<id>` loads the plan in done state; invalid or unauthorized plan_id shows a clear error, not a blank state | FR-6, AC-F3.3 |

#### 2.4 Upgrade Flow UI

| ID | Work Package | Assignee | Depends On | Size (estimated) | DOD | Req. Ref |
|---|---|---|---|---|---|---|
| 2.4.1 | Upgrade CTA card (inline in `/app` and "My plans"): lists Pro benefits; "Upgrade to Pro — $19/month" button calls `POST /api/subscriptions/checkout {tier: pro, provider: stripe}`; Paystack option gated on NGN prices confirmed (shows "coming soon" until then) | frontend-dev | 1.5.4, 2.1.1, DESIGN-SPEC (OD-7) | S | CTA visible when free user hits 3-plan limit; button triggers checkout redirect; Pro benefits listed accurately; Paystack CTA disabled until NGN confirmed | FR-7, AC-P1.1–P1.4, AC-P2.1–P2.3, ADR-005 |
| 2.4.2 | Post-checkout success state: `/app?success=1` triggers subscription status refresh; Pro toast; Pro badge and unlimited save enabled | frontend-dev | 1.5.4, 2.1.1, 2.4.1 | S | `success=1` redirect shows toast; Pro badge appears in Nav; plan-limit cap removed from save button | FR-7, AC-P2.3, AC-P2.4, AC-P3.1–P3.2 |
| 2.4.3 | Billing portal link in Nav/account dropdown (calls `POST /api/subscriptions/portal`; redirects to provider portal: Stripe Customer Portal for Stripe subscriptions, Paystack management link for Paystack subscriptions) | frontend-dev | 1.5.6, 2.1.1, DESIGN-SPEC (OD-7) | S | "Billing" link visible to Pro/Team users; Stripe users go to Stripe Customer Portal; Paystack users go to Paystack management link; link absent for free users | FR-12, AC-P4.1, AC-P4.2, ADR-013 |

#### 2.5 Pricing Page

| ID | Work Package | Assignee | Depends On | Size (estimated) | DOD | Req. Ref |
|---|---|---|---|---|---|---|
| 2.5.1 | Pricing page structure (`pages/pricing.tsx`): static; three-tier layout (Free / Pro / Team); feature comparison; USD prices shown; NGN shown as "coming soon" until product owner confirms; accessible without auth; reachable from Nav | frontend-dev | 1.5.7, DESIGN-SPEC (OD-7) | M | `/pricing` returns 200 unauthenticated; all three tiers displayed with USD prices; NGN column shows sentinel value (not a fabricated amount); page renders statically; Nav link present | FR-17, NFR-16, AC-CP4.1–CP4.5, ADR-012 |
| 2.5.2 | Pricing page CTA wiring: Free -> `/app`; Pro/Team (unauthenticated) -> signup/login preserving `?intent=checkout&tier=X&provider=Y`; Pro/Team (authenticated) -> provider-choice step -> checkout; Team CTA shows "Contact us" until Team tier ships | frontend-dev | 1.5.4, 1.5.7, 2.1.1, 2.5.1 | S | Free CTA navigates to /app; Pro/Team CTA unauthenticated routes to auth with intent preserved; authenticated CTA reaches provider-choice then checkout; Team CTA shows contact link before full Team tier; Paystack option disabled until NGN confirmed | FR-11', FR-17, AC-CP4.3, ADR-012, ADR-013 |
| 2.5.3 | Provider-choice checkout step (UI component): radio/card selection between "Stripe (USD)" and "Paystack (NGN — coming soon until confirmed)"; passes `{tier, provider}` to checkout; no billing logic or secret keys on client | frontend-dev | 1.5.4, 1.5.7, 2.5.2 | S | Component renders; Stripe option always enabled; Paystack option disabled/labelled "coming soon" until NGN prices configured; selection passed correctly to checkout API | FR-11', ADR-013, QA-BL4 |

#### 2.6 Landing Page — Stale Copy Remediation (Must — ships before or with auth)

> These packages MUST be deployed before or simultaneously with any auth feature reaching production (AC-CP1.5, hard release gate). They have no DESIGN-SPEC dependency — they are content/copy changes to existing components.

| ID | Work Package | Assignee | Depends On | Size (estimated) | DOD | Req. Ref |
|---|---|---|---|---|---|---|
| 2.6.1 | Remove hero eyebrow "no account · no persistence" text from landing hero component | frontend-dev | — | XS | Grep of deployed build for "no account" and "no persistence" returns zero matches in visitor-facing text; `npm run build` passes; no visual regression on hero layout | FR-19, AC-CP1.1, AC-CP1.4, G9 |
| 2.6.2 | Remove or rewrite `LockedDecisions` section: "No persistence, by design" card and "No accounts, no DB, no saved drafts" body text removed; section either removed entirely or replaced with buyer-facing differentiation (decision per OD-2 / Q-P1) | frontend-dev | OD-2 (Q-P1 resolved) | S | "No persistence, by design" card gone from rendered HTML; "No accounts" text gone; section either absent or contains buyer-facing content only; `npm run build` passes | FR-19, AC-CP1.2, AC-CP1.4, G9 |
| 2.6.3 | Remove footer CTA "No account. No saved drafts." text from `FooterCTA` component | frontend-dev | — | XS | Grep of deployed build for "No account. No saved drafts." returns zero matches; footer CTA layout preserved | FR-19, AC-CP1.3, AC-CP1.4, G9 |
| 2.6.4 | Update primary CTA to "Generate my plan — it's free ->" and secondary CTA to "See a sample plan first ->" in hero and footer CTA; primary left/top, secondary right/bottom | frontend-dev | — | XS | Hero and footer CTA show updated copy; primary appears before secondary in DOM order and visual hierarchy; `npm run build` passes | FR-19, US-CP2, AC-CP2.1–CP2.4 |
| 2.6.5 | Update landing page demo preview strip (`DemoPreviewStrip`) to reference same non-childcare scenario as updated `/demo` fixture; TAM/SAM/SOM values from real model output; childcare content removed | frontend-dev | 2.7.1 (demo fixture) | S | `DemoPreviewStrip` shows scenario matching `/demo` fixture; no childcare content visible; TAM/SAM/SOM values are real model output values; three-card structure retained | FR-20, AC-CP3.1–CP3.4, US-CP3 |

#### 2.7 Demo Fixture Replacement

| ID | Work Package | Assignee | Depends On | Size (estimated) | DOD | Req. Ref |
|---|---|---|---|---|---|---|
| 2.7.1 | Generate new demo fixture: run Forge generation pipeline against the chosen scenario (OD-3 / Q-P2 resolved); capture output as `lib/fixtures/demo-plan.json` | backend-dev | OD-3 (Q-P2 resolved) | S | `lib/fixtures/demo-plan.json` contains real `gpt-4.1-mini` output for the new scenario; all 10 sections present; schema validates against `BusinessPlan.model_validate()`; old childcare fixture archived or overwritten | FR-20, AC-L3.1–L3.3, S3 |
| 2.7.2 | Update `/demo` page to use new fixture; update demo banner text to reflect new scenario | frontend-dev | 2.7.1 | XS | `/demo` loads without error; banner text references new scenario; critique and regen buttons remain disabled with hint; `npm run build` passes | FR-20, AC-L3.1–L3.3 |

#### 2.8 Landing Hero — three.js + GSAP (ADR-010)

> 2.8.1 can start before DESIGN-SPEC (it is structural/copy). 2.8.2 requires DESIGN-SPEC for the scene design and motion choreography. Do not start 2.8.2 without DESIGN-SPEC delivered.

| ID | Work Package | Assignee | Depends On | Size (estimated) | DOD | Req. Ref |
|---|---|---|---|---|---|---|
| 2.8.1 | `HeroStatic` component (`components/landing/HeroStatic.tsx`): server-rendered hero markup with headline, sub-headline (investor-readiness, two-agent approach, no-templates content elements), updated CTAs; always renders regardless of motion/WebGL | frontend-dev | — | S | HeroStatic renders correctly in SSR; headline and sub-headline present with required content elements; updated CTAs rendered; `npm run build` passes; semantic HTML, correct heading hierarchy | FR-16, NFR-14, AC-L1.1–L1.4, AC-CP2.5 |
| 2.8.2 | `HeroCanvas` component (`components/landing/HeroCanvas.tsx`): three.js + GSAP WebGL hero scene; lazy-loaded via `next/dynamic({ssr:false})`; capability guard (reduced-motion -> abort, WebGL probe -> abort, optional perf heuristic); DPR cap <= 2; off-screen pause via IntersectionObserver; dispose on unmount; `aria-hidden`; narrow imports; scene palette uses CSS token variables | frontend-dev | DESIGN-SPEC (OD-7) | L | three.js and GSAP absent from initial chunk (confirmed via CI build report); 3D chunk <= ~200 KB gzipped (confirmed via CI); `prefers-reduced-motion: reduce` -> no WebGL scene; no-WebGL browser -> static hero only, no console error; no GPU/memory leak on unmount (manual verification); LCP element unaffected by 3D load | FR-16, NFR-13, NFR-14, ADR-010, QA-P5, QA-P6, QA-A1, QA-A2 |
| 2.8.3 | Compose `Landing.tsx`: integrate `HeroStatic` + dynamic `HeroCanvas`; social-proof block (non-empty content per AC-CP5.2); distribution hooks sections above footer CTA (per DESIGN-SPEC layout) | frontend-dev | 2.8.1, 2.8.2, DESIGN-SPEC (OD-7) | M | Landing page renders with both static and canvas hero layers; social-proof block present and non-empty with no unverified numerical claims; distribution hooks sections appear before footer CTA; each section has heading, description, and live contact CTA destination (OD-5); `npm run build` and `npm run lint` pass | FR-16, US-CP5, US-CP6, AC-CP5.1–CP5.4, AC-CP6.1–CP6.3 |

#### 2.9 Referral Attribution Capture

| ID | Work Package | Assignee | Depends On | Size (estimated) | DOD | Req. Ref |
|---|---|---|---|---|---|---|
| 2.9.1 | Referral capture on landing page: read `?ref=export` query param; emit `referral_source=export_watermark` analytics event; optionally persist in `sessionStorage` for first-touch attribution; treat param as untrusted analytics input only | frontend-dev | OD-6 (analytics pipeline) | S | When landing page loaded with `?ref=export`, analytics event fires (or is queued for when pipeline is live); param not used for authz or pricing; no PII captured from the param; page returns 200 (not 404) when param present | FR-18, NFR-15, AC-CP7.2, AC-CP7.3, ADR-011 |

---

### 3.0 QA Suite

| ID | Work Package | Assignee | Depends On | Size (estimated) | DOD | Req. Ref |
|---|---|---|---|---|---|---|
| 3.1.1 | e2e test updates for auth gates: update existing download tests to expect email-capture modal for anonymous users; add `X-Test-Auth: bypass` header in test fixtures | qa-tester | 1.1.7, 2.2.1 | S | All 24 existing tests pass (or are updated); download test in anonymous context triggers modal expectation; bypass header correctly grants Pro mock user in test env | NFR-9, ADR-007, AC-12.6 |
| 3.1.2 | Auth flow e2e tests (`tests/e2e/auth.spec.ts`): signup, login, logout, Google OAuth happy path (mocked), password reset flow, session persistence across page load | qa-tester | 2.1.2, 2.1.4 | M | Tests cover signup valid/invalid email and password; login correct/wrong password; logout clears state; password reset token flow; all tests pass in CI | FR-4, FR-10, NFR-9, AC-F2.1–F2.5, AC-F4.1–F4.4 |
| 3.1.3 | Plan persistence + limit e2e tests (`tests/e2e/plans.spec.ts`): save plan, list in "My plans", load saved plan, free-tier 3-plan cap, upgrade CTA appearance | qa-tester | 2.3.1, 2.3.3, 1.3.1 | M | Save/load/list/delete plan flows pass; 4th save attempt triggers upgrade CTA; loaded plan renders in done state; all tests pass | FR-5, FR-6, ADR-005, AC-F3.1–F3.4, AC-P1.1 |
| 3.1.4 | Tier enforcement e2e tests (`tests/e2e/tier.spec.ts`): watermark present in free/anon download, absent in Pro download; Pro rate-limit bucket active; Pro badge in Nav; plan deletion for Pro | qa-tester | 1.4.2, 1.4.3, 1.3.2, 2.1.3 | M | Free/anon docx and pdf downloads contain watermark footer text with ?ref=export; Pro downloads contain no footer; Pro user Nav shows badge; plan delete works for Pro; all tests pass | FR-7, FR-8, AC-P3.1–P3.5, AC-A2.7 |
| 3.1.5 | Stripe checkout e2e tests (Stripe test mode): checkout redirect occurs; `?success=1` return shows Pro toast; subscription status endpoint returns `pro_active` after test webhook delivery | qa-tester | 1.5.5, 2.4.1, 2.4.2 | M | Stripe test-mode checkout initiates correctly; webhook `checkout.session.completed` processed; status returns `{tier: pro, status: active}`; Pro toast visible on redirect; all tests pass | FR-11', FR-13, AC-P2.1–P2.4 |
| 3.1.6 | Stripe webhook security tests: forged-signature delivery returns 400; duplicate delivery leaves state unchanged (idempotency); tests via Stripe CLI forward | qa-tester | 1.5.5 | S | Forged signature test returns 400; duplicate event delivery test confirms state not changed twice; all tests pass | NFR-3, NFR-18, ADR-013 |
| 3.1.7 | Paystack webhook security tests: forged-signature delivery returns 400; duplicate delivery idempotency; entitlement-from-metadata test (not from payload amount); security-engineer audit of 1.6.1 + 1.6.2 must clear BEFORE this test suite can be marked done | qa-tester | 1.6.2, 5.1.2 | M | Forged `x-paystack-signature` returns 400 (no state change); duplicate event id delivery leaves state unchanged; entitlement test confirms tier derived from plan metadata + re-verified transaction, not raw payload amount; security-engineer audit clear (no High/Critical) on 1.6.1 + 1.6.2 | FR-22, NFR-17, NFR-18, ADR-013, QA-BL2, QA-BL3 |
| 3.1.8 | Landing page regression tests: stale copy absent from build; CTA copy and ordering correct; three.js chunk absent from initial bundle (build report assertion); reduced-motion fallback (Playwright `media` emulation) | qa-tester | 2.6.1–2.6.4, 2.8.2 | S | Grep of build for stale strings returns zero matches; CTA primary/secondary order correct in DOM; 3D chunk not in initial payload; reduced-motion media query causes no 3D scene to load | FR-19, NFR-13, NFR-14, AC-CP1.4, AC-CP2.3, ADR-010 |
| 3.1.9 | `/pricing` page tests: returns 200 unauthenticated; three tiers displayed; CTA links correct; NGN shows sentinel (not a fabricated number); page accessible (axe scan passes) | qa-tester | 2.5.1, 2.5.2 | S | `/pricing` 200 without auth; Free/Pro/Team all visible; USD prices correct; NGN shown as sentinel/label; Free CTA goes to /app; all tests pass | FR-17, NFR-16, AC-CP4.1–CP4.5 |
| 3.1.10 | Auto-save on signup integration test: signup with `current_plan` in body; plan appears in "My plans" immediately; signup without plan succeeds (no 500); signup with invalid plan JSON creates account only | qa-tester | 1.1.8, 2.3.3 | S | Signup with valid plan -> plan in "My plans"; signup with missing plan -> account created, "My plans" empty; signup with invalid plan JSON -> account created (plan skipped, no 500); all tests pass | FR-15, AC-F2.4, ADR-009, QA-CV1 |

---

### 4.0 DevOps / Infrastructure

| ID | Work Package | Assignee | Depends On | Size (estimated) | DOD | Req. Ref |
|---|---|---|---|---|---|---|
| 4.1.1 | Dependency installation and lockfile: add `three`, `gsap`, `@types/three` to `package.json`; add `sqlalchemy`, `alembic`, `psycopg2-binary`, `python-jose[cryptography]`, `bcrypt`, `stripe`, `authlib`, `email-validator` to `requirements.txt`; add `httpx` or `requests` for Paystack REST (verify on install); pin exact versions; confirm `npm run build` and `pip install` succeed | devops-engineer | — | S | All deps install without conflict; `npm run build` and `npm run lint` pass; `pip install -r requirements.txt` succeeds; exact versions recorded in lockfiles; no invented SDK name or version | NFR-7, ADR-010, ADR-013 |
| 4.1.2 | Environment variable management: document and provision `JWT_SECRET` (>=256 bits), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_WEBHOOK_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DATABASE_URL`, `ENVIRONMENT`, `PUBLIC_BASE_URL`, `OPENAI_API_KEY` across local/CI/staging/prod | devops-engineer | — | S | All env vars documented; present in CI secrets; `.env.example` updated; no secret in source control; `PUBLIC_BASE_URL` resolves live before export modules ship; startup without missing env vars succeeds | NFR-2, ADR-011, AC-CP7.2 |
| 4.1.3 | PostgreSQL provisioning for staging and production: managed or self-hosted instance; `DATABASE_URL` with `sslmode=require`; Alembic migration run in CI before deploy | devops-engineer | 1.1.1 | M | Staging DB reachable from FastAPI; `alembic upgrade head` runs cleanly in CI; `sslmode=require` enforced; DB credentials not in source | NFR-7, ADR-002 |
| 4.1.4 | CI pipeline additions: Playwright e2e gate; Alembic migration gate; bundle size gate (initial route JS growth <= ~10 KB gz; 3D chunk <= ~200 KB gz); `npm run lint` gate; `npm run build` gate | devops-engineer | 3.1.1, 4.1.1 | M | All gates run on PR; failing any gate blocks merge; bundle size comparison uses build report artifact; CI passes on the main branch | NFR-13, NFR-9, ADR-010, ADR-002 |
| 4.1.5 | Stripe webhook endpoint registration: register `POST /api/webhooks/stripe` in Stripe Dashboard (test + live); configure `STRIPE_WEBHOOK_SECRET`; test delivery with `stripe listen --forward-to` | devops-engineer | 1.5.5, 4.1.2 | S | Stripe Dashboard shows endpoint registered; test webhook delivery succeeds; `stripe trigger checkout.session.completed` updates subscription in test DB | FR-13, NFR-3 |
| 4.1.6 | Paystack webhook endpoint registration: register `POST /api/webhooks/paystack` in Paystack Dashboard (test + live); configure `PAYSTACK_WEBHOOK_SECRET`; test delivery with Paystack test events | devops-engineer | 1.6.2, 4.1.2 | S | Paystack Dashboard shows endpoint registered; test event delivery succeeds; signature verification logs confirm raw-body HMAC-SHA512 path | FR-22, NFR-17 |

---

### 5.0 Security Review

| ID | Work Package | Assignee | Depends On | Size (estimated) | DOD | Req. Ref |
|---|---|---|---|---|---|---|
| 5.1.1 | Security audit of Stripe webhook handler (1.5.5): verify HMAC-SHA256 via stripe lib on raw body; idempotency; no state change on forged signature; no High/Critical findings | qa-tester | 1.5.5 | S | Security-engineer review complete; no High/Critical findings; findings addressed or risk-accepted with Engineering Lead sign-off | NFR-3, QA-S3, ADR-013 |
| 5.1.2 | Security audit of Paystack webhook handler (1.6.1, 1.6.2): verify HMAC-SHA512 on raw body BEFORE JSON parse; constant-time compare; idempotency; entitlement not from payload amount; no High/Critical findings | qa-tester | 1.6.2 | M | Security-engineer review complete; no High/Critical findings; specifically: raw-body verification confirmed; constant-time compare confirmed; entitlement path from server metadata confirmed; findings addressed or risk-accepted with Engineering Lead sign-off | NFR-17, NFR-18, ADR-013, QA-BL2, R-14, R-17 |
| 5.1.3 | Security audit of auth endpoints (1.1.3, 1.1.4, 1.1.5): JWT secret strength, bcrypt cost >= 12, httpOnly cookie attributes, no plaintext PII in logs, OAuth code exchange server-side | qa-tester | 1.1.4, 1.1.5 | S | Security-engineer review complete; no High/Critical findings; JWT secret entropy >= 256 bits confirmed; bcrypt cost >= 12 confirmed; cookie attributes verified in response headers | NFR-1, NFR-2, QA-S1, QA-S2, QA-S4 |

---

## Work Package Summary

| Layer | Count | Assignee (primary) |
|---|---|---|
| 1.0 Backend API | 23 packages | backend-dev (22), backend-dev + frontend-dev joint (1) |
| 2.0 Frontend UI | 22 packages | frontend-dev (22) |
| 3.0 QA Suite | 10 packages | qa-tester (10) |
| 4.0 DevOps | 6 packages | devops-engineer (6) |
| 5.0 Security Review | 3 packages | qa-tester (3) |
| **Total** | **64 packages** | |

---

## Sprint Plan

### Sprint 0 — Foundation Gate (pre-sprint, 2 days)

**Goal:** All pre-sprint gates passed; no feature code written until this sprint completes.

| ID | Item | Owner | Gate type |
|---|---|---|---|
| S0.1 | PRD-conversion-playbook.md + PRD-saas-pivot.md approved | Engineering Lead | Input gate |
| S0.2 | ARCHITECTURE.md §9A + §9A.12 approved | Engineering Lead | Input gate |
| S0.3 | ADR-001 through ADR-013 all accepted | Engineering Lead | Input gate |
| S0.4 | WBS.md approved (this document) | Engineering Lead | Planning gate |
| S0.5 | Q-P1 resolved (LockedDecisions section: remove or rewrite?) | Product Manager | Unblocks 2.6.2 |
| S0.6 | Q-P2 resolved (which demo scenario replaces childcare?) | Product Manager | Unblocks 2.7.1, 2.6.5 |
| S0.7 | DESIGN-SPEC (docs/DESIGN-SPEC.md) commissioning initiated with UX-designer (Gate G4) | Engineering Lead | Unblocks design-dependent UI packages |
| S0.8 | Env var list documented and provisioned in CI (4.1.2 prep) | devops-engineer | Unblocks 4.1.2 |

---

### Sprint 1 — Backend Foundation + Stale Copy Remediation (5 days)

**Sprint Goal:** Auth scaffolding live in dev; email capture and watermark working end-to-end; stale buyer-facing copy removed from the landing page. No visitor sees "no account" language while monetization features are shipping.

**Hard constraint:** 2.6.1, 2.6.3, 2.6.4 must deploy before or simultaneously with any auth feature reaching production (AC-CP1.5). These are included in Sprint 1 to enforce that gate.

| ID | Work Package | Assignee | Size |
|---|---|---|---|
| 1.1.1 | Database engine + Alembic scaffold | backend-dev | S |
| 1.1.2 | Core ORM models: User, Plan, Lead, PasswordResetToken | backend-dev | M |
| 1.1.3 | JWT + bcrypt auth helpers | backend-dev | S |
| 1.1.4 | Auth router: signup, login, logout, /api/auth/me | backend-dev | M |
| 1.1.7 | Dev-only auth bypass middleware | backend-dev | XS |
| 1.2.1 | Lead capture endpoint | backend-dev | S |
| 1.4.1 | Watermark helper module | backend-dev | XS |
| 4.1.1 | Dependency installation and lockfile | devops-engineer | S |
| 4.1.2 | Environment variable management | devops-engineer | S |
| 2.6.1 | Remove hero eyebrow stale copy | frontend-dev | XS |
| 2.6.3 | Remove footer CTA stale copy | frontend-dev | XS |
| 2.6.4 | Update primary and secondary CTA copy | frontend-dev | XS |
| 2.6.2 | Remove or rewrite LockedDecisions section (requires OD-2 / Q-P1 resolved) | frontend-dev | S |

**Capacity note:** 13 items. Backend-dev carries 7 (4M+S+XS+XS). Items 1.1.1 -> 1.1.2 -> 1.1.3 -> 1.1.4 are sequential; 1.1.7, 1.2.1, 1.4.1 are parallel after their deps. Frontend-dev carries 4 items, all XS/S, independent. DevOps carries 2 items. No XL items. Tight but achievable.

---

### Sprint 2 — Auth UI + Email Capture + Plan Persistence (5 days)

**Sprint Goal:** A user can sign up (auto-saving their generated plan), download with a watermark (email gate for anonymous), and see saved plans in "My plans". Password reset available.

| ID | Work Package | Assignee | Size |
|---|---|---|---|
| 1.1.5 | Google OAuth callback route | backend-dev | M |
| 1.1.6 | Password reset flow | backend-dev | M |
| 1.1.8 | Auto-save plan on signup (atomic transaction, ADR-009) | backend-dev | M |
| 1.4.2 | Tiered docx export + watermark | backend-dev | S |
| 1.4.3 | Tiered PDF export + watermark | backend-dev | S |
| 1.3.1 | Plan CRUD router + free-tier cap | backend-dev | M |
| 2.1.1 | Auth state management (lib/auth.ts) | frontend-dev | S |
| 2.1.2 | Login/signup modal components (DESIGN-SPEC required) | frontend-dev | M |
| 2.1.3 | Nav auth UI (DESIGN-SPEC required) | frontend-dev | S |
| 2.2.1 | Email-capture modal in ForgeApp (DESIGN-SPEC required) | frontend-dev | M |
| 2.3.2 | Free-account prompt banner/toast | frontend-dev | S |
| 3.1.1 | e2e test updates for auth gates | qa-tester | S |
| 2.7.1 | Generate new demo fixture (requires OD-3 / Q-P2 resolved) | backend-dev | S |

**Capacity note:** 13 items. Backend-dev carries 7 (4M + 2S + 1S). 1.1.5, 1.1.6, 1.1.8 depend on Sprint 1 completion and are sequential among themselves (1.1.8 depends on both 1.1.4 + 1.1.5). 1.4.2, 1.4.3 are parallel after 1.4.1 (Sprint 1). 1.3.1 can start after 1.1.2 (Sprint 1).

**DESIGN-SPEC dependency flag:** 2.1.2, 2.1.3, and 2.2.1 depend on DESIGN-SPEC. If DESIGN-SPEC has not landed by Sprint 2 day 2, these packages proceed with structural wiring only (data flow, API calls, form logic) — no visual styling — and a polish task is carried into Sprint 3. Do not block the sprint on the spec; do not ship unstyled components to production.

---

### Sprint 3 — Pro Tier: Stripe Billing + /pricing Page + Demo Update (5 days)

**Sprint Goal:** A free user who hits the 3-plan limit can upgrade to Pro via Stripe USD checkout; Pro benefits active (unlimited saves, no watermark, Pro badge); `/pricing` page live; demo and landing preview updated to new scenario.

**Capacity flag (HIGH RISK):** This sprint contains 25 items including 4 sequential M-sized backend packages in the critical path (1.5.1 -> 1.5.3 -> 1.5.4 -> 1.5.5). Engineering Lead should consider splitting across two tracks: backend-dev on billing seam first (Sprint 3A), all other items on Sprint 3B. If Sprint 2 velocity is lower than planned, defer 2.5.3 (provider-choice UI), 4.1.4 (CI bundle gate), and 5.1.3 to Sprint 4.

| ID | Work Package | Assignee | Size |
|---|---|---|---|
| 1.5.1 | BillingProvider interface + BillingRegistry | backend-dev | S |
| 1.5.2 | Subscription, Team, TeamMember models + Alembic migration | backend-dev | M |
| 1.5.3 | StripeProvider implementation | backend-dev | M |
| 1.5.4 | Subscriptions router | backend-dev | M |
| 1.5.5 | Stripe webhook handler (idempotent) | backend-dev | M |
| 1.5.6 | Stripe Customer Portal route | backend-dev | S |
| 1.5.7 | Pricing config single source of truth | backend-dev + frontend-dev | S |
| 1.3.2 | Tier-aware rate-limit key function | backend-dev | S |
| 2.3.1 | "Save plan" button + 403 upgrade CTA handling | frontend-dev | S |
| 2.3.3 | "My plans" page | frontend-dev | M |
| 2.3.4 | Load saved plan from URL param | frontend-dev | S |
| 2.4.1 | Upgrade CTA card (Stripe path) | frontend-dev | S |
| 2.4.2 | Post-checkout success state | frontend-dev | S |
| 2.4.3 | Billing portal link | frontend-dev | S |
| 2.5.1 | Pricing page structure | frontend-dev | M |
| 2.5.2 | Pricing page CTA wiring | frontend-dev | S |
| 2.5.3 | Provider-choice checkout step UI | frontend-dev | S |
| 2.7.2 | Update /demo page with new fixture | frontend-dev | XS |
| 2.6.5 | Update DemoPreviewStrip to new scenario | frontend-dev | S |
| 4.1.3 | PostgreSQL provisioning for staging/prod | devops-engineer | M |
| 4.1.4 | CI pipeline gates | devops-engineer | M |
| 4.1.5 | Stripe webhook endpoint registration | devops-engineer | S |
| 3.1.2 | Auth flow e2e tests | qa-tester | M |
| 3.1.3 | Plan persistence + limit e2e tests | qa-tester | M |
| 5.1.3 | Security audit: auth endpoints | qa-tester | S |

---

### Sprint 4 — Landing Hero (three.js + GSAP) + Stripe QA + Paystack Gate (5 days)

**Sprint Goal:** three.js + GSAP landing hero live with all guards; Stripe billing fully QA'd and security-audited; Paystack path in sprint if NGN prices are confirmed, otherwise Paystack CTA holds "coming soon".

**DESIGN-SPEC dependency flag:** 2.8.2 (HeroCanvas) and 2.8.3 (Landing compose) require DESIGN-SPEC. Do not schedule Sprint 4 until DESIGN-SPEC is delivered. If DESIGN-SPEC arrives late, 2.8.2 and 2.8.3 slip to Sprint 5 and Sprint 4 focuses on QA and Paystack.

**Paystack packages are conditional:** 1.6.1, 1.6.2, 4.1.6, 3.1.7, 5.1.2 enter Sprint 4 only if OD-1 (NGN prices confirmed) is resolved before Sprint 4 planning. Otherwise they are deferred to Sprint 5.

| ID | Work Package | Assignee | Size |
|---|---|---|---|
| 2.8.1 | HeroStatic component | frontend-dev | S |
| 2.8.2 | HeroCanvas component (three.js + GSAP) (DESIGN-SPEC required) | frontend-dev | L |
| 2.8.3 | Compose Landing.tsx: HeroStatic + HeroCanvas + social proof + distribution hooks (DESIGN-SPEC required) | frontend-dev | M |
| 2.9.1 | Referral attribution capture on landing page | frontend-dev | S |
| 2.1.4 | Password reset UI | frontend-dev | S |
| 3.1.4 | Tier enforcement e2e tests | qa-tester | M |
| 3.1.5 | Stripe checkout e2e tests | qa-tester | M |
| 3.1.6 | Stripe webhook security tests | qa-tester | S |
| 3.1.8 | Landing page regression tests | qa-tester | S |
| 3.1.9 | /pricing page tests | qa-tester | S |
| 3.1.10 | Auto-save on signup integration test | qa-tester | S |
| 5.1.1 | Security audit: Stripe webhook handler | qa-tester | S |

**Paystack (conditional on OD-1 resolved before Sprint 4 planning):**

| ID | Work Package | Assignee | Size |
|---|---|---|---|
| 1.6.1 | PaystackProvider implementation | backend-dev | L |
| 1.6.2 | Paystack webhook handler | backend-dev | M |
| 4.1.6 | Paystack webhook endpoint registration | devops-engineer | S |
| 3.1.7 | Paystack webhook security tests | qa-tester | M |
| 5.1.2 | Security audit: Paystack webhook handler | qa-tester | M |

**Capacity note:** 2.8.2 is the only L item in the confirmed list. It is a self-contained component. The Paystack L item (1.6.1) would add significant backend load — if both are in this sprint, backend-dev and frontend-dev are each carrying one L item. Flag to Engineering Lead at Sprint 3 review.

---

### Sprint 5 — Team Tier + Paystack Path Completion + Project DOD (5 days)

**Sprint Goal:** Team tier (multi-seat, white-label exports) live. Paystack checkout path live (if NGN prices confirmed in Sprint 4 or earlier). All QA suites passing. Project-level DOD achieved. Engineering Lead sign-off on the final increment.

| ID | Work Package | Assignee | Size |
|---|---|---|---|
| 1.7.1 | Team router: create, invite, accept invite, 5-seat cap | backend-dev | L |
| 1.7.2 | White-label export for team tier | backend-dev | S |
| 1.6.1 | PaystackProvider implementation (if not completed in Sprint 4) | backend-dev | L |
| 1.6.2 | Paystack webhook handler (if not completed in Sprint 4) | backend-dev | M |
| 4.1.6 | Paystack webhook endpoint registration (if not Sprint 4) | devops-engineer | S |
| 3.1.7 | Paystack webhook security tests (if not Sprint 4) | qa-tester | M |
| 5.1.2 | Security audit: Paystack webhook handler (if not Sprint 4) | qa-tester | M |

**Capacity note:** 1.7.1 is L and may need breakdown if the invite email/token lifecycle and seat-count edge cases are more complex than estimated. If during Sprint 4 review the estimate for 1.7.1 rises to XL, it must be broken down into sub-packages before Sprint 5 planning. Sprint 5 also absorbs any Paystack packages that slipped from Sprint 4. If both 1.7.1 (L) and 1.6.1 (L) land here, backend-dev carries 2L + 1M — that is a capacity risk. Escalate to Engineering Lead at Sprint 4 review.

---

## Definition of Done

### Project-Level DOD (applies to the final release increment)

- [ ] 100% of approved G1 + G2 scope work packages (64 total) delivered and independently verified.
- [ ] All acceptance criteria in PRD-conversion-playbook.md and PRD-saas-pivot.md pass with qa-tester evidence.
- [ ] Stale-copy remediation (FR-19, AC-CP1.1–CP1.4) deployed before or with auth. Grep of production build confirms zero matches for: "no account", "no persistence", "no saved drafts", "closing the tab loses".
- [ ] All Playwright e2e suites in `tests/e2e/` pass in CI (auth, plans, tier, Stripe, landing regression, pricing, auto-save).
- [ ] Stripe webhook: HMAC-SHA256 verification confirmed on raw body; idempotent; security audit (5.1.1) clear — no High/Critical findings.
- [ ] Paystack webhook: HMAC-SHA512 verified over raw body BEFORE JSON parse confirmed; constant-time compare confirmed; idempotent; entitlement derived from server-side metadata + re-verified transaction, NOT payload amount; qa-tester forged-signature + duplicate-delivery tests pass; security audit (5.1.2) clear — no High/Critical findings. Required before Paystack path ships.
- [ ] three.js + GSAP hero: initial route JS growth <= ~10 KB gz confirmed via CI build report; 3D chunk <= ~200 KB gz confirmed; reduced-motion and no-WebGL fallbacks pass e2e.
- [ ] /pricing page: accessible without auth; USD prices correct; NGN prices show confirmed values (or sentinel if still TO CONFIRM, with Paystack CTA gated).
- [ ] Auto-save on signup: plan appears in "My plans" immediately after signup; invalid/absent plan does not cause 500.
- [ ] Watermark: free/anon exports carry `?ref=export` URL; pro/team exports have no watermark; `PUBLIC_BASE_URL` resolves live.
- [ ] No regression: `npm run build`, `npm run lint`, FastAPI health endpoint all pass.
- [ ] No unresolved High/Critical security findings.
- [ ] docs/ARCHITECTURE.md updated to reflect any implementation delta from the plan.
- [ ] Engineering Lead has reviewed and signed off on the final increment. No ticket self-marked Done by the implementing developer.

### Sprint-Level DOD (applies to each sprint increment)

- [ ] All sprint WBS items completed and independently verifiable against their stated DOD criteria.
- [ ] No regression in prior sprint items — prior e2e suite passes on the sprint branch.
- [ ] `npm run build` and `npm run lint` pass before merge.
- [ ] Any blocker surfaced to Engineering Lead within the same day it is discovered (no silent blocks).
- [ ] Sprint review conducted; outcome documented; velocity recorded as "observed (T-shirt sizes delivered)".
- [ ] Any scope change or new discovery updated in this WBS document before the sprint review closes.

---

## Delivery Risks

| # | Risk | Probability | Impact | Owner | Mitigation |
|---|---|---|---|---|---|
| R1 | **Paystack webhook security misconfiguration (wrong hash algo or parsed-body verification):** The Paystack webhook requires HMAC-SHA512 over the raw request body, verified BEFORE JSON parsing. A common failure mode is computing the hash over a re-serialised body (which changes byte-for-byte), making the signature trivially bypassable. If misconfigured, a forged event grants Pro entitlement to an attacker with Critical business impact. | Medium | Critical | backend-dev + qa-tester | (a) `PaystackProvider.verify_webhook` must use Python stdlib `hmac.compare_digest(hmac.new(secret, raw_body, sha512).hexdigest(), header_value)` — raw bytes, before any JSON parse. (b) 3.1.7 includes a forged-signature test, a tampered-body test, and an idempotency test. (c) 5.1.2 security audit must explicitly confirm the raw-body path before Paystack checkout ships. (d) Paystack path is sequenced after Stripe; security audit is a hard gate. |
| R2 | **NGN prices never confirmed by product owner (OD-1) — Paystack checkout cannot ship:** ADR-013 forbids hardcoded FX-derived NGN amounts. If Pro NGN and Team NGN amounts and Paystack plan codes are not confirmed, all packages in 1.6.x, 3.1.7, 4.1.6, and 5.1.2 are blocked indefinitely. The /pricing page shows a sentinel value and the Paystack CTA is disabled. This delays NGN market coverage but does not block USD/Stripe launch. | Medium | High | Product Manager | (a) Product owner sets NGN prices as a Sprint 0 or Sprint 1 action item. (b) `lib/pricing.ts` accepts null safely; Paystack checkout is disabled when null (QA-BL4). (c) /pricing Paystack column shows "coming soon" label — no broken UX. (d) Stripe-USD ships independently in Sprint 3. (e) Escalate to Engineering Lead at Sprint 3 review if NGN prices are not confirmed; Paystack packages move to Sprint 5 or a future milestone. |
| R3 | **DESIGN-SPEC (Gate G4, OD-7) delayed, blocking auth UI and three.js hero:** Auth modal, email capture, Nav auth UI, upgrade CTAs, /pricing page, My plans page, HeroCanvas, and Landing compose all depend on the DESIGN-SPEC. If it is not delivered before Sprint 2 starts, auth UI is blocked. If not delivered before Sprint 4 starts, the three.js hero is blocked. | Medium | High | Engineering Lead + UX-designer | (a) DESIGN-SPEC commissioning is Sprint 0 gate (S0.7). (b) Structural wiring (API integration, data flow, route scaffolding, form logic) proceeds without DESIGN-SPEC; visual styling is the gated portion. (c) If DESIGN-SPEC is delayed past Sprint 2 day 2, Engineering Lead escalates immediately: structural-only UI ships in Sprint 2; a polish sprint is added after the spec lands. (d) 2.8.2 (HeroCanvas) explicitly must not start Sprint 4 without DESIGN-SPEC delivered. |

---

## Open Dependencies (Engineering Lead must track)

| # | Dependency | Blocks | Owner | Status |
|---|---|---|---|---|
| OD-1 | NGN prices confirmed by product owner: Pro NGN amount, Team NGN amount, Paystack plan codes | 1.6.1, 1.6.2, 2.5.3 (Paystack enabled), 3.1.7, 4.1.6, 5.1.2 | Product Manager | TO CONFIRM |
| OD-2 | Q-P1 resolved: what replaces or removes the LockedDecisions section? Remove or rewrite as buyer-facing differentiation? | 2.6.2 | Product Manager | Open |
| OD-3 | Q-P2 resolved: which demo scenario replaces childcare? (micro-SaaS / Lagos food delivery / online education) | 2.7.1, 2.6.5 | Product Manager | Open |
| OD-4 | Watermark base domain (`PUBLIC_BASE_URL`): which domain resolves live? Must be confirmed before export modules ship | 1.4.1, 4.1.2, AC-CP7.2 | Business/Founder | Open (Q-P3) |
| OD-5 | Contact destination for distribution hooks (typeform, Calendly, emailto) must be live at launch | 2.8.3 (distribution sections), AC-CP6.3 | Business/Founder | Not started |
| OD-6 | Analytics pipeline (PostHog or equivalent) live in production | 2.9.1, G6–G11 | Engineering / Business | Not started |
| OD-7 | DESIGN-SPEC (Gate G4) from UX-designer | 2.1.2, 2.1.3, 2.1.4, 2.2.1, 2.3.1–2.3.3, 2.4.1–2.4.3, 2.5.1, 2.8.2, 2.8.3 | UX-designer | Not yet produced |
| OD-8 | Beta user quotes / social proof content for landing page (AC-CP5.2–CP5.4) | 2.8.3 (social proof block content) | Business/Founder | Not started |
| OD-9 | Stripe account approved and live mode configured | 4.1.5, production Stripe checkout | Business/Founder | Confirm status |
| OD-10 | Paystack account approved; test and live modes configured | 4.1.6, 1.6.1, 1.6.2 | Business/Founder | Not started |

---

*End of WBS. This document is the scope baseline for the Forge Conversion Playbook + Multi-Provider Billing delivery. Any addition, removal, or change to a work package requires Engineering Lead approval and an update to this document before implementation begins.*
