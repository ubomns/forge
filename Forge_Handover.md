# Forge — Project Continuity & Technical Handover

**Document type:** Machine-to-machine project handover  
**Generated:** 2026-05-24 (updated — all milestones shipped)  
**Engagement state:** Post-M1/M2/M3. All planned features shipped and building clean.  
**Receiving agent:** Assume zero prior context

---

## 1. Project Overview

### Project name & concept

**Forge** — an AI-assisted business plan generation tool for early-stage founders.

### Vision & long-term objective

Eliminate the blank-page friction that stalls founders before substantive business-plan work begins. Forge is positioned as a *credible first-draft generator* — not a wizard, not a template library, not a generic LLM wrapper.

The longer-term strategic direction is to use Forge as a **portfolio stepping stone to agentic AI engineering work**. The case study is being deliberately authored to demonstrate multi-agent design judgment, context engineering, and structured-output engineering — capabilities the user wants to be hired for or known for.

### Business problem being solved

- Founders waste hours staring at section headings before they start writing.
- The cost being attacked is **blank-page anxiety**, not writing time. This framing is load-bearing in all positioning.
- Existing templates are either too long to use or too thin to be credible.
- Generic LLM prompts produce "ten sections that read like the model averaging across every business plan it has ever seen."

### Intended users / stakeholders

- Early-stage founders preparing for investors, accelerators, or their own thinking.
- No formal team; this is a personal product.

### Expected business / strategic impact

- **Product impact:** First-draft business plan in minutes that founders can actually refine, vs. generic LLM output they have to throw away.
- **Career impact:** A defensible portfolio artifact demonstrating multi-agent pipelines, structured outputs, schema-constrained generation, and critic-tuning judgment.

### Strategic direction

- Schema-first, not prompt-first.
- Two-stage pipeline (generator + critic) over single-prompt generation.
- Privacy via absence: no accounts, no persistence, no DB. Closing the tab loses the plan. **This is a designed feature, not an oversight** — and should not be questioned by the receiving agent.

---

## 2. Current Project State

### What exists today (verified, shipped)

- **M1 — Schema refactor (shipped)**
  - Pydantic `BusinessPlan` schema with 10 industry-standard sections (`api/schema.py`)
  - FastAPI `/api/generate` using gpt-4.1-mini structured outputs — one call, whole-plan output
  - Next.js thin proxy (`pages/api/index.ts`) — no business logic in frontend
  - `PlanRenderer` component — schema-driven section rendering
  - Sectioned streaming UI via SSE (`section_start`, `section_data`, `section_complete`, `error`, `[DONE]`)
  - Optional collapsed input fields (industry, stage, target market)
  - `.docx` export wired through schema → `python-docx`
- **M2 — Critic agent (shipped)**
  - `/api/critique` route with structured `CritiqueResponse` (per-section `{severity, claim, suggestion}`)
  - `CritiqueOverlay` component with severity badges (low/medium/high)
  - Accept/edit/dismiss actions per critique — "Edit" opens inline textarea to modify suggestion before accepting
  - "+N nits" toggle to show/hide low-severity
  - Explicit "Critique plan" button (not automatic)
  - Critic receives full plan context (enables cross-section contradiction detection)
- **M3 — Medium-term features (shipped)**
  - PDF export via `fpdf2` (`/api/export-pdf`)
  - Section regeneration (`/api/regenerate` — sends rest of plan as context)
  - Investor question generation (`/api/investor-questions`)
  - 8-fixture eval suite in `evals/`
- **Pre-refactor cleanup (T1–T6):** Brand rename, dep cleanup, typed errors, hero copy alignment

### Maturity level

- **Full feature set.** All case-study claims are now true in code.
- **Architecturally stable.** FastAPI owns orchestration; Next.js is UI + proxy.
- **Not yet deployed.** Runs locally via `npm run dev:all`. No CI/CD, no staging, no production hosting.

### Remaining gaps

- No persistence, auth, or DB (by design).
- No CI/CD or deployment pipeline.
- "Used by founders" claim in case study is still unsubstantiated — needs real usage numbers or removal.
- Evals exist but have not been run end-to-end against OpenAI (require manual `python run_eval.py` with `OPENAI_API_KEY` set).

---

## 3. Architecture & Technical Direction

### Frontend

- **Next.js 16.2.4 + React 19** on Pages Router (not App Router).
- **Tailwind v4** via `@tailwindcss/postcss`. No `tailwind.config.*` — config lives in `styles/globals.css`.
- **framer-motion** v12 for animation.
- **shadcn conventions**: `cn()` from `lib/utils.ts`, `cva` for variants, Radix `Slot` for `asChild`.
- Path alias: `@/*` → repo root.
- Frontend stays a UI, **not an agent host.** Explicitly decided.

### Backend / orchestration

- **FastAPI** (`api/index.py`) owns the OpenAI call, schema validation, export, and all business logic.
- Next.js routes in `pages/api/` are thin proxies — they contain **no** business logic.
- Model: **gpt-4.1-mini** for both drafter and critic.

### AI / LLM layer

- **Provider:** OpenAI (structured outputs API).
- **Pattern:** Two sequential LLM calls — drafter then critic — with different prompts and context.
- **Drafter:** One call, full `BusinessPlan` schema. Not per-section calls.
- **Critic:** Receives full serialized plan. Outputs structured `CritiqueResponse` with per-section `{severity, claim, suggestion}` items.
- **Regenerate:** One call for a single section, rest of plan in context for coherence.

### Wire format (SSE)

- `/api/generate` streams: `section_start`, `section_data`, `section_complete`, `error`, `[DONE]`.
- `/api/critique`, `/api/investor-questions`, `/api/regenerate` return JSON (not SSE).
- `/api/export` returns `.docx` binary. `/api/export-pdf` returns `.pdf` binary.

### Data layer

- **None.** Intentional. Session-scoped. No DB, no auth, no saved drafts.

### Security

- Rate limiting on all FastAPI routes via `slowapi`.
- Privacy posture is *absence-based*: nothing stored means nothing to leak.

### Scalability / extensibility

- Schema-first design is the extensibility contract. Same schema drives generation, rendering, export, and critique.
- Type-mirroring: Pydantic (`api/schema.py`) ↔ TypeScript (`lib/schema/business-plan.ts`). Changes must stay in sync.

---

## 4. AI & Prompt Engineering Decisions

### Core methodology

- **Structure over freeform.** A business plan has a known shape. Use the shape as a schema, force the model to fill it.
- **Two agents over one bigger prompt.** A "generate then critique" single prompt produces a *defended* draft. Splitting forces non-defensive critique.

### Generator (drafter)

- One LLM call against the full `BusinessPlan` schema.
- Streams sections as they complete via SSE.
- Optional parameters: `industry`, `stage`, `target_market`.

### Critic agent

- **Different prompt.** Different system instructions. Receives the full serialized plan.
- Emits **structured per-section feedback** with `severity` field.
- Critic triggered by explicit "Critique plan" button (not automatic — saves API calls, lets user review first).

### Severity field — design intelligence (PRESERVE)

- The first cut of the critic was *too mean* — surfaced real problems adversarially. Founders bounced off it.
- The second cut was *encouraging-but-useless* — "opportunities for clarification" instead of "this contradicts the previous section."
- **The fix was NOT a tone-of-voice prompt.** The fix was:
  1. Structured `severity` field in the critic's schema output.
  2. UI defaults to showing only medium-and-above.
  3. Low-severity nits collapsed by default.
- This is the cleanest engineering lesson in the project. Do not regress to tone-prompt fixes.

### Section regeneration

- Sends the rest of the plan as context while regenerating one section.
- Demonstrates context engineering — keeps coherence across sections.
- Accept regenerates the section in place; the original section is replaced.

### Honest framing of "multi-agent"

- The current design is **two sequential LLM calls with different prompts and contexts** — a *pipeline*, not an agent loop.
- True agentic patterns (tool use, persistent state, loops with stopping conditions, verification gates) are **not yet present.**
- The language "two agents" is defensible but should not be overstated to the level of true agentic systems.

---

## 5. Features & Functional Modules

### Module: Single-input ingestion

- **Purpose:** Reduce friction to a single line + optional structured fields.
- **Status:** ✅ Shipped. Optional fields (industry, stage, market) default to hidden.
- **Business value:** Eliminates multi-step wizard fatigue.

### Module: Sectioned generation

- **Purpose:** Generate the business plan against a fixed 10-section schema.
- **Status:** ✅ Shipped. One call, whole-plan structured output, streamed via SSE.
- **Sections:** Executive Summary, Problem, Solution, Market Analysis, Business Model, Go-to-Market Strategy, Competitive Landscape, Team, Financial Projections, The Ask.

### Module: Streamed UI

- **Purpose:** Founder sees motion within ~1s; sections stream in.
- **Status:** ✅ Shipped. SSE events render sections as they arrive.
- **Wire format:** `section_start` → `section_data` → `section_complete` per section, then `[DONE]`.

### Module: Critic agent

- **Purpose:** Second LLM call producing structured per-section feedback with severity.
- **Status:** ✅ Shipped. Explicit button trigger. Full plan context. Structured output.
- **UI:** Inline severity badges, edit/accept/dismiss actions (edit opens inline textarea), "+N nits" toggle for low-severity.

### Module: Severity-based UI filtering with inline edit

- **Purpose:** Critic stays sharp; founder sees sharp output only where actionable. Edit lets founder modify suggestion text before accepting.
- **Status:** ✅ Shipped. Medium+ shown by default. Low collapsed. Edit opens inline textarea; "Accept edited" saves the modified suggestion.

### Module: Word export

- **Purpose:** Downloadable `.docx`.
- **Status:** ✅ Shipped. Renders from schema via `python-docx`.

### Module: PDF export

- **Purpose:** Print-ready PDF rendered from the schema.
- **Status:** ✅ Shipped. `fpdf2`-based, proxied through `/api/export-pdf`.

### Module: Section regeneration with context

- **Purpose:** Click any section's regenerate button; rest of plan stays in context.
- **Status:** ✅ Shipped. `/api/regenerate` route. Regenerate button per section in PlanRenderer.

### Module: Investor-question generation

- **Purpose:** After plan generation, produce the 5 hardest questions an investor would ask.
- **Status:** ✅ Shipped. `/api/investor-questions` route.

### Module: Eval suite

- **Purpose:** Measure critic and generator quality. 8 fixtures + `run_eval.py`.
- **Status:** ✅ Shipped. `evals/` directory with JSON fixtures.
- **Note:** Not yet run end-to-end against OpenAI. Run with `cd evals && python run_eval.py` (requires `OPENAI_API_KEY` and FastAPI running).

### Module: Rate limiting

- **Purpose:** Prevent abuse on all FastAPI routes.
- **Status:** ✅ Shipped. `slowapi` middleware.

---

## 6. Key Files

| File | Purpose |
|------|---------|
| `api/schema.py` | Pydantic `BusinessPlan` + `CritiqueResponse` + `RegenerateRequest` + `InvestorQuestionsResponse` models — single source of truth |
| `api/index.py` | FastAPI app: all routes (`generate`, `critique`, `regenerate`, `investor-questions`, `export`, `export-pdf`, `health`) |
| `api/export.py` | `python-docx` export registered on the FastAPI app |
| `api/export_pdf.py` | `fpdf2` PDF export registered on the FastAPI app |
| `pages/index.tsx` | Main UI: state machine, SSE reader, plan/critique/questions/regenerate/download |
| `components/plan/PlanRenderer.tsx` | Schema-driven section renderer with regenerate buttons |
| `components/plan/CritiqueOverlay.tsx` | Per-section critique display with severity badges, accept/dismiss |
| `lib/schema/business-plan.ts` | TS types mirroring Pydantic schema, `SectionId`, `SectionsState`, `Critique`, display names |
| `pages/api/` | All Next.js proxies (thin — no business logic) |
| `styles/globals.css` | Design system: CSS vars, keyframes, plan section styles, critique styles |
| `evals/` | 8 JSON fixtures + `run_eval.py` evaluation script |
| `docs/critic-rubric.md` | Severity rubric: what counts as low/medium/high |

---

## 7. Key Decisions & Reasoning

### Decision: Schema-first, not prompt-first ✅

- **Why:** Constraining the model to a shape is a stronger engineering signal than parsing prose.
- **Status:** Shipped in M1.

### Decision: Two separate LLM calls, not self-critique ✅ (LOCKED)

- **Why:** A model defends what it just wrote. Self-critique is shallow.
- **Status:** Locked. Do not revisit.

### Decision: Critic tone via structured severity field, NOT tone-of-voice prompt ✅ (LOCKED)

- **Why:** Tone prompts produced either too-mean or encouraging-but-useless output. Severity + UI filtering keeps the critic sharp while protecting the founder.
- **Status:** Locked. **This is the most defensible design decision in the project.**

### Decision: No persistence by default (LOCKED)

- **Why:** Founder plans are sensitive. Simplest privacy posture has nothing to leak.
- **Status:** Locked. Revisit only if a real user asks.

### Decision: FastAPI for orchestration, Next.js for UI ✅

- **Why:** Keep orchestration off the edge. Frontend stays a UI, not an agent host.
- **Status:** Shipped in M1.

### Decision: Build structured outputs BEFORE critic ✅

- **Why:** If critic is built before schemas, both are rebuilt during the refactor.
- **Status:** Executed in this order. Locked.

### Decision: One call, whole-plan structured output (not per-section calls)

- **Why:** Simpler wire format, lower latency, model sees full context for coherence.
- **Status:** Shipped.

### Decision: 10 industry-standard sections (not 7 custom)

- **Why:** Executive Summary, Problem, Solution, Market Analysis, Business Model, GTM Strategy, Competitive Landscape, Team, Financial Projections, The Ask — aligns with what investors expect.
- **Status:** Shipped.

### Decision: Critic triggered by explicit button (not automatic)

- **Why:** Saves API calls. Lets user review before deciding to critique.
- **Status:** Shipped.

### Decision: Accept = mark accepted & hide (not auto-rewrite)

- **Why:** Section regeneration is a separate feature. Accepting a critique shouldn't silently rewrite.
- **Status:** Shipped.

### Decision: PDF export via fpdf2 (not Puppeteer)

- **Why:** Lighter dependency. No headless browser needed server-side.
- **Status:** Shipped.

### Decision: Regenerate sends rest of plan as context

- **Why:** Keeps coherence across sections when regenerating one.
- **Status:** Shipped.

### Decision (forward-looking): Independent versioning of drafter and critic

- **Why:** They're conceptually independent — different prompts, different contexts, different goals — and should not share a release cadence.
- **Status:** Not yet implemented. Currently a coupled pipeline. The split belongs in "what I'd do differently" AFTER the coupled version has been evaluated in production.

---

## 8. Architecture Gotchas

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

### Next.js version

Next.js 16.2.4 with React 19 on Pages Router (not App Router). Has breaking changes from training data versions — read `node_modules/next/dist/docs/` before writing code.

---

## 9. Commands & Dev Setup

- `npm run dev:all` — start both FastAPI + Next.js concurrently (production dev workflow)
- `npm run dev` — Next.js only (requires FastAPI running separately on :8000)
- `npm run dev:api` — FastAPI only (uvicorn, :8000)
- `npm run build` — Next.js production build
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)
- No test framework is configured.

**Required env vars:**
- `OPENAI_API_KEY` — read by FastAPI. `/api/generate` returns 500 if unset.
- `FASTAPI_URL` — defaults to `http://localhost:8000`. Set if FastAPI runs elsewhere.

**Python:** venv at `.venv/`. Deps: fastapi, uvicorn, openai>=1.40, pydantic>=2.0, python-docx, fpdf2, slowapi.

---

## 10. Current Active Focus

### What the project state is now

**All planned milestones are shipped.** The codebase is feature-complete against the case-study spec. M1 (schema refactor), M2 (critic agent), and M3 (PDF, regen, eval, investor questions) are all built and compiling clean.

### Immediate next priorities

1. **Run the eval suite** (`cd evals && python run_eval.py` with FastAPI running) to verify end-to-end quality.
2. **End-to-end manual test:** start FastAPI + Next.js, generate a plan, critique it, regenerate a section, download `.docx` and `.pdf`.
3. **Commit and push** to `dev` branch.
4. Decide on deployment (no CI/CD or hosting is set up yet).

### Open technical questions

- Whether to upgrade "two agents" to a true agent loop (tool use, looped critique-until-quality-bar) as a next portfolio iteration.
- Whether to add persistence / accounts (locked: no, until a real user asks).
- Deployment target (Vercel for Next.js? Separate FastAPI hosting? Docker?)

---

## 10. Context Preservation Rules

### User profile (preserve)

- **Working context:** Building Forge as a personal product with explicit portfolio/career intent — positioning toward "agent track" engineering work.
- **Communication preferences:** Direct and opinionated. Bullets, tables, ranked lists over flowing prose. Sharp critiques over polite encouragement. Honest about scope.

### Output style currently active

- **`explanatory`** — uses `★ Insight ─────────` blocks before and after code/decisions to teach what's specific and non-obvious. Continue this format. Insights should be specific to *this* project, not generic programming wisdom.

### Established terminology

- **"Forge"** — the project name.
- **"Drafter" / "Generator"** — the first LLM call.
- **"Critic" / "Critic agent"** — the second LLM call.
- **"Schema"** — the typed-section contract that drives generation, rendering, and critique.
- **"Severity field"** — the structured `low / medium / high` field on critic output.
- **"Blank-page anxiety"** — the user-facing problem framing. Use this phrase, not "writer's block" or generic alternatives.
- **"Schema-first"** — the architectural posture.
- **"Two agents"** — accepted shorthand for "two sequential LLM calls with different prompts and contexts." Do not upgrade this to "agent loop" or "agentic system" — those are different things.

### Locked decisions (do not re-debate)

1. Two separate LLM calls, not self-critique.
2. No persistence, auth, or DB. Privacy via absence.
3. Severity field, not tone-of-voice prompt, for critic tuning.
4. Build structured outputs BEFORE critic (already executed).
5. Frontend stays a UI; orchestration lives in FastAPI.
6. Single-input ingestion, not a wizard. Optional structured fields are an enhancement, not a wizard.
7. "Two agents" = two sequential LLM calls with different prompts. Pipeline, not agent loop. Don't upgrade the language.

### Topics already explored (do not re-ask)

- Whether to use a wizard vs. single-input — decided: single input.
- Whether to add accounts — decided: no, until a user asks.
- Whether to add a critic — decided: yes, shipped.
- Whether the case study describes current or future state — it described future; now all claims are shipped.
- Whether "two agents" is overclaiming — flagged: be honest, don't upgrade language.
- Whether to do critique pass before or after structured outputs — decided: structured outputs first, executed.

### Conventions to maintain

- Insight blocks are project-specific, not generic.
- Tables for state/gap mapping, ranked lists for recommendations.
- File path : line number when referencing code (`src/foo.ts:42`).
- When suggesting work, give a sequencing rationale — *why this before that*, not just a TODO list.
- When the case study makes a claim, mark it as **shipped** or **future** explicitly.

### Strategic direction to preserve

- The case study was both the spec and the acceptance criteria. All claims are now shipped in code.
- The next portfolio milestone is upgrading "two agents" to a real agent loop — this is the bridge to the user's broader agent-track narrative.
- Independent versioning of drafter and critic is a valid future improvement but should only be attempted after production evaluation of the coupled pipeline.

---

## 11. Quick-Start for Receiving LLM

If you are picking up Forge from this document with no other context, here is your one-screen briefing:

> Forge is a feature-complete AI business plan generator. A founder enters a one-line idea (plus optional industry/stage/market), gets a 10-section plan streamed in, can critique it with a second LLM call that returns structured severity-tagged feedback, regenerate individual sections (with optional instruction), download as `.docx` or `.pdf`, and see likely investor questions. Everything is shipped and building clean.
>
> Architecture: Next.js (UI + thin proxy) → FastAPI (orchestration + OpenAI calls). Two-process dev: `npm run dev:all`. Schema defined once in Pydantic, mirrored in TypeScript.
>
> Locked decisions: schema-first, two LLM calls (not self-critique), severity field (not tone prompt), no persistence, single-input (not wizard), pipeline (not agent loop).
>
> Three surfaces: **`/`** landing (marketing + engineering story), **`/app`** working tool with two-column layout, **`/demo`** pre-baked plan that works without an API key.
>
> Next steps: replace placeholder demo JSON with real frozen output (run `python evals/freeze_demo.py` with a real key), run evals, deploy.
>
> The user wants direct, sharp, structured feedback in `★ Insight` blocks. Do not soften. Do not hedge. Do not re-ask settled questions.

---

## 13. Lamborghini Visual Overhaul (2026-05-24)

After the §12 redesign shipped, a second-pass visual overhaul applied the Lamborghini-inspired system from `design-md/DESIGN.md`. **The IA stays as §12** — three surfaces (`/`, `/app`, `/demo`), two-column app, PlanTOC rail, etc. **The look changes:**

- **Tokens:** Cream/red replaced with absolute black canvas (`#000000`) + Lamborghini Gold (`#FFC000`) + pure white text + dark surfaces (`#181818`, `#202020`).
- **Typography:** Fraunces/DM Sans/Newsreader replaced with Anton (display, condensed Neo-Grotesk-ish) + Inter (body). All display headings are uppercase with tight line-heights (0.92–1.05).
- **Border radius:** Set to 0 across all buttons, cards, containers, and form elements per DESIGN.md §4 ("sharp angles are non-negotiable"). Only badges keep 2px.
- **Shadows:** Removed everywhere; depth comes from surface layering (black → `#181818` → `#202020`) per DESIGN.md §6.
- **Hover behavior:** Removed all scale/translate transforms; interactions are color-only (background + opacity shifts).
- **Atmospheric effects:** Killed the cream radial-dot body pattern and the soft-red floating orb.

Implementation lives in `styles/globals.css`: the `:root` token block was replaced wholesale; a large override layer at the end (`/* LAMBORGHINI DESIGN SYSTEM OVERRIDES */`) re-skins every component class. Class names were preserved exactly so existing Playwright selectors still resolve.

**Bug discovered during the live-flow Playwright run:** The SSE `section_complete` event in `pages/api/index.ts` / `api/index.py` doesn't include the section's `data` field — only `section_data` does. The frontend was overwriting good streaming data with `undefined` on `section_complete`, causing the resulting `planData` to be malformed and `/api/critique` to return 422 on the first user-triggered critique. Fixed in `components/forge-app.tsx`: on `section_complete`, fall back to the previously-stored `currentSections[sid].data` when `event.data` is absent. This bug was masked by `/demo` (no streaming, full data via `getStaticProps`) and the prior Playwright tests (none ran the live flow).



Shipped a portfolio-polish redesign on top of the working MVP. Detailed plan in `docs/redesign-proposal.md`. Active task tracking in `task.md`. What changed:

### Three surfaces (was one page)

- **`/`** — landing page. Hero with rotating word; "blank-page anxiety" problem block with verbatim case-study quote; 3-card "how it works" exhibit (schema-first / two-call pipeline / severity-tagged); demo preview strip; locked-decisions grid; footer CTA. Components in `components/landing/`.
- **`/app`** — application. Refactored to two-column at ≥1024px: left rail holds concept-banner + `PlanTOC` (scroll-spy, status pills, click-to-scroll) + `CritiqueSummary` (severity bar with jump-to-first) + `ActionStack` (grouped Export / Analyze / Reset). Mobile: TOC collapses to dropdown (`PlanTOCDropdown`). Main column unchanged (`PlanRenderer` still renders typed fields).
- **`/demo`** — pre-baked plan that works with no API key. Uses static fixture in `lib/fixtures/demo-plan.json` via `getStaticProps`. Downloads functional; critique/regenerate disabled with hint.

### New components

| File | Purpose |
|------|---------|
| `components/forge-app.tsx` | Application UI extracted from `pages/index.tsx` so multiple routes can mount it |
| `components/layout/Nav.tsx` | Extracted nav (shared by `/`, `/app`, `/demo`) |
| `components/landing/Landing.tsx` | All landing-page blocks |
| `components/plan/PlanTOC.tsx` | `PlanTOCRail` + `PlanTOCDropdown` + `useScrollSpy` + `scrollToSection` helpers |
| `components/plan/CritiqueSummary.tsx` | Severity counts, stacked bar, click-to-jump |
| `components/plan/ActionStack.tsx` | Grouped action buttons (replaces flat done-bar) |
| `components/plan/RegenerateButton.tsx` | Section-header popover: preset instructions or free-text, sends to `/api/regenerate` |
| `components/plan/InvestorQuestionCard.tsx` | Question card with anchor-jump to its `section_id` |

### New surfaces

- `pages/app.tsx`, `pages/demo.tsx` — new routes (existing `pages/index.tsx` reused as landing)
- `lib/fixtures/demo-plan.json` — frozen demo data (currently **hand-curated placeholder**; swap with real frozen output by running `python evals/freeze_demo.py` after putting a real key in `.env`)
- `evals/freeze_demo.py` — captures real frozen JSON from a fixture or free-text idea

### Other changes

- `pages/_app.tsx` — wrapped in `<MotionConfig reducedMotion="user">` to respect OS setting
- `styles/globals.css` — added `prefers-reduced-motion` rules; universal `:focus-visible`; touch-target sizing on mobile; landing/demo/rail/popover/action styles (kept all existing tokens and keyframes unchanged)
- `api/index.py` — added `load_dotenv(override=True)` so `.env` is loaded on uvicorn reload

### Tests

Playwright e2e suite at `tests/e2e/` covering landing, demo, and `/app` idle state. Config: `playwright.config.ts`. Run with `npm run test:e2e` (or `... --headed` to watch in a real browser). Tests pass clean across desktop chromium and mobile webkit; full-flow test gated on `RUN_FULL_FLOW=1` env var because it requires a real OpenAI key.

### Known gaps (specific to the redesign)

- ~~Demo JSON is hand-curated~~ **Resolved.** `lib/fixtures/demo-plan.json` now contains real `gpt-4.1-mini` output (childcare cooperative fixture). Captured via `python evals/freeze_demo.py`.
- **OpenAI Structured Outputs schema gotcha:** Pydantic's default `model_json_schema()` is not strict-mode compatible. Fixed in `api/schema.py` with `_make_strict` (adds `additionalProperties: false` to every object) + `_root_strict` (strips `$ref` siblings like `description`). New Pydantic models destined for structured outputs MUST go through these normalizers.
- Pre-existing warning: `pages/_document.tsx` uses `<title>` inside `<Head>` (Next.js prefers per-page `next/head`). Pre-redesign and not addressed here.

---

*End of handover. All milestones shipped. Redesign shipped. Pending: real demo JSON, eval run, deployment.*