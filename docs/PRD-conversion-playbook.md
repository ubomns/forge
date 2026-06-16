# Forge — Conversion Playbook PRD
## Closing the Free-Visitor → Paying-Customer Gap

**Status:** Draft
**Date:** 2026-06-15
**Author:** Product Manager
**Relationship to existing docs:**
This document EXTENDS `docs/PRD-saas-pivot.md` (the SaaS pivot baseline). It does not replace it. Every requirement here either (a) adds detail not present in the baseline, (b) corrects a stale or conflicting statement in the baseline, or (c) promotes a playbook ask that the baseline only partially addresses. Where a section is already fully covered in `PRD-saas-pivot.md`, that is noted and this document does not repeat it. Read both together.

**Constraints in force:** All 8 ADRs (ADR-001 through ADR-008) are locked. Locked decisions in `task.md` §2 remain locked. This document does not re-debate them.

---

## Reconciliation Table — Playbook Asks vs. Existing Coverage

| Playbook ask | Classification | Coverage location | Net additions in this PRD |
|---|---|---|---|
| 1. Audience positioning line ("Built for early-stage founders…") | Already covered in baseline — **not yet shipped** | PRD-saas-pivot M7, AC-L1.3 | Adds: must remove contradicting live copy simultaneously. Stale copy gap flagged. |
| 2a. Email capture after plan generates → unlocks download | Already covered in baseline — **not yet shipped** | PRD-saas-pivot M1, US-A2 | None |
| 2b. Free account after 1 plan → save & return | Already covered in baseline — **not yet shipped** | PRD-saas-pivot M2, US-F1, US-F2 | None |
| 2c. Pro $19/mo after 3 plans | Already covered in baseline — **not yet shipped** | PRD-saas-pivot M4, US-P1, US-P2 | None |
| 2d. Team $49/mo, multi-seat, white-label, batch | Already covered in baseline — **not yet shipped** | PRD-saas-pivot S1, US-T1, US-T2 | None |
| 2e. "Generated with Forge" watermark + URL on exports | **Extension** — baseline covers upgrade incentive; playbook adds referral-marketing framing | PRD-saas-pivot M5, ADR-006 | Adds: watermark-as-distribution metric (referral signups attributable to exported plans). New success metric defined. |
| 3. Distribution hooks (accelerators, coaches, contact CTAs) | Already covered in baseline — **not yet shipped** | PRD-saas-pivot S2, AC-L2 | Adds: explicit requirement that cohort/coach sections appear above the footer CTA, not buried. Position on page matters for conversion. |
| 4. Demo scenario replacement (aspirational idea) | Already covered in baseline — **not yet shipped** | PRD-saas-pivot S3, AC-L3 | Adds: the landing page preview strip also references childcare and must be updated simultaneously with the demo fixture. Stale content gap flagged. |
| 5. Hero rewrite (headline, sub-headline, CTAs) | **Extension** — baseline covers headline and audience line; playbook specifies exact CTA copy and ordering | PRD-saas-pivot M6, US-L1 | Adds: explicit primary/secondary CTA copy requirements and ordering constraint. Adds: removal of stale "no account · no persistence" eyebrow. Adds: removal of "No persistence, by design" locked-decisions card. |
| Portfolio-wide: buyer-facing positioning | **Net-new** | Not in PRD-saas-pivot | Adds: requirement to audit and remediate all existing copy that contradicts the SaaS positioning (stale "builder-facing" language). |
| Portfolio-wide: social proof / testimonials | **Net-new** | Not in PRD-saas-pivot | Adds: placeholder testimonial or social proof block as a Should requirement. No real testimonials exist — requirement is to define the placeholder and the mechanism for populating it post-launch. |
| Portfolio-wide: premium pricing signals | **Net-new** | Not in PRD-saas-pivot | Adds: pricing page / tier comparison requirement. Baseline mentions upgrade prompts inline but has no dedicated pricing surface. |

---

## 1. Problem Statement

### 1.1 The baseline problem (from PRD-saas-pivot.md — unchanged)
Forge generates high-quality structured business plans and gives them away completely free with no lead capture, no persistence, and no monetization. Every generated plan is ephemeral.

### 1.2 The conversion gap (what this PRD adds)
The SaaS-pivot PRD defines the monetization architecture correctly. What it does not fully address is the *conversion surface* — the set of buyer-facing signals, copy choices, and page structures that determine whether a visitor decides to generate a plan, provide an email, create an account, and ultimately pay.

Three specific gaps exist today that the pivot PRD does not resolve:

**Gap 1: Stale copy contradicts the pivot.** The live landing page (`components/landing/Landing.tsx`) contains copy that actively undermines the SaaS positioning before it ships:
- The hero eyebrow reads "Business plan generator · no account · no persistence" — both claims will be false after the pivot.
- The `LockedDecisions` section displays "No persistence, by design — No accounts, no DB, no saved drafts. Closing the tab loses the plan. Privacy via absence." This is a publicly visible statement that will be incorrect and confusing once auth and persistence ship. It must be removed or rewritten before or simultaneously with the pivot launch.
- The `FooterCTA` section reads "One sentence to start. No account. No saved drafts." — same issue.

**Gap 2: The landing page demo preview content is tied to the childcare scenario.** The `DemoPreviewStrip` component in `Landing.tsx` contains hardcoded childcare plan content (TAM of $48B, "Trusted childcare swaps for parents who already know each other"). This must be updated alongside the demo fixture replacement (PRD-saas-pivot S3) — updating only the `/demo` page while leaving the landing preview unchanged creates inconsistency.

**Gap 3: No dedicated pricing surface.** The baseline PRD defines upgrade prompts inline (at the 3-plan limit, in "My plans"), but there is no dedicated pricing or tier-comparison page that a visitor can reach intentionally. Visitors who arrive ready to pay have no surface to evaluate tiers before generating a plan.

### 1.3 The watermark-as-distribution gap
ADR-006 and PRD-saas-pivot M5 define the watermark as an upgrade incentive. The playbook frames it as an additional distribution channel: every downloaded plan that a founder shares with an investor, advisor, or partner is a Forge impression. The watermark URL (`forgeplans.com` or equivalent) should be trackable. This is currently not defined as a measurable outcome anywhere.

---

## 2. Target Users

This section does not duplicate the persona table in `PRD-saas-pivot.md §2`. It adds the buyer-facing framing the playbook introduces:

| Persona | Positioning signal they need to see | What would cause them to leave |
|---|---|---|
| **First-time founder with a business idea** | "This is for people like me, not generic users" — audience positioning line. "It's free to try" — primary CTA. | Feeling like a builder demo, not a founder tool. Copy that reads "no persistence" (implies low investment). |
| **Returning founder who has already generated** | "My plan is saved and I can come back" — account creation prompt. | Losing work on tab close; no nudge to save. |
| **Accelerator applicant or serious repeat user** | "Pro removes the watermark and I get more plans" — clear upgrade value. | Watermark on a document they're sharing with investors. |
| **Business coach or cohort manager** | "There's a team tier for people like me" — dedicated section, contact CTA. | No visible signal that Forge serves B2B buyers. |
| **Investor or advisor who received a Forge-exported plan** | "I can find out what made this" — watermark URL is legible and leads somewhere meaningful. | A URL that 404s or lands on an unrelated page. |

---

## 3. Goals & Measurable Success Metrics

### 3.1 Metrics carried forward from PRD-saas-pivot.md (not duplicated, referenced only)
Goals G1–G5 from PRD-saas-pivot §3 remain in force: email-to-download conversion ≥ 40%, free-account signup ≥ 15% of plan-generators, free-to-Pro upgrade ≥ 5% within 30 days, first paid subscriber within 14 days of launch, 7-day return rate ≥ 30%.

### 3.2 New metrics added by this PRD

| ID | Goal | Metric | Target | Measurement mechanism |
|---|---|---|---|---|
| G6 | **Watermark referral traffic** | Sessions originating from the watermark URL (e.g., `forgeplans.com?ref=export`) | ≥ 10 referral sessions within 60 days of watermark launch | ASSUMPTION — measurement mechanism required. Requires UTM parameter on watermark URL and analytics pipeline (PostHog or equivalent) tracking `referral_source = export_watermark`. |
| G7 | **Pricing page conversion** | % of pricing page visitors who initiate checkout | ≥ 8% of `/pricing` page visitors click "Upgrade to Pro" | ASSUMPTION — measurement mechanism required. Track `pricing_page_view` → `checkout_initiated` events. |
| G8 | **Demo-to-generate conversion** | % of `/demo` visitors who click "Generate your own" | ≥ 15% of `/demo` page visitors (raised from 10% baseline target per S3 improvement goal) | ASSUMPTION — measurement mechanism required. Track `demo_page_view` → `app_page_view` funnel. |
| G9 | **Stale-copy elimination** | Zero instances of "no account", "no persistence", "closing the tab loses the plan" language on live product surfaces | 100% at pivot launch | Measurable: grep on deployed build and manual audit of landing page before release gate. |
| G10 | **Team-tier inquiry rate** | Coach/cohort contact CTA clicks | ≥ 5 contact form submissions or Calendly bookings within 30 days of distribution hooks shipping | ASSUMPTION — measurement mechanism required. Track `distribution_cta_clicked` event. |
| G11 | **Social proof engagement** | % of landing page visitors who scroll to testimonials/social-proof block | ≥ 40% scroll depth past the social proof block | ASSUMPTION — measurement mechanism required. Track scroll depth events. |

---

## 4. Scope

### 4.1 What the baseline PRD already puts IN scope (must not be duplicated or contradicted)
All Must (M1–M10) and Should (S1–S5) items from `PRD-saas-pivot.md §4.1` remain in scope and are not re-listed here. This PRD adds to that list.

### 4.2 Additional IN scope — this PRD

#### Must (M) — ships simultaneously with or before the pivot launch

| ID | Feature | Rationale |
|---|---|---|
| M-P1 | **Stale-copy remediation** — Remove or rewrite all live copy that contradicts the pivot: (a) hero eyebrow "no account · no persistence"; (b) `LockedDecisions` "No persistence, by design" card; (c) footer CTA "No account. No saved drafts." These must be gone before or on the same deploy that ships auth. | Shipping auth while the landing page advertises "no accounts" creates contradictory user messaging and actively undermines trust. This is a launch blocker, not a polish item. |
| M-P2 | **CTA copy and ordering** — Primary CTA: "Generate my plan — it's free →". Secondary CTA: "See a sample plan first →". Primary CTA appears first (left or top), secondary second. This applies to the hero and the footer CTA section. | Playbook specifies this ordering. Primary CTA anchors the free entry point; secondary reduces anxiety. Current copy ("Generate your plan →" / "See the demo →") is close but not buyer-facing. |
| M-P3 | **Landing page demo preview content update** — `DemoPreviewStrip` in `Landing.tsx` must be updated to reference the same non-childcare scenario chosen for the `/demo` fixture replacement (PRD-saas-pivot S3). Both surfaces must show the same scenario simultaneously. | Inconsistency between the landing preview (childcare) and the demo page (new scenario) breaks the trust signal the demo is intended to provide. |

#### Should (S) — ships within 2 weeks of pivot launch

| ID | Feature | Rationale |
|---|---|---|
| S-P1 | **Dedicated pricing / tier-comparison page (`/pricing`)** — A page reachable from the Nav and from inline upgrade CTAs that shows all tiers side by side: Free, Pro ($19/mo), Team ($49/mo). Feature list per tier. Primary CTA per tier. | Intentional buyers have no surface to evaluate tiers. Inline upgrade prompts serve users who hit the limit; `/pricing` serves visitors who arrive ready to pay. ASSUMPTION — no evidence yet that visitors arrive intent-to-pay, but standard SaaS practice is to have this surface. |
| S-P2 | **Social proof / testimonials block on landing page** — A placeholder block after `HowItWorks` with space for 2–3 quotes. At launch, this can be populated with anonymized paraphrases from beta users or left as a visible "Early access — be one of the first" statement. Real testimonials replace it when collected. | Social proof is the single most commonly cited conversion lever in SaaS. Absent real testimonials, a visible placeholder signals the product is in active use. ASSUMPTION — no real testimonials exist yet. Measurement mechanism required: post-launch, collect 3+ quotes and replace within 30 days. |
| S-P3 | **Distribution hooks positioned above footer CTA** — The "For coaches & cohorts" and "For business coaches / agencies" blocks (PRD-saas-pivot S2, AC-L2) must appear as full landing page sections above the footer CTA, not as footnotes or footer links. | Placement determines visibility. B2B buyers (coaches, accelerator managers) scan landing pages for sections addressed to them. Burying these blocks reduces the Team-tier inquiry rate (G10). |
| S-P4 | **Watermark URL with referral tracking** — The watermark text ("Generated with Forge") must include a URL with a UTM or referral parameter (e.g., `forgeplans.com?ref=export`) so that traffic from exported documents is attributable. | Without a trackable URL, the distribution value of the watermark (G6) is unmeasurable. ADR-006 specifies watermark text and position; this extends it with attribution. |
| S-P5 | **"Locked Decisions" section removal or reclassification** — The `LockedDecisions` component on the landing page currently reads as a builder's technical manifesto ("No persistence, by design"; "FastAPI for orchestration"). After the pivot, at least two of the six cards become false. The section must be either removed or rewritten to be buyer-facing (e.g., "Why Forge is different from a template" framing). | A section that tells potential customers "no accounts" when accounts now exist is directly harmful to conversion. |

#### Could (C) — post-launch if capacity allows

| ID | Feature | Rationale |
|---|---|---|
| C-P1 | **Annual billing option for Pro** — "$190/year (save 2 months)" alongside the $19/mo option. | Standard SaaS conversion lever. Improves LTV and cash flow. Deferred because it adds Stripe product complexity. |
| C-P2 | **"Share my plan" public link** — Generate a read-only URL for a plan so a founder can share it without exporting a document. | Currently out of scope per PRD-saas-pivot W10 (moderation risk). Re-evaluate if demand emerges post-launch. Elevated here from Won't to Could because the playbook's distribution framing makes shareable output a logical next step. |
| C-P3 | **Referral / affiliate program** — "Give a friend $5 credit; get $5 credit." | PRD-saas-pivot W6 deferred this. Same position here, elevated to Could because the playbook identifies distribution as a primary gap. Not worth building until baseline monetization is proven. |

### 4.3 Explicit Non-Goals (OUT) — additions to PRD-saas-pivot.md §4.2

These are explicitly not in scope for this PRD beyond what the baseline already lists:

| ID | Non-goal | Rationale |
|---|---|---|
| W-P1 | **Custom domain white-label for Pro tier** | Pro removes the watermark from the document. It does not give users a custom domain. That is Team-tier v2 territory. |
| W-P2 | **Real-time testimonial collection UI** | Collecting testimonials is a business/ops task, not a product feature. The product need is a placeholder block (S-P2); populating it is out of product scope. |
| W-P3 | **SEO-optimized public plan pages** | A `/plan/[slug]` page for indexing would require moderation and content strategy. Out of scope for v1. Separate from C-P2 (private share link). |
| W-P4 | **Changing the hero animated word rotation** | The rotating-word hero animation in `LandingHero` is a design surface, not a product requirement. Copy changes (M-P2) are in scope; animation mechanic changes are UX-designer territory. |

---

## 5. Requirements

All requirements from `PRD-saas-pivot.md §5` (US-A1 through US-L3) remain in force. The following requirements are added or amended.

### 5.1 Stale Copy Remediation (extends US-L1)

#### US-CP1: Remove contradicting live copy
**As a** first-time visitor who arrives after the pivot ships, **I want to** see messaging that is consistent with what the product actually does, **so that** I trust what I'm being told.

- **AC-CP1.1:** The hero eyebrow no longer contains the text "no account" or "no persistence". The eyebrow either reads differently or is removed entirely.
- **AC-CP1.2:** The `LockedDecisions` section does not display a card titled "No persistence, by design" or any card whose body states "No accounts, no DB, no saved drafts."
- **AC-CP1.3:** The footer CTA does not contain the text "No account. No saved drafts."
- **AC-CP1.4:** A grep of the deployed build for the strings "no account", "no persistence", "no saved drafts", "closing the tab loses" returns zero matches in visitor-facing rendered text.
- **AC-CP1.5:** The stale-copy remediation and the auth/persistence launch are deployed in the same release or the remediation deploys first. They must not be deployed in reverse order.

### 5.2 CTA Copy and Ordering (amends US-L1, AC-L1.4)

#### US-CP2: Buyer-facing CTA copy
**As a** visitor on the landing page, **I want to** see a primary action that is clearly free and low-commitment, **so that** I click it without hesitation.

- **AC-CP2.1:** The primary CTA on the hero reads "Generate my plan — it's free →" (or a close variant that preserves the explicit "it's free" signal). The current text "Generate your plan →" is insufficient — it omits the free signal.
- **AC-CP2.2:** The secondary CTA on the hero reads "See a sample plan first →" (or a close variant). The current text "See the demo →" is acceptable as a fallback but "See a sample plan first" better addresses the anxiety of an unknown-quality tool.
- **AC-CP2.3:** The primary CTA appears to the left of (or above) the secondary CTA in the hero. The ordering is not reversed.
- **AC-CP2.4:** The same CTA copy and ordering convention is applied to the footer CTA section.
- **AC-CP2.5:** The sub-headline includes at minimum: reference to investor-readiness, the two-agent approach ("drafted by one AI agent, critiqued by another" or equivalent), and the absence of templates. The exact wording is UX-designer territory; these are the required content elements.

### 5.3 Landing Page Demo Preview Update (extends S3)

#### US-CP3: Consistent demo scenario across surfaces
**As a** visitor who sees the landing page preview and then clicks through to `/demo`, **I want to** see the same scenario on both surfaces, **so that** the demo feels coherent and credible.

- **AC-CP3.1:** The `DemoPreviewStrip` section on the landing page references the same business scenario as the updated `/demo` fixture (whichever of the three scenarios from PRD-saas-pivot AC-L3.1 is chosen).
- **AC-CP3.2:** The childcare cooperative content (current hardcoded content in `DemoPreviewStrip`) is replaced before or simultaneously with the demo fixture update.
- **AC-CP3.3:** The TAM/SAM/SOM values shown in the landing preview are taken from the actual plan output of the new scenario, not fabricated for the preview.
- **AC-CP3.4:** The preview section retains its three-card structure (plan section / market numbers / critique) with the new content.

### 5.4 Pricing Page (new, S-P1)

#### US-CP4: Dedicated tier comparison surface
**As a** visitor who arrives ready to evaluate paid plans, **I want to** see all tiers compared in one place, **so that** I can make a purchase decision without generating a plan first.

- **AC-CP4.1:** A `/pricing` page exists and is reachable from the Nav and from all upgrade CTAs in the product.
- **AC-CP4.2:** The page shows all three tiers (Free, Pro, Team) with a feature comparison: what each tier includes and excludes.
- **AC-CP4.3:** Each paid tier has a prominent CTA linking to checkout. Free tier CTA links to `/app`.
- **AC-CP4.4:** The page clearly states the prices ($19/mo Pro, $49/mo Team) without requiring any interaction to reveal them.
- **AC-CP4.5:** The page is accessible without authentication.

### 5.5 Social Proof Block (new, S-P2)

#### US-CP5: Social proof on landing page
**As a** first-time visitor who is uncertain about quality, **I want to** see evidence that other founders have used and benefited from Forge, **so that** I trust the output enough to try it.

- **AC-CP5.1:** The landing page includes a social proof block between `HowItWorks` and the distribution hooks sections.
- **AC-CP5.2:** At launch, the block may contain anonymized paraphrased quotes from beta users, a count of plans generated, or a "Join X founders who have already generated their first draft" statement. It must not be empty.
- **AC-CP5.3:** The block has a clearly defined slot/format for real testimonial quotes (name, role/company optional, quote text) that can be populated without a code change (via a data file or CMS field). ASSUMPTION — a code-free content update mechanism is not guaranteed without engineering work; if not available at launch, a data file update is acceptable.
- **AC-CP5.4:** The block does not make claims that cannot be verified (e.g., "Used by 500+ founders" unless that number is real). ASSUMPTION — exact numbers must be verified before copy is finalized.

### 5.6 Distribution Hooks Placement (amends S2, AC-L2)

#### US-CP6: B2B distribution sections at visible page position
**As a** business coach or cohort manager scanning the landing page, **I want to** quickly find a section addressed to people like me, **so that** I know to inquire about the team tier.

- **AC-CP6.1:** The cohort/coach distribution sections appear as first-class landing page sections (not footer links, sidebar items, or collapsed accordions) before the footer CTA.
- **AC-CP6.2:** Each section has a descriptive heading (e.g., "For accelerators and cohorts" / "For business coaches and agencies"), a 2–3 sentence value description, and a contact CTA.
- **AC-CP6.3:** The contact CTA links to a functional destination (typeform, emailto, or Calendly). The destination must be live at launch — a dead or 404 CTA is worse than no CTA. ASSUMPTION — the contact destination must be set up by the business owner before this ships.

### 5.7 Watermark Referral Attribution (extends M5, ADR-006)

#### US-CP7: Attributable watermark URL
**As a** Forge operator, **I want to** know when traffic comes from exported documents that others have shared, **so that** I can measure the distribution value of the free tier.

- **AC-CP7.1:** The watermark text in free-tier exports includes a URL with a referral parameter (e.g., `forgeplans.com?ref=export` or equivalent).
- **AC-CP7.2:** The referral URL resolves to the Forge landing page (not a 404).
- **AC-CP7.3:** The analytics pipeline (once set up per PRD-saas-pivot §9 dependency on event tracking) captures sessions where `ref=export` is present in the URL.
- **AC-CP7.4:** The watermark styling (ADR-006: small font, gray, footer) is preserved — the URL addition must not make the watermark larger or more prominent than specified.

---

## 6. UX Notes

These are directional signals for the UX designer. Implementation detail is the designer's domain.

- **Hero:** The current rotating-word animation is a differentiating visual. The copy update (M-P2) should be compatible with or replace the animation — the designer decides. The constraint is that "it's free" must be visible above the fold without scroll.
- **Stale Decisions Section:** The `LockedDecisions` component currently presents six builder-facing decisions as a grid of cards. If retained after the pivot, it needs reframing as buyer-facing differentiation ("Why Forge is not like the others"). If removed, the page needs a replacement section of similar visual weight or the flow collapses.
- **Pricing page:** Standard SaaS convention is a three-column card layout. The constraint is that Free → Pro → Team ordering must read left to right (or top to bottom on mobile), with the recommended tier visually highlighted. Exact treatment is designer territory.
- **Social proof block:** Must not look placeholder-y to the visitor even when it is placeholder content. "Be the first 100 founders" framing is preferable to an empty testimonial grid.

---

## 7. Dependencies and Risks

### 7.1 Dependencies carried from PRD-saas-pivot.md (referenced, not duplicated)
All dependencies from PRD-saas-pivot §9 remain: Stripe account, transactional email provider, domain verification, PostgreSQL instance, auth library decision, event tracking pipeline, privacy policy/ToS, cookie consent banner.

### 7.2 New dependencies from this PRD

| Dependency | Required for | Status | Owner |
|---|---|---|---|
| **Contact destination** (typeform, Calendly, emailto) for distribution hooks | S-P3, US-CP6, AC-CP6.3 | Not started | Business / Founder |
| **New demo scenario fixture** generated from real model output | M-P3, US-CP3 | Not started — blocks landing preview update | Engineering (run `evals/freeze_demo.py` equivalent against new scenario) |
| **Referral parameter convention** agreed on (e.g., `?ref=export`) | S-P4, US-CP7 | Not started | Engineering + Business |
| **Analytics pipeline** live in production | G6, G7, G8, G10, G11 | Not started — blocks all new metrics | Engineering |
| **Beta user quotes / social proof content** | S-P2, US-CP5 | Not started — blocks S-P2 from shipping meaningfully | Business / Founder |

### 7.3 Risks specific to this PRD

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Stale-copy removal ships after auth** — landing page says "no account" while auth is live | Medium | High (trust damage, user confusion) | Make AC-CP1.5 a hard release gate: deploy stale-copy remediation before or with auth. Enforce in PR review. |
| **Demo fixture and landing preview update are uncoupled** — PRD-saas-pivot S3 ships but `DemoPreviewStrip` still shows childcare content | Medium | Medium (incoherence, reduced social proof impact) | Track M-P3 and S3 as a single task in WBS; they ship together. |
| **Pricing page creates unreachable expectation** — Team tier is listed on `/pricing` before the Team tier is buildable | Low | Low | Note on pricing page: "Team tier — contact us" with the distribution CTA, until full Team tier ships. |
| **Contact destination dead at launch** — "For coaches" CTA links nowhere | Medium | Medium (breaks trust for B2B audience) | Contact form / email must be set up and tested before S-P3 ships. Business owner dependency (see 7.2). |
| **Social proof block ships empty or fabricated** — AC-CP5.4 violated | Low | High (legal / trust risk) | Hard rule: no unverified numbers. If no real quotes exist at ship, use "Early access — plans generated and counting" style copy. |
| **Referral watermark URL 404s** — watermark ships without live URL resolution | Low | Medium | Verify URL resolves before export modules ship S-P4. |

---

## 8. Open Questions

### 8.1 Questions resolved by ADRs (closing out stale questions from PRD-saas-pivot.md §13)

The following questions from PRD-saas-pivot §13 are now resolved and should be closed in that document:

| PRD-saas-pivot question | Resolution | Source |
|---|---|---|
| Q7 — Auth token strategy | JWT in httpOnly cookie, 7-day expiry, HS256 | ADR-001 |
| Q8 — Dev auth bypass | `X-Test-Auth: bypass` header, `ENVIRONMENT=test` only | ADR-007 |
| Q2 — Plan limit enforcement | Soft UI prompt + hard API cap (HTTP 403) | ADR-005 |
| Q3 — Free tier plan limit | 3 saved plans | ADR-005 |
| Q6 — Session-to-account migration | No auto-migration; explicit "Save plan" CTA | ADR-008 (overrides AC-F2.4) |
| Q9 — Watermark design | Subtle footer text, small font, gray, every page | ADR-006 |

### 8.2 Open questions requiring resolution before shipping

| # | Question | Blocking what | Priority |
|---|---|---|---|
| Q-P1 | **What happens to the `LockedDecisions` section?** Remove it entirely, rewrite it as buyer-facing differentiation, or replace it with a different section? This is a product + UX decision before the designer can produce a spec. | M-P1 (cannot write AC without knowing the target state) | High — blocks designer |
| Q-P2 | **Which demo scenario replaces childcare?** PRD-saas-pivot AC-L3.1 lists three options (micro-SaaS for freelance designers, Lagos food delivery, online education). Only one can be the default demo. The other two could be secondary tabs or deferred. Decision needed before engineering runs the fixture generation. | M-P3, US-CP3 | High — blocks engineering |
| Q-P3 | **What is the domain / base URL for the watermark?** `forgeplans.com`, `forgeplan.ai`, or the current Vercel deployment URL? The watermark URL must resolve today and not require a domain migration later. | S-P4, US-CP7 | Medium — blocks S-P4 |
| Q-P4 | **Is the `/pricing` page a new route or an anchor on the landing page?** A separate route is cleaner for analytics tracking (G7). A landing-page section is simpler to build. Decision needed before designer specs the surface. | S-P1, US-CP4 | Medium — blocks designer |
| Q-P5 | **AC-F2.4 conflict with ADR-008:** The PRD-saas-pivot AC-F2.4 states "any plan in the current session is auto-saved to their account" on signup. ADR-008 explicitly overrides this for v1, deferring it. The PRD acceptance criterion and the ADR are in direct conflict. The PM must either: (a) accept ADR-008 and update AC-F2.4 to match, or (b) reject ADR-008 and require auto-save (adding ~1 day of implementation work per the ADR's own estimate). | US-F2, AC-F2.4 | High — creates ambiguity for engineering |
| Q-P6 | **Q1 from PRD-saas-pivot (payment processor):** Stripe only, or also Paddle/PayPal for international? ADR-003 resolves this as Stripe only, but PRD-saas-pivot §13 still lists it as open. Close or confirm. | M4, S1 | Low — ADR-003 likely resolves it, needs PM sign-off |
| Q-P7 | **Does the Team tier appear on `/pricing` before it is fully built?** If Team ships weeks after Pro, the pricing page should show Team as "contact us" initially. Needs a decision on messaging so the designer can spec it. | S-P1 | Low |

---

## 9. Assumptions

Every unvalidated claim is labeled. If an assumption is disproven, the relevant requirement must be revised.

| # | Assumption | Validation method |
|---|---|---|
| A-P1 | **Stale copy is actively harming conversion.** Assumed because contradicting "no account" after pivot ships will confuse visitors. No A/B test has been run. | ASSUMPTION — verify. Post-launch, compare bounce rate and email-capture rate before (current copy) and after (remediated copy). |
| A-P2 | **"Generate my plan — it's free →" outperforms "Generate your plan →"** as primary CTA copy. | ASSUMPTION — verify. A/B test CTA copy post-launch if analytics pipeline supports it. |
| A-P3 | **A dedicated `/pricing` page improves paid conversion** for visitors who arrive intent-to-pay. | ASSUMPTION — no data. Monitor `pricing_page_view → checkout_initiated` funnel from day one. If < 2%, investigate. |
| A-P4 | **Social proof content can be collected within 30 days of launch** from early users. | ASSUMPTION — verify. If no real quotes exist within 30 days, escalate to business owner for outreach. |
| A-P5 | **The watermark URL will generate measurable referral traffic** within 60 days. | ASSUMPTION — verify. If G6 shows fewer than 5 referral sessions in 60 days, the distribution value of the watermark is primarily upgrade-incentive only, not growth. |
| A-P6 | **Positioning the cohort/coach sections prominently on the landing page will generate Team-tier inquiries** without a dedicated outbound sales effort. | ASSUMPTION — verify. Track G10. If fewer than 5 inquiries in 30 days, consider outbound to accelerator/incubator networks. |
| A-P7 | **The `LockedDecisions` section is currently causing confusion** for non-technical visitors who read "no persistence" as a product limitation rather than a design philosophy statement. | ASSUMPTION — no user research. If retained after pivot, monitor whether bounce rates on the landing page change. |
| A-P8 | **The childcare demo scenario is a weaker conversion driver** than the proposed alternatives (micro-SaaS, food delivery, education). | ASSUMPTION — no A/B test data. The reasoning is that childcare cooperative is a niche, low-aspiration scenario for the target persona (founder with growth-oriented idea). The alternatives are broader-market and more aspirational. Validate by comparing G8 (demo-to-generate) before and after scenario replacement. |
| A-P9 | **Q4 from PRD-saas-pivot (Team seat management) and Q10 (annual discount) are still unresolved** and require PM decisions before Phase 4 engineering begins. | Verify by checking task.md and WBS before Phase 4 starts. |

---

## 10. Non-Goals (Reinforced — additions to PRD-saas-pivot.md §11)

The following are explicitly out of scope for this PRD and the pivot launch:

1. **Changing the drafter + critic pipeline** — two LLM calls, SSE wire format, and schema remain locked.
2. **Wizard-style multi-step input** — single-input + optional fields is locked.
3. **Custom testimonial collection UI** — a data file update is sufficient.
4. **SEO strategy or content marketing** — the `/pricing` page and landing copy changes in this PRD improve on-page messaging; they are not an SEO campaign.
5. **New plan sections or schema changes** — 10 sections remain fixed.
6. **Animation or motion changes** — CTA copy changes yes; animation mechanic changes are UX-designer territory.
7. **Internationalization** — English-only.
8. **Mobile app** — web-only.

---

## 11. Acceptance Criteria Summary — New Items Only

(Full checklist for all pivot items remains in PRD-saas-pivot.md §12. Only additions from this PRD are listed here.)

### Stale Copy
- [ ] Hero eyebrow does not contain "no account" or "no persistence".
- [ ] `LockedDecisions` section does not show "No persistence, by design" card.
- [ ] Footer CTA does not say "No account. No saved drafts."
- [ ] Stale copy removal and auth launch are in the same or stale-copy-first deploy.

### CTA Copy
- [ ] Primary hero CTA contains the phrase "it's free" or equivalent.
- [ ] Secondary CTA is "See a sample plan first →" or approved equivalent.
- [ ] Primary CTA appears before secondary CTA in DOM order and visual hierarchy.
- [ ] Sub-headline references investor-readiness, two-agent approach, and absence of templates.

### Demo Consistency
- [ ] `DemoPreviewStrip` on landing page shows same scenario as `/demo` fixture.
- [ ] Childcare content is removed from both surfaces simultaneously.
- [ ] TAM/SAM/SOM numbers in landing preview come from real model output.

### Pricing Page
- [ ] `/pricing` route exists and returns 200.
- [ ] All three tiers are displayed with prices and feature lists.
- [ ] Page is accessible without auth.
- [ ] Upgrade CTAs link to checkout.

### Social Proof
- [ ] Social proof block exists on landing page between HowItWorks and distribution sections.
- [ ] Block contains non-empty, verifiable content at launch.
- [ ] No unverified numerical claims (e.g., "500 founders").

### Distribution Hooks
- [ ] Cohort/coach sections appear as full landing page sections, not footer items.
- [ ] Each section has heading, description, and a live contact CTA destination.

### Watermark Attribution
- [ ] Watermark URL includes referral parameter.
- [ ] URL resolves to Forge landing page.
- [ ] Analytics pipeline captures `ref=export` sessions.

---

*End of PRD. Read alongside `docs/PRD-saas-pivot.md`. When the SaaS pivot PRD is updated to resolve the open questions listed in §8.1 above, mark those questions as closed in both documents. This document is the authoritative source for conversion-layer requirements; the pivot PRD remains authoritative for monetization architecture requirements.*
