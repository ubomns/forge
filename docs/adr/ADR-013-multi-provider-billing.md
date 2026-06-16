# ADR-013: Multi-Provider Billing (Stripe + Paystack, User-Selected)

**Date:** 2026-06-15
**Status:** Accepted
**Supersedes:** ADR-003 (Stripe Checkout Hosted Flow)

## Context

ADR-003 chose **Stripe only** for Pro ($19/mo) and Team ($49/mo) subscriptions.
The product owner has now changed billing scope (locked at **Gate G2**): Forge
must serve buyers who cannot transact on Stripe (notably the Nigerian / Naira
market) and must let the **user choose their payment provider at checkout**
(Option B).

Locked at G2 (design HOW, not WHETHER):

- Both **Stripe** and **Paystack** are offered; the user picks the provider on
  the checkout step.
- Currencies: **USD via Stripe**, **NGN via Paystack**. Each paid tier needs a
  USD price (Stripe) AND an NGN price (Paystack).
- **NGN amounts are NOT FX-derived.** They are configuration values the product
  owner will set. This ADR treats them as `TO CONFIRM (product owner)` and never
  hardcodes a number or applies a live rate.

The existing stack already demonstrates the pattern we want: `api/llm.py` is a
provider-agnostic LLM seam (OpenAI / Ollama) behind one interface. We apply the
same shape to billing. Per ADR-004, FastAPI owns all billing logic; Next.js
stays a UI + proxy. Per ADR-012, `/pricing` carries no billing logic.

This ADR does **not** re-debate hosted checkout (both providers are hosted, so
the zero-PCI posture of ADR-003 is preserved on both sides), nor the tier model
(ADR-005), nor the webhook/idempotency principle (ADR-003 §, §7 STRIDE) — it
generalises them to two providers.

## Decision

Introduce a **provider-agnostic billing abstraction in FastAPI** and offer the
user a provider choice at checkout. One subscription lives on **exactly one**
provider.

### 1. `BillingProvider` interface (FastAPI)

A small Python abstraction (`api/billing/base.py`) with two concrete
implementations (`api/billing/stripe_provider.py`, `api/billing/paystack_provider.py`)
selected by a registry keyed on the provider string. **Interface contract
(shape, not code):**

```
class BillingProvider(Protocol):
    name: Literal["stripe", "paystack"]

    def create_checkout_session(
        self, *, user, tier: Literal["pro","team"], currency: str
    ) -> CheckoutResult:
        # Resolve the provider+tier+currency price from lib/pricing config
        # (server side), create/lookup the provider customer, and return a
        # hosted-checkout handoff (URL or access_code) + provider_session_ref.
        ...

    def verify_webhook(self, *, raw_body: bytes, headers: Mapping) -> bool:
        # Stripe:   Stripe-Signature (HMAC-SHA256 scheme, via stripe lib)
        # Paystack: x-paystack-signature (HMAC-SHA512 over raw body, secret key)
        ...

    def handle_event(self, *, event: dict) -> SubscriptionDelta | None:
        # Map a provider event to the SAME internal subscription state
        # (active / past_due / canceled, tier, period end, external IDs).
        ...
```

`CheckoutResult` is provider-neutral: `{ kind: "redirect"|"inline", url?, access_code?, provider, provider_session_ref }`.
`SubscriptionDelta` is the single internal representation both providers map onto
(see §5 and ADR-013 data delta) — the rest of the app never branches on provider
beyond the seam.

### 2. Provider selection flow (`/pricing` → checkout)

```
/pricing (static, ADR-012)
  → user clicks "Upgrade to Pro/Team"
  → (if unauthenticated) auth, preserving intent (tier + chosen provider/currency)
  → checkout step: user picks provider  ── Stripe (USD)  ── Paystack (NGN)
  → POST /api/subscriptions/checkout { tier, provider }
  → FastAPI: BillingRegistry.get(provider).create_checkout_session(...)
       Stripe   → Stripe Checkout Session  → redirect to hosted Checkout (USD)
       Paystack → Paystack transaction init (with a Paystack **Plan** for the
                  subscription) → redirect to hosted checkout OR return access_code
                  for the Paystack inline popup (frontend Paystack JS)
```

`provider` and `currency` are **derived server-side** from the chosen provider
and `lib/pricing` config; the client sends only `tier` + `provider`. The server
never trusts a client-supplied price/amount (see STRIDE §9A.8).

### 3. Hosted checkout on both sides (PCI posture preserved)

- **Stripe:** Stripe Checkout (hosted) + Customer Portal — unchanged from ADR-003.
- **Paystack:** Paystack hosted checkout (redirect) or the **inline popup**
  (Paystack JS) with server-initialised transactions, and **Paystack Plans** for
  recurring subscriptions. No card data ever touches Forge on either provider.

### 4. One subscription, one provider

A subscription record records **which provider** owns it plus the provider-side
customer + subscription identifiers. Switching providers = cancel on one, create
on the other (out of scope to migrate in place for v1). Management/cancel routes
dispatch to the owning provider (Stripe Customer Portal; Paystack
disable-subscription / management link).

### 5. Pricing config is the single source of truth (tier × provider × currency)

`lib/pricing.ts` (frontend, ADR-012) and a mirrored server-side price map hold
the tier → { provider → { currency, amount, external price/plan id } } mapping.
USD amounts are known ($19, $49). **NGN amounts = `TO CONFIRM (product owner) —
do not hardcode an FX-derived number`** until the product owner supplies them.

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| **Stripe + Paystack, user-selected (chosen)** | Serves USD + NGN buyers; provider-agnostic seam isolates each SDK/REST quirk; preserves zero-PCI hosted posture both sides; matches existing `llm.py` pattern | Two integrations + two webhook boundaries to maintain and test; dual reconciliation |
| Stripe only (ADR-003 status quo) | Simplest; one webhook; one SDK | Excludes NGN/Paystack-first buyers — the exact gap G2 reverses |
| Auto-pick provider by user geo/IP (no choice) | Less UI; "magic" | Mis-detects (VPN, travel); removes user agency that G2 explicitly wants (Option B); harder to test |
| Stripe + Stripe-NGN | One SDK | Stripe NGN support/payout is not assumed here (no verified capability) and does not match local rails Paystack provides; would be an invented capability |
| Merchant-of-record (Paddle/LemonSqueezy) for both | One integration, handles tax | Re-opens ADR-003 (rejected there); does not give first-class NGN local rails; higher fees |

## Consequences

**Positive:**
- USD (Stripe) and NGN (Paystack) buyers both convert without leaving hosted,
  PCI-safe flows.
- The `BillingProvider` seam means the rest of FastAPI (subscriptions router,
  webhook router, tier enforcement) is provider-neutral; adding/removing a
  provider is localised to `api/billing/*` + config (extends QA-M1).
- Internal subscription state is one shape regardless of provider — tier
  enforcement (ADR-005), `/api/subscriptions/status`, and the UI are unchanged.

**Negative:**
- **Two webhook trust boundaries** (Stripe + Paystack), each with its own
  signature scheme and idempotency surface (see STRIDE §9A.8).
- Two sets of products/prices/plans to keep in sync with `lib/pricing` config.
- Reconciliation, refunds, and dunning differ per provider (operational load).
- Paystack has **no required Python SDK** in this stack; the Paystack provider
  uses REST over the existing HTTP layer (mark any helper dep "to be added —
  verify on install"; do not invent an SDK name/version).

**Blocking item carried out of this ADR:**
- **NGN prices for Pro and Team are `TO CONFIRM (product owner)`.** Checkout via
  Paystack cannot ship until they are set in `lib/pricing`. No FX-derived number
  is used as a placeholder.

## Requirement traceability

- FR-11 (checkout for Pro/Team) — generalised from Stripe-only to multi-provider.
- FR-12 (subscription management) — per-owning-provider (Stripe Portal / Paystack).
- FR-13 (status sync via webhooks) — now Stripe **and** Paystack webhooks → one
  internal state.
- G2 locked decision (Option B: user-selected provider; USD/Stripe + NGN/Paystack).
- ADR-004 (FastAPI owns billing) — honoured: the seam lives in FastAPI.
- ADR-012 (`/pricing` carries no billing logic) — updated alongside this ADR.
- ADR-005 (tier model) — unchanged; tiers gain a per-provider/currency price map.
- Supersedes ADR-003 (Stripe-only) — Stripe is retained as one of two providers.
