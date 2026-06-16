"""
Plan CRUD router.

Endpoints:
  GET  /api/plans          — list all plans for authenticated user
  POST /api/plans          — create a new plan (free-tier cap enforced)
  GET  /api/plans/{id}     — get a single plan by ID
  DELETE /api/plans/{id}   — delete a plan by ID

Free-tier cap: max 3 plans per user (ADR-005).
"""

from __future__ import annotations

import json
import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.auth import get_current_user
from api.database import get_db
from api.models import Plan, User
from api.schema import BusinessPlan

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/plans", tags=["plans"])

FREE_TIER_PLAN_LIMIT = 3


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class PlanCreateRequest(BaseModel):
    title: str
    plan_data: dict
    idea_description: str


class PlanResponse(BaseModel):
    id: str
    user_id: str
    title: str
    plan_data: dict
    idea_description: str
    created_at: str
    updated_at: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _plan_response(plan: Plan) -> dict:
    """Serialize a Plan ORM instance to the API response shape."""
    return {
        "id": plan.id,
        "user_id": plan.user_id,
        "title": plan.title,
        "plan_data": json.loads(plan.plan_data),
        "idea_description": plan.idea_description,
        "created_at": plan.created_at.isoformat() if plan.created_at else "",
        "updated_at": plan.updated_at.isoformat() if plan.updated_at else "",
    }


def _get_user_plan(db: Session, plan_id: str, user_id: str) -> Plan:
    """Fetch a plan ensuring it exists and belongs to the user."""
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if plan is None or plan.user_id != user_id:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Plan not found"}},
        )
    return plan


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/")
async def list_plans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[dict]:
    """List all plans for the authenticated user, ordered by created_at desc."""
    plans = (
        db.query(Plan)
        .filter(Plan.user_id == current_user.id)
        .order_by(Plan.created_at.desc())
        .all()
    )
    logger.info("Listed plans (user_id=%s, count=%s)", current_user.id, len(plans))
    return [_plan_response(p) for p in plans]


@router.post("/")
async def create_plan(
    body: PlanCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Create a new plan.

    Validates plan_data against BusinessPlan schema.
    Enforces free-tier cap: free users may only have 3 plans.
    """
    # Validate plan_data schema before touching the DB
    try:
        BusinessPlan.model_validate(body.plan_data)
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail={
                "error": {
                    "code": "INVALID_REQUEST",
                    "message": f"plan_data validation failed: {exc}",
                }
            },
        )

    # Free-tier cap enforcement
    if current_user.tier == "free":
        plan_count = (
            db.query(Plan)
            .filter(Plan.user_id == current_user.id)
            .count()
        )
        if plan_count >= FREE_TIER_PLAN_LIMIT:
            logger.warning(
                "Plan limit reached (user_id=%s, tier=%s, count=%s)",
                current_user.id,
                current_user.tier,
                plan_count,
            )
            raise HTTPException(
                status_code=403,
                detail={
                    "error": {
                        "code": "PLAN_LIMIT_REACHED",
                        "message": "Free tier is limited to 3 plans. Upgrade to save more.",
                    }
                },
            )

    plan = Plan(
        user_id=current_user.id,
        title=body.title,
        plan_data=json.dumps(body.plan_data),
        idea_description=body.idea_description,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    logger.info("Plan created (plan_id=%s, user_id=%s)", plan.id, current_user.id)
    return _plan_response(plan)


@router.get("/{plan_id}")
async def get_plan(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Get a single plan by ID. Returns 404 if not found or not owned."""
    plan = _get_user_plan(db, plan_id, current_user.id)
    logger.info("Retrieved plan (plan_id=%s, user_id=%s)", plan.id, current_user.id)
    return _plan_response(plan)


@router.delete("/{plan_id}")
async def delete_plan(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Delete a plan by ID. Returns 404 if not found or not owned."""
    plan = _get_user_plan(db, plan_id, current_user.id)
    db.delete(plan)
    db.commit()

    logger.info("Plan deleted (plan_id=%s, user_id=%s)", plan_id, current_user.id)
    return {"message": "Plan deleted"}
