# Forge — Task Handoff for Receiving Agent

**Generated:** 2026-05-24
**Project:** Forge — AI-assisted business plan generator
**Status of this document:** Active task list. Update in place as items are completed.
**Receiving agent assumption:** Zero prior context. Read §0 before touching code.

---

## §0 — Required reading before any work

In this order:

1. **`Forge_Handover.md`** — the project standard / spec. Locked decisions in §7 and §10. Terminology in §10. Build-order constraints in §9. **Do not re-debate locked decisions.**
2. **`CLAUDE.md` + `AGENTS.md`** — environment and tooling notes. The Next.js version is 16.2.4 with breaking changes from training data — `node_modules/next/dist/docs/` is authoritative when in doubt.
3. **§1 below** — the gap between what the handover claims and what the code actually is. The handover is aspirational in a few places; trust the code on those points.

**Communication preferences for this user:** direct, opinionated, structured. Bullets, tables, ranked lists over prose. File-path:line references when citing code (`pages/api/index.ts:46`). Mark every claim as **shipped** or **future**. Don't soften. Don't hedge. Don't upgrade "two agents" language to "agentic system" — those are different things.

---

## §1 — Current state vs. handover (verified by code audit 2026-05-24)

### Active path (TypeScript)

```
pages/index.tsx  →  POST /api  →  pages/api/index.ts  →  OpenAI Chat Completions (gpt-4o-mini, stream)
```

**Shipped today:**
- Single-page UI with `idle` → `generating` → `done`/`error` state machine (`pages/index.tsx:123-335`)
- Single textarea input, ⌘/Ctrl+Enter shortcut, 4 example chips (`pages/index.tsx:217-242`)
- `AnimatedHero` rotating-word headline (`components/ui/animated-hero.tsx`)
- `TiltCard` 3D mouse-tracked perspective transform — correctly separates rotating layer from styled card to preserve 3D context (`pages/index.tsx:84-121`); **preserve this nesting**
- Hand-rolled markdown subset renderer parsing `##`/`###`/`####`, `-`/`*`/`•`, `\d+.`, `**bold**` (`pages/index.tsx:20-82`) — **coupled to the prompt's markdown rules** in `pages/api/index.ts:17-21`
- SSE proxy: `data: <JSON-stringified token>\n\n` chunks, `[DONE]` terminator (`pages/api/index.ts` ↔ `pages/index.tsx:145-167`)
- Bespoke CSS design system in `styles/globals.css` (598 lines, 11 keyframes); polished

### Dormant path (Python)

- `api/index.py` is a FastAPI implementation of the same endpoint using `gpt-5-nano`. **Not wired into dev/build.** Exists as the seed for the planned FastAPI orchestration layer per handover §3.
- `.venv/` and `requirements.txt` belong to this Python side.
- **Prompt has drifted** from the TS prompt — same section list, slightly different text.

### Discrepancies with `Forge_Handover.md` — fix before quoting the handover

| Handover claim | Code reality | Action |
|---|---|---|
| §2: Input includes "structured fields (industry, stage, market)" | **Now shipped.** Optional collapsed fields for industry, stage, and market context. | No action needed |
| Project name "Forge" | **Fixed.** Nav says "Forge", document title says "Forge". | Done (T1) |
| ~~§2: "Word (.docx) export" does not exist~~ | **Now shipped.** `api/export.py` generates .docx from schema via `python-docx`. | Done (M1.5) |

---

## §2 — Locked decisions (do NOT re-debate)

Per `Forge_Handover.md` §7 and §10:

1. Two separate LLM calls (drafter + critic), **not** self-critique.
2. **No persistence by default** — no auth, no DB, no saved drafts. Reconsidered only if a real user asks.
3. Critic tone via structured **`severity` field** (`low`/`medium`/`high`), **NOT** tone-of-voice prompt. UI defaults to medium+, low collapsed.
4. **Build order: structured outputs FIRST, then critic.** Reverse means rebuilding both.
5. Frontend stays a UI; orchestration intended to live in FastAPI (planned).
6. Single-input ingestion, not a wizard.
7. "Two agents" means "two sequential LLM calls with different prompts and contexts." It is a **pipeline**, not an agent loop. Don't upgrade the language.

If a task would require touching any of these, **stop and ask** — don't propose alternatives.

---

## §3 — Open questions blocking milestone 1

These are conversation, not code. **Resolve with the user before writing schema code.**

| # | Question | Constraints |
|---|---|---|
| Q1 | **Section list** for `BusinessPlanSection[]` — industry-standard 10 sections (Exec Summary / Problem / Solution / Market / Competition / GTM / Business Model / Team / Financials / Ask), or a tighter custom 6-8? | Current prompt has 7 sections but they're brainstorm-flavored, not credible-plan-flavored. Schema should match "credible early-stage business plan" framing. |
| Q2 | **OpenAI model** for structured outputs | Current `gpt-4o-mini` likely undersells "credible first draft." Pick deliberately. Cost vs. quality. Must support Structured Outputs / Responses API. |
| Q3 | **One call vs. N calls** — whole-plan structured-output call (one shot, sections appear together) vs. per-section calls (true progressive streaming, higher cost) | Affects streaming UX and latency. Recommend whole-plan with partial-object streaming until per-section is needed for critic. |
| Q4 | **Orchestration location** — stay in `pages/api/*` (ship faster, simpler) or move to FastAPI (`api/index.py`) now to match case-study architecture story | Locked direction is FastAPI eventually. Timing is the question. |
| Q5 | **Structured input fields** — add industry/stage/market per handover §2, or stay single-textarea? | Affects schema input and prompt context. |

---

## §4 — Pre-refactor cleanup

Mechanical, low-risk. Can run in parallel with §3 decision conversation. Each is independently shippable.

### Tasks

- [x] **T1 — Brand naming.** Pick `Forge` or `IdeaForge` (per Q5 + handover §1 the canonical name is "Forge"). Apply to:
  - `pages/_document.tsx:7` — `<title>`
  - `pages/_document.tsx:8` — `<meta name="description">`
  - `pages/index.tsx:201` — `.nav-brand`
  - `README.md` — title heading
  - **Acceptance:** Grep for "IdeaForge" and "Business Idea Generator" returns zero matches outside `docs/notes/`.

- [x] **T2 — Remove unused deps.** Drop from `package.json` (then run `npm install` and verify `npm run build` still passes):
  - `react-markdown`
  - `remark-gfm`
  - `remark-breaks`
  - `@tailwindcss/typography` (Tailwind v4 CSS-only config doesn't load it via `@plugin` — confirm with grep)
  - `lucide-react` (nav uses inline SVG; grep before removing)
  - **Acceptance:** `npm run build` and `npm run lint` pass; bundle size in `.next/` drops.

- [x] **T3 — Fix or delete `components/ui/button.tsx`.** Deleted — references non-existent Tailwind tokens and was unused.
  - Options: (a) delete entirely; (b) add token definitions in `styles/globals.css` under `@theme`; (c) rewrite variants using existing CSS variables (`var(--accent)` etc.).
  - **Recommend (a) — delete.** Build a Button if/when milestone 1 needs one, against the actual design system in `globals.css`.
  - **Acceptance:** Either the file is gone OR the rendered button passes a visual check using `npm run dev`.

- [x] **T4 — Consolidate or remove the Python/TS prompt drift.**
  - Added drift note to `api/index.py` pointing to `pages/api/index.ts` as source of truth. Prompt will be consolidated automatically when M1.1 ships the shared schema.

- [x] **T5 — Distinguish error types in the API → UI path.**
  - API now returns typed JSON: `{ error: { code, message } }` with codes `MISSING_API_KEY`, `UPSTREAM_ERROR`, `INVALID_REQUEST`.
  - `pages/api/index.ts`: added `sendError()` helper; handles non-POST (405), missing key (500), upstream connection failure (502), upstream non-2xx, and stream interruption.
  - `pages/index.tsx`: error handler parses typed errors — shows key-specific message for `MISSING_API_KEY`, upstream message for `UPSTREAM_ERROR`, generic fallback otherwise.
  - **Acceptance:** ✅ API returns a typed error shape; UI surfaces the message field; "check your API key" only appears for `MISSING_API_KEY`.

- [x] **T6 — Hero copy alignment.**
  - Changed `components/ui/animated-hero.tsx:64` from "our AI builds the full plan" to "our AI drafts your first business plan." Matches current 7-section brainstorm output until the schema refactor delivers a full plan.

---

## §5 — Milestone 1: Schema refactor (THE keystone work)

**Goal:** Replace prose-with-markdown-rules generation with typed `BusinessPlanSection[]` driven by OpenAI Structured Outputs. Rewire rendering and export off the schema.

**Prerequisite:** §3 questions answered. Don't start without Q1, Q2, Q3, Q4.

### Tasks

- [x] **M1.1 — Define `BusinessPlanSection` schema.**
  - `api/schema.py` — Pydantic `BusinessPlan` model with 10 sections (Executive Summary, Problem, Solution, Market, Competition, GTM, Business Model, Team, Financials, Ask). Each section has typed fields. Exports JSON Schema for OpenAI Structured Outputs.
  - `lib/schema/business-plan.ts` — Matching TypeScript types, `SectionId`, `SectionsState`, `SECTION_ORDER`, `SECTION_DISPLAY_NAMES`, `GenerateRequest`.
  - **Decisions applied:** Q1 = 10 industry-standard sections; Q2 = gpt-4.1-mini; Q3 = one call; Q4 = FastAPI; Q5 = optional collapsed fields.
  - **Acceptance:** ✅ Both schemas compile; `model_json_schema()` produces valid JSON Schema; TS types pass `npm run build`.

- [x] **M1.2 — Rewrite generator call to OpenAI Structured Outputs.**
  - `api/index.py` — FastAPI `POST /api/generate` using `gpt-4.1-mini` with `response_format=json_schema` (strict mode).
  - New wire format: SSE events `{type: "section_start", section, index}`, `{type: "section_data", section, data}`, `{type: "section_complete", section, data, index}`, `{type: "error", code, message}`, and `data: [DONE]`.
  - Model generates complete `BusinessPlan`, then server emits section-by-section events for progressive rendering.
  - **Acceptance:** ✅ FastAPI endpoint validates with `BusinessPlan.model_validate()` before streaming.

- [x] **M1.3 — Schema-driven renderer.**
  - `components/plan/PlanRenderer.tsx` — Takes `SectionsState`, renders per-section with typed fields. No markdown parsing.
  - `renderContent` and `renderInline` deleted from `pages/index.tsx`.
  - CSS for plan sections, fields, TAM/SAM/SOM cards, bullet lists added to `styles/globals.css`.
  - **Acceptance:** ✅ No string-parsing of markdown in the render path.

- [x] **M1.4 — Sectioned streaming UI.**
  - `pages/index.tsx` — State changed from `idea: string` to `sections: SectionsState`. SSE reader parses `section_start`, `section_data`, `section_complete` events.
  - `PlanSection` components animate in with framer-motion as sections arrive.
  - Optional input fields (Industry, Stage, Target Market) added as collapsible "Add details" under textarea.
  - TiltCard, hero, examples, "Start over" all preserved.
  - **Acceptance:** ✅ Sections fill in order as they stream from the API.

- [x] **M1.5 — Word (.docx) export from schema.**
  - `api/export.py` — FastAPI `POST /api/export` takes `BusinessPlan` JSON, returns `.docx` via `python-docx`.
  - `pages/api/export-docx.ts` — Next.js thin proxy to FastAPI.
  - Client-side download button in done-bar, with "Download .docx" + "Start over" layout.
  - **Acceptance:** ✅ Export route registered; `python-docx` installed; proxy route compiles.

- [x] **M1.6 — Update `Forge_Handover.md` §2** to reflect the new shipped state (schema, structured outputs, sectioned streaming, **now-actually-shipped** docx export). Mark milestone 1 complete in §9.

---

## §6 — Milestone 2: Critic agent

**Prerequisite:** Milestone 1 fully shipped.

### Tasks

- [x] **M2.1 — Critic prompt.**
  - Location: `api/index.py` (CRITIC_SYSTEM_PROMPT constant). FastAPI `/api/critique` route.
  - Different prompt, different context window (full plan JSON, no drafter reasoning). Uses `gpt-4.1-mini` structured outputs against `CritiqueResponse` schema.
  - Locked output schema: `{ section_id, severity, claim, suggestion }` via `Critique` Pydantic model.
  - Tone via **severity field**, no tone-of-voice instructions. Severity definitions in `docs/critic-rubric.md`.
  - **Acceptance:** ✅ Prompt contains no "be encouraging"/"be direct" instructions. Severity is the tone mechanism.

- [x] **M2.2 — Critic API call.**
  - `POST /api/critique` in FastAPI — separate OpenAI call, not appended to drafter (locked decision).
  - `pages/api/critique.ts` — Next.js thin proxy to FastAPI.
  - Input: full `BusinessPlan` JSON (not single section — detects cross-section contradictions). Output: `CritiqueResponse` JSON.
  - Rate limited: 5/min per IP.
  - **Acceptance:** ✅ Route registered; structured output forces valid `CritiqueResponse`.

- [x] **M2.3 — Critique UI.**
  - `components/plan/CritiqueOverlay.tsx` — inline per-section overlay with severity badges, claim, suggestion.
  - Default visibility: `medium` and `high` shown; `low` collapsed under "+N nits" toggle.
  - Three actions: **Accept** (marks as accepted, hides critique), **Edit** (opens inline textarea to modify the suggestion before accepting), **Dismiss** (hides critique). See `components/plan/CritiqueOverlay.tsx:77-94`.
  - **Acceptance:** ✅ Severity filter works; nits toggle works; accept/edit/dismiss hides critique and persists across re-renders.

- [x] **M2.4 — Critique state.**
  - `lib/schema/business-plan.ts` — added `Critique`, `CritiqueResponse`, `Severity`, `CritiqueWithId` types.
  - `pages/index.tsx` — `critiques`, `critiqueStatus`, `acceptedCritiqueIds`, `dismissedCritiqueIds` state. Critique triggered by "Critique plan" button (explicit user action, not automatic). Reset on "Start over".
  - `PlanRenderer` accepts critique props and renders `CritiqueOverlay` per section.
  - **Acceptance:** ✅ State persists across re-renders; dismissals stick within session; reset clears all.

- [x] **M2.5 — Severity rubric documentation.**
  - `docs/critic-rubric.md` — defines `high` (contradictions, missing critical info, undefensible claims), `medium` (questionable assumptions, vagueness, scope misalignment), `low` (style, nits, formatting).
  - Critic prompt aligns with rubric definitions.
  - **Acceptance:** ✅ Rubric exists; severity definitions match prompt; will be used by M3.3 eval suite.

- [x] **M2.6 — Update `Forge_Handover.md` §2, §5, §9** to reflect critic shipped state.

---

## §7 — Milestone 3: Medium-term (after critic)

Build in this order — eval suite **before** further critic tuning, otherwise tuning is blind.

- [x] **M3.1 — PDF export from schema.**
  - `api/export_pdf.py` — FastAPI `POST /api/export-pdf` using `fpdf2`. Generates PDF from `BusinessPlan` with section headings, field labels, bullet lists, numbered questions.
  - `pages/api/export-pdf.ts` — Next.js thin proxy.
  - "Download .pdf" button alongside "Download .docx" in the done-bar.
  - **Acceptance:** ✅ Download produces valid PDF; section ordering matches schema.

- [x] **M3.2 — Section regeneration with context.**
  - `POST /api/regenerate` in FastAPI — takes `BusinessPlan` + `section_id` + optional `instruction`, sends rest of plan as context, regenerates single section via structured outputs.
  - `pages/api/regenerate.ts` — Next.js proxy.
  - Regenerate button (↻ icon) on each section header in `PlanRenderer`. Clicking it sends the full plan as context and replaces the section in state.
  - Critiques for the regenerated section are cleared automatically.
  - **Acceptance:** ✅ Regenerated section integrates with surrounding plan; critiques cleared.

- [x] **M3.3 — Tiny eval suite.**
  - `evals/` directory with 8 fixture business ideas and `run_eval.py` script.
  - Evaluates: schema compliance, section completeness, critique coverage, severity calibration, cross-section coherence.
  - **Acceptance:** ✅ `python evals/run_eval.py` produces a report with pass/fail per criterion.

- [x] **M3.4 — Investor-question generation.**
  - `POST /api/investor-questions` in FastAPI — takes `BusinessPlan`, returns 5 investor questions via structured outputs (`InvestorQuestionsResponse`).
  - `pages/api/investor-questions.ts` — Next.js proxy.
  - "Investor questions" button in done-bar (alongside critique and download buttons).
  - Questions display in a dedicated section below the plan with question text + "why it matters" explanation.
  - **Acceptance:** ✅ Questions surface in a dedicated UI section on `done`.

---

## §8 — What NOT to do

- ❌ Build the critic before structured outputs (rebuilds both).
- ❌ Add a "now critique your own output" instruction to the drafter prompt (self-critique is shallow — see handover §4).
- ❌ Tune critic tone with prompt instructions like "be encouraging" or "be direct." Use the severity field + UI filter.
- ❌ Add accounts, sessions, or a database. Privacy is via absence.
- ❌ Use `react-markdown` + remark plugins to replace the renderer — the schema renderer should render typed fields, not parse markdown.
- ❌ Skip `Forge_Handover.md` updates when milestones complete. The handover is the spec; out-of-date spec = drift.
- ❌ Move orchestration to FastAPI mid-milestone-1 unless Q4 was answered "now." Don't change two things at once.
- ❌ Use the existing `components/ui/button.tsx` as-is — its Tailwind tokens don't exist in this project. See T3.
- ❌ Bundle prior uncommitted MVP work (`components/`, `lib/utils.ts`, `pages/api/index.ts`, prior modifications) into refactor commits. They deserve a `feat: initial Forge MVP` commit first; ask the user.

---

## §9 — Definition of done (per milestone)

**Milestone 1 done when:**
- ✅ `BusinessPlan` schema exists in Pydantic (`api/schema.py`) and TS (`lib/schema/business-plan.ts`) — single source of truth for generation, rendering, and docx export.
- ✅ No string-parsing of markdown in the render path. `renderContent`/`renderInline` deleted; `PlanRenderer` uses typed fields.
- ✅ `npm run build` and `npm run lint` pass.
- A user can paste an idea, watch sections stream in, and download a valid `.docx`. *(needs manual E2E test)*
- `Forge_Handover.md` §2 has been updated to reflect actual shipped state.

**Milestone 2 done when:**
- ✅ Critic runs on completed sections as a second OpenAI call (`POST /api/critique`).
- ✅ UI shows medium+ critiques by default, low collapsed.
- ✅ Accept / edit / dismiss actions work and persist within session.
- ✅ `docs/critic-rubric.md` exists and aligns with the critic prompt.

**Milestone 3 done when:**
- ✅ PDF export works. `api/export_pdf.py` generates valid PDF from schema.
- ✅ Section regeneration preserves coherence with surrounding sections. `POST /api/regenerate` takes full plan + section_id.
- ✅ Eval suite runs and produces a report. `python evals/run_eval.py` evaluates 8 fixtures.
- ✅ Investor-question feature ships. `POST /api/investor-questions` + UI section.

---

## §10 — Reporting format expected from receiving agent

When you complete or attempt any task above:

1. **Quote the task ID** (T2, M1.3, etc.) in your update.
2. **Note files touched** with `path:line` references.
3. **Mark blockers explicitly** — don't silently skip. If an open question in §3 wasn't answered, stop and ask.
4. **If you discover a new gap** between code and `Forge_Handover.md`, add it to §1 of this document.
5. **Update checkboxes in this file** when items ship.

---

## §11 — Interface redesign (shipped 2026-05-24)

Per `docs/redesign-proposal.md`. Three-surface IA, preserved cream/red tokens.

### Decisions locked at the start

- **A1:** Real landing at `/`
- **A2:** Real frozen output for `/demo` (✅ **completed** — `lib/fixtures/demo-plan.json` now contains real `gpt-4.1-mini` output captured via `python evals/freeze_demo.py`)
- **A3:** Defer the engineering drawer
- **A4:** Collapsed dropdown TOC on mobile
- **A5:** "Forge" everywhere

### Phases

- [x] **Phase 1 — Routing scaffolding.** Extract `pages/index.tsx` body to `components/forge-app.tsx`; add `components/layout/Nav.tsx`; create `pages/app.tsx` + `pages/demo.tsx` wrappers.
- [x] **Phase 2 — Landing page.** Six blocks per proposal §3.1. Components in `components/landing/`. All tokens preserved.
- [x] **Phase 3 — `/demo` wired with frozen JSON.** Static `getStaticProps` load of `lib/fixtures/demo-plan.json`. Downloads functional; critique/regen disabled with hint.
- [x] **Phase 4 — Two-column `/app` layout.** `components/plan/PlanTOC.tsx` with `PlanTOCRail` + `PlanTOCDropdown`. Scroll spy via `useScrollSpy` + `IntersectionObserver`. `scrollToSection` helper. `data-section-id` added to `PlanRenderer` section elements.
- [x] **Phase 5 — CritiqueSummary + ActionStack.** Both mounted in rail. Replaces flat done-bar. Grouped actions (Export / Analyze / Reset).
- [x] **Phase 6 — Regenerate popover with `instruction`.** Replaces icon-only ↻ with popover (4 presets + free-text input). Wires existing `instruction` param of `/api/regenerate`.
- [x] **Phase 7 — Reduced-motion pass.** CSS `prefers-reduced-motion: reduce` + `<MotionConfig reducedMotion="user">` in `_app.tsx`.
- [x] **Phase 8 — Investor questions integration.** Extracted to `InvestorQuestionCard` + `InvestorQuestionsList`. Each card jump-links to its `section_id`.
- [x] **Phase 9 (deferred) — Engineering drawer.** Per A3.
- [x] **Phase 10 — Polish + mobile pass.** Universal `:focus-visible`, mobile padding/sizing, touch targets ≥44px on mobile.
- [x] **Phase 11 — Playwright e2e.** `tests/e2e/*.spec.ts` covering landing, demo, `/app` idle. `playwright.config.ts` with chromium + mobile webkit projects. Full-flow test gated on `RUN_FULL_FLOW=1`. **Run: `npm run test:e2e`** (add `--headed` to watch). Last run: 24 passed, 1 skipped (gated), 0 failed.
- [x] **Phase 12 — Final build + handover update.** `npm run build` passes; `npm run lint` clean except pre-existing `<title>` warning in `_document.tsx`. `Forge_Handover.md` §12 added.

### Known gaps after redesign

1. **OpenAI strict-mode schema normalization** lives in `api/schema.py:_make_strict` and `_root_strict`. Any new Pydantic model used with structured outputs must pass through them; otherwise OpenAI rejects with "additionalProperties required" or "$ref cannot have sibling keywords."
2. **Stale `e2e/forge.spec.ts`** at repo root — not used by `playwright.config.ts` (which points to `tests/e2e/`). Safe to delete.
3. **Pre-existing:** `pages/_document.tsx` `<title>` warning. Per Next.js, move to `next/head` per page. Out of redesign scope.

---

*End of task document. Pair with `Forge_Handover.md`. Ready for next agent.*
