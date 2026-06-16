"""
Watermark helper module (WBS 1.4.1, ADR-011).

Provides a single source of truth for the export watermark URL, used by
both the .docx (api/export.py) and .pdf (api/export_pdf.py) export modules.

Rules:
  - anonymous / free  => "Generated with Forge — <base_url>/?ref=export"
  - pro / team        => ""  (no watermark)

The URL carries ?ref=export for referral attribution (ADR-011) and never
includes PII (NFR-15).

PUBLIC_BASE_URL must be set and resolve live before export modules ship
(OD-4 / AC-CP7.2).
"""

from __future__ import annotations

import os

# Read once at import; overridable in tests via monkeypatch / env.
PUBLIC_BASE_URL: str = os.environ.get("PUBLIC_BASE_URL", "https://forgeplan.com")


def watermark_text(tier: str) -> str:
    """Return the watermark footer text for the given tier.

    Args:
        tier: One of "anonymous", "free", "pro", "team".

    Returns:
        The watermark string including the referral URL for anonymous/free,
        or an empty string for pro/team (no watermark).
    """
    if tier in ("pro", "team"):
        return ""

    base = PUBLIC_BASE_URL.rstrip("/")
    return f"Generated with Forge — {base}/?ref=export"


def watermark_url(tier: str) -> str:
    """Return just the URL portion with ?ref=export, or empty string for pro/team.

    Useful when only the URL is needed (e.g. as a hyperlink target).
    """
    if tier in ("pro", "team"):
        return ""

    base = PUBLIC_BASE_URL.rstrip("/")
    return f"{base}/?ref=export"
