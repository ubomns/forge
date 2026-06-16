"""
BillingProvider interface (ADR-013, WBS 1.5.1).

Defines the provider-agnostic billing abstraction that both StripeProvider and
PaystackProvider will implement. The rest of the application accesses billing
ONLY through this interface — provider-specific logic is confined to the
concrete implementations in api/billing/.

This module mirrors the pattern used in api/llm.py for the LLM provider seam:
a Protocol/ABC with a small surface area, selected by a registry keyed on the
provider name string.

All methods are STUBS for Sprint 0 foundation. Concrete implementations are
deferred to later sprints (1.5.3 for Stripe, 1.6.1 for Paystack).
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Literal, Mapping, Optional


# ---------------------------------------------------------------------------
# Shared data types (provider-neutral)
# ---------------------------------------------------------------------------

@dataclass
class CheckoutResult:
    """Provider-neutral checkout session result.

    Returned by BillingProvider.create_checkout_session().
    The caller uses `url` for redirect-based checkout (Stripe, Paystack redirect)
    or `access_code` for inline popup (Paystack inline).
    """
    kind: Literal["redirect", "inline"]
    url: Optional[str] = None
    access_code: Optional[str] = None
    provider: str = ""
    provider_session_ref: str = ""


@dataclass
class SubscriptionDelta:
    """Provider-neutral subscription state change.

    Returned by BillingProvider.handle_event(). The subscriptions router
    uses this to UPSERT the internal subscription record — no provider
    branching outside the seam.
    """
    user_id: str = ""
    tier: Literal["pro", "team"] = "pro"
    status: Literal["incomplete", "active", "canceled", "past_due"] = "incomplete"
    provider: str = ""
    currency: str = ""
    external_customer_id: str = ""
    external_subscription_id: str = ""
    external_price_id: str = ""
    current_period_start: Optional[str] = None  # ISO 8601
    current_period_end: Optional[str] = None    # ISO 8601
    event_id: str = ""  # Provider event ID for idempotency / dedup


# ---------------------------------------------------------------------------
# Abstract base class
# ---------------------------------------------------------------------------

class BillingProvider(ABC):
    """Provider-agnostic billing interface (ADR-013).

    Concrete implementations:
      - api/billing/stripe_provider.py   (Sprint 3 / WBS 1.5.3)
      - api/billing/paystack_provider.py (Sprint 4–5 / WBS 1.6.1)
    """

    @property
    @abstractmethod
    def name(self) -> Literal["stripe", "paystack"]:
        """The canonical provider name used as the registry key."""
        ...

    @abstractmethod
    def create_checkout_session(
        self,
        *,
        user_id: str,
        user_email: str,
        tier: Literal["pro", "team"],
        currency: str,
        success_url: str,
        cancel_url: str,
    ) -> CheckoutResult:
        """Initiate a hosted checkout session on the provider.

        The server resolves the provider-specific price/plan from lib/pricing
        config — the client never supplies an amount or price ID.

        Returns a CheckoutResult with a redirect URL (or access_code for
        Paystack inline popup).
        """
        ...

    @abstractmethod
    def verify_webhook(
        self,
        *,
        raw_body: bytes,
        headers: Mapping[str, str],
    ) -> bool:
        """Verify the webhook signature.

        - Stripe:   HMAC-SHA256 via stripe lib (Stripe-Signature header)
        - Paystack: HMAC-SHA512 over raw body, constant-time compare to
                    x-paystack-signature header

        Returns True if signature is valid, False otherwise.
        Must be called BEFORE any JSON parsing of the body.
        """
        ...

    @abstractmethod
    def handle_event(
        self,
        *,
        event: dict[str, Any],
    ) -> Optional[SubscriptionDelta]:
        """Map a provider-specific webhook event to a SubscriptionDelta.

        Returns a SubscriptionDelta for events that affect subscription state
        (e.g. checkout.session.completed, charge.success, subscription.deleted).
        Returns None for events that do not require a state change.
        """
        ...
