# Forge — Interface Redesign Proposal

**Generated:** 2026-05-24
**Status:** Implemented / Shipped (see Forge_Handover.md §12 for implementation details; new surfaces: /, /app, /demo; new components: PlanTOC, CritiqueSummary, ActionStack; Playwright e2e suite added)
**Skill basis:** `ui-ux-pro-max` (rules library) + product judgment + user-locked constraints
**Decisions locked by user:** Full rethink of IA + flow · Portfolio polish goal · Preserve existing design tokens (cream/red palette, Fraunces/DM Sans/Newsreader, existing keyframes)

---

## §1 — Brief

**What we're doing:** Rebuilding the information architecture and user flow without rebuilding the visual language. Existing CSS tokens, font system, and motion keyframes in `styles/globals.css` stay. What changes is *what surfaces exist*, *how the user moves through them*, and *what the engineering work looks like to a portfolio reviewer*.

**What we're optimizing for:** A reviewer (recruiter, hiring engineer, founder peer) can land cold, see in 30 seconds what Forge is and why it's interesting, hit a working demo without an API key, and — if they care — peek at the engineering judgment behind it (schema-first, structured outputs, severity-tagged critic, two-call pipeline).

**What we're not doing:** Changing the backend, the schema, the prompts, the rendering logic for plan sections, or any locked decision in `Forge_Handover.md` §7. No accounts, no DB, still pipeline-not-agent-loop.

---

## §2 — IA audit (current state)

Single page (`pages/index.tsx:76-628`) with a four-state machine (`idle` / `generating` / `done` / `error`).

| Surface | Today | What it does well | What it costs us for portfolio polish |
|---|---|---|---|
| Idle / landing | `AnimatedHero` rotating words + textarea inside `TiltCard` + 4 example chips | Sets a confident creative tone; the tilt is genuinely distinctive | **Zero positioning.** A cold visitor sees "type your idea" without learning what Forge *is*. No "blank-page anxiety" framing, no engineering story, no proof. The case study has nowhere to link. |
| Generating | Concept banner + `dots` loader + sections appearing via `PlanRenderer` | The sectioned-streaming reveal is the visible payoff of M1 | The work behind the reveal (Pydantic schema, JSON-Schema strict mode, SSE wire format) is **invisible**. Reviewers don't see what they should be impressed by. |
| Done | `done-bar` with .docx / .pdf / Critique plan / Investor questions / Start over (`pages/index.tsx:545-599`) — 5 actions in one horizontal row | Everything is discoverable | **Bar congestion.** 5 buttons + 2 icons inline; will wrap or compress on narrower viewports. Action grouping is flat — exports, analysis, and reset are visually equivalent. |
| Critique | `CritiqueOverlay` inline per section, severity badges, accept/edit/dismiss, "+N nits" toggle | The severity field + filter is the load-bearing design decision and it works | **No overview.** No "you have 3 high, 5 medium, 4 nits across 4 sections" summary. The user has to scroll to discover what's critical. |
| Regenerate | One-click ↻ icon on section header (`PlanRenderer.tsx:204-215`) | Discoverable, in place | **`instruction` param is unused.** The API accepts free-text instructions ("rewrite for an angel investor") per `api/index.py:278-280` but the UI provides no way to send one. |
| Investor questions | Block at the bottom of the page after the plan, in its own `<motion.div>` (`pages/index.tsx:605-625`) | Surface exists | **Disconnected and easy to miss.** Visually orphaned from the plan; no relationship to which section each question targets, despite the API returning a `section_id` per question. |
| Demo without key | None | — | **Cold visitor with no `OPENAI_API_KEY` hits an immediate dead end.** Portfolio reviewers won't bring keys. |
| Engineering visibility | None | — | The whole portfolio thesis (schema-first, two-agent pipeline, severity-tuned critic) is **hidden behind generated output**. |

`★ Insight ─────────────────────────────────────`

- The single-page IA worked for the MVP because there was one thing to do. With M1+M2+M3 shipped, the surface now needs to expose *features (download/critique/regenerate/investor-Qs)*, *analysis state (severity counts)*, and — for portfolio polish — *engineering story*. Five horizontal buttons can't carry that load.
- Forge's most distinctive engineering decisions are invisible to the user. The schema, the structured-outputs contract, the severity rubric, the two-call pipeline — none of them surface in the current UI. That's the portfolio-polish gap, not visual style.
`─────────────────────────────────────────────────`

---

## §3 — Proposed IA

Three surfaces, not one. Each does one job.

### 3.1 — `/` Landing (new)

A marketing surface. Not just an empty input box.

| Block | Purpose | Content |
|---|---|---|
| Hero | Hook + framing | Rotating-word headline (reuse `AnimatedHero` pattern); subhead names the cost being attacked — "blank-page anxiety, not writing time" (verbatim handover §1). Primary CTA: **Try the demo** → loads `/demo`. Secondary CTA: **Generate your own** → `/app`. |
| The problem | Why this exists | One-paragraph framing of why founders waste hours on section headings; one quote-style callout: *"Generic LLM prompts produce ten sections that read like the model averaging across every business plan it has ever seen."* |
| How it works | Engineering story (3-step) | Three cards using existing `--shadow-md` + bordered cream surface treatment: (1) Schema-first generation — typed `BusinessPlan` with 10 sections, structured outputs API; (2) Two-call pipeline — drafter then critic, separate context windows; (3) Severity-tagged critique — high/medium/low, UI filters to medium+. Each card has 2-3 lines + a small inline diagram. |
| Live preview / demo strip | Proof | Pre-rendered miniature of the plan output — three sections shown as static cards with the actual `PlanRenderer` styling. "This is real output, not a mockup." |
| The decisions | Portfolio depth | Optional collapsed section listing the locked decisions from handover §7 with one-line rationales: "Why two separate LLM calls", "Why severity, not tone-of-voice prompt", "Why no persistence." This is the hireable-judgment exhibit. |
| Footer CTA | Convert | Final **Generate your own plan** button. |

**Token discipline:** Uses existing `--bg`, `--surface`, `--border`, `--accent`, `--shadow-{sm,md,lg}`. Uses existing fonts: `--f-display` (Fraunces) for hero + section headers, `--f-ui` (DM Sans) for body, `--f-prose` (Newsreader) for the callout quote. No new tokens. Motion uses existing `word-reveal`, `lift-in`, `slide-down`, `draw-line` keyframes.

### 3.2 — `/app` Application surface (refactored from current `pages/index.tsx`)

Two-column layout once a plan exists. Single column while idle.

```
┌─────────────────────────────────────────────────────────────────┐
│  Nav (Forge logo)                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  IDLE STATE (single column, centered):                          │
│  ─ AnimatedHero (existing)                                      │
│  ─ TiltCard input (existing) + collapsible Add details          │
│  ─ Example chips                                                │
│                                                                 │
│  GENERATING + DONE STATE (two columns on ≥1024px):              │
│  ┌───────────────────┐  ┌──────────────────────────────────┐    │
│  │  Left rail        │  │  Right: plan stream              │    │
│  │  (sticky, 280px)  │  │  (max-width: 720px)              │    │
│  │                   │  │                                  │    │
│  │  Concept banner   │  │  Section: Executive Summary      │    │
│  │  (existing)       │  │  Section: Problem                │    │
│  │                   │  │  Section: Solution               │    │
│  │  Plan TOC         │  │  ...                             │    │
│  │  ─ Exec Summary ✓ │  │                                  │    │
│  │  ─ Problem ✓      │  │  (critiques inline per section)  │    │
│  │  ─ Solution •••   │  │                                  │    │
│  │  ─ Market ○       │  │                                  │    │
│  │  ─ ... (10 total) │  │                                  │    │
│  │                   │  │                                  │    │
│  │  Critique summary │  │                                  │    │
│  │  ── 3 high        │  │                                  │    │
│  │  ── 5 medium      │  │                                  │    │
│  │  ── +2 nits       │  │                                  │    │
│  │                   │  │                                  │    │
│  │  Actions          │  │                                  │    │
│  │  ─ Download .docx │  │                                  │    │
│  │  ─ Download .pdf  │  │                                  │    │
│  │  ─ Critique plan  │  │                                  │    │
│  │  ─ Investor Qs    │  │                                  │    │
│  │  ─ Start over     │  │                                  │    │
│  └───────────────────┘  └──────────────────────────────────┘    │
│                                                                 │
│  Below the plan (full width): Investor Questions section        │
│  (only when invoked; cards reference section names)             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Plan TOC behavior:**

- Always-visible during `generating` and `done`. Status icons per section: `○` pending, `●●●` streaming with pulse animation (reuse `dot-wave`), `✓` complete with cream check.
- Click a TOC entry → smooth-scroll to that section in the right column.
- Highlight current section via `IntersectionObserver` (scroll spy).

**Critique summary panel:**

- Severity counts as a stacked horizontal bar (high / medium / low) using `--accent` for high, `rgba(234,179,8,...)` for medium (already used in `CritiqueOverlay.tsx:11-15`), gray for low.
- Click a severity row → filters the right-column plan to only show sections with that severity, OR scrolls to the first such critique. Pick one and stay consistent.
- Counts update as the user accepts/dismisses, with a small number-flip animation.

**Action stack:**

- Downloads grouped (`.docx`, `.pdf`).
- Analysis grouped (`Critique plan`, `Investor questions`).
- Destructive separated (`Start over`) at the bottom — applies the `destructive-nav-separation` rule from the skill's nav guidelines.
- On viewports < 1024px, the left rail collapses into a top dropdown (`Plan ▾`) and a floating action button for actions.

### 3.3 — `/demo` Demo mode (new)

Pre-rendered business plan from a fixture, no OpenAI call required.

- Loads a static `BusinessPlan` JSON (from `evals/fixtures/`) — pick one with rich content (e.g. `001-freelancer-scheduling.json` or `006-childcare-coop.json` after running them once with a real key and saving the output).
- Full IA of `/app` works (TOC, critique summary, downloads, investor Qs all populated from baked-in fixtures).
- Critiques and investor questions are also baked-in.
- Banner at top: "Demo plan — generated previously. Want your own? **Generate now.**"
- All buttons functional: downloads work (real `.docx`/`.pdf` generation from the fixture); regenerate/critique are disabled with a tooltip "Live in /app".

**Why this matters:** A portfolio reviewer with no API key can see the *output* of all M1+M2+M3 work without paying or signing up. This is the highest-leverage move for portfolio polish per dollar of effort.

### 3.4 — `/about` or `?engineering` drawer (optional, second-pass)

Side drawer on `/app` toggleable by a small "How it works" link. Contents:

- The schema (live JSON viewer of `lib/schema/business-plan.ts`)
- The drafter and critic prompts (sanitized)
- Live SSE event log during generation (`section_start`, `section_data`, `section_complete`)
- Locked-decisions list from handover §7

This is the deepest portfolio-polish surface — but it's also the most work and may distract from the product story. **Recommend deferring to a second pass.** If you ever want a "live debug view" for talks or demos, this is where it goes.

---

## §4 — Component-level changes (working within preserved tokens)

| Component | File | Change | Token impact |
|---|---|---|---|
| `AnimatedHero` | `components/ui/animated-hero.tsx` | Becomes shared between `/` (larger scale, full subhead) and `/app` idle (current scale). Add `size` prop. | None — uses `--f-display`, `word-reveal` keyframe |
| `TiltCard` | `pages/index.tsx:39-74` | Extract to `components/ui/tilt-card.tsx`. Both `/` hero CTA card and `/app` input card use it. | None |
| `PlanRenderer` | `components/plan/PlanRenderer.tsx` | No changes to section render fns. Add `data-section-id` attribute on `<motion.section>` for scroll spy. | None |
| New: `PlanTOC` | `components/plan/PlanTOC.tsx` | Sticky left-rail navigation; pills with status; `IntersectionObserver` for active state. | Uses `--surface`, `--border`, `--accent`, `--text-2/3`. New CSS class `plan-toc` |
| New: `CritiqueSummary` | `components/plan/CritiqueSummary.tsx` | Severity stacked bar + counts; filter/scroll-to handlers. | Reuses critique severity colors already in `CritiqueOverlay.tsx:5-21` |
| New: `ActionStack` | `components/plan/ActionStack.tsx` | Replaces the inline `done-bar`. Grouped actions: Exports / Analysis / Destructive. | Reuses `.download-btn`, `.critique-btn`, `.restart-btn` classes |
| `CritiqueOverlay` | `components/plan/CritiqueOverlay.tsx` | No visual changes. Adds `data-critique-id` so summary panel can scroll-to. | None |
| Regenerate UX | `PlanRenderer.tsx:204-215` + `pages/index.tsx:267-301` | Replace icon-only button with a popover: presets ("Make more detailed", "Rewrite for an angel investor", "Use concrete numbers") + free-text input → sends as `instruction` to `/api/regenerate`. | New CSS for `.regen-popover`; uses `--surface`, `--shadow-md` |
| New: `InvestorQuestionCard` | `components/plan/InvestorQuestionCard.tsx` | Each question links to its `section_id`. Cards already render at `pages/index.tsx:614-622`; extract + add anchor link. | None |
| New: marketing components | `components/landing/*` | `LandingHero`, `ProblemBlock`, `HowItWorks`, `DemoPreview`, `LockedDecisions`, `FooterCTA`. All compose from existing tokens. | New layout classes; no new colors/fonts |

`★ Insight ─────────────────────────────────────`

- Adding the left-rail TOC is the single highest-leverage IA change: it *visualizes the schema* to the user. They see "10 typed sections" without you telling them. The engineering thesis becomes ambient.
- The regenerate popover uses an API parameter (`instruction`) that **already exists in the backend** (`api/index.py:278-280`) but currently has no UI. This is free portfolio surface — shipping it costs only frontend work and turns regenerate from "spin again" into "ask the model to rewrite for an angel investor."
`─────────────────────────────────────────────────`

---

## §5 — Motion / interaction additions

All compose from existing keyframes in `styles/globals.css`. No new motion language.

- **Landing → app transition:** Shared-element transition on the brand name ("Forge"). Use framer-motion `layoutId`. ~400ms `ease-spring`.
- **TOC pill state changes:** Apply `draw-line` to the active-section indicator under the pill. Pulse `dot-wave` on streaming pills.
- **Severity counts:** When critiques resolve, animate the count number with a vertical translate + fade (reuse `lift-in` reversed) — communicates change without alarming.
- **Regenerate popover:** Enter with `scale-in`; exit with shorter `lift-in` (apply skill's `exit-faster-than-enter` — exit at 60-70% of enter duration).
- **TOC scroll-to:** `scroll-behavior: smooth` on the right column; offset for sticky nav.
- **Reduced motion:** `prefers-reduced-motion: reduce` should kill `orb-float`, `glow-pulse`, `dot-wave`, and the hero word-flip — currently they all run unconditionally. **One-time fix during refactor.**

---

## §6 — What stays untouched

Important to name explicitly so the receiving agent doesn't churn:

- All design tokens in `styles/globals.css:6-26` (`--bg`, `--surface`, `--accent`, etc.)
- Font imports + `--f-display`, `--f-ui`, `--f-prose`
- All keyframes (`word-reveal`, `lift-in`, `scale-in`, `slide-left`, `slide-down`, `draw-line`, `shimmer-sweep`, `glow-pulse`, `dot-wave`, `blink`, `orb-float`)
- `TiltCard` 3D mechanics + nesting rule (rotating layer ≠ overflow-hidden layer)
- `AnimatedHero` rotating-word logic
- FastAPI orchestration (`api/index.py`, `api/export.py`, `api/export_pdf.py`)
- Schema in `api/schema.py` and `lib/schema/business-plan.ts`
- Per-section render functions in `PlanRenderer.tsx:30-164`
- Critique severity colors and "+N nits" logic in `CritiqueOverlay.tsx`
- All locked decisions in `Forge_Handover.md` §7

---

## §7 — Implementation sequencing

Each step is independently shippable and visually verifiable. Stop after any step if the result is enough.

| # | Step | Files touched | Risk | What you can demo after |
|---|---|---|---|---|
| 1 | **Routing scaffolding.** Add `pages/app.tsx` (moves current `index.tsx` logic), keep `pages/index.tsx` as new landing. Add `pages/demo.tsx`. Shared layout in `components/layout/Shell.tsx`. | new pages, layout component | Low | Landing page exists, /app still works |
| 2 | **Landing page.** Build the 6 blocks. Hero, problem, how-it-works (3 cards), demo preview strip, locked decisions, footer CTA. | `pages/index.tsx`, `components/landing/*` | Low | Cold visitors see positioning |
| 3 | **Demo mode.** Bake a fixture plan + critiques + investor Qs into static JSON. Render through existing `PlanRenderer` and `CritiqueOverlay`. Disable live actions; enable downloads. | `pages/demo.tsx`, new `lib/fixtures/demo-plan.json` | Low | Reviewers without keys can see output |
| 4 | **Two-column layout on `/app`.** Wrap the existing plan render in a two-column flex/grid; mount `PlanTOC` on the left, plan on the right. Mobile: TOC collapses to top dropdown. | `pages/app.tsx`, new `components/plan/PlanTOC.tsx`, CSS additions | Medium | Reviewers see "10 typed sections" ambiently |
| 5 | **Critique summary + action stack.** Replace the inline done-bar with `ActionStack` + `CritiqueSummary` mounted in the left rail. | new components, refactor of done-bar in `pages/app.tsx` | Medium | Cleaner action grouping; severity at a glance |
| 6 | **Regenerate popover with `instruction`.** Replace icon-only ↻ with popover (presets + free-text); wire `instruction` param. | `PlanRenderer.tsx`, `pages/app.tsx` | Low (API already supports it) | Demonstrate context engineering — "rewrite for angel investor" |
| 7 | **Reduced-motion pass.** Wrap atmospheric animations (`orb-float`, `glow-pulse`, `dot-wave`) in `@media (prefers-reduced-motion: reduce)`. | `styles/globals.css` | Low | Accessibility compliance |
| 8 | **Investor questions integration.** Move from full-width-below to a tabbed view in the right column OR linked anchors from the TOC. Pick one. | `pages/app.tsx`, `components/plan/InvestorQuestionCard.tsx` | Low | Investor Qs feel like part of the plan |
| 9 (optional) | **Engineering drawer.** Schema viewer + SSE event log + prompts. Toggleable. | new components, drawer integration | Medium | Deepest portfolio surface — only if you want it |
| 10 | **Polish + mobile pass.** Hover/focus states, micro-interactions, 375px / 768px / 1024px / 1440px sweep. Run pre-delivery checklist from the skill. | All visual files | Low | Ship-ready |

`★ Insight ─────────────────────────────────────`

- **The order matters.** Steps 1-3 are pure additions (no destructive refactor). Step 4 (two-column) is the first invasive change but it leaves the right column intact — so the existing `PlanRenderer` keeps working unchanged. By the time you reach step 5 (action stack), the foundations are in place to absorb the change cleanly.
- If you stop after step 3, you've already moved the needle on portfolio polish enormously — landing + demo are the two highest-impact surfaces. Steps 4-10 are quality compounders.
`─────────────────────────────────────────────────`

---

## §8 — Accessibility + responsive requirements (skill's checklist)

Applied to web specifically (skipping the iOS-specific rules from the skill).

- Color contrast 4.5:1 minimum for body text (already met by existing tokens; verify the new severity bar's text doesn't drop below).
- Visible focus states on every interactive element (currently missing on the TiltCard's chip buttons — fix during refactor).
- Tab order matches visual order (left rail tabs after the right column main content? Probably right column first, left rail second; document the decision).
- Touch targets ≥ 44×44px (currently the ↻ regen icon is borderline at small viewports — fix as part of popover refactor).
- `prefers-reduced-motion` honored (currently not — see step 7 above).
- Mobile-first breakpoints: 375 / 768 / 1024 / 1440 (the two-column layout activates at 1024+).
- No horizontal scroll on mobile (current single-column flows are fine; the new two-column must collapse cleanly).
- Heading hierarchy: landing uses `<h1>` for hero, `<h2>` for sections; app uses `<h1>` for plan title (currently the plan has no top-level title — add one).

---

## §9 — Open questions before code

Answer these before step 1, in priority order:

1. **Is the landing page worth doing now**, or do you want to keep the case study external (Notion, personal site) and put a thinner "explainer block" on `/app` instead? Cost: landing is ~2-3 days of design work; an inline explainer is half a day.
2. **Demo fixture source:** do you want to run `evals/run_eval.py` once against your real `OPENAI_API_KEY` and freeze one output, or hand-write a demo plan? Real output is more credible; hand-written is faster and lets you pick the most demonstration-worthy example.
3. **Engineering drawer (step 9):** include or defer? Defer recommendation stands unless you have a specific portfolio-demo use case in mind.
4. **Mobile behavior of the TOC:** collapsed dropdown (compact, hidden until tapped) or always-visible top strip (always present, takes vertical space)? Affects how generation feels on phones.
5. **Brand name:** "Forge" everywhere now (nav + landing + browser title) — confirm. Currently consistent in code, just want it explicit.

---

## §10 — Definition of done

Redesign ships when:

- [ ] `/` (landing) exists and tells the engineering story in under 30 seconds of scroll.
- [ ] `/demo` works end-to-end with no `OPENAI_API_KEY` — downloads functional, critiques visible.
- [ ] `/app` uses two-column layout at ≥1024px; collapses gracefully below.
- [ ] Plan TOC reflects live generation state and supports click-to-scroll.
- [ ] Critique summary shows severity counts with live updates on accept/dismiss.
- [ ] Regenerate popover sends `instruction` to the API and is reachable from every section.
- [ ] `prefers-reduced-motion` kills atmospheric animations; structural transitions still work.
- [ ] Cream/red/Fraunces token system is unchanged in `styles/globals.css:6-26`.
- [ ] All locked decisions in `Forge_Handover.md` §7 still hold.
- [ ] Tested at 375 / 768 / 1024 / 1440 widths.
- [ ] Pre-delivery checklist from the skill passes.

---

*Proposal end. Ready for your edits / approval before any code changes.*
