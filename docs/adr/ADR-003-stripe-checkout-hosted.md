# ADR-003: Stripe Checkout Hosted Flow

**Date:** 2026-06-11
**Status:** Superseded by ADR-013 (2026-06-15)

> **Superseded by [ADR-013](ADR-013-multi-provider-billing.md).** Billing scope
> changed at Gate G2 to **multi-provider, user-selected** (Stripe USD **+**
> Paystack NGN). Stripe is **retained** as one of two providers; the hosted
> Checkout + Customer Portal design below still applies to the Stripe path. What
> changed: there is now a provider-agnostic `BillingProvider` seam in FastAPI,
> the user picks the provider at checkout, and a second webhook boundary
> (Paystack) exists. Read this ADR's body for the Stripe-specific rationale, then
> ADR-013 for the multi-provider design. The body below is retained unchanged for
> the historical record.

## Context

The SaaS pivot requires payment processing for Pro ($19/mo) and Team ($49/mo) tiers. We need:
1. Secure collection of payment details
2. Minimal PCI compliance burden
3. Self-service subscription management (cancel, update card)
4. Fast implementation to hit the 3-week launch target

## Decision

Use **Stripe Checkout (hosted)** for initial subscription creation and **Stripe Customer Portal** for subscription management.

- User clicks "Upgrade" → FastAPI creates Checkout Session → redirects to Stripe-hosted page
- User completes payment → Stripe redirects back to Forge with `?success=1`
- Stripe webhook `checkout.session.completed` updates subscription status in DB
- "Manage billing" link creates Customer Portal session → redirects to Stripe-hosted portal
- Stripe test mode in dev/staging; live mode in production

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| Stripe Elements (embedded) | Fully branded UI; stays on Forge domain | Requires PCI SAQ A-EP; more frontend complexity; card field handling |
| Paddle | Handles tax/VAT; merchant of record | Higher fees; less control; slower payout |
| PayPal | Widely recognized; some users prefer it | More complex integration; inconsistent webhook reliability |
| Lemon Squeezy | Simple for SaaS; handles tax | Higher fees; newer; less mature than Stripe |
| Stripe Checkout hosted (chosen) | Zero PCI scope (Stripe handles card fields); trusted UI; Customer Portal included; robust webhooks | Less UI customization; user leaves Forge domain briefly |

## Consequences

**Positive:**
- Stripe Checkout is the fastest path to compliant payment collection
- Customer Portal provides self-service cancellation without engineering work
- Stripe webhooks are reliable and well-documented
- `stripe-python` library handles signature validation and idempotency helpers

**Negative:**
- User briefly leaves Forge domain (acceptable for v1)
- Limited customization of checkout page (logo and colors only)
- Requires Stripe account approval (external risk; apply immediately)

## Requirement traceability

- FR-11: Stripe Checkout for Pro/Team subscription
- FR-12: Stripe Customer Portal for management
- FR-13: Subscription status sync via webhooks
- PRD Q1: Payment processor resolved as Stripe only
