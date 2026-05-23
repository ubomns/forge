# Forge — Project Continuity & Technical Handover

**Document type:** Machine-to-machine project handover
**Generated:** 2026-05-24
**Engagement state:** Strategic planning / pre-refactor
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
- Currently used by the user themselves plus "a handful of founders" (vague — flagged as needing a real number or removal from the case study).
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

### What exists today (verified)

- Single-input ingestion: one-line business idea plus a few structured fields (industry, stage, market).
- Plan generation from the short description.
- **Word (.docx) export.**
- No accounts. No persistence. Session-scoped only.

### What the case study claims (NOT yet built — this is the spec, not the status)

The polished case study currently reads as if these are shipped. **They are not.** This was explicitly clarified by the user. The case study is the **future state** Forge is being built toward. The receiving agent must not assume any of the following are implemented:

- Typed schema per section using OpenAI Structured Outputs
- Streaming sectioned generation in the UI
- A second LLM call ("critic agent") per section with its own prompt and context
- Structured severity field on critic output (`low / medium / high`)
- Default UI filter showing only medium-and-above critic issues; low-severity collapsed
- Inline accept / edit / ignore on critique suggestions
- PDF export (Word export exists; PDF does not)
- FastAPI orchestration layer (current orchestration location unconfirmed — likely Next.js frontend)

### Maturity level

- **Functional MVP** with the absolute minimum (idea in, plan out, Word download).
- **Architecturally pre-refactor.** The schema refactor is the keystone work item.
- **Pre-evaluation.** No eval suite for critic quality. No automated quality measurement.

### Outstanding gaps

- No schema layer.
- No critic.
- No PDF.
- No streaming.
- No eval suite.
- No independent versioning between (future) drafter and critic.
- "Used by founders" claim is unsubstantiated — needs real usage numbers or removal.

---

## 3. Architecture & Technical Direction

### Frontend

- **Next.js** — handles input UI and rendering.
- Frontend stays a UI, **not an agent host.** Explicitly decided.

### Backend / orchestration

- **FastAPI** — intended to handle orchestration, schema validation, and the two-agent call chain.
- Status: **planned per case study**, current implementation reality not fully confirmed in this session. Likely still partially or fully running through Next.js routes today.

### AI / LLM layer

- **Provider:** OpenAI (referenced explicitly — "OpenAI's structured outputs API," "second OpenAI call").
- **Pattern:** Two separate calls — drafter and critic — with different prompts and different context windows.
- **Critical constraint:** The critic must NOT be the same model re-prompted to critique its own output. The case study explicitly rejects this: *"the same model asked to critique its own output… produces shallow critique because the model defends what it just wrote."* The receiving agent must treat this as a locked design decision.

### Data layer

- **None.** Intentional. Session-scoped. No DB, no auth, no saved drafts.
- Reconsidered only "if a real user asks" — not before.

### Hosting / deployment

- Not extensively discussed. The two-agent split should be **independently versioned and deployed**, per the case study's "what I'd do differently" — but the user has not yet built the coupled version, so this is forward-looking, not retrospective.

### Security / compliance

- Privacy posture is *absence-based*: nothing stored means nothing to leak. Founder plans treated as sensitive by default.

### Scalability / extensibility

- Schema-first design is the extensibility play. Once sections are typed, the same schema can render to UI, Word, PDF, and future evals/critic feedback.

---

## 4. AI & Prompt Engineering Decisions

### Core methodology

- **Structure over freeform.** A business plan has a known shape. Use the shape as a schema, force the model to fill it.
- **Two agents over one bigger prompt.** A "generate then critique" single prompt produces a *defended* draft. Splitting forces non-defensive critique.

### Generator agent

- Drafts plan content section-by-section against a typed schema (planned).
- Streams output as sections complete (planned).

### Critic agent

- **Different prompt.** Different context window. No knowledge of the generator's reasoning.
- Emits **structured per-section feedback** against the same schema.
- Each critique includes a **severity field** — this is the load-bearing detail in the case study and the "hard problem worth mentioning" passage.

### Severity field — design intelligence (PRESERVE)

- The first cut of the critic was *too mean* — surfaced real problems adversarially. Founders bounced off it.
- The second cut was *encouraging-but-useless* — "opportunities for clarification" instead of "this contradicts the previous section."
- **The fix was NOT a tone-of-voice prompt.** The fix was:
  1. Structured `severity` field in the critic's schema output.
  2. UI defaults to showing only medium-and-above.
  3. Low-severity nits collapsed by default.
- This is the cleanest engineering lesson in the project. Do not regress to tone-prompt fixes.

### Context management strategy

- Drafter and critic receive **separate, isolated context windows**. This isolation is the mechanism that produces useful critique.
- For future section regeneration: the rest of the plan stays in context while one section is regenerated. This is explicitly called out as a "context engineering" demonstration target.

### Honest framing of "multi-agent"

- The current design is **two sequential LLM calls with different prompts and contexts** — a *pipeline*, not an agent loop.
- True agentic patterns (tool use, persistent state, loops with stopping conditions, verification gates) are **not yet present.**
- The case study language ("two agents") is defensible but should not be overstated to the level of true agentic systems. The user has been advised to either acknowledge this scope honestly OR upgrade the design (critic loops until quality bar met, tool-use for fact-checking, etc.).

---

## 5. Features & Functional Modules

### Module: Single-input ingestion

- **Purpose:** Reduce friction to a single line + a few structured fields.
- **Status:** Implemented.
- **Business value:** Eliminates multi-step wizard fatigue.
- **Dependencies:** None.

### Module: Sectioned generation

- **Purpose:** Generate the business plan against a fixed section shape.
- **Status:** Partial — generation works, but section-typed schema does not yet exist.
- **Dependencies:** Schema refactor.
- **Next step:** Define `BusinessPlanSection` types (executive summary, market, product, GTM, financials, etc.) with prose nested as typed fields.

### Module: Streamed UI

- **Purpose:** Founder sees motion within ~1s; sections stream in.
- **Status:** Not built.
- **Dependencies:** Schema refactor; per-section generation calls.

### Module: Critic agent

- **Purpose:** Second LLM call producing structured per-section feedback with severity.
- **Status:** Not built. This is the second milestone after structured outputs.
- **Dependencies:** Schema refactor must come first.
- **Functional behavior:** Inline suggestions; founder can accept, edit, or ignore.

### Module: Severity-based UI filtering

- **Purpose:** Critic stays sharp; founder sees sharp output only where actionable.
- **Status:** Not built.
- **Dependencies:** Critic must exist first.

### Module: Word export

- **Purpose:** Downloadable .docx.
- **Status:** Implemented (current MVP).
- **Note:** Will need to be re-wired to render *from the schema* once the refactor happens, rather than from prose.

### Module: PDF export

- **Purpose:** Print-ready PDF rendered from the schema.
- **Status:** Not built.

### Module: Section regeneration with context

- **Purpose:** Click any section, request "make this more detailed" or "rewrite for an angel investor."
- **Status:** Not built. Listed as **medium impact / low effort** in the recommendations.
- **Strategic value:** Demonstrates context engineering — keeping rest of plan in context while regenerating one part.

### Module: Investor-question generation

- **Purpose:** After plan generation, produce the 5 hardest questions an investor would ask.
- **Status:** Not built. **Lowest priority** of the four recommendations — useful but weakest engineering signal.

### Module: Eval suite (recommended addition)

- **Purpose:** Measure critic quality. 5–10 fixtures, rubric, before/after critic outputs.
- **Status:** Not built. **Flagged by assistant as missing** but described in the case study's "what I'd do differently" section.
- **Strategic value:** Without it, "the critic is tuned" is an unverified claim.

---

## 6. Deliverables & Artifacts Created (in this engagement)

### Artifact 1: Analysis of the Forge document

- **Form:** Conversational analysis in chat.
- **Purpose:** Critique the user's case study draft + recommendations.
- **Contents summary:**
  - Identified the apparent contradiction between recommendations (critic = future) and case study (critic = shipped) — later clarified by user as intentional (future state framing).
  - Ranked the four recommendations by signal-per-effort: structured outputs → critic → section regen → investor questions.
  - Flagged "tuning the critic" passage as the strongest part of the case study.
  - Flagged the vague "handful of founders" usage claim as needing real data or removal.
  - Flagged the absence of an eval story as the credibility gap.
  - Noted that "two agents" is honestly a pipeline, not an agent loop, and recommended either honest framing or design upgrade.
- **Status:** Delivered conversationally. Not codified into a separate document.

### Artifact 2: Current-state → future-state gap map

- **Form:** Inline table in chat.
- **Purpose:** Show the user exactly which claims in the case study are aspirational vs. true today.
- **Contents:** Per-claim breakdown (typed schema, streaming, critic, severity, accept/edit/ignore, Word, PDF, FastAPI, no-persistence).
- **Status:** Delivered.

### Artifact 3: Two-milestone build plan

- **Form:** Prose in chat.
- **Purpose:** Define the minimum sequence to make the case study true.
- **Contents:**
  - **Milestone 1 — Schema refactor.** Define `BusinessPlanSection` types, switch to structured outputs API, rewire Word export to render from schema.
  - **Milestone 2 — Critic pass.** Second call per section with `{severity, section_id, claim, suggestion}` output; UI filter (medium+); accept/edit/ignore.
- **Status:** Delivered conversationally. Not yet implemented in code.

### Artifact 4: This handover document

- **Form:** Markdown.
- **Purpose:** Allow another LLM agent to pick up Forge work with zero prior context.
- **Status:** Being produced now.

---

## 7. Key Decisions & Reasoning

### Decision: Schema-first, not prompt-first

- **Why:** Asking a model to "produce a business plan" and parsing prose is a worse engineering signal than constraining the model to a shape and trusting it to fill the shape.
- **Tradeoff:** Half-day to a day of refactoring vs. continued prose parsing.
- **Status:** Decided. Not yet executed.

### Decision: Two separate LLM calls, not one prompt with "now critique yourself"

- **Why:** A model defends what it just wrote. Self-critique is shallow.
- **Tradeoff:** Extra API call per section ↔ meaningful critique quality.
- **Status:** Locked. Do not revisit.

### Decision: Critic tone via structured severity field, NOT tone-of-voice prompt

- **Why:** Tone prompts produced either too-mean or encouraging-but-useless output. Severity + UI filtering keeps the critic sharp while protecting the founder from low-signal noise at the wrong moment.
- **Tradeoff:** More schema complexity ↔ better user experience.
- **Status:** Locked. **This is the most defensible design decision in the project.**

### Decision: No persistence by default

- **Why:** Founder plans are sensitive. Simplest privacy posture has nothing to leak.
- **Tradeoff:** No "resume later" UX ↔ no auth, no DB, no compliance surface.
- **Status:** Locked. Revisit only if a real user asks.

### Decision: FastAPI for orchestration, Next.js for UI

- **Why:** Keep orchestration off the edge. Frontend stays a UI, not a half-implemented agent host.
- **Status:** Decided as direction. Implementation status unconfirmed.

### Decision: Build order — structured outputs FIRST, then critic

- **Why:** If the critic is built before structured outputs, both are rebuilt during the refactor. With schemas in place, the critic can consume typed sections and emit structured per-section feedback directly.
- **Status:** Locked. Confirmed by user.

### Decision (forward-looking): Independent versioning of drafter and critic

- **Why:** They're conceptually independent — different prompts, different contexts, different goals — and should not share a release cadence.
- **Status:** Forward-looking. The user has not yet built the coupled version. This belongs in the "what I'd do differently" reflection AFTER the coupled version ships, not before.

---

## 8. Current Active Focus

### What the user is doing right now

**Pre-implementation strategic planning.** The user has:

1. A working MVP (idea → plan → Word).
2. A drafted case study describing the polished future state.
3. A clear ranked list of recommendations to bridge the gap.
4. Just received external critique (this conversation) confirming the sequencing.

### Latest discussion points

- Confirmed: case study = future state, recommendations = path to that state.
- Confirmed: structured outputs refactor is the next concrete unit of work.
- Confirmed: critic comes second, not first.
- Unresolved: whether to start the schema refactor immediately or revise the case study first.

### Immediate priorities (for the next conversation)

1. **Define the `BusinessPlanSection` schema** — what sections, what typed fields per section, what's the minimum useful shape.
2. **Choose the OpenAI model** for structured outputs (not yet specified in conversation — needs to be picked).
3. **Decide where orchestration runs today** vs. where it should run after the refactor.
4. Decide whether the user wants the next agent to write code, or continue advisory/planning work.

### Open technical questions

- Which section shape best fits "credible early-stage business plan"? (Industry-standard 10 sections? Custom 6–8?)
- One LLM call per section, or one call with the full plan schema?
- How to scope the critic's context — full plan, single section, or section + adjacent sections?
- Streaming implementation: SSE, websockets, or chunked HTTP?
- How will Word/PDF rendering be templated from the schema? (Direct HTML→PDF? Pandoc? docxtemplater?)

---

## 9. Pending Tasks & Next Steps

### Immediate (next session)

1. **Confirm or define section schema.** Output: a TypeScript or Pydantic schema for `BusinessPlanSection[]`.
2. **Refactor generator** to use OpenAI Structured Outputs API against that schema.
3. **Rewire Word export** to render from the schema instead of prose.

### Short-term (1–2 weeks)

1. **Build the critic agent** — separate prompt, separate OpenAI call, structured output with `{severity, section_id, claim, suggestion}`.
2. **Build the critic UI** — inline suggestions per section, medium+ shown by default, low collapsed, accept / edit / ignore actions.
3. **Add streaming** — sections appear as they complete.

### Medium-term (2–4 weeks)

1. **PDF export** from the schema.
2. **Section regeneration with context** — single-section regen with the rest of the plan in context.
3. **Tiny eval suite** — 5–10 fixtures, before/after critic outputs, manual rubric. Without this, "the critic is tuned" is unverified.
4. **Investor-question generation** — lowest-priority feature.

### Strategic / portfolio

1. Get a real usage number for the "founders used it" claim, or remove it from the case study.
2. After the coupled drafter+critic ships, attempt the independent-versioning split — only then is "what I'd do differently" honest retrospective rather than borrowed wisdom.
3. Decide whether to upgrade the "two agents" to a real agent loop (tool use, looped critique-until-quality-bar) as the next portfolio iteration.

### Documentation pending

- API surface for the FastAPI orchestration layer.
- Section schema definition.
- Critic prompt (the actual text).
- Severity rubric — what counts as low vs. medium vs. high.

### Risks to monitor

- **Risk:** Critic tone regression. Each prompt change can swing tone back to mean or back to useless. Eval suite mitigates this.
- **Risk:** Schema rigidity. If section shape is too narrow, generation feels generic; too loose, structured outputs lose value.
- **Risk:** Case study credibility gap. The longer the case study describes features that aren't shipped, the worse the gap reads if surfaced.
- **Risk:** "Two agents" overclaim. Receiving agent / future readers may expect a true agent loop and find a pipeline. Frame honestly.

---

## 10. Context Preservation Rules

### User profile (preserve)

- **Email:** <swint.ai07@gmail.com>
- **Working context:** Building Forge as a personal product with explicit portfolio/career intent — positioning toward "agent track" engineering work.
- **Other in-flight project (from memory, not this session):** "Chill 'n' Chow" food-ordering app design paused at Home screen Section 2 (Figma).
- **Account constraint (from memory):** Figma is on Starter plan with capped MCP tool calls — warn before large design jobs. Not relevant to Forge directly but preserved.

### Communication preferences

- **Direct and opinionated.** The user does not want hedged feedback. Sharp critiques over polite encouragement.
- **Structured.** Bullets, tables, ranked lists land better than flowing prose.
- **Concrete over abstract.** Specific decisions, file references, schema shapes. Not "consider improving structure" — "define `BusinessPlanSection` with these fields."
- **Honest about scope.** When the user calls something "multi-agent," push back if it's actually a pipeline. The user values being told the truth about engineering claims.

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

- Two separate LLM calls, not self-critique.
- No persistence by default.
- Severity field, not tone-of-voice prompt, for critic tuning.
- Build structured outputs BEFORE building the critic.
- Frontend stays a UI; orchestration lives in FastAPI.

### Topics already explored (do not re-ask)

- Whether to use a wizard vs. single-input — decided: single input.
- Whether to add accounts — decided: no, until a user asks.
- Whether to add a critic — decided: yes, after structured outputs.
- Whether the case study describes current or future state — clarified: future.
- Whether "two agents" is overclaiming — flagged: be honest, don't upgrade language.
- Whether to do critique pass before or after structured outputs — decided: structured outputs first.

### Conventions to maintain

- Insight blocks are project-specific, not generic.
- Tables for state/gap mapping, ranked lists for recommendations.
- File path : line number when referencing code (`src/foo.ts:42`).
- When suggesting work, give a sequencing rationale — *why this before that*, not just a TODO list.
- When the case study makes a claim, mark it as **shipped** or **future** explicitly.

### Strategic direction to preserve

- The case study is both the spec and the acceptance criteria.
- When every claim in the case study is true in the code, Forge ships its portfolio milestone.
- The next portfolio milestone after that is upgrading "two agents" to a real agent loop — this is the bridge to the user's broader agent-track narrative.

---

## 11. Quick-Start for Receiving LLM

If you are picking up Forge from this document with no other context, here is your one-screen briefing:

> Forge is a working MVP: founder enters a one-line idea, gets a business plan, downloads a Word doc. The user has written a polished case study describing a far more sophisticated system (typed section schemas, streaming, a separate critic agent with structured severity-tagged feedback, accept/edit/ignore UI, PDF export, FastAPI orchestration). **None of that is built yet.** The case study is the spec.
>
> Two milestones turn the MVP into the case study:
>
> 1. **Schema refactor** (half-day to a day): define `BusinessPlanSection` types, switch generation to OpenAI Structured Outputs, rewire Word export off the schema.
> 2. **Critic pass**: second OpenAI call per section, different prompt, different context, outputs `{severity, section_id, claim, suggestion}`. UI shows medium+ by default.
>
> Do milestone 1 first. Do not build the critic before the schema. Do not let the critic self-critique. Do not change critic tone via prompt — use the severity field and UI filtering.
>
> The user wants direct, sharp, structured feedback in `★ Insight` blocks. Do not soften. Do not hedge. Do not re-ask settled questions (see §10).

---

*End of handover. Ready for next agent.*
