from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class Stage(str, Enum):
    idea = "idea"
    validation = "validation"
    growth = "growth"


class ExecutiveSummary(BaseModel):
    tagline: str = Field(description="A one-line tagline for the business")
    elevator_pitch: str = Field(description="A 2-3 sentence compelling summary of the business concept")


class Problem(BaseModel):
    description: str = Field(description="The core problem this business solves")
    pain_points: List[str] = Field(description="Specific pain points the target audience experiences")


class Solution(BaseModel):
    description: str = Field(description="How the business solves the identified problem")
    key_features: List[str] = Field(description="The main features or capabilities of the product/service")


class Market(BaseModel):
    tam: str = Field(description="Total addressable market — the overall revenue opportunity")
    sam: str = Field(description="Serviceable addressable market — the portion you can realistically reach")
    som: str = Field(description="Serviceable obtainable market — your near-term achievable share")
    segments: List[str] = Field(description="Key customer segments to target first")


class Competition(BaseModel):
    overview: str = Field(description="Landscape of existing solutions and alternatives")
    advantages: List[str] = Field(description="Competitive advantages that differentiate this business")
    competitors: List[str] = Field(description="Named competitors or alternatives in the space")


class GoToMarket(BaseModel):
    strategy: str = Field(description="Overall go-to-market strategy")
    channels: List[str] = Field(description="Customer acquisition and distribution channels")
    milestones: List[str] = Field(description="Key milestones for the first 12-18 months")


class BusinessModel(BaseModel):
    revenue_streams: List[str] = Field(description="Ways the business generates revenue")
    pricing: str = Field(description="Pricing model and strategy")
    unit_economics: str = Field(description="Key unit economics assumptions (LTV, CAC, margins)")


class Team(BaseModel):
    needed_roles: List[str] = Field(description="Key roles that need to be filled")
    current_gaps: List[str] = Field(description="Gaps in the current team and expertise")


class Financials(BaseModel):
    revenue_projection: str = Field(description="Projected revenue trajectory for years 1-3")
    key_costs: List[str] = Field(description="Major cost categories")
    break_even: str = Field(description="Expected timeline to break even")


class Ask(BaseModel):
    amount: str = Field(description="The funding amount being sought")
    use_of_funds: List[str] = Field(description="How the raised capital will be allocated")
    vision: str = Field(description="The long-term vision for what this business becomes")


class BusinessPlan(BaseModel):
    executive_summary: ExecutiveSummary = Field(description="Executive summary — the hook and overview")
    problem: Problem = Field(description="The problem being solved")
    solution: Solution = Field(description="The proposed solution")
    market: Market = Field(description="Market size and target segments")
    competition: Competition = Field(description="Competitive landscape and advantages")
    go_to_market: GoToMarket = Field(description="Go-to-market strategy and milestones")
    business_model: BusinessModel = Field(description="Revenue model and unit economics")
    team: Team = Field(description="Team composition and gaps")
    financials: Financials = Field(description="Financial projections and break-even")
    ask: Ask = Field(description="The funding ask and vision")


class GenerateRequest(BaseModel):
    description: str = Field(min_length=1, description="The business idea description")
    industry: Optional[str] = Field(default=None, description="Industry or sector context")
    stage: Optional[Stage] = Field(default=None, description="Current business stage")
    market_context: Optional[str] = Field(default=None, description="Additional market or customer context")


class Severity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class Critique(BaseModel):
    section_id: str = Field(description="The section this critique applies to (e.g. 'market', 'financials')")
    severity: Severity = Field(description="How important this critique is: low (nit/style), medium (substantive issue), high (contradiction or missing critical info)")
    claim: str = Field(description="The specific claim, assumption, or passage in the section that triggered this critique")
    suggestion: str = Field(description="A concrete, actionable suggestion to address the issue")


class CritiqueResponse(BaseModel):
    critiques: List[Critique] = Field(description="List of critiques across all sections of the plan")


class CritiqueRequest(BaseModel):
    plan: BusinessPlan = Field(description="The full business plan to critique")


class RegenerateRequest(BaseModel):
    plan: BusinessPlan = Field(description="The current full business plan (provides context)")
    section_id: str = Field(description="The section to regenerate, e.g. 'market', 'financials'")
    instruction: Optional[str] = Field(default=None, description="Optional instruction like 'more detailed' or 'rewrite for angel investor'")


class InvestorQuestion(BaseModel):
    question: str = Field(description="The hardest question an investor would ask")
    why_it_matters: str = Field(description="Why this question matters for evaluating the plan")
    section_id: str = Field(description="Which section this question targets")


class InvestorQuestionsResponse(BaseModel):
    questions: List[InvestorQuestion] = Field(description="The 5 hardest investor questions for this plan")


class InvestorQuestionsRequest(BaseModel):
    plan: BusinessPlan = Field(description="The business plan to evaluate")


SECTION_ORDER: list[str] = [
    "executive_summary",
    "problem",
    "solution",
    "market",
    "competition",
    "go_to_market",
    "business_model",
    "team",
    "financials",
    "ask",
]

SECTION_DISPLAY_NAMES: dict[str, str] = {
    "executive_summary": "Executive Summary",
    "problem": "Problem",
    "solution": "Solution",
    "market": "Market",
    "competition": "Competition",
    "go_to_market": "Go-to-Market",
    "business_model": "Business Model",
    "team": "Team",
    "financials": "Financials",
    "ask": "The Ask",
}


def _make_strict(schema: dict) -> dict:
    """
    Conform a Pydantic JSON Schema to OpenAI Structured Outputs (strict mode).

    Rules enforced:
      1. Every object schema must declare additionalProperties: false.
      2. A `$ref` cannot have siblings like description/title (OpenAI rejects them).
      3. The root must not carry a `title`.
    """
    if isinstance(schema, dict):
        if "$ref" in schema:
            for key in list(schema.keys()):
                if key != "$ref":
                    del schema[key]
        else:
            if schema.get("type") == "object" and "additionalProperties" not in schema:
                schema["additionalProperties"] = False
        for value in list(schema.values()):
            if isinstance(value, dict):
                _make_strict(value)
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        _make_strict(item)
    return schema


def _root_strict(schema: dict) -> dict:
    """Apply _make_strict + drop the top-level `title` that Pydantic adds."""
    _make_strict(schema)
    schema.pop("title", None)
    return schema


def schema_json() -> dict:
    """Return the JSON Schema suitable for OpenAI Structured Outputs (strict)."""
    return _root_strict(BusinessPlan.model_json_schema())


def critique_schema_json() -> dict:
    """Return the JSON Schema for critique structured output (strict)."""
    return _root_strict(CritiqueResponse.model_json_schema())


def investor_questions_schema_json() -> dict:
    """Return the JSON Schema for investor questions structured output (strict)."""
    return _root_strict(InvestorQuestionsResponse.model_json_schema())