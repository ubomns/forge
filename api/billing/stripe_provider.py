"""
StripeProvider — STUB (WBS 1.5.3, Sprint 3).

This file exists so that BillingRegistry can import and register
the provider. All methods raise NotImplementedError until Sprint 3
implements the real Stripe SDK integration.
"""

from __future__ import annotations

from typing import Any, Literal, Mapping, Optional

from api.billing.base import BillingProvider, CheckoutResult, SubscriptionDelta


class StripeProvider(BillingProvider):
    """Stripe billing provider (USD).

    Concrete implementation deferred to WBS 1.5.3.
    """

    @property
    def name(self) -> Literal["stripe", "paystack"]:
        return "stripe"

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
        raise NotImplementedError(
            "StripeProvider.create_checkout_session is a stub — implement in Sprint 3 (WBS 1.5.3)"
        )

    def verify_webhook(
        self,
        *,
        raw_body: bytes,
        headers: Mapping[str, str],
    ) -> bool:
        raise NotImplementedError(
            "StripeProvider.verify_webhook is a stub — implement in Sprint 3 (WBS 1.5.3)"
        )

    def handle_event(
        self,
        *,
        event: dict[str, Any],
    ) -> Optional[SubscriptionDelta]:
        raise NotImplementedError(
            "StripeProvider.handle_event is a stub — implement in Sprint 3 (WBS 1.5.3)"
        )
