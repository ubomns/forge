"""
BillingRegistry — provider lookup by name (ADR-013, WBS 1.5.1).

Maps "stripe" / "paystack" to their concrete BillingProvider implementations.
Mirrors the pattern in api/llm.py where providers are registered by key and
resolved at runtime.

Usage:
    provider = BillingRegistry.get("stripe")
    result = provider.create_checkout_session(...)

Adding a new provider:
    1. Implement BillingProvider in api/billing/<name>_provider.py
    2. Register it in BillingRegistry._providers

Provider implementations are imported lazily to avoid pulling in SDK
dependencies (e.g. stripe) at import time when they are not needed.
"""

from __future__ import annotations

from typing import Optional

from api.billing.base import BillingProvider


class _RegistryError(Exception):
    """Raised when an unknown billing provider is requested."""
    pass


class BillingRegistry:
    """Singleton registry mapping provider names to BillingProvider instances."""

    _instances: dict[str, BillingProvider] = {}
    _initialized: bool = False

    @classmethod
    def _ensure_initialized(cls) -> None:
        """Lazily import and register concrete providers.

        Concrete implementations are STUBS until their sprint ships:
          - StripeProvider   (WBS 1.5.3 — Sprint 3)
          - PaystackProvider (WBS 1.6.1 — Sprint 4/5)

        Each provider module is imported only when first needed to avoid
        import-time errors if the provider's SDK is not yet installed.
        """
        if cls._initialized:
            return

        # --- Stripe ---
        try:
            from api.billing.stripe_provider import StripeProvider
            cls._instances["stripe"] = StripeProvider()
        except ImportError:
            pass  # Stripe provider not yet implemented

        # --- Paystack ---
        try:
            from api.billing.paystack_provider import PaystackProvider
            cls._instances["paystack"] = PaystackProvider()
        except ImportError:
            pass  # Paystack provider not yet implemented

        cls._initialized = True

    @classmethod
    def get(cls, provider_name: str) -> BillingProvider:
        """Return the BillingProvider for the given name.

        Args:
            provider_name: "stripe" or "paystack"

        Raises:
            _RegistryError: If the provider is unknown or not yet registered.
        """
        cls._ensure_initialized()

        provider = cls._instances.get(provider_name)
        if provider is None:
            available = list(cls._instances.keys()) or ["(none registered)"]
            raise _RegistryError(
                f"Unknown billing provider '{provider_name}'. "
                f"Available: {', '.join(available)}"
            )
        return provider

    @classmethod
    def available_providers(cls) -> list[str]:
        """Return the list of registered provider names."""
        cls._ensure_initialized()
        return list(cls._instances.keys())

    @classmethod
    def register(cls, provider: BillingProvider) -> None:
        """Manually register a provider (useful for testing)."""
        cls._instances[provider.name] = provider
        cls._initialized = True

    @classmethod
    def reset(cls) -> None:
        """Reset the registry (testing only)."""
        cls._instances.clear()
        cls._initialized = False
