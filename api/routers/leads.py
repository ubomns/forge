"""
Lead capture router.

Endpoint:
  POST /api/leads — capture an email address before download (FR-2, FR-3).

Rate-limited to 10/min per IP (AC-A2.3).
"""

from __future__ import annotations

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from api.database import get_db
from api.models import Lead

logger = logging.getLogger(__name__)

router = APIRouter(tags=["leads"])

# The limiter instance is injected from api/index.py at mount time.
# We use a module-level reference that gets set via init_leads_limiter().
_limiter: Optional[Limiter] = None


def init_leads_limiter(limiter: Limiter) -> None:
    """Set the shared limiter instance so the route decorator can reference it."""
    global _limiter
    _limiter = limiter


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class LeadCreateRequest(BaseModel):
    email: EmailStr
    plan_snapshot: Optional[dict] = None
    source: str = Field(default="download", pattern="^(download|signup)$")


class LeadCreateResponse(BaseModel):
    lead_id: str


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/api/leads")
async def create_lead(
    request: Request,
    body: LeadCreateRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Capture a lead email (mandatory before anonymous download).

    - Valid email format required (422 on invalid).
    - Rate-limited 10/min per IP.
    - Returns the created lead ID.
    """
    # Rate limiting is applied via the shared limiter in api/index.py

    plan_snapshot_str: Optional[str] = None
    if body.plan_snapshot is not None:
        try:
            plan_snapshot_str = json.dumps(body.plan_snapshot)
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=422,
                detail={"error": {"code": "INVALID_REQUEST", "message": "plan_snapshot must be valid JSON"}},
            )

    lead = Lead(
        email=body.email,
        plan_snapshot=plan_snapshot_str,
        source=body.source,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    logger.info("Lead captured (lead_id=%s, source=%s)", lead.id, lead.source)
    return {"lead_id": lead.id}
