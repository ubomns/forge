"""
PaystackProvider — STUB (WBS 1.6.1, Sprint 4/5).

This file exists so that BillingRegistry can import and register
the provider. All methods raise NotImplementedError until the
Paystack sprint implements the real REST integration.

Paystack uses REST over HTTPS (no required SDK); webhook signature is
HMAC-SHA512 over the raw body using the secret key (NFR-17).
"""

from __future__ import annotations

from typing import Any, Literal, Mapping, Optional

from api.billing.base import BillingProvider, CheckoutResult, SubscriptionDelta


class PaystackProvider(BillingProvider):
    """Paystack billing provider (NGN).

    Concrete implementation deferred to WBS 1.6.1.
    """

    @property
    def name(self) -> Literal["stripe", "paystack"]:
        return "paystack"

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
            "PaystackProvider.create_checkout_session is a stub — implement in Sprint 4/5 (WBS 1.6.1)"
        )

    def verify_webhook(
        self,
        *,
        raw_body: bytes,
        headers: Mapping[str, str],
    ) -> bool:
        raise NotImplementedError(
            "PaystackProvider.verify_webhook is a stub — implement in Sprint 4/5 (WBS 1.6.1)"
        )

    def handle_event(
        self,
        *,
        event: dict[str, Any],
    ) -> Optional[SubscriptionDelta]:
        raise NotImplementedError(
            "PaystackProvider.handle_event is a stub — implement in Sprint 4/5 (WBS 1.6.1)"
        )
