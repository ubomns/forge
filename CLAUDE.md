# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Critical: Next.js version

This is **Next.js 16.2.4 + React 19** on the **Pages Router** (not App Router). `pages/_app.tsx`, `pages/_document.tsx`, `pages/api/*` are authoritative. The warning imported from `AGENTS.md` applies — APIs may differ from training data; consult `node_modules/next/dist/docs/` before writing Next.js code.

## Commands

- `npm run dev:all` — start both FastAPI and Next.js concurrently (recommended dev workflow)
- `npm run dev` — start Next.js dev server only (requires FastAPI running separately on :8000)
- `npm run dev:api` — start FastAPI only (uvicorn, :8000)
- `npm run build` — production build
- `npm run start` — serve the built app
- `npm run lint` — ESLint via `eslint-config-next` (flat config in `eslint.config.mjs`)
- Playwright e2e tests configured (no unit/integration test framework)

Required env: `OPENAI_API_KEY` (read by FastAPI on :8000). The endpoint returns HTTP 500 with an error if unset. Set `FASTAPI_URL` if FastAPI runs on a different host/port.

## Architecture

**Two-process orchestration:** FastAPI (port 8000) is the active backend orchestrating schema validation, OpenAI calls, and export operations. Next.js is a thin proxy+UI layer.

**Request flow:**

```
Browser
  ↓
Next.js (port 3000)
  pages/api/index.ts → POST /api/generate → pages/index.tsx (SSE reader)
  pages/api/critique.ts → POST /api/critique
  pages/api/regenerate.ts → POST /api/regenerate
  pages/api/investor-questions.ts → POST /api/investor-questions
  pages/api/export-docx.ts → POST /api/export
  pages/api/export-pdf.ts → POST /api/export-pdf
  ↓
FastAPI (port 8000, `api/index.py`)
  ↓
OpenAI API (gpt-4-mini)
```

**Schema & validation:** Pydantic models (`BusinessPlan`, `CritiqueResponse`, `InvestorQuestionsResponse`) live in `api/schema.py`. TypeScript mirrors exist in `lib/schema/business-plan.ts` and `components/forge-app.tsx`. OpenAI Structured Outputs (strict mode) ensures the LLM returns valid JSON matching the schema.

**SSE wire format:** `/api/generate` streams newline-delimited JSON events:
- `{"type": "section_start", "section": "problem", "index": 0}`
- `{"type": "section_data", "section": "problem", "data": {...}}`
- `{"type": "section_complete", "section": "problem", "data": {...}, "index": 0}`
- `{"type": "error", "code": "...", "message": "..."}`
- `data: [DONE]`

The client in `pages/index.tsx` reads this exact format via EventSource / fetch streaming.

**Prompt ↔ renderer coupling.** The system prompt in `api/index.py` enforces strict JSON via Structured Outputs (not markdown); output is typed Pydantic objects. The UI renderer in `components/plan/PlanRenderer.tsx` consumes the typed schema and renders each section accordingly.

**Styling.**
- Tailwind v4 via `@tailwindcss/postcss` (postcss.config.mjs). No `tailwind.config.*` — config lives in CSS via `@import "tailwindcss"` in `styles/globals.css`.
- The bulk of the visual design is **bespoke CSS in `styles/globals.css`** (CSS variables for tokens, hand-written keyframes). Tailwind utility classes appear mainly in the shadcn-style primitives.
- `components/ui/` follows the shadcn convention: `cn()` from `lib/utils.ts` (clsx + tailwind-merge), `cva` for variants, Radix `Slot` for `asChild`. Only `button.tsx` and `animated-hero.tsx` exist so far.
- Motion is driven by `framer-motion` (v12). The `TiltCard` in `pages/index.tsx` separates the rotating transform layer from the styled card so `overflow: hidden` doesn't break the 3D context — preserve that nesting.

**Path alias.** `@/*` → repo root (`tsconfig.json`). Import as `@/components/...`, `@/lib/utils`, etc.

## Repository extras

- `week1/*.md` are course/tutorial notes, not app code. `day5.md` outlines a Docker + AWS App Runner deployment that has **not been built** in this repo (no Dockerfile, no `api/server.py`, no static export config).
- `next.config.ts` is minimal (`reactStrictMode: true`). If implementing the day5 path, the static-export changes go here.
- Active branch is `dev`; PRs target `main`.
