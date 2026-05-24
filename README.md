# Forge

AI-assisted business plan generator for early-stage founders.

Forge is a credible first-draft generator — not a wizard, not a template library, not a generic LLM wrapper. The cost it attacks is **blank-page anxiety**, not writing time.

See [`Forge_Handover.md`](./Forge_Handover.md) for the full spec, locked design decisions, and current build state. See [`CLAUDE.md`](./CLAUDE.md) and [`AGENTS.md`](./AGENTS.md) for agent working instructions.

## Stack

- **Next.js 16.2.4 + React 19** on the **Pages Router**
- **FastAPI** (Python) on `:8000` — orchestration, OpenAI calls, schema validation, export
- **OpenAI gpt-4.1-mini** with structured outputs — one call for full plan, separate call for critic
- **Tailwind v4** (CSS-config via `@import "tailwindcss"` in `styles/globals.css`) + bespoke CSS tokens
- **framer-motion** v12 for motion; **shadcn-style** primitives in `components/ui/`
- **python-docx** for `.docx` export; **fpdf2** for `.pdf` export
- **slowapi** for rate limiting on all FastAPI routes

## Commands

```bash
npm run dev:all  # start FastAPI + Next.js concurrently (production dev workflow)
npm run dev      # Next.js only (requires FastAPI running separately on :8000)
npm run dev:api  # FastAPI only (uvicorn, :8000)
npm run build    # Next.js production build
npm run lint     # ESLint (flat config, eslint.config.mjs)
```

No test framework is configured.

## Environment

Required:

- `OPENAI_API_KEY` — read by FastAPI. `/api/generate` returns 500 if unset.
- `FASTAPI_URL` — defaults to `http://localhost:8000`. Set if FastAPI runs elsewhere.

## Architecture at a glance

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

- **FastAPI** (`api/index.py`) owns the OpenAI call, schema validation, and export generation. It is the orchestration layer.
- **Next.js** (`pages/api/`) are thin proxies — no business logic.
- **Schema** is defined once in Pydantic (`api/schema.py`) and mirrored as TypeScript types (`lib/schema/business-plan.ts`).
- **Wire format:** SSE events `section_start`, `section_data`, `section_complete`, `error`, and `[DONE]`.

## Current state

All three milestones are shipped:

- **M1 — Schema refactor:** Pydantic `BusinessPlan` with 10 typed sections, gpt-4.1-mini structured outputs, SSE streaming, `.docx` export from schema.
- **M2 — Critic agent:** `/api/critique` with structured `CritiqueResponse` (severity-tagged per-section feedback), UI with severity badges, accept/edit/ignore actions, "+N nits" toggle for low-severity.
- **M3 — Medium-term features:** PDF export, section regeneration with full-plan context, investor-question generation, 8-fixture eval suite, rate limiting.