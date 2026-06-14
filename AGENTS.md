<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project

**Forge** — AI-assisted business plan generator. Idea in → structured plan out → .docx / .pdf download.

**Architecture (post-M1/M2/M3 + redesign):**

```
Browser → Next.js (:3000) → FastAPI (:8000) → OpenAI (gpt-4.1-mini, structured outputs)
              │                       │
              └── /api (proxy) ───────┼── /api/generate (SSE: section events)
                                      ├── /api/critique (JSON)
                                      ├── /api/regenerate (JSON)
                                      ├── /api/investor-questions (JSON)
                                      ├── /api/export (.docx)
                                      └── /api/export-pdf (.pdf)
```

- **FastAPI** (`api/index.py`) owns the OpenAI call, schema validation, and docx/pdf generation. It is the orchestration layer.
- **Next.js** (`pages/api/*.ts`) are thin proxies. They contain **no** business logic.
- **Schema** is defined once in Pydantic (`api/schema.py`) and mirrored as TypeScript types (`lib/schema/business-plan.ts`).
- **Wire format:** SSE events `section_start`, `section_data`, `section_complete`, `error`, and `[DONE]`. Not token-string SSE.

## Commands

- `npm run dev:all` — start both FastAPI + Next.js concurrently (production dev workflow)
  - **Windows only:** uses `.venv\Scripts\python.exe`. On macOS/Linux, adjust to `.venv/bin/python`.
- `npm run dev` — Next.js only (requires FastAPI running separately on :8000)
- `npm run dev:api` — FastAPI only (uvicorn, :8000)
- `npm run build` — Next.js production build
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)
- `npm run test:e2e` — Playwright e2e tests (`tests/e2e/`)
- `npm run test:e2e:install` — install Playwright browsers

**Required env vars:**

- `OPENAI_API_KEY` — read by FastAPI. `/api/generate` returns 500 if unset.
- `FASTAPI_URL` — defaults to `http://localhost:8000`. Set if FastAPI runs elsewhere.

## Key files

| File | Purpose |
|------|---------|
| `api/schema.py` | Pydantic `BusinessPlan` + `CritiqueResponse` + `InvestorQuestionsResponse` models — single source of truth |
| `api/index.py` | FastAPI app: `/api/generate`, `/api/critique`, `/api/regenerate`, `/api/investor-questions`, `/api/export`, `/api/export-pdf`, `/api/health` |
| `api/export.py` | `python-docx` export registered on the FastAPI app |
| `api/export_pdf.py` | `fpdf2` PDF export registered on the FastAPI app |
| `pages/api/index.ts` | Next.js proxy → `FASTAPI_URL/api/generate` |
| `pages/api/critique.ts` | Next.js proxy → `FASTAPI_URL/api/critique` |
| `pages/api/regenerate.ts` | Next.js proxy → `FASTAPI_URL/api/regenerate` |
| `pages/api/investor-questions.ts` | Next.js proxy → `FASTAPI_URL/api/investor-questions` |
| `pages/api/export-docx.ts` | Next.js proxy → `FASTAPI_URL/api/export` |
| `pages/api/export-pdf.ts` | Next.js proxy → `FASTAPI_URL/api/export-pdf` |
| `pages/index.tsx` | Landing page wrapper (`<Landing />`) |
| `pages/app.tsx` | Main app surface (two-column plan generator) |
| `pages/demo.tsx` | Frozen demo plan surface |
| `components/forge-app.tsx` | Shared app shell between `/app` and `/demo` |
| `components/plan/PlanRenderer.tsx` | Schema-driven section renderer with critique overlays |
| `components/plan/CritiqueOverlay.tsx` | Per-section critique display with severity badges, accept/dismiss |
| `lib/schema/business-plan.ts` | TS types, `SectionId`, `SectionsState`, `Critique`, `CritiqueWithId`, `InvestorQuestion`, display names |
| `styles/globals.css` | Design system: CSS vars, keyframes, plan section styles, critique styles, investor questions |
| `docs/critic-rubric.md` | Severity rubric: what counts as low/medium/high |
| `evals/` | Fixture business ideas + `run_eval.py` evaluation script |

## Architecture gotchas

### Two-process dev workflow

Running `npm run dev` without FastAPI on :8000 will give connection errors. Use `npm run dev:all` or run both processes manually.

`next.config.ts` adds a **dev-only rewrite** (`/api/:path*` → `FASTAPI_URL/api/:path*`) so the frontend can call `/api/generate` directly in development. In production, the proxy routes in `pages/api/*.ts` forward to FastAPI.

### SSE wire format

`/api/generate` streams JSON SSE events: `{type: "section_start", section, index}`, `{type: "section_data", section, data}`, `{type: "section_complete", section, data, index}`, `{type: "error", code, message}`, and `data: [DONE]`. The client in `components/forge-app.tsx` parses this exact format. Both sides must stay in sync.

### TiltCard 3D nesting

`components/forge-app.tsx` — the `TiltCard` separates the rotating transform layer from the styled card so `overflow: hidden` doesn't break the 3D context. **Preserve this nesting** if refactoring.

### Schema is the rendering contract

`PlanRenderer` renders typed fields from `SectionsState`, not parsed markdown. If you add a section or field to `api/schema.py`, you must:

1. Add the matching type to `lib/schema/business-plan.ts`
2. Add a renderer entry in `components/plan/PlanRenderer.tsx`
3. Add the section heading to `SECTION_DISPLAY_NAMES` in both files

### Optional input fields

Industry, Stage, and Target Market are optional collapsible fields under the textarea. They default to hidden. These are sent to `/api/generate` as optional parameters.

## Styling

- **Tailwind v4** via `@tailwindcss/postcss` (postcss.config.mjs). No `tailwind.config.*` — config lives in CSS via `@import "tailwindcss"` in `styles/globals.css`.
- The bulk of the visual design is **bespoke CSS** in `styles/globals.css`: CSS variables for tokens, hand-written keyframes, plan section styles, TAM/SAM/SOM cards, skeleton loaders. This file is the design system source of truth.
- `components/ui/`: class merging via `cn()` from `lib/utils.ts` (clsx + tailwind-merge). Only `animated-hero.tsx` exists. `cva` (class-variance-authority) and Radix `Slot` are **not** installed — they were removed as unused; add them back if you adopt shadcn-style variant components.
- Motion is `framer-motion` v12.
- Path alias: `@/*` → repo root (`tsconfig.json`).

## Testing

- **Playwright e2e only.** No unit or integration test framework is configured.
- Config: `playwright.config.ts` — `tests/e2e/` directory, chromium + mobile webkit projects.
- Full-flow test (OpenAI call) is gated on `RUN_FULL_FLOW=1` env var.
- Last known run: 24 passed, 1 skipped (gated), 0 failed.

## Eval suite

`evals/run_eval.py` evaluates 8 fixture business ideas against schema compliance, section completeness, critique coverage, and severity calibration. **Requires `OPENAI_API_KEY` and manual execution.** Not part of CI.

## Locked decisions (from task.md §2 — do NOT re-debate)

1. Two separate LLM calls (drafter + critic), not self-critique.
2. ~~No persistence, auth, or DB. Privacy via absence.~~ **OVERRIDDEN 2026-06-11** — Pivoting to SaaS. Persistence, auth, and DB are now required for monetization (email capture, saved plans, paid tiers, team licensing).
3. Critic tone via structured `severity` field (`low`/`medium`/`high`), not tone-of-voice prompt.
4. **Build order: structured outputs first, then critic.** Reverse means rebuilding both. ✅ Both now shipped.
5. Orchestration lives in FastAPI. Next.js is a UI + proxy. ✅ Shipped in M1.
6. Single-input ingestion, not a wizard. Optional structured fields (industry, stage, market) are an enhancement, not a wizard.
7. "Two agents" = two sequential LLM calls with different prompts. Pipeline, not agent loop. Don't upgrade the language.

If a task would require touching any of these (except #2, which is now active), **stop and ask**.

## Active work document

`task.md` is the authoritative task list and state tracker. **Read it before starting work.** Update its checkboxes and §1 when you discover or ship things.

## Git

Active branch is `dev`; PRs target `main`.

## Agent team

This repository is orchestrated by an Engineering Lead that delegates to specialist subagents:

- **product-manager** — scope, PRD, success metrics
- **business-analyst** — requirements, user stories, acceptance criteria
- **solution-architect** — component design, tech stack, docs/ARCHITECTURE.md
- **scrum-master** — WBS, sprint plan, task assignment, docs/WBS.md
- **ux-designer** — layout, interaction, states, docs/DESIGN-SPEC.md
- **frontend-dev** — client implementation (reads WBS + design spec)
- **backend-dev** — server implementation (reads WBS + architecture)
- **qa-tester** — test authoring and execution (reads WBS + acceptance criteria)
- **code-reviewer** — quality review (read-only)
- **security-engineer** — vulnerability audit (read-only)

Default delegation playbook: load `delegation-playbook` skill at start of orchestration. Use `codebase-conventions` and `git-workflow` when coordinating changes. In development phase, use `feature-dev` to drive Jira-ticketed work.

## OpenCode config

`opencode.json` sets `skill: { "*": "deny" }`. Skills must be explicitly loaded per task; they are not auto-injected.
