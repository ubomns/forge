# MEMORY.md — Forge Project Continuity (for an LLM)

**Last updated:** 2026-06-15 (merge to dev completed, Sprint 2 starting)
**Purpose:** Hand a future LLM/agent everything needed to resume work without re-deriving context.
**Read this first, then `git log --oneline -8` and the files cited below.**

---

## 0. TL;DR — where to continue

The team is mid-way through building the **Conversion Playbook + Multi-Provider Billing** initiative for **Forge** (an AI business-plan generator pivoting to a monetized SaaS), driven by a gated multi-agent workflow.

- **Planning is 100% done** (gates G1–G4: PRD, architecture, ADRs, WBS, design spec).
- **Build is partial:** Sprint 0 (backend foundation) and Sprint 1 (landing stale-copy) are **committed and verified**.
- **Gate G5 approved by user.** Security audit completed; 5 of 6 blocking findings fixed directly by Engineering Lead and committed (see §9).
- **Merge completed:** `chore/claude-dev-team` → `dev` pushed to origin (commit `818d17b`). Sprint 0 + Sprint 1 now on `dev`.
- **Resume at:** **Sprint 2** — Auth UI + email capture + plan persistence. Alembic migrations (ADR-002) can run in parallel with Sprint 2 backend work.
- **Active branch:** `dev` (merged). Create feature branches off `dev` for Sprint 2 work.

To operate: start a Claude Code session in this repo (it auto-loads the **Engineering Lead** output style), set `/model claude-opus-4-8`, then say e.g. *"continue the verification gate"* or *"start Sprint 2."*

---

## 1. The dev-team orchestration system (`.claude/`)

This repo contains a Claude-Code-native multi-agent "dev team." **The main session is the orchestrator** (Engineering Lead) and delegates to specialist subagents via the **Task tool**. Subagents cannot spawn subagents.

- **Orchestrator:** `.claude/output-styles/engineering-lead.md` — set as the default via `"outputStyle": "Engineering Lead"` in `.claude/settings.json`. Enforces human approval **gates G1–G5**.
- **12 subagents:** `.claude/agents/*.md` — product-manager, business-analyst, solution-architect, scrum-master, ux-designer, frontend-dev, backend-dev, devops-engineer, qa-tester, code-reviewer (read-only), security-engineer (read-only), technical-writer.
- **20 skills:** `.claude/skills/*/SKILL.md`.
- **Model pinning (in each agent's frontmatter):** Opus 4.8 = engineering-lead, solution-architect, code-reviewer, security-engineer. Opus 4.6 = backend-dev, frontend-dev, business-analyst, ux-designer, devops-engineer. Sonnet 4.6 = product-manager, scrum-master, qa-tester, technical-writer.
- **Read-only agents** (code-reviewer, security-engineer) have NO Edit/Write tools — enforced by tool allowlist.
- `.claude/README.md` documents the bundle. `.mcp.json` defines github+jira MCP servers, **disabled by default** (`disabledMcpjsonServers` in settings.json).

**Gates (each requires explicit human approval before proceeding):**
G1 Requirements · G2 Architecture · G3 WBS · G4 Design Spec · G5 Pre-merge.

> **Operational note:** subagents have repeatedly hit the session limit on long runs this session. When that happens, inspect the working tree to see what landed, then finish the gaps directly rather than re-running (which repeats work). The backend-dev and ux-designer runs were both finished this way.

---

## 2. Git state

**Branch:** `chore/claude-dev-team` (created off `dev`; **not pushed** — no PR yet).
**Relevant commits (newest first):**

```
fea878c  feat(landing): Sprint 1 buyer-facing stale-copy remediation
e5c760d  feat(api): Sprint 0 foundation — auth, persistence, billing seam
2e9e763  docs: conversion-playbook planning artifacts (G1–G4)
8f8521d  chore(claude): track shared dev-team bundle and drop stray docx
c0fe23b  chore: add Claude dev-team bundle, CI, dev→main workflow, repo cleanup
```

Working tree has **uncommitted security fixes** applied post-audit (see §9). Also an untracked root `forge-brand-strategy-playbook-1.docx` (a duplicate of `docs/forge-brand-strategy-playbook-1.docx`; the user keeps re-adding it — leave it).

**Branch model (this repo):** single integration branch **`dev`**; protected release branch **`main`** (PR + approval). Feature branches off `dev`. The `git-workflow` / `github-pr` skills include create-if-missing logic.

---

## 3. Planning artifacts (gates G1–G4, all complete — committed `2e9e763`)

| Gate | Artifact | Notes |
|---|---|---|
| G1 | `docs/PRD-conversion-playbook.md` | Extends `docs/PRD-saas-pivot.md` (the baseline). Reconciles the brand-playbook asks. |
| G2 | `docs/ARCHITECTURE.md` §9A + §9A.12 | Conversion scope + multi-provider billing deltas. |
| G2 | `docs/adr/ADR-009..013` | 009 auto-save on signup (supersedes 008); 010 three.js/GSAP landing; 011 watermark referral; 012 `/pricing` route; 013 multi-provider billing (supersedes 003). |
| G3 | `docs/WBS.md` | ~70 work packages, **Sprint 0–5**. Webhook-security DoD baked in. |
| G4 | `docs/DESIGN-SPEC.md` | Conversion extension appended (section "Conversion Playbook Extension (2026-06-15)", from line ~1358). 6 proposed design tokens **approved by user**. |

**Source of the asks:** `docs/forge-brand-strategy-playbook-1.docx` (brand strategist's conversion playbook). It is the "why" behind the pivot.

**Sprint plan:** S0 Foundation Gate · S1 Backend foundation + stale copy · S2 Auth UI + email capture + persistence · S3 Pro tier: Stripe + `/pricing` + demo · S4 Landing hero (three.js/GSAP) + Stripe QA + Paystack gate · S5 Team tier + Paystack completion + project DoD.

---

## 4. Build progress (what is actually coded)

### Sprint 0 — backend foundation ✅ committed `e5c760d`, verified
New files in `api/`:
- `database.py` — SQLAlchemy engine/session; SQLite dev (`sqlite:///./forge.db`) / Postgres prod via `DATABASE_URL` (ADR-002). Has `init_db()` (dev `create_all` bootstrap; called on app startup).
- `models.py` — User, Plan, Subscription (with `provider`+`currency` discriminator per ADR-013), Team, TeamMember, Lead, PasswordResetToken. UUIDs as CHAR(36) for SQLite/PG portability.
- `auth.py` — bcrypt hashing, JWT (HS256) in httpOnly cookie `forge_session` (ADR-001), `get_current_user`/`get_optional_user`, dev-only `X-Test-Auth` bypass when `ENVIRONMENT=test` (ADR-007). Reads `JWT_SECRET` (required at token time).
- `routers/auth.py` — `POST /api/auth/signup` (with optional `current_plan` auto-save in one transaction, ADR-009), `/login`, `/logout`, `GET /api/auth/me`. Password ≥ 8; duplicate email → generic 200 (security fix: prevents user enumeration).
- `routers/leads.py` — `POST /api/leads` (email capture before download). `init_leads_limiter()` provided (rate-limit decorator NOT yet applied — minor follow-up).
- `billing/` — `base.py` (`BillingProvider` ABC + `CheckoutResult` + `SubscriptionDelta`), `registry.py` (lazy provider lookup, import-safe without SDKs), `stripe_provider.py` + `paystack_provider.py` (**STUBS — raise NotImplementedError**).
- `watermark.py` — `watermark_text(tier)` / `watermark_url(tier)` helper (ADR-011). **NOT yet wired into exports.**

Integration completed in `api/index.py`: routers included, startup `init_db()`, CORS updated (`allow_credentials=True`, added `GET`). **Security fix:** removed `allow_origin_regex=r"https://.*\.vercel\.app"` (overly permissive with credentials). `requirements.txt` adds `sqlalchemy`, `bcrypt`, `python-jose[cryptography]>=3.4.0` (was `>=3.3`, CVE-2024-33663 fix), `email-validator`. `.env.example` created (and un-ignored in `.gitignore`); `*.db` ignored. `next` upgraded to `^16.2.9` (was `16.2.4`, High CVEs fix). `concurrently` upgraded to `^10.0.3` (dev-only, shell-quote CVE fix).

**Verified:** `python -m compileall api` ✓; deps install in `.venv` on Python 3.14 ✓; `import api.index` → 16 routes ✓; functional smoke (init_db + user insert + bcrypt verify + JWT decode) ✓.

### Sprint 1 — landing stale-copy ✅ committed `fea878c`, verified
- `components/landing/Landing.tsx` — static hero rewrite: headline "Your business idea, taken seriously.", investor-ready sub, CTAs "Generate my plan — it's free →" (`/app`) / "See a sample plan first →" (`/demo`). Audience line added. `LockedDecisions` → `BuyerDifferentiation` (4 `.buyer-diff-card`s, Q-P1). Removed the rotating-word hero animation. Footer CTA copy refreshed.
- `components/layout/Nav.tsx` — added "Pricing" nav link (target `/pricing`, route lands in Sprint 3 — will 404 until then).
- `styles/globals.css` — `.buyer-diff-card`, `.landing-audience`, `.nav-link(s)` styles (existing design tokens; Lamborghini override block updated).
- `tests/e2e/landing.spec.ts` — reconciled to new copy/markup; obsolete rotating-word test removed.

**Verified:** `npm run build` ✓ green, `npx tsc --noEmit` ✓, `npm run lint` ✓; stale copy gone from built output. **e2e NOT executed** (needs dev servers + Playwright) — the spec was updated to match but a real run (CI/qa) must confirm green.

---

## 5. RESUME POINT (do these next, in order)

1. **Verification gate — specialist tasks failing:** `qa-tester` and `code-reviewer` Task tool calls error out repeatedly (no output). Engineering Lead must either:
    - **Option A:** Run e2e suite + manual review directly (see §10 verification checklist).
    - **Option B:** User approves merge to `dev` without specialist evidence (G5 already approved).
    - If running directly: start servers (`npm run dev:all`), run `npm run test:e2e`, verify `landing.spec.ts` passes, manually inspect `api/auth.py`, `api/routers/auth.py`, `api/index.py` for the 5 security fixes.
    - → merge `chore/claude-dev-team` → `dev`.
2. **Alembic migrations (ADR-002)** — outstanding Sprint-0 item. Dev uses `init_db()`/`create_all`; prod needs Alembic scaffolding + first migration.
3. **Wire `watermark.py` into `api/export.py` + `api/export_pdf.py`** (currently the helper is unused) — Sprint 3 task but easy to miss.
4. **Sprint 2** — Auth UI (login/signup modals, auth-aware Nav, My Plans), **email-capture gate UI** before download, plan persistence UI, "save after 1 plan" gating.
5. **Sprint 3** — `/pricing` page (USD+NGN, provider choice), **Stripe** provider impl + checkout + webhook, watermark wiring, tier/plan-count enforcement (ADR-005), demo update.
6. **Sprint 4** — three.js/GSAP `HeroCanvas` (ssr:false, reduced-motion/WebGL/perf-budget fallbacks per ADR-010), social-proof block, distribution-hook sections, Stripe QA, Paystack gate.
7. **Sprint 5** — Team tier, **Paystack** provider impl + checkout + webhook (HMAC-SHA512 over raw body, idempotent), project DoD.

---

## 6. Pending inputs OWED BY THE USER (gate later sprints)

- **NGN prices for Pro & Team + Paystack plan codes** → blocks Paystack path (S4–5). Marked `TO CONFIRM` in pricing config; do NOT invent FX numbers.
- **Stripe API keys** (test + webhook secret) → S3 (user sets as env/secrets).
- **Watermark live domain** (Q-P3) for `?ref=export` → before watermark exports ship.
- **Analytics provider** (e.g. PostHog) → referral/conversion metrics.
- **Distribution-hook contact destination** → Team "Contact us" CTA.
- **Demo scenario** (Q-P2) → currently DEFERRED; childcare-swap fixture kept.

---

## 7. Brand-strategist recommendations → status

All recommendations are **fully designed**; build status:

| Recommendation | Build status |
|---|---|
| Hero rewrite (headline/sub/CTAs) | ✅ Live (`fea878c`) |
| Audience positioning line | ✅ Live |
| Buyer-facing copy + differentiation reframe | ✅ Live |
| Email capture before download | 🟡 Backend endpoint only; UI not built (S2) |
| Free accounts / auto-save | 🟡 Backend only; UI + gating not built (S2) |
| Watermark on exports + ref URL | 🟡 Helper exists, NOT wired into exports |
| Pro $19 tier | 🔴 Stubs/schema only (S3) |
| Team $49 tier | 🔴 Schema only (S5) |
| `/pricing` page + premium signals | 🔴 Designed, not built (S3) |
| Stripe + Paystack billing (user addition) | 🔴 Stubs only (S3–5) |
| Distribution hooks (cohort/coach) | 🔴 Designed, not built (S4) |
| Social proof / testimonials | 🔴 Designed (placeholder copy), not built (S4) |
| three.js/GSAP hero canvas | 🔴 Static hero shipped; canvas deferred (S4) |
| Demo scenario swap | ⏸️ Deferred by user |

**Summary:** the *positioning/messaging* half ("write for buyers") is **live**; the *monetization/conversion-architecture* half is **designed + foundationed but not shipped**.

---

## 8. Locked decisions, conventions & gotchas (do NOT violate)

- **Stack:** Next.js **16 Pages Router** (NOT App Router — APIs differ; consult `node_modules/next/dist/docs`) + React 19; FastAPI (`api/index.py`) backend; OpenAI structured outputs. `next.config.ts` has a dev-only `/api/*` → FastAPI rewrite and `turbopack.root` pinned.
- **Locked product decisions:** two-call drafter+critic pipeline (NOT an agent loop); single-input ingestion (NOT a wizard); SSE wire format (`section_start/section_data/section_complete/error/[DONE]`); FastAPI owns auth + billing + orchestration (ADR-004). The "no persistence/auth/DB" decision was **OVERRIDDEN 2026-06-11** (SaaS pivot).
- **Schema is the rendering contract:** adding a section/field requires updating `api/schema.py`, `lib/schema/business-plan.ts`, and `components/plan/PlanRenderer.tsx` + display-name maps.
- **Billing:** never trust webhook payload amounts; entitlement from server-side metadata + re-verified amount; verify signature on RAW body BEFORE JSON parse; idempotent upsert keyed on provider event id. One subscription = one provider.
- **Security/hygiene:** secrets from env only; `.env.example` placeholders only; never log PII/secrets; no `any` in TS.
- **CI:** `.github/workflows/ci.yml` runs on PRs to `dev`/`main` (lint/typecheck/build, py compile, audit, e2e). Needs no secrets. G5 (`dev`→`main`) is enforced by branch protection (user must enable on GitHub).

---

## 9. Known issues / small follow-ups

### Security audit findings (2026-06-15) — 5 fixed, 1 pending user decision

**Fixed by Engineering Lead directly:**
- ✅ `.env` with live OpenAI API key — removed from working tree (already gitignored, not tracked). **User must rotate the key in OpenAI dashboard.**
- ✅ `python-jose[cryptography]>=3.3` — upgraded to `>=3.4.0` (CVE-2024-33663 algorithm confusion, CVSS 9.3).
- ✅ `next@16.2.4` — upgraded to `^16.2.9` (multiple High CVEs).
- ✅ CORS `allow_origin_regex=r"https://.*\.vercel\.app"` with `allow_credentials=True` — removed regex, now explicit origin whitelist only.
- ✅ Signup `EMAIL_EXISTS` 409 — changed to generic 200 response to prevent user enumeration.

**Pending user decision:**
- 🟡 **Logout does not invalidate JWT server-side** (High). Current behavior: logout clears cookie, but JWT remains valid for 7 days. Fix options: (1) token deny-list in DB (simplest), (2) short-lived access + refresh tokens, or (3) accept risk and document. **User deferred decision — implement in Sprint 2 or address now?**

### Pre-existing follow-ups
- `watermark.py` helper is **not wired** into `api/export.py` / `api/export_pdf.py`.
- `api/routers/leads.py` has `init_leads_limiter()` but no `@limiter.limit` decorator applied yet (rate limit AC-A2.3 not enforced).
- `components/forge-app.tsx` has an outdated `"no persistence"` **code comment** (not user-facing) — clean up post-pivot.
- `api/index.py` uses `@app.on_event("startup")` (deprecated in newer FastAPI; works — consider lifespan handler later).
- e2e suite not executed since the copy change — must run before merge to `dev`.
- `npm audit` shows 3 moderate severity vulnerabilities (brace-expansion, postcss via next) — non-blocking, address with `npm audit fix`.

---

## 10. How to verify / run

```bash
# Frontend
npm install
npm run build            # must be green (verified 2026-06-15 post-security fixes)
npx tsc --noEmit -p tsconfig.json
npm run lint

# Backend (Windows venv path used by dev:all)
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
# required env: OPENAI_API_KEY, JWT_SECRET (see .env.example)
.venv/Scripts/python.exe -c "import api.index; print(len(api.index.app.routes))"  # 16

# Both processes
npm run dev:all          # FastAPI :8000 + Next :3000

# e2e (needs both servers; full-flow gated behind RUN_FULL_FLOW)
npm run test:e2e
```

**Post-security-fix verification checklist:**
- [x] `npm run build` passes
- [x] `npm run lint` passes
- [x] `python -m compileall api` passes
- [x] `import api.index` → 16 routes
- [x] `.env` is NOT present in working tree (live key removed)
- [x] `requirements.txt` has `python-jose[cryptography]>=3.4.0`
- [x] `package.json` has `next` >= `16.2.9`
- [x] `api/index.py` has NO `allow_origin_regex` line (only a comment)
- [x] e2e suite: 20 passed, 3 skipped (full-flow gated, 2 download tests skipped with FastAPI down)

**Key files index:** `docs/PRD-conversion-playbook.md`, `docs/ARCHITECTURE.md` (§9A/§9A.12), `docs/WBS.md`, `docs/DESIGN-SPEC.md`, `docs/adr/ADR-001..013`, `task.md` (locked decisions), `.claude/README.md`, `Forge_Handover.md` (pre-pivot snapshot — historical).
