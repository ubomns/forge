# Forge — SaaS Pivot Architecture

**Status:** Proposed (SaaS pivot) + Conversion Playbook extension Accepted (§9A, 2026-06-15) + Multi-Provider Billing Accepted (§9A.12, 2026-06-15)  
**Date:** 2026-06-11 (pivot); extended 2026-06-15 (conversion playbook); extended 2026-06-15 (multi-provider billing)  
**Author:** Solution Architect  
**Scope:** Pivot from free, no-persistence tool to monetized SaaS with tiered access, auth, persistence, and payments. **§9A** extends this with the conversion-playbook scope (auto-save on signup, three.js/GSAP landing, `/pricing` route, watermark referral attribution) per Gate G1 and ADR-009…ADR-012. **§9A.12** extends billing from Stripe-only to **multi-provider (Stripe USD + Paystack NGN, user-selected at checkout)** per Gate G2 and ADR-013 (which supersedes ADR-003).

---

## Table of Contents

1. [Context & Stakeholders](#1-context--stakeholders)
2. [Requirements Traceability](#2-requirements-traceability)
3. [Quality-Attribute Scenarios](#3-quality-attribute-scenarios)
4. [4+1 Architectural Views](#4-41-architectural-views)
5. [Data Architecture](#5-data-architecture)
6. [Interfaces & Contracts](#6-interfaces--contracts)
7. [Threat Model (STRIDE)](#7-threat-model-stride)
8. [Tech Stack](#8-tech-stack)
9. [Trade-off Analysis (ATAM)](#9-trade-off-analysis-atam)
9A. [Conversion Playbook Extension (2026-06-15)](#9a-conversion-playbook-extension-2026-06-15)
10. [Migration Plan](#10-migration-plan)
11. [Deliberately Out of Scope](#11-deliberately-out-of-scope)
12. [Appendix: ADR Index](#12-appendix-adr-index)

---

## 1. Context & Stakeholders

### 1.1 System Overview

Forge is an AI-assisted business plan generator. The pre-pivot architecture is a two-process system:

- **Next.js** (`:3000`) — UI layer, thin API proxies, sessionStorage-based session persistence
- **FastAPI** (`:8000`) — Orchestration layer: OpenAI calls, schema validation, .docx/.pdf export generation
- **OpenAI** (`gpt-4.1-mini`) — LLM provider via structured outputs

The SaaS pivot introduces:
- **User identity** (email/password + Google OAuth)
- **Plan persistence** (per-user stored plans)
- **Tiered access** (Anonymous → Free → Pro $19/mo → Team $49/mo)
- **Payment processing** (Stripe Checkout + Customer Portal)
- **Lead capture** (email gate before download)

### 1.2 Stakeholders & Concerns (ISO/IEC/IEEE 42010)

| Stakeholder | Concern | Quality Attribute |
|---|---|---|
| **Founder / End User** | Generate a plan quickly; save and revisit; download without friction | Usability, Performance |
| **Free Tier User** | Save up to 3 plans; understand upgrade value | Usability, Functional Suitability |
| **Pro Subscriber** | Unlimited plans, fast generation, clean exports | Performance, Functional Suitability |
| **Team Admin** | Manage seats, white-label exports, batch generate | Functional Suitability, Maintainability |
| **Product Manager** | Track conversion funnels; iterate on pricing | Maintainability, Portability |
| **Security Engineer** | Protect PII; secure auth; prevent fraud | Security, Reliability |
| **Developer** | Incremental deployability; clear contracts; minimal schema drift | Maintainability, Compatibility |
| **Operator** | Monitor health; scale DB; manage Stripe webhooks | Reliability, Scalability |

---

## 2. Requirements Traceability

### 2.1 Functional Requirements (FR-x)

Derived from `docs/PRD-saas-pivot.md` §4.1, §5, §12.

| ID | Requirement | Source |
|---|---|---|
| FR-1 | Anonymous users can generate a complete business plan without authentication | M10, US-A1 |
| FR-2 | Download (.docx / .pdf) is gated by mandatory email capture for anonymous users | M1, US-A2 |
| FR-3 | Email capture creates a lightweight lead record (email + timestamp + plan snapshot) | M1, AC-A2.5 |
| FR-4 | Free account creation via email + password or Google OAuth | M2, M8, US-F2 |
| FR-5 | Free accounts can save up to 3 plans; view them in "My plans" list | M3, US-F3 |
| FR-6 | Saved plans load into `/app` in `done` state with all sections, critiques, investor questions restored | M3, AC-F3.3 |
| FR-7 | Pro tier ($19/mo) unlocks unlimited plans, priority generation, watermark-free exports | M4, US-P3 |
| FR-8 | Free-tier exports include "Generated with Forge" footer watermark | M5, US-A2 |
| FR-9 | Team tier ($49/mo) includes up to 5 seats, white-label exports, batch generation | S1, US-T1 |
| FR-10 | Self-service password reset via email | S5, US-F2 |
| FR-11 | Stripe Checkout hosted flow for Pro/Team subscription | M4, S1, US-P2 |
| FR-12 | Stripe Customer Portal for subscription management (cancel, update) | S5, US-P4 |
| FR-13 | Subscription status sync via Stripe webhooks | US-P2, US-P4 |
| FR-14 | All existing functionality preserved: generation, critique, export, investor questions, regeneration, demo mode | M10 |

### 2.2 Non-Functional Requirements (NFR-x)

| ID | Requirement | Source |
|---|---|---|
| NFR-1 | **Security:** Passwords hashed with bcrypt (cost factor ≥ 12) | M8 |
| NFR-2 | **Security:** JWT signed with HS256, stored in httpOnly cookie, 7-day expiry | Resolved Q7 |
| NFR-3 | **Security:** Stripe webhook signatures validated with `stripe-python` | FR-13 |
| NFR-4 | **Performance:** Plan generation latency ≤ 45s for 10-section structured output (P95) | Existing baseline |
| NFR-5 | **Performance:** "My plans" list query ≤ 200ms (P95) | M3 |
| NFR-6 | **Reliability:** SSE wire format unchanged; existing client parser continues to work | Constraint |
| NFR-7 | **Scalability:** SQLite for dev, PostgreSQL for prod; schema must support both | M9 |
| NFR-8 | **Maintainability:** Single source of truth for schema (Pydantic → TypeScript) | Existing convention |
| NFR-9 | **Testability:** e2e tests can bypass auth gates via dev-only header | PRD resolved Q8 |
| NFR-10 | **Deployability:** Incremental rollout in 4 phases without breaking existing flow | PRD §7 |
| NFR-11 | **Privacy:** No PII logged in plaintext; email addresses encrypted at rest if possible | Security posture |
| NFR-12 | **Compliance:** GDPR cookie consent banner for analytics and auth cookies | PRD §9 Dependencies |

---

## 3. Quality-Attribute Scenarios

Driving scenarios derived from ADD / ISO/IEC 25010.

### 3.1 Performance

| ID | Scenario | Measure |
|---|---|---|
| QA-P1 | Anonymous user submits idea; first SSE `section_start` event arrives | ≤ 3s (P95) |
| QA-P2 | Full 10-section plan generation completes | ≤ 45s (P95) |
| QA-P3 | Logged-in user opens "My plans" page | ≤ 200ms (P95) |
| QA-P4 | Pro user gets higher rate-limit bucket than free user | 10/min vs 5/min |

### 3.2 Security

| ID | Scenario | Measure |
|---|---|---|
| QA-S1 | Attacker with stolen JWT cannot forge tokens | HS256 secret ≥ 256 bits |
| QA-S2 | Attacker with DB dump cannot read plaintext passwords | bcrypt hash irreversible |
| QA-S3 | Attacker sends forged Stripe webhook | Signature validation rejects |
| QA-S4 | XSS cannot steal auth token | httpOnly cookie; no localStorage token |

### 3.3 Reliability

| ID | Scenario | Measure |
|---|---|---|
| QA-R1 | FastAPI restart does not lose in-flight generation | Stateless; client reconnects |
| QA-R2 | Stripe webhook delivery failure retries | 24h retry window; idempotent handlers |
| QA-R3 | DB connection failure degrades gracefully | Anonymous generation still works |

### 3.4 Maintainability

| ID | Scenario | Measure |
|---|---|---|
| QA-M1 | Adding a new tier requires changes in ≤ 3 files | Tier config centralized |
| QA-M2 | Schema change propagates to TS types automatically | Manual mirror; documented |
| QA-M3 | New developer understands auth flow in ≤ 15 min | Documented in ARCHITECTURE.md |

### 3.5 Scalability

| ID | Scenario | Measure |
|---|---|---|
| QA-SC1 | 100 concurrent anonymous generations | Rate limiter + OpenAI quota |
| QA-SC2 | 10,000 registered users | PostgreSQL handles with connection pooling |

---

## 4. 4+1 Architectural Views

### 4.1 Logical View (Components & Responsibilities)

```mermaid
graph TB
    subgraph Browser
        UI[Next.js UI Layer]
        SS[sessionStorage<br/>Anonymous Session]
    end

    subgraph NextJS["Next.js (:3000)"]
        PROXY["API Proxy Routes<br/>(pages/api/*.ts)"]
        AUTH["Auth Helpers<br/>JWT cookie read/write"]
    end

    subgraph FastAPI["FastAPI (:8000)"]
        GEN["/api/generate<br/>SSE Streaming"]
        CRIT["/api/critique"]
        REGEN["/api/regenerate"]
        INV["/api/investor-questions"]
        EXP["/api/export<br/>Watermark conditional"]
        EXP_PDF["/api/export-pdf<br/>Watermark conditional"]
        AUTH_API["/api/auth/*<br/>Login/Signup/OAuth"]
        PLAN_API["/api/plans/*<br/>CRUD + List"]
        SUB_API["/api/subscriptions/*<br/>Status + Checkout"]
        STRIPE_WH["/api/webhooks/stripe<br/>Idempotent handler"]
        RATE["Rate Limiter<br/>slowapi (tier-aware)"]
        VAL["Pydantic Schema Validation"]
    end

    subgraph Data["Data Layer"]
        DB[(SQLite dev / PostgreSQL prod)]
        CACHE[(Optional: Redis<br/>Rate limit + Sessions)]
    end

    subgraph External["External Services"]
        OPENAI[OpenAI API]
        STRIPE[Stripe API]
        GOOGLE[Google OAuth 2.0]
    end

    UI -->|fetch /api/*| PROXY
    UI -->|read/write| SS
    PROXY -->|proxy + attach cookie| GEN
    PROXY -->|proxy + attach cookie| CRIT
    PROXY -->|proxy + attach cookie| REGEN
    PROXY -->|proxy + attach cookie| INV
    PROXY -->|proxy + attach cookie| EXP
    PROXY -->|proxy + attach cookie| EXP_PDF
    PROXY -->|proxy| AUTH_API
    PROXY -->|proxy + attach cookie| PLAN_API
    PROXY -->|proxy + attach cookie| SUB_API
    PROXY -->|proxy| STRIPE_WH

    GEN -->|structured outputs| OPENAI
    CRIT -->|structured outputs| OPENAI
    REGEN -->|structured outputs| OPENAI
    INV -->|structured outputs| OPENAI
    AUTH_API -->|verify token| GOOGLE
    SUB_API -->|create session| STRIPE
    STRIPE_WH -->|event delivery| STRIPE

    GEN --> VAL
    CRIT --> VAL
    REGEN --> VAL
    INV --> VAL
    EXP --> VAL
    EXP_PDF --> VAL

    AUTH_API --> DB
    PLAN_API --> DB
    SUB_API --> DB
    STRIPE_WH --> DB

    GEN --> RATE
    CRIT --> RATE
    REGEN --> RATE
    INV --> RATE
    EXP --> RATE
    EXP_PDF --> RATE
```

#### Component Responsibilities

| Component | Responsibility | Technology |
|---|---|---|
| **Next.js UI** | Render landing, app, demo, auth modals, "My plans", pricing. Manage client-side state (sessionStorage for anonymous, React state for auth). | Next.js 16.2.4, React 19, Tailwind v4, framer-motion v12 |
| **Next.js API Proxy** | Forward requests to FastAPI, attach `Cookie` header, handle CORS preflight in production. No business logic. | Next.js API Routes |
| **FastAPI Auth** | Register, login, OAuth callback, password reset. Issue JWT in httpOnly cookie. Validate JWT on every protected request. | FastAPI, `python-jose`, `bcrypt`, `authlib` |
| **FastAPI Plans** | CRUD for saved plans. Enforce plan count limits per tier. Serialize/deserialize `BusinessPlan` JSON. | FastAPI, SQLAlchemy |
| **FastAPI Subscriptions** | Create Stripe Checkout sessions. Return subscription status. Redirect to Customer Portal. | FastAPI, `stripe-python` |
| **FastAPI Webhooks** | Receive Stripe webhooks. Idempotently update subscription status in DB. Validate signatures. | FastAPI, `stripe-python` |
| **FastAPI Generate** | Unchanged orchestration: OpenAI structured outputs → SSE section events. Add tier-aware rate limits. | FastAPI, `openai>=1.40` |
| **FastAPI Export** | Conditionally append watermark footer based on user's subscription tier. | `python-docx`, `fpdf2` |
| **Rate Limiter** | `slowapi` with custom key function: `user_id` for authenticated, `ip` for anonymous. Tier-aware limits. | `slowapi` |
| **Database** | Users, plans, subscriptions, teams, leads, password reset tokens. SQLite dev / PostgreSQL prod. | SQLAlchemy 2.x, Alembic |

### 4.2 Process View (Runtime Behaviour)

#### 4.2.1 Anonymous Plan Generation (Unchanged Flow)

```mermaid
sequenceDiagram
    actor U as Anonymous User
    participant UI as Next.js UI
    participant PROXY as Next.js Proxy
    participant GEN as FastAPI /api/generate
    participant OPENAI as OpenAI

    U->>UI: Type idea, click Generate
    UI->>PROXY: POST /api/generate {description, industry, stage, market_context}
    PROXY->>GEN: Proxy request (no cookie)
    GEN->>GEN: slowapi: rate limit by IP (5/min)
    GEN->>OPENAI: chat.completions.create (structured outputs)
    OPENAI-->>GEN: Complete BusinessPlan JSON
    GEN->>GEN: BusinessPlan.model_validate()
    loop Section-by-section
        GEN-->>PROXY: SSE: section_start
        PROXY-->>UI: SSE: section_start
        GEN-->>PROXY: SSE: section_data
        PROXY-->>UI: SSE: section_data
        GEN-->>PROXY: SSE: section_complete
        PROXY-->>UI: SSE: section_complete
    end
    GEN-->>PROXY: SSE: [DONE]
    PROXY-->>UI: SSE: [DONE]
    UI->>UI: status = 'done', save to sessionStorage
```

#### 4.2.2 Email Capture → Download (New Flow)

```mermaid
sequenceDiagram
    actor U as Anonymous User
    participant UI as Next.js UI
    participant PROXY as Next.js Proxy
    participant LEAD as FastAPI /api/leads
    participant EXP as FastAPI /api/export

    U->>UI: Click "Download .docx"
    UI->>UI: Check auth state (no cookie)
    UI->>UI: Show email-capture modal
    U->>UI: Enter email, submit
    UI->>PROXY: POST /api/leads {email, plan_snapshot}
    PROXY->>LEAD: Proxy request
    LEAD->>LEAD: Validate email format
    LEAD->>DB: Insert lead record
    LEAD-->>PROXY: 200 {lead_id}
    PROXY-->>UI: 200
    UI->>UI: Unlock download, proceed
    UI->>PROXY: POST /api/export {plan_data, tier: 'anonymous'}
    PROXY->>EXP: Proxy request
    EXP->>EXP: Build docx with watermark footer
    EXP-->>PROXY: StreamingResponse (docx bytes)
    PROXY-->>UI: Blob download
```

#### 4.2.3 Auth Flow (JWT httpOnly Cookie)

```mermaid
sequenceDiagram
    actor U as User
    participant UI as Next.js UI
    participant PROXY as Next.js Proxy
    participant AUTH as FastAPI /api/auth
    participant DB as Database
    participant GOOGLE as Google OAuth

    %% Email + Password Signup
    U->>UI: Fill signup form (email, password)
    UI->>PROXY: POST /api/auth/signup {email, password}
    PROXY->>AUTH: Proxy request
    AUTH->>AUTH: Validate password ≥ 8 chars
    AUTH->>AUTH: Hash password with bcrypt
    AUTH->>DB: INSERT user (email, password_hash)
    AUTH->>AUTH: Create JWT (sub=user.id, exp=7d)
    AUTH-->>PROXY: 200 + Set-Cookie: forge_session=<jwt>; HttpOnly; Secure; SameSite=Lax
    PROXY-->>UI: 200 + Set-Cookie (proxied)
    UI->>UI: Logged-in state = true

    %% Google OAuth
    U->>UI: Click "Sign up with Google"
    UI->>UI: Redirect to Google OAuth consent
    GOOGLE-->>UI: Authorization code
    UI->>PROXY: POST /api/auth/oauth/google {code}
    PROXY->>AUTH: Proxy request
    AUTH->>GOOGLE: Exchange code for tokens + userinfo
    GOOGLE-->>AUTH: {email, sub}
    AUTH->>DB: SELECT user by email
    alt User exists
        AUTH->>AUTH: Create JWT
    else New user
        AUTH->>DB: INSERT user (email, google_id)
        AUTH->>AUTH: Create JWT
    end
    AUTH-->>PROXY: 200 + Set-Cookie
    PROXY-->>UI: 200 + Set-Cookie

    %% Authenticated Request
    U->>UI: Click "My plans"
    UI->>PROXY: GET /api/plans (Cookie: forge_session=...)
    PROXY->>AUTH: Proxy with Cookie header
    AUTH->>AUTH: Decode & verify JWT
    AUTH->>DB: SELECT plans WHERE user_id = sub
    DB-->>AUTH: Plan list
    AUTH-->>PROXY: 200 {plans: [...]}
    PROXY-->>UI: 200
```

#### 4.2.4 Stripe Checkout → Subscription Activation

```mermaid
sequenceDiagram
    actor U as Free User
    participant UI as Next.js UI
    participant PROXY as Next.js Proxy
    participant SUB as FastAPI /api/subscriptions
    participant STRIPE as Stripe API
    participant DB as Database
    participant WH as FastAPI /api/webhooks/stripe

    U->>UI: Click "Upgrade to Pro"
    UI->>PROXY: POST /api/subscriptions/checkout {price_id, tier}
    PROXY->>SUB: Proxy (authenticated)
    SUB->>DB: Get user.stripe_customer_id
    alt No customer_id
        SUB->>STRIPE: customers.create({email})
        STRIPE-->>SUB: customer_id
        SUB->>DB: UPDATE user.stripe_customer_id
    end
    SUB->>STRIPE: checkout.sessions.create({customer, price, mode: subscription})
    STRIPE-->>SUB: {url}
    SUB-->>PROXY: 200 {checkout_url}
    PROXY-->>UI: 200
    UI->>U: Redirect to Stripe Checkout

    U->>STRIPE: Complete payment
    STRIPE->>WH: POST /api/webhooks/stripe (checkout.session.completed)
    WH->>WH: Verify signature
    WH->>DB: SELECT user by stripe_customer_id
    WH->>DB: INSERT/UPDATE subscription (status=active, tier=pro)
    WH-->>STRIPE: 200 OK

    U->>STRIPE: Redirect back to /app?success=1
    UI->>UI: Show success toast
    UI->>PROXY: GET /api/subscriptions/status
    PROXY->>SUB: Proxy
    SUB->>DB: SELECT subscription
    DB-->>SUB: {tier: pro, status: active}
    SUB-->>PROXY: 200
    PROXY-->>UI: Pro badge unlocked
```

### 4.3 Development View (Module / Package Organisation)

```mermaid
graph LR
    subgraph Frontend["Next.js (frontend/)"]
        PAGES["pages/"]
        COMP["components/"]
        LIB["lib/"]
        STYLES["styles/"]
        TESTS["tests/e2e/"]
    end

    subgraph Backend["FastAPI (api/)"]
        API_ROOT["api/"]
        MODELS["api/models.py<br/>SQLAlchemy ORM"]
        SCHEMA["api/schema.py<br/>Pydantic (unchanged)"]
        AUTH_MOD["api/auth.py<br/>JWT, bcrypt, OAuth"]
        DB_MOD["api/database.py<br/>Engine, SessionLocal"]
        EXPORT_MOD["api/export.py<br/>+ watermark"]
        EXPORT_PDF_MOD["api/export_pdf.py<br/>+ watermark"]
        ROUTES["api/routers/"]
        MIGRATIONS["alembic/"]
    end

    PAGES --> LIB
    COMP --> LIB
    LIB --> SCHEMA
    API_ROOT --> SCHEMA
    API_ROOT --> MODELS
    API_ROOT --> AUTH_MOD
    API_ROOT --> DB_MOD
    API_ROOT --> EXPORT_MOD
    API_ROOT --> EXPORT_PDF_MOD
    ROUTES --> MODELS
    ROUTES --> AUTH_MOD
    ROUTES --> DB_MOD
```

#### File-Level Changes

| File | Change | Rationale |
|---|---|---|
| `api/models.py` | **New.** SQLAlchemy models: `User`, `Plan`, `Subscription`, `Team`, `TeamMember`, `Lead`, `PasswordResetToken` | Data persistence |
| `api/database.py` | **New.** `create_engine`, `SessionLocal`, `get_db()` dependency. SQLite dev / PostgreSQL prod via env var. | DB connection management |
| `api/auth.py` | **New.** `create_access_token`, `verify_password`, `get_current_user` dependency, Google OAuth flow. | Auth logic |
| `api/routers/auth.py` | **New.** `/api/auth/signup`, `/api/auth/login`, `/api/auth/oauth/google`, `/api/auth/me`, `/api/auth/password-reset`, `/api/auth/password-reset-confirm` | Auth endpoints |
| `api/routers/plans.py` | **New.** `/api/plans` (GET list, POST create, GET {id}, DELETE {id}) | Plan persistence |
| `api/routers/subscriptions.py` | **New.** `/api/subscriptions/status`, `/api/subscriptions/checkout`, `/api/subscriptions/portal` | Subscription management |
| `api/routers/leads.py` | **New.** `/api/leads` (POST create) | Lead capture |
| `api/routers/webhooks.py` | **New.** `/api/webhooks/stripe` | Stripe webhook handler |
| `api/index.py` | **Modified.** Register new routers. Add `get_current_user` optional dependency to existing routes for tier-aware rate limiting. | Integration point |
| `api/export.py` | **Modified.** Accept `tier` parameter; conditionally append watermark footer. | Tiered export |
| `api/export_pdf.py` | **Modified.** Accept `tier` parameter; conditionally append watermark footer. | Tiered export |
| `lib/schema/business-plan.ts` | **Modified.** Add `User`, `Subscription`, `Plan` types. | TypeScript contract |
| `components/forge-app.tsx` | **Modified.** Add auth state, email-capture modal, tier checks before download. | UX integration |
| `components/layout/Nav.tsx` | **Modified.** Add auth UI (login/signup buttons, avatar, "My plans" link). | Navigation |
| `pages/my-plans.tsx` | **New.** List view of saved plans. | Free tier value |
| `pages/app.tsx` | **Modified.** Load saved plan from query param. | Plan restoration |
| `tests/e2e/auth.spec.ts` | **New.** Auth flow tests with bypass flag. | Test coverage |
| `tests/e2e/tier.spec.ts` | **New.** Tier enforcement tests. | Test coverage |
| `requirements.txt` | **Modified.** Add `sqlalchemy`, `alembic`, `psycopg2-binary`, `python-jose[cryptography]`, `bcrypt`, `stripe`, `authlib`, `email-validator` | Dependencies |

### 4.4 Physical / Deployment View

```mermaid
graph TB
    subgraph Client["Client"]
        BROWSER["Browser"]
    end

    subgraph Vercel["Vercel (Production)"]
        NEXT["Next.js Server<br/>Node.js 20"]
    end

    subgraph VPS["VPS / Container (Production)"]
        FASTAPI["FastAPI Server<br/>Uvicorn + Gunicorn"]
    end

    subgraph Data["Data Layer"]
        POSTGRES[("PostgreSQL<br/>Managed or self-hosted")]
        REDIS[("Redis<br/>Optional: rate limit + sessions")]
    end

    subgraph External["External"]
        OPENAI["OpenAI API"]
        STRIPE["Stripe API + Webhooks"]
        GOOGLE["Google OAuth"]
    end

    BROWSER -->|HTTPS| NEXT
    NEXT -->|HTTPS internal| FASTAPI
    FASTAPI -->|TLS 1.2+| POSTGRES
    FASTAPI -->|TLS 1.2+| REDIS
    FASTAPI -->|TLS 1.2+| OPENAI
    FASTAPI -->|TLS 1.2+| STRIPE
    FASTAPI -->|TLS 1.2+| GOOGLE
    STRIPE -->|Webhook POST| FASTAPI
```

#### Environment Topology

| Environment | Next.js | FastAPI | Database | Notes |
|---|---|---|---|---|
| **Local Dev** | `next dev` (:3000) | `uvicorn` (:8000) | SQLite (`forge.db`) | `npm run dev:all` starts both |
| **CI / Test** | `next build` + Playwright | `uvicorn` (:8000) | SQLite (`:memory:` or temp file) | `X-Test-Auth: bypass` header enabled |
| **Staging** | Vercel Preview | VPS / Container | PostgreSQL (staging) | Stripe test mode |
| **Production** | Vercel | VPS / Container | PostgreSQL (prod) | Stripe live mode, `Secure` cookies |

### 4.5 Scenarios View (+1) — Key Use Cases

#### Scenario 1: Anonymous User Generates and Downloads

1. User visits `/app`, types idea, clicks Generate
2. FastAPI `/api/generate` streams SSE sections (unchanged)
3. Plan renders in UI; sessionStorage persists
4. User clicks "Download .docx"
5. UI detects no auth cookie → shows email-capture modal
6. User submits email → POST `/api/leads` creates lead record
7. UI proceeds to POST `/api/export` with `tier: 'anonymous'`
8. FastAPI generates docx with "Generated with Forge" watermark
9. Browser triggers download

#### Scenario 2: Free User Saves and Hits Limit

1. User generates 1st plan, sees "Save your plan — create free account" banner
2. User clicks, signs up with email + password
3. FastAPI creates user, issues JWT cookie, auto-saves current plan
4. User visits "My plans", sees 1 saved plan
5. User generates 2nd plan, saves it (2/3)
6. User generates 3rd plan, saves it (3/3)
7. User generates 4th plan, clicks Save → UI shows upgrade CTA
8. FastAPI POST `/api/plans` returns 403 `{error: {code: "PLAN_LIMIT_REACHED", message: "Upgrade to Pro to save unlimited plans."}}`

#### Scenario 3: Pro User Checkout and Export

1. Free user clicks "Upgrade to Pro" on limit CTA
2. UI calls POST `/api/subscriptions/checkout` → receives Stripe Checkout URL
3. Redirect to Stripe, complete payment
4. Stripe webhook `checkout.session.completed` hits FastAPI
5. FastAPI updates subscription to `pro_active`
6. User redirected to `/app?success=1`
7. UI fetches `/api/subscriptions/status` → shows Pro badge
8. User downloads export → no watermark; rate limit = 10/min

---

## 5. Data Architecture

### 5.1 Entity-Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ PLAN : owns
    USER ||--o{ SUBSCRIPTION : has
    USER ||--o{ LEAD : creates
    USER ||--o{ PASSWORD_RESET_TOKEN : has
    TEAM ||--o{ TEAM_MEMBER : has
    TEAM ||--o{ SUBSCRIPTION : has
    USER ||--o{ TEAM_MEMBER : belongs_to

    USER {
        uuid id PK
        string email UK
        string password_hash "nullable"
        string google_id "nullable, UK"
        string stripe_customer_id "nullable"
        enum tier "anonymous|free|pro|team"
        datetime created_at
        datetime updated_at
    }

    PLAN {
        uuid id PK
        uuid user_id FK
        string title
        json plan_data "BusinessPlan JSON"
        string idea_description
        datetime created_at
        datetime updated_at
    }

    SUBSCRIPTION {
        uuid id PK
        uuid user_id FK "nullable"
        uuid team_id FK "nullable"
        string stripe_subscription_id UK
        string stripe_price_id
        enum status "incomplete|active|canceled|past_due"
        enum tier "pro|team"
        datetime current_period_start
        datetime current_period_end
        datetime created_at
        datetime updated_at
    }

    TEAM {
        uuid id PK
        string name
        uuid admin_id FK
        integer seat_limit "default 5"
        datetime created_at
        datetime updated_at
    }

    TEAM_MEMBER {
        uuid id PK
        uuid team_id FK
        uuid user_id FK
        enum role "admin|member"
        datetime created_at
    }

    LEAD {
        uuid id PK
        string email
        json plan_snapshot "nullable"
        string source "download|signup"
        datetime created_at
    }

    PASSWORD_RESET_TOKEN {
        uuid id PK
        uuid user_id FK
        string token_hash UK
        datetime expires_at
        datetime used_at "nullable"
        datetime created_at
    }
```

### 5.2 SQLAlchemy Models (Python)

```python
# api/models.py — simplified representation
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Enum, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship
import uuid
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    stripe_customer_id = Column(String(255), nullable=True, index=True)
    tier = Column(Enum("anonymous", "free", "pro", "team", name="user_tier"), default="free")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    plans = relationship("Plan", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user")
    team_memberships = relationship("TeamMember", back_populates="user")

class Plan(Base):
    __tablename__ = "plans"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    plan_data = Column(JSON, nullable=False)
    idea_description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="plans")

class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True, index=True)
    stripe_subscription_id = Column(String(255), unique=True, nullable=False)
    stripe_price_id = Column(String(255), nullable=False)
    status = Column(Enum("incomplete", "active", "canceled", "past_due", name="sub_status"), default="incomplete")
    tier = Column(Enum("pro", "team", name="sub_tier"), nullable=False)
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="subscriptions")
    team = relationship("Team", back_populates="subscriptions")

class Team(Base):
    __tablename__ = "teams"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    seat_limit = Column(Integer, default=5)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="team")

class TeamMember(Base):
    __tablename__ = "team_members"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    role = Column(Enum("admin", "member", name="team_role"), default="member")
    created_at = Column(DateTime, default=datetime.utcnow)

    team = relationship("Team", back_populates="members")
    user = relationship("User", back_populates="team_memberships")

class Lead(Base):
    __tablename__ = "leads"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, index=True)
    plan_snapshot = Column(JSON, nullable=True)
    source = Column(Enum("download", "signup", name="lead_source"), default="download")
    created_at = Column(DateTime, default=datetime.utcnow)

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
```

### 5.3 Pydantic Schema Models (API Contracts)

```python
# api/schema.py — additions to existing schema
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr

class UserSignupRequest(UserBase):
    password: str = Field(min_length=8)

class UserLoginRequest(UserBase):
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    tier: str
    created_at: datetime

class PlanCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    plan_data: BusinessPlan
    idea_description: str

class PlanResponse(BaseModel):
    id: str
    title: str
    idea_description: str
    created_at: datetime
    updated_at: datetime

class PlanDetailResponse(PlanResponse):
    plan_data: BusinessPlan

class LeadCreateRequest(BaseModel):
    email: EmailStr
    plan_snapshot: Optional[dict] = None
    source: str = "download"

class SubscriptionStatusResponse(BaseModel):
    tier: str  # "free", "pro", "team"
    status: str  # "active", "canceled", "past_due", "none"
    current_period_end: Optional[datetime] = None

class CheckoutRequest(BaseModel):
    price_id: str
    tier: str  # "pro" or "team"

class CheckoutResponse(BaseModel):
    checkout_url: str

class PortalResponse(BaseModel):
    portal_url: str
```

### 5.4 Data Flows

| Flow | Data | Classification | Encryption |
|---|---|---|---|
| Browser → FastAPI (auth) | Email, password | **PII / Sensitive** | TLS 1.2+ in transit; bcrypt at rest |
| Browser → FastAPI (plan) | Business idea, generated plan | **Business-sensitive** | TLS 1.2+ in transit; stored as JSON in DB |
| FastAPI → OpenAI | Business idea, plan JSON | **Business-sensitive** | TLS 1.2+ in transit; OpenAI processes per their policy |
| FastAPI → Stripe | Customer email, subscription metadata | **PII / Financial** | TLS 1.2+ in transit; Stripe handles PCI compliance |
| Stripe → FastAPI (webhook) | Subscription status, customer ID | **Financial** | TLS 1.2+; signature validated |
| FastAPI → DB | All persisted data | **Mixed** | PostgreSQL SSL/TLS connection; SQLite file-level encryption not used (dev only) |

### 5.5 Data Residency & Retention

| Data Type | Residency | Retention Policy |
|---|---|---|
| User account | Primary DB | Until deletion request |
| Saved plans | Primary DB | Until user deletes or account deletion |
| Leads | Primary DB | 2 years, then anonymize email |
| Password reset tokens | Primary DB | 24 hours or until used |
| Subscription records | Primary DB | 7 years (tax/billing compliance) |
| Session cookies | Client browser | 7 days (JWT expiry) |
| Anonymous session | sessionStorage | Tab lifetime only |

### 5.6 PII Classification

| Field | PII Level | Protection |
|---|---|---|
| `users.email` | **Direct PII** | Unique index, never logged in plaintext, not exposed in APIs except to owner |
| `users.password_hash` | **Credential** | bcrypt with salt, not readable |
| `users.google_id` | **Indirect PII** | Unique index, not exposed in APIs |
| `users.stripe_customer_id` | **Financial PII** | Not exposed in APIs |
| `plans.plan_data` | **Business-sensitive** | Owned by user; not shared |
| `leads.email` | **Direct PII** | Same as `users.email` |

---

## 6. Interfaces & Contracts

### 6.1 Auth Cookie Contract

```
Name:     forge_session
Value:    <JWT>
Domain:   <production domain>
Path:     /
HttpOnly: true
Secure:   true (production) / false (dev)
SameSite: Lax
Max-Age:  604800 (7 days)
```

JWT Payload:
```json
{
  "sub": "<user_uuid>",
  "email": "<user_email>",
  "tier": "free|pro|team",
  "iat": 1718083200,
  "exp": 1718688000
}
```

### 6.2 API Endpoints — New

| Method | Path | Auth | Request | Response | Description |
|---|---|---|---|---|---|
| POST | `/api/auth/signup` | No | `{email, password}` | `UserResponse` + Set-Cookie | Email/password signup |
| POST | `/api/auth/login` | No | `{email, password}` | `UserResponse` + Set-Cookie | Email/password login |
| POST | `/api/auth/oauth/google` | No | `{code}` | `UserResponse` + Set-Cookie | Google OAuth callback |
| GET | `/api/auth/me` | Yes | — | `UserResponse` | Current user info |
| POST | `/api/auth/password-reset` | No | `{email}` | `{message}` | Request reset email |
| POST | `/api/auth/password-reset-confirm` | No | `{token, new_password}` | `UserResponse` + Set-Cookie | Confirm reset |
| GET | `/api/plans` | Yes | — | `PlanResponse[]` | List user's plans |
| POST | `/api/plans` | Yes | `PlanCreateRequest` | `PlanResponse` | Save a plan |
| GET | `/api/plans/{id}` | Yes | — | `PlanDetailResponse` | Load a plan |
| DELETE | `/api/plans/{id}` | Yes | — | `{deleted}` | Delete a plan |
| POST | `/api/leads` | No | `LeadCreateRequest` | `{lead_id}` | Capture lead email |
| GET | `/api/subscriptions/status` | Yes | — | `SubscriptionStatusResponse` | Current subscription |
| POST | `/api/subscriptions/checkout` | Yes | `CheckoutRequest` | `CheckoutResponse` | Start Stripe checkout |
| POST | `/api/subscriptions/portal` | Yes | — | `PortalResponse` | Stripe Customer Portal |
| POST | `/api/webhooks/stripe` | No (sig check) | Stripe payload | `200 OK` | Stripe events |

### 6.3 API Endpoints — Modified

| Method | Path | Change | Description |
|---|---|---|---|
| POST | `/api/generate` | Add optional `Authorization` header (cookie). Rate limit key = `user_id` if auth, else `ip`. | Tier-aware rate limiting |
| POST | `/api/critique` | Same as above. | Tier-aware rate limiting |
| POST | `/api/regenerate` | Same as above. | Tier-aware rate limiting |
| POST | `/api/investor-questions` | Same as above. | Tier-aware rate limiting |
| POST | `/api/export` | Accept `tier` in request body (or infer from auth). Conditionally add watermark. | Tiered export |
| POST | `/api/export-pdf` | Same as above. | Tiered export |

### 6.4 Request/Response Changes to Existing Endpoints

**`/api/export` (modified)**

Request body now accepts:
```json
{
  "plan": { /* BusinessPlan JSON */ },
  "tier": "anonymous"  // optional; inferred from auth if omitted
}
```

Response unchanged: `StreamingResponse` with `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`.

**`/api/generate` (modified — rate limit only)**

No request/response body changes. Rate limiter key function updated:
```python
def get_rate_limit_key(request: Request) -> str:
    user = getattr(request.state, "user", None)
    if user:
        return f"user:{user.id}"
    return get_remote_address(request)
```

---

## 7. Threat Model (STRIDE)

### 7.1 Trust Boundaries

1. **Browser ↔ Next.js** (Public internet)
2. **Next.js ↔ FastAPI** (Internal network / same host in dev; separate services in prod)
3. **FastAPI ↔ Database** (Internal network)
4. **FastAPI ↔ OpenAI** (External API)
5. **FastAPI ↔ Stripe** (External API + Webhooks)
6. **FastAPI ↔ Google OAuth** (External API)

### 7.2 STRIDE Analysis

#### Boundary: Browser → Next.js → FastAPI (Auth Flows)

| Asset / Flow | Threat Category | Threat Description | Impact | Mitigation |
|---|---|---|---|---|
| Login POST | Spoofing | Attacker brute-forces passwords | High | bcrypt slow hash; rate limit 5/min per IP |
| Login POST | Tampering | MITM intercepts credentials | High | TLS 1.2+ enforced; HSTS header |
| JWT Cookie | Information Disclosure | XSS steals token | High | **httpOnly cookie** (no localStorage); `SameSite=Lax` |
| JWT Cookie | Tampering | Attacker modifies token claims | Medium | HS256 signature verified server-side |
| JWT Secret | Information Disclosure | Secret leaked in source/repo | Critical | Secret from env var; ≥ 256 bits; rotated on breach |
| Password Reset | Spoofing | Attacker requests reset for victim | Medium | Token sent to registered email only; 24h expiry |
| Password Reset | Tampering | Attacker guesses reset token | Medium | Cryptographically random token; hashed in DB; single use |
| Signup | Repudiation | Attacker creates accounts with fake emails | Low | No email verification required (per PRD); monitor for abuse |
| OAuth Callback | Spoofing | Attacker sends forged OAuth code | Medium | Exchange code with Google server-side; verify `sub` |

#### Boundary: Browser → FastAPI (Plan Generation & Persistence)

| Asset / Flow | Threat Category | Threat Description | Impact | Mitigation |
|---|---|---|---|---|
| `/api/generate` | Denial of Service | Attacker floods generation endpoint | High | Rate limit 5/min (anon) / 10/min (pro); IP-based for anon |
| `/api/generate` | Elevation of Privilege | Free user claims Pro rate limit | Medium | JWT `tier` claim verified; not client-supplied |
| `/api/plans` | Information Disclosure | User A reads User B's plans | High | `WHERE user_id = current_user.id` enforced on every query |
| `/api/plans` | Tampering | User modifies another user's plan | High | Ownership check before UPDATE/DELETE |
| Plan JSON | Information Disclosure | Plan data leaked in logs | Medium | Never log full `plan_data`; log only `plan_id` |
| `/api/leads` | Denial of Service | Attacker spams lead creation | Low | Rate limit 10/min per IP; email format validation |

#### Boundary: FastAPI ↔ Stripe

| Asset / Flow | Threat Category | Threat Description | Impact | Mitigation |
|---|---|---|---|---|
| Webhook POST | Spoofing | Attacker sends fake Stripe event | Critical | **Stripe signature validation** with `stripe-python` `construct_event()` |
| Webhook POST | Tampering | MITM modifies webhook payload | Critical | TLS + signature validation |
| Webhook POST | Repudiation | Stripe retries; handler not idempotent | Medium | Idempotency: `UPDATE ... WHERE status != 'active'` |
| Checkout Session | Information Disclosure | Price IDs exposed to client | Low | Price IDs are public in Stripe; no secret leakage |
| Customer Portal | Elevation of Privilege | User A accesses User B's portal | Medium | Portal session created with `stripe_customer_id` from DB, not client |

#### Boundary: FastAPI ↔ Database

| Asset / Flow | Threat Category | Threat Description | Impact | Mitigation |
|---|---|---|---|---|
| DB Connection | Information Disclosure | Credentials leaked | Critical | Connection string from env var; not in source |
| DB Connection | Tampering | SQL injection | High | SQLAlchemy ORM (parameterized queries); no raw SQL concatenation |
| SQLite file | Information Disclosure | Dev DB file exposed | Medium | `.gitignore` `*.db`; file permissions 600 |
| PostgreSQL | Information Disclosure | Unencrypted connection | Medium | `sslmode=require` in connection string |

---

## 8. Tech Stack

### 8.1 Existing Stack (Verified from `package.json`, `requirements.txt`)

| Layer | Technology | Version | Verified |
|---|---|---|---|
| Frontend framework | Next.js | 16.2.4 | `package.json` |
| React | React / React DOM | 19.2.4 | `package.json` |
| Styling | Tailwind CSS | v4 | `package.json` |
| PostCSS | `@tailwindcss/postcss` | v4 | `package.json` |
| Animation | framer-motion | 12.38.0 | `package.json` |
| UI primitives | Radix UI Slot | 1.2.4 | `package.json` |
| Variants | class-variance-authority | 0.7.1 | `package.json` |
| Utilities | clsx, tailwind-merge | latest | `package.json` |
| Backend framework | FastAPI | latest | `requirements.txt` |
| Server | uvicorn[standard] | latest | `requirements.txt` |
| LLM client | openai | >=1.40 | `requirements.txt` |
| Schema | pydantic | >=2.0 | `requirements.txt` |
| Documents | python-docx | latest | `requirements.txt` |
| PDF | fpdf2 | latest | `requirements.txt` |
| Rate limiting | slowapi | latest | `requirements.txt` |
| Testing | Playwright | 1.60.0 | `package.json` |

### 8.2 New Dependencies (To Add)

| Layer | Technology | Version | Requirement Served | Verification Status |
|---|---|---|---|---|
| ORM | SQLAlchemy | 2.x | NFR-7 (SQLite/PostgreSQL); data persistence | To be added — verify on install |
| Migrations | Alembic | latest | NFR-7; schema evolution | To be added — verify on install |
| PostgreSQL driver | psycopg2-binary | latest | NFR-7 (production DB) | To be added — verify on install |
| JWT | python-jose[cryptography] | latest | NFR-2 (JWT signing/validation) | To be added — verify on install |
| Password hashing | bcrypt | latest | NFR-1 (secure password storage) | To be added — verify on install |
| Payments | stripe | latest | FR-11, FR-12, FR-13 | To be added — verify on install |
| OAuth | authlib | latest | FR-4 (Google OAuth) | To be added — verify on install |
| Email validation | email-validator | latest | FR-3 (lead capture validation) | To be added — verify on install |
| Environment | python-multipart | latest | FastAPI form data (OAuth callback) | To be added — verify on install |

### 8.3 Technology Choices — Justification

| Decision | Chosen | Rejected | Rationale |
|---|---|---|---|
| Auth token storage | **httpOnly cookie** | localStorage | QA-S4: XSS cannot steal httpOnly cookie. Simpler than localStorage + `Authorization` header on every request. |
| Password hashing | **bcrypt** | Argon2, PBKDF2 | NFR-1: bcrypt is battle-tested, widely supported in Python, sufficient for this threat model. Argon2 is better but adds dependency complexity. |
| JWT library | **python-jose** | PyJWT, jose-jwt | python-jose supports HS256/RS256 and is commonly used with FastAPI. PyJWT is also fine; either is acceptable. |
| OAuth library | **authlib** | social-auth-core | authlib is lightweight, integrates cleanly with Starlette/FastAPI, no Django dependency. |
| ORM | **SQLAlchemy 2.x** | Tortoise ORM, Prisma | SQLAlchemy is the standard in Python; supports both SQLite and PostgreSQL seamlessly; Alembic integration mature. |
| Migrations | **Alembic** | raw SQL, Django migrations | Alembic is the SQLAlchemy-native migration tool; industry standard. |
| Payment processor | **Stripe** | Paddle, PayPal | PRD resolved Q1: Stripe only. Best developer experience, hosted checkout, customer portal, robust webhooks. |
| Checkout type | **Stripe Checkout (hosted)** | Stripe Elements (embedded) | Hosted checkout reduces PCI scope (Stripe handles card fields), faster to implement, trusted UI. |
| Rate limiter enhancement | **slowapi (custom key func)** | redis-rate-limit, custom middleware | slowapi already in use; extending with tier-aware key function is minimal change. Redis adds infrastructure cost not justified at this scale. |
| Dev database | **SQLite** | PostgreSQL local Docker | SQLite requires zero setup for new developers; file-based; sufficient for dev/test. PostgreSQL reserved for prod/staging. |

---

## 9. Trade-off Analysis (ATAM)

### 9.1 Sensitivity Points

A sensitivity point is a component whose change significantly affects a quality attribute.

| ID | Sensitivity Point | Quality Attribute | Rationale |
|---|---|---|---|
| SP-1 | `slowapi` key function (IP vs user_id) | Performance, Security | Changing from IP-based to user-based rate limiting affects both fairness (Pro users get higher limits) and DoS resistance |
| SP-2 | JWT secret rotation | Security, Reliability | Rotating the secret invalidates all sessions; requires graceful handling |
| SP-3 | Watermark logic in export modules | Maintainability | Conditional footer logic in `python-docx`/`fpdf2` is scattered; centralized tier-check helper reduces drift |
| SP-4 | DB schema (Plan JSON storage) | Scalability, Maintainability | Storing plan as JSON blob is flexible but prevents SQL querying of plan content; acceptable since no search/filter by plan content is required |
| SP-5 | Stripe webhook idempotency | Reliability | Missing idempotency creates duplicate subscription records on retries |

### 9.2 Trade-off Points

A trade-off point is a decision where improving one quality attribute worsens another.

| ID | Decision | Improved | Worsened | Rationale |
|---|---|---|---|---|
| TP-1 | **httpOnly cookie vs localStorage** | Security (QA-S4) | Cross-domain complexity | httpOnly cookie cannot be read by JS, so Next.js cannot know auth state without a `/api/auth/me` call on every page load. Adds 1 round-trip. |
| TP-2 | **SQLite dev / PostgreSQL prod** | Developer experience | Compatibility risk | SQLite lacks some PostgreSQL features (JSONB ops, array types). Schema must stay simple and portable. |
| TP-3 | **Mandatory email capture vs friction** | Lead capture (business) | Conversion rate (QA-P1) | Mandatory email before download may cause drop-off. PRD assumption A11: <60% abandonment. |
| TP-4 | **Soft UI prompt + hard API cap** | User experience | Implementation complexity | Soft prompt reduces surprise; hard cap requires tier check on every save API call. Two enforcement layers. |
| TP-5 | **Stripe Checkout hosted vs embedded** | Security / PCI scope | Customization | Hosted checkout limits UI customization but eliminates PCI burden. |
| TP-6 | **No email verification** | Conversion (lower friction) | Security / deliverability | Unverified emails may bounce or be fake. Acceptable for lead capture; problematic for password reset. Mitigation: password reset only works if email is valid. |

### 9.3 Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-1 | **Auth integration breaks sessionStorage flow** | Medium | High | Keep sessionStorage as anonymous fallback. `ForgeApp` state machine works with or without logged-in user. Phase 1 ships auth scaffolding without removing sessionStorage. |
| R-2 | **Stripe webhook signature validation misconfigured** | Medium | Critical | Test with Stripe CLI `stripe listen --forward-to localhost:8000/api/webhooks/stripe`. Log all webhook events in dev. |
| R-3 | **Rate-limiting logic fails to distinguish tiers** | Medium | Medium | Unit test `get_rate_limit_key` with authenticated and anonymous requests. Integration test with `slowapi` in-memory store. |
| R-4 | **e2e tests fail due to auth gates** | Medium | High | Implement `X-Test-Auth: bypass` header (dev-only). Create test fixture user in CI. Update Playwright tests to expect email modal on download. |
| R-5 | **DB schema migration fails in production** | Low | High | Use Alembic. Test migrations against PostgreSQL in CI. Freeze schema before Phase 3. |
| R-6 | **Next.js proxy fails to forward cookies in production** | Medium | High | Verify `fetch` in Next.js API routes forwards `Cookie` header. Test with `curl` against both dev rewrite and production proxy. |
| R-7 | **Team tier complexity delays Pro launch** | Medium | High | Defer Team tier to Phase 4. Build Pro first. Team tier can start as "contact us" (Calendly) before full multi-seat UI. |

### 9.4 Non-Risks

| ID | Non-Risk | Rationale |
|---|---|---|
| NR-1 | **OpenAI API cost increase from tiered users** | Pro pricing ($19/mo) covers ~50 plans at current gpt-4.1-mini pricing. Unlimited is a soft promise bounded by rate limits. |
| NR-2 | **Schema change breaks existing clients** | Schema is additive only. Existing `BusinessPlan` model unchanged. New auth/subscription models are separate. |
| NR-3 | **Mobile app required** | Explicitly out of scope (W4). Mobile web is sufficient. |
| NR-4 | **Real-time collaboration needed** | Explicitly out of scope (W1). Team tier is multi-seat consumption, not concurrent editing. |

---

## 9A. Conversion Playbook Extension (2026-06-15)

> **Scope.** This section extends the SaaS-pivot architecture above with the
> conversion-playbook requirements (`docs/PRD-conversion-playbook.md`) and the
> decisions locked at **Gate G1**. It reconciles with ADR-001…ADR-008 and adds
> ADR-009…ADR-012. Where the pivot architecture already covers an item (auth,
> persistence, Stripe, watermark, rate limiting), this section adds only the
> *delta*; it does not restate the baseline. Read with §§1–9 above.

### 9A.1 G1 Locked Decisions (carried forward — design HOW, not WHETHER)

| # | Locked decision | ADR | Effect on this architecture |
|---|---|---|---|
| 1 | **Auto-save the in-session plan on signup** | ADR-009 (supersedes ADR-008) | Signup/OAuth handlers accept an optional `current_plan`; user + plan persisted in one transaction |
| 2 | **Landing rebuilt with three.js + GSAP** (user-locked tech) | ADR-010 | Client-only, lazy, capability/reduced-motion-gated hero canvas; static-first markup |
| 3 | **Separate `/pricing` route** (real page, not anchor) | ADR-012 | New static `pages/pricing.tsx`; reuses ADR-003 checkout |
| 4 | **Demo fixture unchanged for now** (childcare-swap) | — | No architecture; landing `DemoPreviewStrip` change is a copy/content task (M-P3), not structural |

### 9A.2 Added Requirements Traceability

**Functional (extends §2.1):**

| ID | Requirement | Source | ADR |
|---|---|---|---|
| FR-15 | On signup/OAuth, the anonymous in-session plan is auto-saved to the new account | AC-F2.4, G1 #1 | ADR-009 |
| FR-16 | Buyer-facing landing hero rendered with three.js + GSAP, lazy and client-only | G1 #2 | ADR-010 |
| FR-17 | Dedicated `/pricing` route shows Free/Pro/Team with prices and per-tier CTAs | US-CP4 | ADR-012 |
| FR-18 | Free-tier export watermark URL carries `?ref=export`; referral sessions attributable | US-CP7, G6 | ADR-011 |
| FR-19 | Stale "no account / no persistence" copy removed before/with auth launch | US-CP1 | — (content) |
| FR-20 | Landing demo preview + `/demo` fixture show the same scenario | US-CP3 | — (content) |

**Non-Functional (extends §2.2):**

| ID | Requirement | Source | ADR |
|---|---|---|---|
| NFR-13 | three.js/GSAP must not be in the landing initial chunk; 3D chunk ≤ ~200 KB gz; initial route JS growth ≤ ~10 KB gz | G1 #2 perf budget | ADR-010 |
| NFR-14 | Landing degrades gracefully: no-SSR, no-WebGL, and `prefers-reduced-motion` all fall back to the static hero | Accessibility (WCAG 2.3.3) | ADR-010 |
| NFR-15 | Watermark referral param carries no PII; treated as untrusted analytics input | Privacy | ADR-011 |
| NFR-16 | `/pricing` renders statically without auth; tier definitions from one config | US-CP4, QA-M1 | ADR-012 |

### 9A.3 Added Quality-Attribute Scenarios

| ID | Scenario (source→stimulus→environment→response→measure) | Measure |
|---|---|---|
| QA-P5 | A visitor on a mid-tier laptop loads the landing page; the static hero (text + CTAs) is interactive before any 3D code runs | LCP unaffected by three.js; CTAs clickable pre-canvas |
| QA-P6 | The 3D hero chunk loads only after guards pass | three.js/GSAP absent from initial chunk; chunk ≤ ~200 KB gz |
| QA-A1 | A user with `prefers-reduced-motion: reduce` visits the landing page | No WebGL scene initialised; no GSAP timeline started; static hero shown |
| QA-A2 | A user on a browser without WebGL visits the landing page | Static hero shown; no console error; page fully functional |
| QA-CV1 | An anonymous user who generated a plan signs up | Plan present in "My plans" immediately after signup (auto-save) |
| QA-CV2 | A visitor opens an exported plan URL with `?ref=export` | Lands on live landing page (200, not 404); analytics records `referral_source=export_watermark` |

### 9A.4 Logical View — Delta

New/changed components only (see §4.1 for the baseline diagram):

```mermaid
graph TB
    subgraph Browser
        LANDING["Landing (Pages Router)<br/>static-first markup"]
        HEROSTATIC["HeroStatic<br/>SSR text + CTAs"]
        HEROCANVAS["HeroCanvas (dynamic, ssr:false)<br/>three.js + GSAP"]
        GUARD["Capability Guard<br/>reduced-motion / WebGL / perf"]
        PRICING["/pricing page<br/>static, no auth"]
        REFCAP["Referral capture<br/>?ref=export → analytics"]
    end

    subgraph NextJS["Next.js (:3000)"]
        SUB_PROXY["/api/subscriptions/checkout (proxy)"]
    end

    subgraph FastAPI["FastAPI (:8000)"]
        AUTH_API2["/api/auth/signup + /oauth/google<br/>+ optional current_plan (auto-save)"]
        WMARK["watermark.py helper<br/>shared docx+pdf URL (?ref=export)"]
        EXP2["/api/export + /api/export-pdf<br/>use watermark helper"]
        SUB_API2["/api/subscriptions/checkout (ADR-003)"]
    end

    LANDING --> HEROSTATIC
    LANDING -->|next/dynamic ssr:false| HEROCANVAS
    HEROCANVAS --> GUARD
    GUARD -->|fail any check| HEROSTATIC
    LANDING --> REFCAP
    PRICING -->|authed CTA| SUB_PROXY --> SUB_API2
    AUTH_API2 --> WMARK
    EXP2 --> WMARK
```

#### Added/changed component responsibilities

| Component | Responsibility | Technology / Notes |
|---|---|---|
| **HeroStatic** | Server-rendered hero markup: headline, sub-headline, primary/secondary CTAs. The SEO/LCP and conversion surface. Always present. | Existing bespoke CSS + framer-motion (DOM) |
| **HeroCanvas** | Decorative WebGL hero scene. `aria-hidden`. Dynamically imported (`ssr:false`), guarded, lifecycle-managed (pause off-screen, dispose on unmount). | `three`, `gsap` (to be added — verify on install) |
| **Capability Guard** | Order: reduced-motion → WebGL probe → optional perf heuristic. Any failure ⇒ static hero only, no 3D/GSAP load. | Browser APIs (`matchMedia`, `getContext`) |
| **`/pricing` page** | Static tier comparison; per-tier CTA wiring (Free→/app; Pro/Team→auth-then-checkout). No billing logic. | `pages/pricing.tsx`, `lib/pricing.ts` config |
| **Referral capture** | Reads `?ref=export` on landing; records `referral_source=export_watermark`; optional first-touch persistence in sessionStorage. | Analytics pipeline (PRD dependency) |
| **Auth handlers (changed)** | Accept optional `current_plan`; validate with `BusinessPlan`; insert user + plan in one transaction. | `api/routers/auth.py` (per ADR-009) |
| **Watermark helper (new)** | Single source for the footer URL incl. `?ref=export`, used by both export modules. | `api/watermark.py` (per ADR-011) |

### 9A.5 Process View — Delta

#### 9A.5.1 Auto-Save on Signup (ADR-009 — supersedes the §4.2.3 "no migration" note)

```mermaid
sequenceDiagram
    actor U as Anonymous User (has generated plan)
    participant UI as Next.js UI (ForgeApp)
    participant SS as sessionStorage
    participant PROXY as Next.js Proxy
    participant AUTH as FastAPI /api/auth/signup
    participant DB as Database

    U->>UI: Click "Sign up" (after generating a plan)
    UI->>SS: Read current plan {plan_data, idea_description}
    UI->>PROXY: POST /api/auth/signup {email, password, current_plan}
    PROXY->>AUTH: Proxy request
    AUTH->>AUTH: Validate password; hash (bcrypt)
    AUTH->>AUTH: current_plan present? BusinessPlan.model_validate()
    alt Plan valid
        AUTH->>DB: BEGIN TX → INSERT user → INSERT plan(user_id) → COMMIT
    else Plan absent/invalid
        AUTH->>DB: INSERT user only (account still created)
    end
    AUTH->>AUTH: Create JWT (sub=user.id, tier=free, exp=7d)
    AUTH-->>PROXY: 200 {user, saved_plan_id?} + Set-Cookie
    PROXY-->>UI: 200 + Set-Cookie
    UI->>SS: Replace working copy with saved_plan_id (avoid duplicate on next save)
    UI->>UI: Logged in; plan visible in "My plans"
```

#### 9A.5.2 Landing Hero Load (ADR-010)

```mermaid
sequenceDiagram
    actor V as Visitor
    participant SSR as Next.js SSR/SSG
    participant DOM as Browser DOM
    participant DYN as next/dynamic loader
    participant CV as HeroCanvas (three.js+GSAP)

    V->>SSR: GET /
    SSR-->>DOM: HTML incl. HeroStatic (text + CTAs)  [LCP, no 3D]
    DOM->>DYN: Hydrate; request HeroCanvas chunk (ssr:false)
    DYN->>CV: Mount HeroCanvas
    CV->>CV: Guard: prefers-reduced-motion?
    alt reduced motion OR no WebGL OR low-perf
        CV-->>DOM: Render nothing extra (HeroStatic remains)
    else capable
        DYN-->>CV: Load three.js + gsap chunk (≤ ~200 KB gz)
        CV->>CV: Init scene; cap DPR≤2; start GSAP timeline
        CV->>CV: IntersectionObserver: pause when off-screen
        CV-->>DOM: Decorative aria-hidden canvas behind hero
    end
```

#### 9A.5.3 `/pricing` → Checkout (ADR-012 + ADR-003)

```mermaid
sequenceDiagram
    actor V as Visitor
    participant P as /pricing (static)
    participant PROXY as Next.js Proxy
    participant SUB as FastAPI /api/subscriptions/checkout
    participant STRIPE as Stripe

    V->>P: View pricing (no auth required)
    alt Free tier CTA
        V->>P: Click "Start free"
        P-->>V: Navigate to /app
    else Pro/Team CTA, unauthenticated
        V->>P: Click "Upgrade to Pro"
        P-->>V: Route to signup/login (intent=checkout&tier=pro preserved)
        Note over V,P: After auth, resume checkout
    else Pro/Team CTA, authenticated
        V->>PROXY: POST /api/subscriptions/checkout {price_id, tier}
        PROXY->>SUB: Proxy (authed)
        SUB->>STRIPE: checkout.sessions.create
        STRIPE-->>SUB: {url}
        SUB-->>PROXY: 200 {checkout_url}
        PROXY-->>V: Redirect to Stripe hosted Checkout
    end
```

### 9A.6 Development View — Delta (new/changed files)

| File | Change | Rationale / ADR |
|---|---|---|
| `components/landing/HeroStatic.tsx` | **New.** Server-rendered hero markup (text + CTAs). | ADR-010 (static-first) |
| `components/landing/HeroCanvas.tsx` | **New.** three.js + GSAP scene; guarded, lifecycle-managed; imported via `next/dynamic({ssr:false})`. | ADR-010 |
| `components/landing/Landing.tsx` | **Modified.** Compose HeroStatic + dynamic HeroCanvas; remove stale "no account / no persistence" copy (M-P1); update `DemoPreviewStrip` scenario (M-P3); add social-proof + distribution sections (UX-designer owns layout). | FR-19, FR-20 |
| `pages/pricing.tsx` | **New.** Static tier-comparison page; CTA wiring. | ADR-012 |
| `lib/pricing.ts` | **New.** Single tier/price/feature config + Stripe `price_id` map. | ADR-012, QA-M1 |
| `lib/analytics.ts` | **New (or extend).** Capture `?ref=export`; emit `referral_source`, `pricing_page_view`, `checkout_initiated` events. | ADR-011, G6/G7 |
| `api/watermark.py` | **New.** `watermark_url(tier)` shared helper incl. `?ref=export`. | ADR-011 (resolves SP-3) |
| `api/export.py` | **Modified.** Use `watermark.py` for the .docx footer URL. | ADR-006, ADR-011 |
| `api/export_pdf.py` | **Modified.** Use `watermark.py` in `_PlanPDF.footer()`. | ADR-006, ADR-011 |
| `api/routers/auth.py` | **Modified.** Accept optional `current_plan`; validate + transactional insert. | ADR-009 |
| `api/schema.py` | **Modified.** Add `current_plan` to signup/OAuth request models (optional `PlanCreateRequest`-shaped). | ADR-009 |
| `next.config.ts` | **Verify.** No change needed for `next/dynamic` (it is a runtime API); keep dev rewrite. Add bundle-analyzer only if used for NFR-13 verification. | ADR-010 |
| `package.json` | **Modified.** Add `three`, `gsap`, `@types/three` (dev). To be added — verify on install. | ADR-010 |

### 9A.7 Data Architecture — Delta

No new entities. Changes are confined to existing flows:

| Flow | Data | Classification | Protection |
|---|---|---|---|
| Browser → FastAPI (signup w/ `current_plan`) | Email, password, full plan JSON | PII + business-sensitive | TLS; bcrypt; `BusinessPlan.model_validate()` before persist; transactional write (ADR-009) |
| Exported doc → Browser (`?ref=export`) | Channel tag only (no PII) | Non-sensitive | Static tag; never an identifier (ADR-011, NFR-15) |
| Browser → analytics (referral) | `referral_source`, page events | Behavioural, no direct PII | Subject to cookie consent (NFR-12); param treated as untrusted input |

The `Plan` row created by auto-save is identical in shape to one created via
`POST /api/plans`; it counts toward the ADR-005 free-tier 3-plan cap (first of 3).

### 9A.8 Threat Model (STRIDE) — New Boundaries / Flows

These extend §7. Boundaries already covered (Stripe webhook, DB, OpenAI, OAuth)
are unchanged; only deltas are listed.

#### Boundary: Anonymous client → `/api/auth/signup` carrying `current_plan` (ADR-009)

| Asset / Flow | Threat | Description | Impact | Mitigation |
|---|---|---|---|---|
| `current_plan` payload | Tampering | Malformed/oversized plan JSON injected on an unauthenticated endpoint | Medium | `BusinessPlan.model_validate()` before persist; reject oversized bodies (existing request-size limit); invalid plan is skipped, not fatal |
| `current_plan` payload | Denial of Service | Attacker floods signup with large plan blobs to exhaust DB/CPU | Medium | Rate limit signup by IP (existing 5/min); size cap; validation rejects junk cheaply |
| Auto-save write | Elevation of Privilege | Submitted plan attached to a different/existing user | High | Plan written only to the **freshly created** user id inside the same TX; auto-save never fires on login of an existing account |
| Signup transaction | Repudiation / consistency | Partial write leaves a user with no plan or a plan with no user | Medium | Single DB transaction (atomic); failure rolls back both |

#### Boundary: Exported document URL `?ref=export` → landing page (ADR-011)

| Asset / Flow | Threat | Description | Impact | Mitigation |
|---|---|---|---|---|
| `ref` query param | Tampering | Attacker crafts arbitrary `ref` values | Low | Treat as untrusted analytics label only; never used for authz, pricing, or feature gating (NFR-15); whitelist known values when reporting |
| `ref` query param | Information Disclosure | Per-user data leaked in a shared document URL | Medium | Static `ref=export` tag only — **no** user/plan id embedded (ADR-011 decision #6) |
| Watermark URL | Spoofing / brand | URL points to a 404 or wrong domain, eroding trust | Medium | `PUBLIC_BASE_URL` config must resolve live before ship (AC-CP7.2); single helper prevents drift |
| Referral param | Repudiation (metric integrity) | Bots inflate `ref=export` sessions | Low | Bot filtering at the analytics layer; metric is directional, not billing-critical |

#### Boundary: `/pricing` → checkout hop (ADR-012)

| Asset / Flow | Threat | Description | Impact | Mitigation |
|---|---|---|---|---|
| Checkout intent param | Tampering | User edits `tier`/`price_id` in the resume-after-auth URL | Medium | Server maps `tier`→`price_id` from `lib/pricing.ts`/Stripe config; client `price_id` is validated against the allowed set, never trusted blindly |
| `/pricing` page | Spoofing | Phishing clone of the pricing page | Low | Checkout always lands on Stripe-hosted (ADR-003) under verified domain; no card fields on Forge |

#### Boundary: three.js/GSAP client chunk (ADR-010)

| Asset / Flow | Threat | Description | Impact | Mitigation |
|---|---|---|---|---|
| 3D dependency chunk | Tampering (supply chain) | Compromised `three`/`gsap` package | Medium | Pin exact versions; `dependency-cve` audit on install; SRI/lockfile integrity; CI bundle-size + audit gate |
| WebGL context | Denial of Service (self) | Runaway render loop / GPU leak degrades the user's own device | Low | Pause off-screen (IntersectionObserver) + on `visibilitychange`; dispose on unmount; cap DPR |

### 9A.9 Tech Stack — Delta

| Layer | Technology | Version | Requirement | Verification |
|---|---|---|---|---|
| 3D / WebGL | `three` | — | FR-16, NFR-13/14 | **To be added — verify on install**; pin exact version then record |
| Animation (WebGL/scroll) | `gsap` | — | FR-16 | **To be added — verify on install**; pin exact version then record |
| Types | `@types/three` (dev) | — | FR-16 (TS) | **To be added — verify on install** (GSAP ships its own types) |
| Client loading | `next/dynamic` `{ ssr:false }` | bundled with Next 16.2.4 | FR-16, NFR-14 | **Verified** in `node_modules/next/dynamic.d.ts` (`DynamicOptions.ssr?: boolean`) |

No new backend dependencies — auto-save, watermark helper, and pricing reuse the
pivot stack (SQLAlchemy, Pydantic, Stripe, FastAPI).

### 9A.10 Trade-off Analysis (ATAM) — Delta

**Sensitivity points (extends §9.1):**

| ID | Sensitivity Point | Quality Attribute | Rationale |
|---|---|---|---|
| SP-6 | Lazy-load + guard boundary for HeroCanvas | Performance, Accessibility | Where the `ssr:false`/guard line is drawn determines whether three.js ever touches first load, SSR, or reduced-motion users |
| SP-7 | `watermark.py` single helper | Maintainability | One source for the footer URL prevents .docx/.pdf drift (resolves SP-3) |
| SP-8 | Auto-save transaction boundary | Reliability | Atomicity of the user+plan insert determines whether a failed signup can orphan data |

**Trade-off points (extends §9.2):**

| ID | Decision | Improved | Worsened | Rationale |
|---|---|---|---|---|
| TP-7 | three.js/GSAP rich hero | Brand/conversion appeal | Bundle size, complexity | Heavy chunk justified only because it is lazy + guarded (ADR-010); CI must police NFR-13 |
| TP-8 | Two animation libraries (framer-motion + GSAP) | Right tool per layer (DOM vs WebGL) | Cognitive/maintenance load | Accepted only if GSAP stays scoped to the canvas |
| TP-9 | Auto-save on signup | Conversion (no work loss) | Plan JSON on an unauthenticated endpoint | Mitigated by validation + atomic write (ADR-009, STRIDE §9A.8) |
| TP-10 | Static `ref=export` (channel-level) | Privacy, simplicity | No per-sharer attribution | Sufficient for G6 count metric (ADR-011) |

**Risks (extends §9.3):**

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-8 | three.js leaks GPU/memory or tanks fps on weak devices | Medium | Medium | DPR cap, off-screen pause, dispose-on-unmount; reduced-motion/WebGL guards (ADR-010) |
| R-9 | Bundle regresses (three.js leaks into initial chunk) | Medium | High | `ssr:false` dynamic import; CI bundle-size budget (NFR-13); narrow imports |
| R-10 | Watermark `PUBLIC_BASE_URL` 404s at launch | Low | Medium | Verify URL resolves before export modules ship (AC-CP7.2) |
| R-11 | Auto-save fails silently and user loses plan | Low | High | Non-fatal but logged; return `saved_plan_id`; client surfaces a "saved" confirmation |
| R-12 | Stale "no account" copy ships after auth (trust break) | Medium | High | Hard release gate AC-CP1.5: copy remediation deploys before/with auth (FR-19) |

**Non-risks (extends §9.4):**

| ID | Non-Risk | Rationale |
|---|---|---|
| NR-5 | New DB schema for the playbook | None required; reuses `User`/`Plan`; auto-save uses existing `Plan` shape |
| NR-6 | three.js breaking SSR/SEO | `ssr:false` + static-first markup means SSR/SEO never see WebGL (ADR-010) |
| NR-7 | Demo fixture re-architecture | G1 #4: demo unchanged for now; landing preview is a content swap, not structural |

### 9A.12 Multi-Provider Billing Extension (2026-06-15, Gate G2 / ADR-013)

> **Scope.** Extends the billing portion of this architecture from **Stripe-only**
> (ADR-003) to **multi-provider, user-selected** (Stripe USD + Paystack NGN) per
> Gate G2 and **ADR-013 (supersedes ADR-003)**. Delta only — auth, persistence,
> tiers (ADR-005), `/pricing` route (ADR-012), and the webhook idempotency
> principle (§7) are baselines; this section adds the provider seam, the Paystack
> path, the second webhook boundary, and the data discriminator. FastAPI still
> owns billing (ADR-004); `/pricing` still carries no billing logic (ADR-012).

#### 9A.12.1 G2 Locked Decisions (design HOW, not WHETHER)

| # | Locked decision | ADR | Effect on this architecture |
|---|---|---|---|
| 1 | **Both Stripe and Paystack offered; user picks provider at checkout** (Option B) | ADR-013 | New provider-choice step; `provider` flows from `/pricing`→checkout→`POST /api/subscriptions/checkout` |
| 2 | **USD via Stripe, NGN via Paystack**; each paid tier needs a USD price AND an NGN price | ADR-013 | `lib/pricing` keyed tier × provider × currency |
| 3 | **NGN amounts are config, not FX-derived** | ADR-013 | NGN values marked `TO CONFIRM (product owner)`; no hardcoded/derived number ships |
| 4 | **Provider-agnostic `BillingProvider` seam in FastAPI** | ADR-013 | `api/billing/*`; rest of app is provider-neutral; one internal subscription state |

#### 9A.12.2 Added Requirements Traceability

**Functional (extends §2.1 / §9A.2):**

| ID | Requirement | Source | ADR |
|---|---|---|---|
| FR-11′ | Checkout for Pro/Team is multi-provider; user selects Stripe (USD) or Paystack (NGN) | G2 | ADR-013 |
| FR-21 | Paystack hosted checkout (redirect or inline popup) with Paystack **Plans** for subscriptions | G2 | ADR-013 |
| FR-22 | Paystack webhooks (`charge.success`, subscription events) sync to the **same** internal subscription state as Stripe | G2 | ADR-013 |
| FR-23 | A subscription records its **owning provider** + provider-side customer/subscription IDs | G2 | ADR-013 |

**Non-Functional (extends §2.2 / §9A.2):**

| ID | Requirement | Source | ADR |
|---|---|---|---|
| NFR-17 | **Security:** Paystack webhook verified via HMAC-SHA512 over the raw request body using the secret key, compared to `x-paystack-signature` (constant-time) | ADR-013 | ADR-013 |
| NFR-18 | **Security/Reliability:** Both webhook handlers are idempotent and replay-resistant (provider event id deduplication) | §7, ADR-013 | ADR-013 |
| NFR-19 | **Maintainability:** Adding/removing a provider, or setting the NGN price, is localised to `api/billing/*` + `lib/pricing` (extends QA-M1) | ADR-013 | ADR-013 |
| NFR-20 | **Security:** No card data stored on either provider — hosted checkout both sides (PCI scope unchanged from ADR-003) | ADR-013 | ADR-013 |

#### 9A.12.3 Added Quality-Attribute Scenarios

| ID | Scenario (source→stimulus→environment→response→measure) | Measure |
|---|---|---|
| QA-BL1 | An authenticated user on the checkout step picks **Paystack**; the system initialises a Paystack transaction tied to the Paystack **Plan** for that tier | Hosted checkout / inline popup opens with the configured NGN amount; no card field on Forge |
| QA-BL2 | An attacker POSTs a forged event to `/api/webhooks/paystack` | Rejected: `x-paystack-signature` HMAC-SHA512 mismatch → 401/400; no state change |
| QA-BL3 | Paystack redelivers a `charge.success` event already processed | Handler is idempotent: subscription state unchanged; event id deduped |
| QA-BL4 | Product owner has not yet set the NGN price for Team | `/pricing` shows USD; NGN shown as "coming soon" (no fabricated number); Paystack Team checkout disabled until configured |
| QA-BL5 | A change of provider implementation (e.g. Paystack endpoint) is required | Change confined to `api/billing/paystack_provider.py`; subscriptions router, webhook dispatch, and tier logic untouched (NFR-19) |

#### 9A.12.4 Logical View — Billing Delta

New/changed components only (baseline §4.1; the `llm.py` provider seam is the
precedent pattern for this billing seam):

```mermaid
graph TB
    subgraph Browser
        PRICING2["/pricing (static, ADR-012)<br/>shows USD + NGN per tier"]
        CHECKOUT["Checkout step<br/>provider choice: Stripe / Paystack"]
        PSPOP["Paystack inline popup (optional)<br/>frontend Paystack JS"]
    end

    subgraph NextJS["Next.js (:3000)"]
        SUB_PROXY2["/api/subscriptions/checkout (proxy)"]
        WH_PROXY["/api/webhooks/* (proxy, prod)"]
    end

    subgraph FastAPI["FastAPI (:8000)"]
        SUB_API3["/api/subscriptions/checkout<br/>{tier, provider}"]
        REG["BillingRegistry<br/>provider -> impl"]
        IFACE["BillingProvider (interface)<br/>create_checkout_session / verify_webhook / handle_event"]
        STRIPE_IMPL["StripeProvider<br/>stripe SDK"]
        PS_IMPL["PaystackProvider<br/>REST over existing HTTP stack"]
        WH_STRIPE["/api/webhooks/stripe"]
        WH_PS["/api/webhooks/paystack<br/>HMAC-SHA512 verify"]
        SUBSVC["Subscription state writer<br/>one internal shape"]
    end

    subgraph External["External"]
        STRIPE2["Stripe API + Webhooks (USD)"]
        PAYSTACK["Paystack API + Webhooks (NGN)<br/>Transactions + Plans"]
    end

    subgraph Data["Data"]
        DB2[("subscriptions: provider discriminator<br/>+ provider-specific external IDs")]
    end

    PRICING2 --> CHECKOUT
    CHECKOUT -->|POST {tier, provider}| SUB_PROXY2 --> SUB_API3
    CHECKOUT -.optional access_code.-> PSPOP
    SUB_API3 --> REG --> IFACE
    IFACE --> STRIPE_IMPL --> STRIPE2
    IFACE --> PS_IMPL --> PAYSTACK
    STRIPE2 -->|webhook| WH_STRIPE
    PAYSTACK -->|webhook| WH_PS
    WH_STRIPE --> IFACE
    WH_PS --> IFACE
    IFACE --> SUBSVC --> DB2
```

**Added/changed component responsibilities:**

| Component | Responsibility | Technology / Notes |
|---|---|---|
| **`BillingProvider` interface** | `create_checkout_session(user, tier, currency)`, `verify_webhook(raw_body, headers)`, `handle_event(event)` → `SubscriptionDelta`. The only place the rest of the app touches billing. | `api/billing/base.py` (Protocol/ABC) |
| **`BillingRegistry`** | Map `"stripe"`/`"paystack"` → concrete provider; validate the requested provider against the enabled set. | `api/billing/registry.py` |
| **`StripeProvider`** | Stripe Checkout session create; webhook verify via `stripe` lib; event map (`checkout.session.completed`, `customer.subscription.*`). | `stripe` (already planned, §8.2) |
| **`PaystackProvider`** | Transaction init + Paystack **Plan** subscription; webhook verify (HMAC-SHA512 over raw body); event map (`charge.success`, `subscription.create`, `subscription.disable`, `invoice.*`). **REST over the existing HTTP stack — no required SDK.** | `requirements.txt` (HTTP client — to be added/verify on install) |
| **`/api/webhooks/paystack` (new)** | Second webhook boundary; raw-body signature verify; idempotent dispatch to the shared subscription writer. | `api/routers/webhooks.py` |
| **Subscription state writer** | One internal representation (`active`/`past_due`/`canceled`, tier, period end); both providers map onto it. | `api/routers/subscriptions.py` |
| **Checkout step (FE)** | Provider-choice UI; sends `{tier, provider}`; for Paystack-inline, opens the popup with the server-returned `access_code`. **No billing logic, no secret keys** (ADR-012). | `pages/pricing.tsx` flow / `components/*` (UX owns layout) |

#### 9A.12.5 Process View — Paystack Checkout & Webhook Delta

Stripe checkout is §4.2.4. Paystack path (provider chosen = Paystack):

```mermaid
sequenceDiagram
    actor U as Authenticated User
    participant CO as Checkout step (FE)
    participant PROXY as Next.js Proxy
    participant SUB as FastAPI /api/subscriptions/checkout
    participant REG as BillingRegistry
    participant PS as PaystackProvider (REST)
    participant PAYSTACK as Paystack API
    participant WH as FastAPI /api/webhooks/paystack
    participant DB as Database

    U->>CO: Pick "Paystack (NGN)" for Pro
    CO->>PROXY: POST /api/subscriptions/checkout {tier: pro, provider: paystack}
    PROXY->>SUB: Proxy (authed)
    SUB->>REG: get("paystack")
    REG-->>SUB: PaystackProvider
    SUB->>SUB: Resolve NGN amount + Plan id from pricing config (server-side)
    SUB->>PS: create_checkout_session(user, pro, NGN)
    PS->>PAYSTACK: initialize transaction (amount in kobo, plan, email, metadata{user_id, tier})
    PAYSTACK-->>PS: {authorization_url, access_code, reference}
    PS-->>SUB: CheckoutResult{url | access_code, provider_session_ref}
    SUB-->>PROXY: 200 {checkout_url | access_code}
    PROXY-->>CO: 200
    alt Redirect mode
        CO-->>U: Redirect to Paystack hosted checkout (NGN)
    else Inline popup mode
        CO->>CO: Open Paystack popup with access_code
    end

    U->>PAYSTACK: Complete payment
    PAYSTACK->>WH: POST /api/webhooks/paystack (charge.success / subscription.create)
    WH->>WH: Read RAW body; compute HMAC-SHA512(secret_key, raw_body)
    WH->>WH: constant-time compare to x-paystack-signature
    alt signature invalid
        WH-->>PAYSTACK: 400/401 (no state change)
    else valid
        WH->>WH: dedupe by provider event id (replay protection)
        WH->>REG: get("paystack").handle_event(event)
        REG-->>WH: SubscriptionDelta{tier: pro, status: active, provider: paystack, ext IDs}
        WH->>DB: UPSERT subscription (idempotent)
        WH-->>PAYSTACK: 200 OK
    end
```

#### 9A.12.6 Data Architecture — Billing Delta

No new entities; the existing `SUBSCRIPTION` (§5.1) gains a **provider
discriminator** and **provider-specific external IDs**, replacing the
Stripe-only columns. No card data is stored (hosted checkout both sides).

| Field (subscription) | Change | Notes |
|---|---|---|
| `provider` | **New.** `enum("stripe","paystack")` | Discriminator; which provider owns this subscription |
| `currency` | **New.** `enum("USD","NGN")` (or ISO-4217 string) | USD↔Stripe, NGN↔Paystack |
| `external_customer_id` | **Generalised** from `stripe_customer_id` | Stripe customer id OR Paystack customer code |
| `external_subscription_id` | **Generalised** from `stripe_subscription_id` (UK) | Stripe subscription id OR Paystack subscription code |
| `external_price_id` | **Generalised** from `stripe_price_id` | Stripe price id OR Paystack plan code |

The `User.stripe_customer_id` (§5.2) generalises to a per-provider customer
reference (e.g. `User.billing_refs` JSON or a `customer_refs` child table keyed by
provider) so a user can be a customer on either provider without column churn.
**No FX rate, no derived NGN amount is persisted.** Amounts are read from
`lib/pricing` config at checkout-init time. Migration is additive + a backfill of
`provider='stripe'` for existing rows (Alembic, per ADR-002).

**Data flows (extends §5.4):**

| Flow | Data | Classification | Encryption |
|---|---|---|---|
| FastAPI ↔ Paystack | Customer email, NGN amount, plan/transaction refs | PII / Financial | TLS 1.2+; Paystack handles PCI; no card data on Forge |
| Paystack → FastAPI (webhook) | Charge/subscription status, refs, event id | Financial | TLS 1.2+; HMAC-SHA512 signature verified over raw body |

**Pricing config shape (`lib/pricing.ts`, single source of truth — ADR-012/013):**

```
TIERS = {
  pro:  { stripe: { currency: "USD", amount: 1900,  priceId: "<stripe price id>" },
          paystack: { currency: "NGN", amount: "TO CONFIRM (product owner) — do not hardcode an FX-derived number",
                      planCode: "<paystack plan code — TO CONFIRM>" } },
  team: { stripe: { currency: "USD", amount: 4900,  priceId: "<stripe price id>" },
          paystack: { currency: "NGN", amount: "TO CONFIRM (product owner) — do not hardcode an FX-derived number",
                      planCode: "<paystack plan code — TO CONFIRM>" } },
}
```

(USD amounts shown in minor units per Stripe convention; Paystack NGN is charged
in kobo — the exact minor-unit representation is set when the product owner
confirms the figure. No number is invented here.)

#### 9A.12.7 Threat Model (STRIDE) — Paystack Boundary (new)

Stripe ↔ FastAPI is §7.2 (unchanged). Paystack adds a **parallel** trust
boundary. Differences from Stripe are called out.

**Boundary: Paystack → `/api/webhooks/paystack` (FastAPI)**

| Asset / Flow | Threat Category | Threat Description | Impact | Mitigation |
|---|---|---|---|---|
| Webhook POST | Spoofing | Attacker sends a fake Paystack event to grant a paid tier | Critical | **HMAC-SHA512** of the **raw** request body using the Paystack **secret key**, constant-time compared to `x-paystack-signature`; reject on mismatch (NFR-17). (Stripe uses `Stripe-Signature` HMAC-SHA256 via the `stripe` lib — different scheme, same intent.) |
| Webhook POST | Tampering | MITM alters payload after signing | Critical | TLS 1.2+ **and** raw-body HMAC — body cannot be modified without invalidating the signature. Verify **before** JSON parsing/deserialisation. |
| Webhook POST | Repudiation / replay | Paystack redelivers, or an attacker replays a captured valid event | Medium | Idempotent UPSERT keyed on provider event id / transaction reference; dedupe table or `WHERE status != target`; safe to receive twice (NFR-18). |
| Webhook event | Elevation of Privilege | `charge.success` mapped to the wrong user/tier → free user gets Pro | High | Trust **server-side metadata** (`user_id`, `tier`) set at transaction-init, not client input; re-verify the transaction with Paystack (verify endpoint) before activating; map tier from `planCode`→config, not from the payload amount. |
| Amount / currency | Tampering | Forged event claims a paid amount to unlock a tier | High | Activation gated on provider-verified transaction + expected NGN amount/plan from `lib/pricing`; amount in the event is not the source of truth for entitlement. |
| Secret key | Information Disclosure | Paystack secret key leaked (also signs webhooks) | Critical | Secret from env var only; never in source/logs/client; rotate on breach; FE never receives the secret (inline popup uses the **public** key only). |
| `/api/webhooks/paystack` | Denial of Service | Attacker floods the webhook endpoint | Medium | Cheap signature reject before parsing; rate-limit/size-cap the endpoint; verification is constant-time but bounded. |

**Boundary: Browser → Paystack inline popup (if used)**

| Asset / Flow | Threat Category | Threat Description | Impact | Mitigation |
|---|---|---|---|---|
| Paystack JS / public key | Information Disclosure | Public key exposed in client | Low | Public key is **designed** to be public; the secret key is never shipped to the client. |
| `access_code` / amount | Tampering | Client tampers amount before popup | High | Transaction is **initialised server-side** with the config amount; popup uses the server `access_code`; client cannot set the price. |
| Paystack JS | Tampering (supply chain) | Compromised Paystack inline script | Medium | Load from Paystack's official origin; SRI where supported; CSP `script-src` allowlist; prefer redirect mode if SRI is unavailable. |

**Updated note for §7.1 trust boundaries:** boundary **#5 "FastAPI ↔ Stripe"**
becomes **"FastAPI ↔ Billing Providers (Stripe and Paystack)"** — two external
APIs and **two** webhook ingress points, each with its own signature scheme.

#### 9A.12.8 Tech Stack — Billing Delta

| Layer | Technology | Version | Requirement | Verification |
|---|---|---|---|---|
| Stripe | `stripe` (Python) | — | FR-11′, FR-22 (Stripe path) | Already planned in §8.2 — **to be added — verify on install** |
| Paystack | **REST over existing HTTP stack** (no required SDK) | n/a | FR-21, FR-22 (Paystack path) | Paystack calls use plain HTTPS; **no SDK name/version invented** |
| HTTP client (backend, if a dedicated one is wanted for Paystack REST) | e.g. `httpx` or `requests` | — | FR-21 | **To be added — verify on install** (only if the team prefers it over `urllib`; do not assume it is already present) |
| Webhook signature (Paystack) | Python stdlib `hmac` + `hashlib` (SHA-512) | stdlib | NFR-17 | **Verified** — standard library, no new dependency |
| Paystack inline (frontend, optional) | Paystack inline JS | — | FR-21 (inline mode) | **To be added — verify on install**; only if inline popup is chosen over redirect; loaded from Paystack origin |

No change to the auth/persistence/tier stack. The `BillingProvider` seam adds
**no** runtime dependency itself (pure Python interface); the only genuinely new
external dependency is the Paystack integration, which can be satisfied with the
stdlib + an HTTP client (verify on install).

#### 9A.12.9 Trade-off Analysis (ATAM) — Billing Delta

**Sensitivity points (extends §9.1 / §9A.10):**

| ID | Sensitivity Point | Quality Attribute | Rationale |
|---|---|---|---|
| SP-9 | `BillingProvider` seam boundary | Maintainability, Security | Where the abstraction line sits decides whether provider quirks (signatures, plan vs price, kobo vs cents) leak into the rest of the app |
| SP-10 | Paystack webhook signature + idempotency | Security, Reliability | Wrong hash algo (must be SHA-512, raw body) or non-idempotent handler = forged/duplicate entitlements |
| SP-11 | `provider`/`currency` discriminator on subscription | Maintainability, Reliability | A missing discriminator makes dispatch (cancel/manage/reconcile) ambiguous |

**Trade-off points (extends §9.2 / §9A.10):**

| ID | Decision | Improved | Worsened | Rationale |
|---|---|---|---|---|
| TP-11 | **Dual provider (Stripe + Paystack)** | Market coverage (USD + NGN buyers) | Complexity: two SDKs/REST surfaces, two webhook boundaries, two reconciliations | Justified by G2 market expansion; complexity contained by the seam (SP-9) and one internal state |
| TP-12 | **User picks provider (Option B)** vs auto-detect | User agency, testability, fewer mis-detections | One extra checkout step | G2-locked; avoids geo/VPN mis-routing and keeps the flow explicit/testable |
| TP-13 | **Paystack via REST (no SDK)** | No invented/unmaintained dep; full control | More hand-written HTTP + signature code to test | Matches the `llm.py` "thin client" precedent; stdlib `hmac`/`hashlib` covers signing |
| TP-14 | **NGN as confirmed config, not FX** | Correctness, no silent mispricing | Paystack checkout blocked until product owner sets values | Deliberate: a wrong auto-FX price is worse than a delayed NGN launch |

**Risks (extends §9.3 / §9A.10):**

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-13 | **NGN prices never confirmed → Paystack checkout cannot ship** | Medium | High | Track as a product-owner blocker; gate Paystack CTA on configured NGN value; ship Stripe-USD independently |
| R-14 | **Paystack webhook verification misconfigured** (wrong algo/parsed-body) | Medium | Critical | Verify HMAC-SHA512 over the **raw** body before parsing; test with Paystack test events; log verification outcome in dev |
| R-15 | **Non-idempotent handler → duplicate/skewed subscriptions on redelivery** | Medium | High | Idempotent UPSERT keyed on provider event id; re-verify transaction; integration test redelivery |
| R-16 | **Two providers drift in entitlement mapping** (Stripe active ≠ Paystack active) | Medium | Medium | Single `SubscriptionDelta` shape + shared writer; contract tests per provider against the same internal state |
| R-17 | **Entitlement granted on forged amount/event** | Low | Critical | Activate only on provider-verified transaction + expected config amount; metadata (not payload amount) drives tier (STRIDE §9A.12.7) |

**Non-risks (extends §9.4 / §9A.10):**

| ID | Non-Risk | Rationale |
|---|---|---|
| NR-8 | **PCI scope increases** | Both providers are hosted checkout; no card data on Forge (NFR-20), same as ADR-003 |
| NR-9 | **Tier/UI logic must branch per provider** | Internal subscription state is one shape; tiers (ADR-005), status endpoint, and UI are provider-neutral |
| NR-10 | **In-place provider switching needed for v1** | One subscription = one provider; switching = cancel-then-create; in-place migration is out of scope |

### 9A.11 Deliberately Out of Scope (this extension)

| Item | Rationale |
|---|---|
| Per-sharer referral attribution (unique tokens) | Privacy + over-engineering; `ref=export` channel tag suffices (ADR-011) |
| Pricing CMS / runtime price editing | `lib/pricing.ts` config is sufficient at this scale (ADR-012) |
| react-three-fiber | Not requested; adds React-coupled dependency; raw three.js in one component is enough (ADR-010) |
| Demo fixture replacement | Locked unchanged at G1 #4; only the landing preview copy is touched |
| Landing layout / motion choreography / social-proof visual design | UX-designer territory (`docs/DESIGN-SPEC.md`), not architecture |
| Server-side anonymous plan store | One-plan handoff via the existing sessionStorage is simpler (ADR-009 alt rejected) |
| In-place provider switching (move a live subscription Stripe↔Paystack) | v1: one subscription = one provider; switch = cancel-then-create (ADR-013) |
| FX conversion / live NGN pricing | NGN is product-owner-confirmed config, never FX-derived (ADR-013); no rate engine |
| Auto-detecting provider by geo/IP | G2 locked Option B (user picks); avoids mis-routing (ADR-013) |
| Third+ payment providers, wallets, crypto | Only Stripe (USD) + Paystack (NGN) at G2; seam allows later addition (ADR-013) |
| Multi-currency on a single provider (e.g. Stripe NGN) | Not an assumed capability; NGN is the Paystack path (ADR-013) |

---

## 10. Migration Plan

### 10.1 Phase 1: Foundation (Week 1)

**Goal:** Auth + DB scaffolding, email capture gate, watermark, preserve e2e tests.

| Step | Action | Files | Acceptance |
|---|---|---|---|
| 1.1 | Add SQLAlchemy, Alembic, python-jose, bcrypt, stripe, authlib to `requirements.txt` | `requirements.txt` | `pip install -r requirements.txt` succeeds |
| 1.2 | Create `api/database.py` with SQLite default, PostgreSQL via env | `api/database.py` | `get_db()` yields working session |
| 1.3 | Create `api/models.py` with `User`, `Plan`, `Lead` (minimal) | `api/models.py` | Alembic `revision --autogenerate` produces valid migration |
| 1.4 | Create `api/auth.py` with JWT create/verify, bcrypt helpers | `api/auth.py` | Unit tests for password hash + JWT round-trip |
| 1.5 | Create `api/routers/auth.py` with signup, login, me | `api/routers/auth.py` | `curl` signup → login → me works |
| 1.6 | Create `api/routers/leads.py` | `api/routers/leads.py` | POST creates lead record |
| 1.7 | Modify `api/export.py` and `api/export_pdf.py` to accept `tier` and conditionally watermark | `api/export.py`, `api/export_pdf.py` | Free tier has watermark; Pro/Team does not |
| 1.8 | Modify `api/index.py` to register new routers | `api/index.py` | All routes reachable via `/api/*` |
| 1.9 | Add Next.js auth state helpers (cookie read, `/api/auth/me` call) | `lib/auth.ts` (new) | Nav shows login/signup appropriately |
| 1.10 | Add email-capture modal to `ForgeApp` | `components/forge-app.tsx` | Download triggers modal for anonymous users |
| 1.11 | Update e2e tests: add `X-Test-Auth: bypass` support in FastAPI | `api/auth.py`, `tests/e2e/` | Existing tests pass; new auth tests pass |

**Critical constraint:** `sessionStorage` remains the anonymous fallback. No removal of existing flow.

### 10.2 Phase 2: Free Tier (Week 2)

**Goal:** Free account creation, plan persistence, "My plans" view, password reset.

| Step | Action | Files | Acceptance |
|---|---|---|---|
| 2.1 | Add `Plan` CRUD router | `api/routers/plans.py` | Auth'd user can create, list, get, delete plans |
| 2.2 | Add plan limit enforcement (3 plans for free tier) | `api/routers/plans.py` | 4th plan save returns 403 |
| 2.3 | Add Google OAuth flow | `api/routers/auth.py` | OAuth signup → login works |
| 2.4 | Create `pages/my-plans.tsx` | `pages/my-plans.tsx` | Lists plans, clickable to load |
| 2.5 | Modify `pages/app.tsx` to load plan from query param | `pages/app.tsx` | `?plan_id=xxx` loads saved plan |
| 2.6 | Add "Save plan" button to `ForgeApp` | `components/forge-app.tsx` | Saves current plan to DB |
| 2.7 | Add free-account prompt banner after 1st plan | `components/forge-app.tsx` | Banner appears, dismissible |
| 2.8 | Add password reset flow | `api/routers/auth.py`, email service | Self-service reset works |

### 10.3 Phase 3: Pro Tier (Week 3)

**Goal:** Pro upgrade prompt, Stripe checkout, subscription status, Pro benefits.

| Step | Action | Files | Acceptance |
|---|---|---|---|
| 3.1 | Add `Subscription` model and router | `api/models.py`, `api/routers/subscriptions.py` | Checkout session created |
| 3.2 | Add Stripe webhook handler | `api/routers/webhooks.py` | Webhook updates subscription status |
| 3.3 | Add upgrade CTA UI when free limit hit | `components/forge-app.tsx`, `pages/my-plans.tsx` | CTA visible, links to checkout |
| 3.4 | Add Pro badge and tier-aware UI | `components/layout/Nav.tsx` | Pro users see badge |
| 3.5 | Add Stripe Customer Portal link | `api/routers/subscriptions.py` | User can manage billing |
| 3.6 | Add tier-aware rate limits | `api/index.py` (limiter key func) | Pro users get 10/min |
| 3.7 | Add plan deletion for Pro users | `api/routers/plans.py` | DELETE works for owner |

### 10.4 Phase 4: Team Tier & Polish (Week 4+)

**Goal:** Team tier, distribution hooks, demo improvements, hero rewrite.

| Step | Action | Files | Acceptance |
|---|---|---|---|
| 4.1 | Add `Team` and `TeamMember` models | `api/models.py` | Schema supports teams |
| 4.2 | Add team admin invite flow | `api/routers/teams.py` | Admin invites by email |
| 4.3 | Add team seat enforcement | `api/routers/teams.py` | 6th member rejected |
| 4.4 | Add white-label export (no Forge branding) | `api/export.py`, `api/export_pdf.py` | Team exports have no header/footer |
| 4.5 | Add batch generation (up to 10 ideas) | `api/routers/batch.py` | Returns 10 plans |
| 4.6 | Landing page distribution hooks | `pages/index.tsx` | Coach/agency blocks visible |
| 4.7 | Demo improvements | `pages/demo.tsx`, `lib/fixtures/` | High-converting scenarios |

### 10.5 Rollback Strategy

| Phase | Rollback Trigger | Action |
|---|---|---|
| Phase 1 | Auth breaks existing flow | Revert `api/index.py` router registration; keep `sessionStorage` only |
| Phase 2 | DB performance issues | Add connection pooling (`sqlalchemy.pool`); consider read replica |
| Phase 3 | Stripe integration fails | Disable checkout CTA; allow free unlimited temporarily |
| Phase 4 | Team tier too complex | Ship as "contact us" (Calendly) instead of full multi-seat |

---

## 11. Deliberately Out of Scope

| Feature | Rationale | PRD Reference |
|---|---|---|
| Real-time collaboration / multi-user editing | Too complex; Team tier is consumption, not concurrent editing | W1 |
| Custom branding / domain white-label | Beyond Team tier v1; defer until validated demand | W2 |
| AI model selection by user | Adds complexity; gpt-4.1-mini for all tiers | W3 |
| Mobile native app | Web-first SaaS; mobile web sufficient | W4 |
| Advanced analytics dashboard for users | No validated demand; "My plans" list is sufficient | W5 |
| Affiliate / referral program | Defer until baseline monetization proven | W6 |
| Internationalization (i18n) | English-only for launch | W7 |
| Phone/SMS auth | Email + OAuth sufficient; SMS adds cost | W8 |
| Two-factor authentication (2FA) | Defer until security audit or enterprise tier | W9 |
| Plan sharing / public links | Adds moderation risk; defer | W10 |
| Redis for production caching | Not justified by current scale; add when rate-limit or session load requires | Assumption |
| Email service integration (SendGrid/Postmark/Resend) | Welcome email and password reset can use Python `smtplib` initially; upgrade to transactional provider when deliverability matters | PRD §9 Dependencies |

---

## 12. Appendix: ADR Index

Every significant architecture decision is recorded in `docs/adr/`:

| ADR | Title | Status |
|---|---|---|
| [ADR-001](adr/ADR-001-jwt-httponly-cookie.md) | JWT in httpOnly Cookie Session | Proposed |
| [ADR-002](adr/ADR-002-sqlite-postgresql-sqlalchemy.md) | SQLite Dev / PostgreSQL Prod with SQLAlchemy + Alembic | Proposed |
| [ADR-003](adr/ADR-003-stripe-checkout-hosted.md) | Stripe Checkout Hosted Flow | **Superseded by ADR-013** |
| [ADR-004](adr/ADR-004-fastapi-owns-auth.md) | FastAPI Owns Auth and Business Logic | Proposed |
| [ADR-005](adr/ADR-005-soft-prompt-hard-cap.md) | Soft UI Prompt + Hard API Cap for Tier Enforcement | Proposed |
| [ADR-006](adr/ADR-006-watermark-footer.md) | Watermark as Document Footer | Proposed |
| [ADR-007](adr/ADR-007-e2e-auth-bypass.md) | Dev-Only e2e Auth Bypass | Proposed |
| [ADR-008](adr/ADR-008-no-session-migration.md) | No Migration of Anonymous Session Plans on Signup | **Superseded by ADR-009** |
| [ADR-009](adr/ADR-009-auto-save-on-signup.md) | Auto-Save Session Plan on Signup | Accepted |
| [ADR-010](adr/ADR-010-threejs-gsap-landing.md) | three.js + GSAP for the Buyer-Facing Landing Hero | Accepted |
| [ADR-011](adr/ADR-011-watermark-referral-attribution.md) | Watermark Referral Attribution (`ref=export`) | Accepted |
| [ADR-012](adr/ADR-012-pricing-route.md) | Dedicated `/pricing` Route | Accepted (amended for ADR-013) |
| [ADR-013](adr/ADR-013-multi-provider-billing.md) | Multi-Provider Billing (Stripe + Paystack, user-selected) | Accepted (supersedes ADR-003) |

---

*End of Architecture Document. This is a living document. Update when assumptions are validated, open questions are resolved, or scope changes.*
