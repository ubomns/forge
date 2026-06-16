# ADR-012: Dedicated `/pricing` Route (not a Landing Anchor)

**Date:** 2026-06-15
**Status:** Accepted (amended 2026-06-15 for multi-provider billing — see ADR-013)

## Context

The playbook (S-P1, US-CP4) requires a tier-comparison surface. PRD open
question Q-P4 asks whether `/pricing` is a real route or an anchor on the landing
page. Gate G1 **locked** this as a **separate `/pricing` route**. This ADR
designs how that route fits the Pages Router app and the existing checkout flow.

## Decision

**Add a real Pages Router page `pages/pricing.tsx`**, statically renderable and
publicly accessible.

1. **Routing.** A standalone file `pages/pricing.tsx` (Pages Router file-based
   routing). Reachable from the Nav and from every in-product upgrade CTA
   (AC-CP4.1). Returns 200 unauthenticated (AC-CP4.5).
2. **Rendering.** The page is **static / SSG-able**: tier names, prices, and
   feature lists are static content with no per-user data, so it renders without
   auth and is cacheable/SEO-able. **Multi-provider pricing display (ADR-013):**
   each paid tier shows **both** a USD price (Stripe) and an NGN price (Paystack).
   USD is known ($19/mo Pro, $49/mo Team — AC-CP4.4); **NGN amounts are
   `TO CONFIRM (product owner)` and are read from config — never an FX-derived
   placeholder.** Pricing definitions come from a single shared config
   (`lib/pricing.ts`) keyed **tier × provider × currency**, so the page, inline
   upgrade CTAs, and the provider price/plan-id mapping stay consistent (QA-M1: a
   tier or NGN-price change touches one config).
3. **CTA wiring (auth-aware, provider-aware, no logic on the page).**
   - **Free tier** CTA → `/app` (AC-CP4.3).
   - **Pro / Team** CTA → if **unauthenticated**, route to signup/login first
     (checkout requires a user per ADR-004/ADR-013), preserving an intent param
     (`tier` + chosen `provider`) so the user lands back on checkout; if
     **authenticated**, the user reaches the **provider-choice checkout step**
     (Stripe USD / Paystack NGN — Option B, ADR-013), then the page/flow calls
     `POST /api/subscriptions/checkout { tier, provider }` and is handed to the
     **chosen provider's hosted checkout** (Stripe Checkout redirect; Paystack
     redirect or inline popup). The page itself contains **no** billing logic and
     **no** provider SDK — it delegates to the FastAPI `BillingProvider` seam
     (ADR-004: FastAPI owns billing; ADR-013: provider abstraction).
   - **Team-before-built** state: until the full Team tier ships, the Team CTA
     shows "Contact us" → the distribution contact destination (per playbook
     risk mitigation and Q-P7), not a dead checkout.
4. **Analytics.** A dedicated route gives clean funnel events
   `pricing_page_view → checkout_initiated` (metric G7) without the noise of a
   landing-page scroll anchor.

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| Separate `/pricing` route (chosen) | Clean analytics funnel (G7); shareable/linkable; SEO; intentional-buyer surface | One more page to maintain |
| Landing-page `#pricing` anchor | Simplest; no new route | Muddy analytics; not directly linkable as a destination; rejected at G1 |
| Pricing only inside the app (post-limit) | Reuses existing upgrade CTA | No surface for intent-to-pay visitors who haven't generated a plan (the whole gap) |

## Consequences

**Positive:**
- Intentional buyers get an evaluation surface; G7 funnel is measurable.
- Tier config centralised (tier × provider × currency) → adding/retiring a tier,
  or setting the NGN price, is a one-file change (QA-M1).
- No new backend logic on the page: reuses the FastAPI `BillingProvider` seam
  (ADR-013) and the ADR-004 ownership boundary.

**Negative:**
- The CTA must handle the unauthenticated → auth → checkout hop **and** carry the
  chosen `provider` through the intent param so the user isn't dumped or sent to
  the wrong provider after login.
- Pricing copy/prices now live in code config; a price change is a deploy
  (acceptable at this scale; no pricing CMS).
- The page must render an NGN price that is **not yet set** gracefully until the
  product owner confirms it (e.g. show USD with NGN "coming soon" rather than a
  fabricated number).

## Requirement traceability

- PRD-conversion-playbook S-P1, US-CP4 (AC-CP4.1–4.5); metric G7; Q-P4 (resolved:
  separate route); Q-P7 (Team "contact us" until built).
- ADR-013 (multi-provider billing seam; supersedes ADR-003 Stripe-only),
  ADR-004 (FastAPI owns billing), ADR-005 (tier definitions). G2 (user-selected
  provider; USD/Stripe + NGN/Paystack).
