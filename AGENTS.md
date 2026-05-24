<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project

**Forge** — AI-assisted business plan generator. Idea in → structured plan out → .docx download.

**Architecture (post-M1 refactor):**

```
Browser → Next.js (:3000) → FastAPI (:8000) → OpenAI (gpt-4.1-mini, structured outputs)
              │                       │
              └── /api (proxy) ───────┼── /api/generate (SSE: section events)
                                      └── /api/export   (.docx from schema)
```

- **FastAPI** (`api/index.py`) owns the OpenAI call, schema validation, and docx generation. It is the orchestration layer.
- **Next.js** (`pages/api/index.ts`, `pages/api/export-docx.ts`) are thin proxies. They contain **no** business logic.
- **Schema** is defined once in Pydantic (`api/schema.py`) and mirrored as TypeScript types (`lib/schema/business-plan.ts`).
- **Wire format:** SSE events `section_start`, `section_data`, `section_complete`, `error`, and `[DONE]`. Not token-string SSE.

## Commands

- `npm run dev:all` — start both FastAPI + Next.js concurrently (production dev workflow)
- `npm run dev` — Next.js only (requires FastAPI running separately on :8000)
- `npm run dev:api` — FastAPI only (uvicorn, :8000)
- `npm run build` — Next.js production build
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)
- Playwright e2e tests configured (see `tests/e2e/` and `playwright.config.ts`); unit/integration test frameworks are not configured

**Required env vars:**

- `OPENAI_API_KEY` — read by FastAPI. `/api/generate` returns 500 if unset.
- `FASTAPI_URL` — defaults to `http://localhost:8000`. Set if FastAPI runs elsewhere.

## Key files

| File | Purpose |
|------|---------|
| `api/schema.py` | Pydantic `BusinessPlan` + `CritiqueResponse` models — single source of truth |
| `api/index.py` | FastAPI app: `/api/generate`, `/api/critique`, `/api/regenerate`, `/api/investor-questions`, `/api/export`, `/api/export-pdf`, `/api/health` |
| `api/export.py` | `python-docx` export registered on the FastAPI app |
| `api/export_pdf.py` | `fpdf2` PDF export registered on the FastAPI app |
| `pages/api/index.ts` | Next.js proxy → `FASTAPI_URL/api/generate` |
| `pages/api/critique.ts` | Next.js proxy → `FASTAPI_URL/api/critique` |
| `pages/api/regenerate.ts` | Next.js proxy → `FASTAPI_URL/api/regenerate` |
| `pages/api/investor-questions.ts` | Next.js proxy → `FASTAPI_URL/api/investor-questions` |
| `pages/api/export-docx.ts` | Next.js proxy → `FASTAPI_URL/api/export` |
| `pages/api/export-pdf.ts` | Next.js proxy → `FASTAPI_URL/api/export-pdf` |
| `pages/index.tsx` | Main UI: state machine, SSE reader, PlanRenderer, critique trigger, download button |
| `components/plan/PlanRenderer.tsx` | Schema-driven section renderer with critique overlays |
| `components/plan/CritiqueOverlay.tsx` | Per-section critique display with severity badges, accept/dismiss |
| `lib/schema/business-plan.ts` | TS types, `SectionId`, `SectionsState`, `Critique`, `CritiqueWithId`, `InvestorQuestion`, display names |
| `styles/globals.css` | Design system: CSS vars, keyframes, plan section styles, critique styles, investor questions |
| `docs/critic-rubric.md` | Severity rubric: what counts as low/medium/high |
| `evals/` | Fixture business ideas + `run_eval.py` evaluation script |

## Architecture gotchas

### Two-process dev workflow

Running `npm run dev` without FastAPI on :8000 will give connection errors. Use `npm run dev:all` or run both processes manually.

### SSE wire format

`/api/generate` streams JSON SSE events: `{type: "section_start", section, index}`, `{type: "section_data", section, data}`, `{type: "section_complete", section, data, index}`, `{type: "error", code, message}`, and `data: [DONE]`. The client in `pages/index.tsx` parses this exact format. Both sides must stay in sync.

### TiltCard 3D nesting

`pages/index.tsx` — the `TiltCard` separates the rotating transform layer from the styled card so `overflow: hidden` doesn't break the 3D context. **Preserve this nesting** if refactoring.

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
- `components/ui/` follows shadcn conventions: `cn()` from `lib/utils.ts` (clsx + tailwind-merge), `cva` for variants, Radix `Slot` for `asChild`.
- Motion is `framer-motion` v12.
- Path alias: `@/*` → repo root (`tsconfig.json`).

## Locked decisions (from task.md §2 — do NOT re-debate)

1. Two separate LLM calls (drafter + critic), not self-critique.
2. No persistence, auth, or DB. Privacy via absence. This is a designed feature.
3. Critic tone via structured `severity` field (`low`/`medium`/`high`), not tone-of-voice prompt.
4. **Build order: structured outputs first, then critic.** Reverse means rebuilding both. ✅ Both now shipped.
5. Orchestration lives in FastAPI. Next.js is a UI + proxy. ✅ Shipped in M1.
6. Single-input ingestion, not a wizard. Optional structured fields (industry, stage, market) are an enhancement, not a wizard.
7. "Two agents" = two sequential LLM calls with different prompts. Pipeline, not agent loop. Don't upgrade the language.

If a task would require touching any of these, **stop and ask**.

## Active work document

`task.md` is the authoritative task list and state tracker. **Read it before starting work.** Update its checkboxes and §1 when you discover or ship things.

## Git

Active branch is `dev`; PRs target `main`.