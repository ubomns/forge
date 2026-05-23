# Forge

AI-assisted business plan generator for early-stage founders.

Forge is a credible first-draft generator — not a wizard, not a template library, not a generic LLM wrapper. The cost it attacks is **blank-page anxiety**, not writing time.

See [`Forge_Handover.md`](./Forge_Handover.md) for the full spec, locked design decisions, and current build state. See [`CLAUDE.md`](./CLAUDE.md) and [`AGENTS.md`](./AGENTS.md) for agent working instructions.

## Stack

- **Next.js 16.2.4 + React 19** on the **Pages Router**
- **Tailwind v4** (CSS-config via `@import "tailwindcss"` in `styles/globals.css`) + bespoke CSS tokens
- **OpenAI Chat Completions** (streamed) via `pages/api/index.ts`
- **framer-motion** for motion; **shadcn-style** primitives in `components/ui/`
- A dormant **FastAPI** implementation lives in `api/index.py` for the planned orchestration layer (not wired into dev/build)

## Commands

```bash
npm run dev     # start the Next.js dev server
npm run build   # production build
npm run start   # serve the built app
npm run lint    # ESLint via eslint-config-next
```

No test framework is configured.

## Environment

Required:

- `OPENAI_API_KEY` — read by `pages/api/index.ts`. The route returns HTTP 500 with a plain-text error if unset.

## Architecture at a glance

```
pages/index.tsx  →  POST /api  →  pages/api/index.ts  →  OpenAI Chat Completions (stream)
```

The API route proxies OpenAI's SSE stream to the client, re-emitting each delta as `data: <JSON-stringified token>\n\n` and ending with `data: [DONE]`. The system prompt enforces a strict markdown subset that the hand-rolled renderer in `pages/index.tsx` parses directly — keep prompt and renderer in sync.

## Current state vs. spec

The MVP today is: one-line idea → plan → Word download.

The spec in `Forge_Handover.md` describes a richer system — typed section schemas, streamed sectioned generation, a separate critic agent with structured severity-tagged feedback, accept/edit/ignore UI, PDF export, FastAPI orchestration. **None of that is built yet.** Build order is locked: schema refactor first, critic second.
