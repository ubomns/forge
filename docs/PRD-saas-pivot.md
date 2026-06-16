# Forge — SaaS Pivot PRD

**Status:** Draft  
**Date:** 2026-06-11  
**Author:** Product Manager  
**Scope:** Pivot from free, no-persistence tool to monetized SaaS with tiered access, auth, and persistence.

---

## 1. Problem Statement

Forge currently generates high-quality, structured business plans but gives them away completely free with no way to capture user value, build a customer base, or monetize the output. Every generated plan is ephemeral — closing the tab loses the work. There is no mechanism to:

- Capture leads (email) before delivering high-value output (downloadable documents)
- Retain users who want to save, edit, or revisit their plans
- Convert power users to paid subscribers who generate multiple plans
- Serve teams or agencies who need multi-seat access or white-label output

**The pivot:** Introduce a lightweight monetization architecture that gates high-value actions behind incremental commitment (email → free account → paid tier → team tier) while preserving the core generation experience.

---

## 2. Target Users

| Tier | User | Job-to-be-done | Current pain |
|---|---|---|---|
| Anonymous | First-time visitor with a business idea | Get a credible first draft quickly | No way to save or download without giving something back |
| Free account | Founder who generated 1+ plans | Save plans, return to edit, build a portfolio | Plan is lost on tab close; no history |
| Pro ($19/mo) | Serious founder, accelerator applicant, repeat user | Generate unlimited plans, get priority speed, clean exports | Hit a plan cap; exports carry branding; generation queues feel slow |
| Team ($49/mo) | Business coach, cohort lead, small agency | Manage multiple clients/students, white-label deliverables, batch generate | No multi-seat; no brand removal; no bulk workflow |

---

## 3. Goals & Measurable Success Metrics

### 3.1 Primary Goals

| Goal | Metric | Target | Measurement mechanism |
|---|---|---|---|
| Capture leads | Email-to-download conversion rate | ≥ 40% of users who reach "done" state | ASSUMPTION — event tracking pipeline required. Track `plan_done` → `email_submitted` → `download_clicked` funnel. |
| Free account creation | Free-account signup rate | ≥ 15% of users who generate 1 plan | ASSUMPTION — measurement mechanism required. Track `plan_generated` (1st) → `account_created` events. |
| Paid conversion | Free-to-Pro upgrade rate | ≥ 5% of free accounts within 30 days | ASSUMPTION — measurement mechanism required. Track `account_created` → `checkout_initiated` → `subscription_active` events. |
| Revenue | Monthly Recurring Revenue (MRR) | First paid subscriber within 14 days of launch | ASSUMPTION — Stripe or equivalent payment processor required. |
| Retention | 7-day return rate for free accounts | ≥ 30% of free accounts open a saved plan within 7 days | ASSUMPTION — measurement mechanism required. |

### 3.2 Secondary Goals

| Goal | Metric | Target |
|---|---|---|
| Reduce anonymous churn | % of "done" users who download | ≥ 50% (includes email-gated) |
| Team tier validation | Team-tier inquiries or signups | ≥ 1 within 30 days of launch |
| Demo engagement | Demo-to-app conversion | ≥ 10% of `/demo` visitors click "Generate your own" |

---

## 4. Scope

### 4.1 In Scope (Must / Should)

#### Must (M) — Ships in initial SaaS launch

| ID | Feature | Rationale |
|---|---|---|
| M1 | **Email capture gate** — After plan generates, user must provide a valid email address to unlock .docx / .pdf download. | Lead capture; lowest-friction commitment before delivering high-value output. |
| M2 | **Free account tier** — After generating 1 plan, prompt user to create a free account (email + password or OAuth) to save plans and return to edit. | Retention mechanism; bridges anonymous → known user. |
| M3 | **Plan persistence** — Save generated plans to a per-user store. Load on return. Allow "My plans" list view. | Core value prop of free tier; justifies account creation. |
| M4 | **Paid Pro tier ($19/mo)** — After 3 generated plans (or 3 saved plans), prompt to upgrade. Benefits: unlimited plans, priority generation queue, watermark-free exports. | First revenue stream; caps free usage at a natural point. |
| M5 | **Watermark on free-tier exports** — "Generated with Forge" footer on .docx and .pdf for non-Pro users. | Creates visible incentive to upgrade; brands free output. |
| M6 | **Hero rewrite** — New headline: "Your business idea, taken seriously." Sub-headline about investor-ready plans, no templates, no averaging. | Positions product for founders, not generic "business idea" tourists. |
| M7 | **Audience positioning line** — Add: "Built for early-stage founders who need a credible first draft — not a generic template, and not a $3,000 consultant." | Sharpens ICP and justifies premium pricing. |
| M8 | **Auth system (lightweight)** — Email + password with secure hashing, or OAuth (Google). No over-engineering. | Required for M2, M3, M4. |
| M9 | **Simple DB** — SQLite for dev, PostgreSQL for prod. Stores users, plans, and subscription status. | Required for M3, M4. |
| M10 | **Preserve all existing functionality** — Plan generation, critique, export, investor questions, section regeneration, demo mode, landing page. | Non-negotiable baseline. |

#### Should (S) — Ships within 2 weeks of initial launch

| ID | Feature | Rationale |
|---|---|---|
| S1 | **Team tier ($49/mo)** — Multi-seat (up to 5), white-label export (no Forge branding), batch generation (up to 10 plans in one session). | Higher ACV; serves coaches/agencies. |
| S2 | **Distribution hooks** — Dedicated sections on landing page for "Cohort licensing" and "Business coaches". | Lead gen for Team tier. |
| S3 | **Demo improvements** — Replace neutral demo with high-converting scenarios: micro-SaaS for freelance designers, local food delivery in Lagos, online education platform. | Better portfolio polish; stronger proof. |
| S4 | **Priority generation queue** — Pro/Team users get a separate rate-limit bucket or faster model fallback. | Tangible Pro benefit; can be simulated with rate-limit tiers initially. |
| S5 | **Password reset flow** — Self-service email reset. | Table stakes for auth. |

### 4.2 Out of Scope (Won't)

| ID | Feature | Rationale |
|---|---|---|
| W1 | **Real-time collaboration / multi-user editing** | Too complex for initial pivot; Team tier is multi-seat consumption, not concurrent editing. |
| W2 | **Custom branding / domain white-label** | Beyond Team tier v1; defer until Team tier has paying customers. |
| W3 | **AI model selection by user** | Adds complexity; stick to gpt-4.1-mini for all tiers initially. |
| W4 | **Mobile native app** | Web-first SaaS; mobile web is sufficient. |
| W5 | **Advanced analytics dashboard for users** | No validated demand; "My plans" list is sufficient. |
| W6 | **Affiliate / referral program** | Defer until baseline monetization is proven. |
| W7 | **Internationalization (i18n)** | English-only for launch; expand if non-English demand emerges. |
| W8 | **Phone/SMS auth** | Email + OAuth is sufficient; SMS adds cost and complexity. |
| W9 | **Two-factor authentication (2FA)** | Defer until security audit demands it or enterprise tier emerges. |
| W10 | **Plan sharing / public links** | Adds moderation risk; defer. |

### 4.3 Open Questions (scope not yet determined)

| # | Question | Blocking? |
|---|---|---|
| Q1 | **Payment processor:** Stripe only, or also PayPal / Paddle for international? | Yes — affects checkout UI and backend integration. |
| Q2 | **Plan limit enforcement:** Hard cap (API rejects) or soft cap (UI prompt only)? | Yes — affects UX and backend logic. |
| Q3 | **Free tier plan limit:** Is it "1 plan saved" or "1 plan generated per session"? | Yes — affects M2 and M4 gating logic. |
| Q4 | **Team tier seat management:** Admin invites by email, or self-join with a team code? | Yes — affects S1 scope. |
| Q5 | **Email verification:** Required before download, or optional (just capture)? | Yes — affects M1 friction. |
| Q6 | **Existing sessionStorage data migration:** When a returning anonymous user creates an account, do we migrate their current session plan? | No — can default to "no" for launch. |

---

## 5. User Stories & Acceptance Criteria

### 5.1 Anonymous User Flow

#### US-A1: Generate a plan (existing functionality preserved)
**As an** anonymous user, **I want to** type my idea and generate a business plan, **so that** I see a structured output.

- **AC-A1.1:** User can access `/app` without authentication.
- **AC-A1.2:** Generation flow is unchanged: input → SSE streaming → 10 sections render.
- **AC-A1.3:** Critique, investor questions, and section regeneration remain accessible without auth.

#### US-A2: Email capture before download
**As an** anonymous user who has a completed plan, **I want to** download the .docx / .pdf, **so that** I have a portable document.

- **AC-A2.1:** Download buttons in ActionStack are visible but trigger an email-capture modal when clicked by an unauthenticated user.
- **AC-A2.2:** Modal asks for email address with clear value proposition: "Enter your email to download your plan. We'll send you a link to edit it later."
- **AC-A2.3:** Email input validates format (contains `@` and domain). Invalid emails are rejected with inline error.
- **AC-A2.4:** Email capture is **mandatory** — user cannot proceed to download without providing a valid email address.
- **AC-A2.5:** Submitting email creates a lightweight "lead" record (email + timestamp + plan snapshot) and unlocks the download for this session.
- **AC-A2.6:** After email submit, the download proceeds automatically (.docx or .pdf based on which button was clicked).
- **AC-A2.7:** Free-tier exports include a "Generated with Forge" watermark in the document footer.
- **AC-A2.8:** If user already has an account and is logged in, download proceeds immediately with no modal.

### 5.2 Free Account Tier

#### US-F1: Prompt to create free account
**As an** anonymous user who has generated 1 plan, **I want to** be prompted to save my work, **so that** I don't lose it if I close the tab.

- **AC-F1.1:** After the first plan reaches `done` state, a non-blocking banner or toast appears: "Save this plan — create a free account in 10 seconds."
- **AC-F1.2:** The prompt does not block download (download is gated on email, not account).
- **AC-F1.3:** If user dismisses the prompt, it does not reappear for 24 hours (cookie/localStorage).
- **AC-F1.4:** If user generates a 2nd plan without an account, the prompt becomes more prominent (inline card instead of toast).

#### US-F2: Create free account
**As a** user who wants to save plans, **I want to** create an account with email + password or Google, **so that** my plans are persisted.

- **AC-F2.1:** Signup form has email, password, and confirm password fields.
- **AC-F2.2:** Password minimum 8 characters.
- **AC-F2.3:** OAuth option (Google) is available as a one-click alternative.
- **AC-F2.4:** On successful signup, user is logged in, a user record is created in the DB, and any plan in the current session is auto-saved to their account.
- **AC-F2.5:** User receives a welcome email (optional for launch — can be deferred to post-launch if email service not ready).

#### US-F3: View and manage saved plans
**As a** free account user, **I want to** see a list of my saved plans, **so that** I can return to them.

- **AC-F3.1:** A "My plans" link appears in the Nav when logged in.
- **AC-F3.2:** "My plans" page shows a list of saved plans with title (derived from idea description), date generated, and a "Open" button.
- **AC-F3.3:** Clicking "Open" loads the plan into `/app` in the `done` state with all sections, critiques, and investor questions restored.
- **AC-F3.4:** Free account is limited to **3 saved plans** (ASSUMPTION — limit may change based on Q3). When limit is reached, a CTA to upgrade appears.

#### US-F4: Log in and out
**As a** returning user, **I want to** log in with my credentials, **so that** I access my saved plans.

- **AC-F4.1:** Login form has email + password fields.
- **AC-F4.2:** OAuth login (Google) works for returning users.
- **AC-F4.3:** Logged-in state is reflected in Nav (avatar or email display + logout).
- **AC-F4.4:** Logout clears the client-side auth token and refreshes the page.

### 5.3 Pro Tier ($19/mo)

#### US-P1: Upgrade prompt at plan limit
**As a** free account user with 3 saved plans, **I want to** understand why I can't save more and how to unlock unlimited plans, **so that** I can decide to upgrade.

- **AC-P1.1:** When free user hits the 3-plan save limit, an inline upgrade card appears on "My plans" and in `/app` after generation.
- **AC-P1.2:** Upgrade card clearly lists Pro benefits: unlimited plans, priority generation, no watermark.
- **AC-P1.3:** Card has a primary CTA: "Upgrade to Pro — $19/month" leading to checkout.
- **AC-P1.4:** A secondary link: "See what you get" scrolls to a feature comparison.

#### US-P2: Pro checkout and activation
**As a** user who wants Pro features, **I want to** pay securely and have my account upgraded immediately, **so that** I can use Pro features right away.

- **AC-P2.1:** Checkout is hosted (Stripe Checkout or equivalent) — we redirect to Stripe, then back to Forge on success.
- **AC-P2.2:** On successful payment, user's subscription status is updated to `pro_active` in the DB.
- **AC-P2.3:** User is redirected to `/app` with a success toast: "You're on Pro! Unlimited plans unlocked."
- **AC-P2.4:** Pro status is checked on every page load; expired subscriptions downgrade gracefully (see US-P4).

#### US-P3: Pro benefits
**As a** Pro subscriber, **I want to** enjoy unlimited plans, faster generation, and clean exports, **so that** the product feels premium.

- **AC-P3.1:** Pro users can save unlimited plans. The 3-plan limit is removed.
- **AC-P3.2:** Pro users see a "Pro" badge in the Nav.
- **AC-P3.3:** Pro exports (.docx / .pdf) do **not** include the "Generated with Forge" watermark.
- **AC-P3.4:** Pro users get a separate rate-limit bucket on `/api/generate` (e.g., 10/min vs 5/min for free) or a priority queue indicator. ASSUMPTION — exact mechanism depends on infrastructure.
- **AC-P3.5:** Pro users can delete saved plans from "My plans".

#### US-P4: Subscription management
**As a** Pro subscriber, **I want to** cancel or view my subscription, **so that** I have control over my billing.

- **AC-P4.1:** A "Billing" link in Nav (or account dropdown) opens a self-service Stripe Customer Portal.
- **AC-P4.2:** Canceling downgrades the user to free at the end of the billing period.
- **AC-P4.3:** Downgraded users retain access to existing saved plans but cannot save new ones if over the free limit.

### 5.4 Team Tier ($49/mo)

#### US-T1: Team signup and seat management
**As a** business coach or agency lead, **I want to** purchase a Team plan and invite members, **so that** my cohort can use Forge under one billing account.

- **AC-T1.1:** Team tier is purchasable from the pricing page or upgrade flow.
- **AC-T1.2:** Team plan includes up to 5 seats (ASSUMPTION — exact number may change based on demand).
- **AC-T1.3:** Admin can invite members by email; invited users receive a signup/join link.
- **AC-T1.4:** Team members log in with their own credentials but are associated with the team's billing account.

#### US-T2: Team benefits
**As a** Team member or admin, **I want to** use white-label exports and batch generation, **so that** my deliverables look professional and I can work efficiently.

- **AC-T2.1:** Team exports have no Forge watermark and no Forge header/footer branding. Document title is customizable (ASSUMPTION — may be deferred to v2).
- **AC-T2.2:** Batch generation allows submitting up to 10 ideas at once and receiving 10 plans (ASSUMPTION — may be deferred if high complexity).
- **AC-T2.3:** Team admin can view a dashboard of plans generated by team members (list only, not content — privacy within team). ASSUMPTION — measurement mechanism required.

### 5.5 Landing Page & Marketing

#### US-L1: Hero rewrite
**As a** visitor to `/`, **I want to** immediately understand that Forge is for serious founders, **so that** I feel this is the right tool for me.

- **AC-L1.1:** Hero headline reads: "Your business idea, taken seriously."
- **AC-L1.2:** Sub-headline mentions: "Investor-ready business plans in minutes. No templates. No generic filler."
- **AC-L1.3:** Audience positioning line appears below the hero or in the problem block: "Built for early-stage founders who need a credible first draft — not a generic template, and not a $3,000 consultant."
- **AC-L1.4:** Existing CTAs ("Generate your plan", "See the demo") are preserved.

#### US-L2: Distribution hooks
**As a** business coach or cohort manager visiting `/`, **I want to** see that Forge supports teams, **so that** I inquire about cohort licensing.

- **AC-L2.1:** Landing page includes a "For coaches & cohorts" block with a brief description of Team tier benefits.
- **AC-L2.2:** Block has a CTA: "Learn about team licensing" that opens a typeform, emailto, or Calendly link (ASSUMPTION — exact mechanism depends on tooling).
- **AC-L2.3:** Similar block for "For agencies" if S2 is in scope.

#### US-L3: Demo improvements
**As a** visitor to `/demo`, **I want to** see a compelling, realistic scenario, **so that** I am convinced of Forge's quality.

- **AC-L3.1:** Demo plan is replaced with one of three high-converting scenarios: (a) micro-SaaS for freelance designers, (b) local food delivery in Lagos, (c) online education platform.
- **AC-L3.2:** Scenario is chosen randomly or via tabs so visitors can see variety.
- **AC-L3.3:** Demo banner text is updated to reflect the scenario.

---

## 6. Monetization Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Landing   │────▶│   /demo     │────▶│   /app (idle)   │────▶│  Generate plan  │
│   page (/)  │     │  (no key)   │     │  (input form)   │     │  (SSE stream)   │
└─────────────┘     └─────────────┘     └─────────────────┘     └─────────────────┘
                                                                         │
                                                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              PLAN DONE STATE                                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Critique plan  │  │ Investor Qs     │  │  Regenerate     │  │  Download       │  │
│  │  (free)         │  │  (free)         │  │  (free)         │  │  (email gate)   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                                                         │
                                                                         ▼
                                                              ┌─────────────────┐
                                                              │  Email capture  │
                                                              │  modal / inline │
                                                              │  (valid email   │
                                                              │   required)     │
                                                              └─────────────────┘
                                                                         │
                                                                         ▼
                                                              ┌─────────────────┐
                                                              │  Download with  │
                                                              │  watermark      │
                                                              │  (free / lead)  │
                                                              └─────────────────┘
                                                                         │
                                                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         POST-DOWNLOAD / RETURN FLOW                                 │
│                                                                                     │
│   ┌─────────────────────────┐                                                       │
│   │  1st plan generated     │                                                       │
│   │  → Prompt: "Save your   │                                                       │
│   │     plan — create free  │                                                       │
│   │     account"            │                                                       │
│   └─────────────────────────┘                                                       │
│              │                                                                      │
│              ▼                                                                      │
│   ┌─────────────────────────┐     ┌─────────────────────────┐                      │
│   │  Free account created   │────▶│  2nd plan saved         │                      │
│   │  → Can save up to 3     │     │  → 3rd plan saved       │                      │
│   │    plans                │     │  → Limit approaching    │                      │
│   └─────────────────────────┘     └─────────────────────────┘                      │
│                                              │                                      │
│                                              ▼                                      │
│                                   ┌─────────────────────────┐                      │
│                                   │  3-plan limit hit         │                      │
│                                   │  → Upgrade CTA to Pro     │                      │
│                                   │    ($19/mo)             │                      │
│                                   └─────────────────────────┘                      │
│                                              │                                      │
│                                              ▼                                      │
│                                   ┌─────────────────────────┐                      │
│                                   │  Pro checkout (Stripe)  │                      │
│                                   │  → Unlimited plans      │                      │
│                                   │  → No watermark         │                      │
│                                   │  → Priority queue       │                      │
│                                   └─────────────────────────┘                      │
│                                              │                                      │
│                                              ▼                                      │
│                                   ┌─────────────────────────┐                      │
│                                   │  Team tier inquiry      │                      │
│                                   │  ($49/mo, 5 seats,      │                      │
│                                   │   white-label, batch)   │                      │
│                                   └─────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Prioritization (MoSCoW + Ship Order)

### Phase 1: Foundation (Week 1)

| Priority | Feature | Why first |
|---|---|---|
| M | Auth + DB scaffolding | Blocks everything else. |
| M | Email capture gate | Lowest-lift monetization; captures leads immediately. |
| M | Watermark on free exports | Creates upgrade incentive from day one. |
| M | Preserve existing e2e tests | Quality gate; must not regress. |

### Phase 2: Free Tier (Week 2)

| Priority | Feature | Why second |
|---|---|---|
| M | Free account creation | Retention bridge. |
| M | Plan persistence + "My plans" | Core free-tier value. |
| S | Password reset | Table stakes, but can be Week 2. |

### Phase 3: Pro Tier (Week 3)

| Priority | Feature | Why third |
|---|---|---|
| M | Pro upgrade prompt at 3-plan limit | Revenue activation. |
| M | Stripe checkout + subscription status | Actually collect money. |
| M | Pro benefits (unlimited, no watermark, priority) | Deliver on promise. |
| S | Billing portal (Stripe Customer Portal) | Self-service cancellation. |

### Phase 4: Polish & Team (Week 4+)

| Priority | Feature | Why fourth |
|---|---|---|
| S | Team tier | Higher complexity; validate Pro demand first. |
| S | Distribution hooks (coaches, agencies) | Marketing surface; low engineering risk. |
| S | Demo improvements | Conversion optimization; can ship anytime. |
| S | Hero rewrite + audience positioning | Marketing copy; can ship in parallel with Phase 1. |

---

## 8. Risk Assessment

### 8.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Auth integration breaks existing sessionStorage flow** | Medium | High | Keep sessionStorage as a fallback for anonymous users. Only replace with DB persistence after account creation. Ensure `ForgeApp` state machine can work with or without a logged-in user. |
| **DB schema changes require migration strategy** | Medium | Medium | Start with a simple schema (users, plans, subscriptions). Use Alembic or similar for migrations. Freeze schema before Phase 3. |
| **Rate-limiting logic must distinguish tier levels** | Medium | Medium | FastAPI `slowapi` supports custom limit keys. Use `user_id` for authenticated users, `ip` for anonymous. Pro users get higher limits or separate buckets. |
| **Export watermark requires docx/pdf template changes** | Low | Medium | Watermark is a footer addition in `api/export.py` and `api/export_pdf.py`. Conditionally include based on `subscription_tier` passed in request body. |
| **e2e tests fail due to auth gates** | Medium | High | Add `data-testid` attributes for auth modal. Create a `test:e2e:auth` suite or use test fixtures that bypass email gate (dev-only flag). Update existing tests to expect email modal on download. |
| **Next.js + FastAPI auth token passing** | Medium | Medium | Pass auth token (JWT or session cookie) from Next.js to FastAPI on every request. FastAPI validates token. If using Next.js API routes as proxies, they can attach the token. If using dev rewrites, token must be in request headers. |

### 8.2 Business Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Email gate causes drop-off > 60%** | Medium | High | A/B test modal vs. inline form. Offer "Download without saving" as a lower-friction option. Track funnel religiously. |
| **Free-to-Pro conversion < 2%** | Medium | High | Ensure 3-plan limit is a real friction point (not just a banner). Make watermark visible and prominent. Offer annual billing discount. |
| **Team tier has zero demand** | Medium | Medium | Ship Team tier as "contact us" first (Calendly/typeform) before building full multi-seat UI. Validate demand with S2 distribution hooks. |
| **Users perceive watermark as cheap / spammy** | Low | Medium | Design watermark as subtle footer text, not intrusive banner. "Generated with Forge — forgeplans.com" |
| **Competitors undercut on price** | Medium | Medium | Differentiate on quality (critic agent, structured outputs) not just price. Position as "credible first draft" not "cheap template." |

### 8.3 External Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Stripe account approval delays** | Low | High | Apply for Stripe account immediately. Have Paddle or Lemon Squeezy as fallback. |
| **OpenAI API cost increases** | Low | Medium | Monitor cost per plan. Pro tier pricing covers ~50 plans/month at current gpt-4.1-mini pricing. Adjust if model changes. |
| **Email deliverability issues** | Low | Low | Use a transactional email provider (SendGrid, Postmark, Resend). Verify domain before launch. |

---

## 9. Dependencies

| Dependency | Required for | Status | Owner |
|---|---|---|---|
| **Payment processor account** (Stripe) | M4, S1 | Not started | Business / Founder |
| **Transactional email provider** | M2 (welcome), S5 (password reset) | Not started | Business / Founder |
| **Domain verification** (DNS) | Email deliverability, Stripe | Not started | Business / Founder |
| **PostgreSQL instance** (prod) | M9 | Not started | Engineering |
| **Auth library decision** (email vs OAuth vs both) | M8 | Not started | Engineering |
| **Event tracking pipeline** (PostHog, Plausible, or Segment) | Success metrics | Not started | Engineering / Business |
| **Privacy policy + ToS** | Any account creation | Not started | Business / Legal |
| **Cookie consent banner** (GDPR) | Email capture, analytics | Not started | Engineering |

---

## 10. Assumptions

Every unvalidated claim is labeled below. If an assumption is disproven, the PRD must be revised.

| # | Assumption | Validation method |
|---|---|---|
| A1 | **40% email-to-download conversion** is achievable with a single-field modal. | Track funnel from day one; if < 30%, iterate on copy and friction. |
| A2 | **3 free saved plans** is the right limit before upgrade prompt. | ASSUMPTION — no data. May adjust to 2 or 5 based on behavior. |
| A3 | **$19/mo Pro pricing** is acceptable to target users. | ASSUMPTION — no pricing research conducted. Monitor checkout-initiation rate. |
| A4 | **Priority generation** can be delivered via rate-limit differentiation alone (no separate infra). | ASSUMPTION — technical feasibility. If FastAPI + slowapi cannot express tiered limits easily, priority may be simulated with a "Pro" badge only initially. |
| A5 | **Users will tolerate a watermark** on free exports. | ASSUMPTION — no user research. If complaints are high, watermark can be made smaller or moved to final page only. |
| A11 | **Mandatory email capture** will not cause >60% download abandonment. | ASSUMPTION — track funnel from day one. If drop-off is high, iterate on modal copy and value proposition. |
| A6 | **SQLite for dev / PostgreSQL for prod** is sufficient; no need for managed NoSQL. | ASSUMPTION — based on schema simplicity (users, plans, subscriptions). If plan storage volume grows unexpectedly, reassess. |
| A7 | **OAuth (Google) is sufficient**; no need for GitHub, Apple, etc. at launch. | ASSUMPTION — based on ICP (founders often use Google Workspace). Add others if requested. |
| A8 | **Team tier demand exists** without quantitative validation. | ASSUMPTION — defer full build until "contact us" form generates 5+ inquiries. |
| A9 | **Existing e2e tests can be updated** to handle auth gates without a full rewrite. | ASSUMPTION — test architecture. Add auth-bypass flag or dedicated test user for CI. |
| A10 | **SessionStorage plans can be lost** when user creates an account; no migration required. | ASSUMPTION — low user friction. If feedback says otherwise, add a one-click "Save current plan to your new account" flow. |

---

## 11. Non-Goals (Reinforced)

These are explicitly **not** part of this PRD, even if they seem adjacent:

1. **Changing the core generation pipeline** — drafter + critic, structured outputs, SSE wire format, and schema remain untouched.
2. **Adding new plan sections or changing the schema** — 10 sections remain as shipped in M1.
3. **Building a mobile app** — Web-only.
4. **Real-time collaboration** — Team tier is multi-seat consumption, not concurrent editing.
5. **Custom AI model selection** — gpt-4.1-mini for all tiers.
6. **Affiliate/referral program** — Defer.
7. **Public plan sharing / SEO pages** — Defer.
8. **Advanced user analytics** — "My plans" list is sufficient.
9. **Phone/SMS auth or 2FA** — Defer.
10. **Internationalization** — English-only.

---

## 12. Acceptance Criteria Summary (Testable Checklist)

### 12.1 Anonymous Flow

- [ ] Anonymous user can generate a plan without auth.
- [ ] Download button triggers email-capture modal for anonymous users.
- [ ] Invalid email format is rejected with inline error.
- [ ] Email capture is mandatory — user cannot download without providing a valid email.
- [ ] Valid email submission unlocks download and creates a lead record.
- [ ] Free-tier .docx export contains "Generated with Forge" footer.
- [ ] Free-tier .pdf export contains "Generated with Forge" footer.

### 12.2 Auth & Free Tier

- [ ] User can sign up with email + password.
- [ ] User can sign up with Google OAuth.
- [ ] Password must be ≥ 8 characters.
- [ ] On signup, current session plan is saved to user's account.
- [ ] "My plans" page lists saved plans with title and date.
- [ ] Clicking a saved plan loads it in `/app` in `done` state.
- [ ] Free user cannot save more than 3 plans.
- [ ] Login works for returning users.
- [ ] Logout clears auth state and refreshes page.

### 12.3 Pro Tier

- [ ] Free user sees upgrade CTA when attempting to save plan #4.
- [ ] Upgrade CTA links to Stripe Checkout.
- [ ] Successful payment updates user to `pro_active`.
- [ ] Pro user sees "Pro" badge in Nav.
- [ ] Pro user can save unlimited plans.
- [ ] Pro exports do NOT contain watermark.
- [ ] Pro user has higher rate limit or priority indicator.
- [ ] Billing portal link opens Stripe Customer Portal.
- [ ] Canceling subscription downgrades to free at period end.

### 12.4 Team Tier (Should)

- [ ] Team tier is purchasable.
- [ ] Admin can invite up to 5 members by email.
- [ ] Team members can log in and use Forge.
- [ ] Team exports have no Forge branding.

### 12.5 Landing & Marketing

- [ ] Hero headline reads "Your business idea, taken seriously."
- [ ] Audience positioning line is visible on landing page.
- [ ] "For coaches & cohorts" block exists with CTA.
- [ ] Demo page shows one of three high-converting scenarios.

### 12.6 Regression & Quality

- [ ] All existing e2e tests pass (or are updated to reflect auth gates).
- [ ] Plan generation, critique, investor questions, and regeneration work for all tiers.
- [ ] `/demo` works without auth and without API key.
- [ ] `npm run build` and `npm run lint` pass.
- [ ] FastAPI health endpoint returns `ok`.

---

## 13. Open Questions (Reiterated)

These must be resolved before engineering begins on the affected feature:

1. **Q1 — Payment processor:** Stripe only, or also Paddle/PayPal for international?  
2. **Q2 — Plan limit enforcement:** Hard API cap or soft UI prompt?  
3. **Q3 — Free tier plan limit:** 1 generated? 1 saved? 3 saved?  
4. **Q4 — Team seat management:** Admin invite or self-join code?  
5. **Q5 — Email verification:** Required before download. Email capture is mandatory, not optional.  
6. **Q6 — Session-to-account migration:** Migrate current session plan on signup?  
7. **Q7 — Auth token strategy:** JWT in localStorage, or httpOnly cookie session?  
8. **Q8 — Dev auth:** How do e2e tests bypass auth gates in CI?  
9. **Q9 — Watermark design:** Text only, or include Forge logo/URL?  
10. **Q10 — Annual discount:** Offer 2 months free for annual Pro billing?

---

*End of PRD. This document is a living spec. Update when assumptions are validated, open questions are resolved, or scope changes.*
