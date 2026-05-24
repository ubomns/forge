from __future__ import annotations

import json
import os
from typing import Optional

from dotenv import load_dotenv

load_dotenv(override=True)

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from api.llm import (
    call_structured,
    check_api_key,
    get_client,
    get_model,
    provider_info,
    supports_structured_outputs,
)
from api.schema import (
    BusinessPlan,
    CritiqueRequest,
    CritiqueResponse,
    GenerateRequest,
    InvestorQuestionsRequest,
    InvestorQuestionsResponse,
    RegenerateRequest,
    SECTION_DISPLAY_NAMES,
    SECTION_ORDER,
    Stage,
    critique_schema_json,
    investor_questions_schema_json,
    schema_json,
)
from api.export import register_export_routes
from api.export_pdf import register_pdf_routes

limiter = Limiter(key_func=get_remote_address, default_limits=["10/minute"])
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

register_export_routes(app, limiter)
register_pdf_routes(app, limiter)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
)

MODEL = get_model()

SYSTEM_PROMPT = """You are a business plan consultant. Given a business idea, produce a detailed, \
credible early-stage business plan. Be specific, creative, and actionable. Use concrete numbers \
where possible. Avoid generic filler — every section should teach the reader something specific \
about this particular business."""

SYSTEM_PROMPT_WITH_CONTEXT = """You are a business plan consultant. Given a business idea (plus \
optional context about industry, stage, and market), produce a detailed, credible early-stage \
business plan. Tailor the plan to the provided context. Be specific, creative, and actionable. \
Use concrete numbers where possible. Avoid generic filler — every section should teach the \
reader something specific about this particular business."""


def _build_user_prompt(req: GenerateRequest) -> str:
    parts = [f"Business idea: {req.description}"]
    if req.industry:
        parts.append(f"Industry: {req.industry}")
    if req.stage:
        parts.append(f"Stage: {req.stage.value}")
    if req.market_context:
        parts.append(f"Market context: {req.market_context}")
    return "\n".join(parts)


def _sse_event(event_type: str, data: dict) -> str:
    return f"data: {json.dumps({'type': event_type, **data})}\n\n"


def _sse_done() -> str:
    return "data: [DONE]\n\n"


@app.post("/api/generate")
@limiter.limit("5/minute")
async def generate(request: Request, req: GenerateRequest):
    api_key = check_api_key()
    if not api_key and os.environ.get("LLM_PROVIDER", "openai").lower() != "ollama":
        raise HTTPException(
            status_code=500,
            detail={"error": {"code": "MISSING_API_KEY", "message": f"{os.environ.get('LLM_PROVIDER', 'openai').upper()}_API_KEY environment variable is not set"}},
        )

    client = get_client()
    model = get_model()

    has_context = bool(req.industry or req.stage or req.market_context)
    system_msg = SYSTEM_PROMPT_WITH_CONTEXT if has_context else SYSTEM_PROMPT
    user_msg = _build_user_prompt(req)

    plan_schema = schema_json()

    def event_stream():
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": user_msg},
                ],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "business_plan",
                        "strict": True,
                        "schema": plan_schema,
                    },
                } if supports_structured_outputs() else {"type": "json_object"},
                temperature=0.7,
                stream=False,
            )
        except Exception as exc:
            yield _sse_event("error", {"code": "UPSTREAM_ERROR", "message": str(exc)})
            return

        content = response.choices[0].message.content
        if not content:
            yield _sse_event("error", {"code": "UPSTREAM_ERROR", "message": "Empty response from model"})
            return

        try:
            plan_data = json.loads(content)
        except json.JSONDecodeError:
            yield _sse_event("error", {"code": "UPSTREAM_ERROR", "message": "Model returned invalid JSON"})
            return

        try:
            BusinessPlan.model_validate(plan_data)
        except Exception as exc:
            yield _sse_event("error", {"code": "UPSTREAM_ERROR", "message": f"Schema validation failed: {exc}"})
            return

        section_ids = list(SECTION_DISPLAY_NAMES.keys())
        for idx, section_id in enumerate(section_ids):
            section_data = plan_data.get(section_id)
            if section_data is None:
                continue
            yield _sse_event("section_start", {"section": section_id, "index": idx})
            yield _sse_event("section_data", {"section": section_id, "data": section_data})
            yield _sse_event("section_complete", {"section": section_id, "index": idx})

        yield _sse_done()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


CRITIC_SYSTEM_PROMPT = """You are an experienced early-stage investor reviewing a business plan. \
Your job is to identify substantive issues that would concern a real investor.

Rate each critique by severity:
- high: Contradictions between sections, missing critical information, financial claims that don't \
match the business model, regulatory or legal red flags, undefensible market assertions.
- medium: Questionable assumptions that need evidence, vague sections that could be more specific, \
scope misalignment, claims that are plausible but unconvincing without support.
- low: Style issues, minor wording preferences, nit-level formatting, small inconsistencies that \
don't affect the substance of the plan.

For each critique:
1. Cite the specific claim, assumption, or passage in the section that triggered it (the "claim" field).
2. Provide a concrete, actionable suggestion to address it (the "suggestion" field).
3. Assign the appropriate section_id from: executive_summary, problem, solution, market, competition, \
go_to_market, business_model, team, financials, ask.

Focus on what matters to a founder trying to get funded. Skip obvious praise or restating what's \
already there. Every critique should teach the reader something about what an investor would question."""


@app.post("/api/critique")
@limiter.limit("5/minute")
async def critique(request: Request, req: CritiqueRequest):
    api_key = check_api_key()
    if not api_key and os.environ.get("LLM_PROVIDER", "openai").lower() != "ollama":
        raise HTTPException(
            status_code=500,
            detail={"error": {"code": "MISSING_API_KEY", "message": f"{os.environ.get('LLM_PROVIDER', 'openai').upper()}_API_KEY environment variable is not set"}},
        )

    client = get_client()
    model = get_model()

    plan_json = req.plan.model_dump()
    user_msg = f"Here is the business plan to critique:\n\n```json\n{json.dumps(plan_json, indent=2)}\n```"

    try:
        result = call_structured(
            client=client,
            model=model,
            messages=[
                {"role": "system", "content": CRITIC_SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            schema=critique_schema_json(),
            schema_name="critique_response",
            pydantic_model=CritiqueResponse,
            temperature=0.5,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=502,
            detail={"error": {"code": "UPSTREAM_ERROR", "message": str(exc)}},
        )

    return {"critiques": [c.model_dump() for c in result.parsed.critiques]}


@app.post("/api/regenerate")
@limiter.limit("10/minute")
async def regenerate(request: Request, req: RegenerateRequest):
    api_key = check_api_key()
    if not api_key and os.environ.get("LLM_PROVIDER", "openai").lower() != "ollama":
        raise HTTPException(
            status_code=500,
            detail={"error": {"code": "MISSING_API_KEY", "message": f"{os.environ.get('LLM_PROVIDER', 'openai').upper()}_API_KEY environment variable is not set"}},
        )

    if req.section_id not in SECTION_ORDER:
        raise HTTPException(
            status_code=422,
            detail={"error": {"code": "INVALID_REQUEST", "message": f"Invalid section_id. Must be one of: {', '.join(SECTION_ORDER)}"}},
        )

    client = get_client()
    model = get_model()

    plan_json = req.plan.model_dump()
    display_name = SECTION_DISPLAY_NAMES.get(req.section_id, req.section_id)

    rest_of_plan = {k: v for k, v in plan_json.items() if k != req.section_id}
    context_str = "The current plan has these sections:\n"
    for sid, sdata in rest_of_plan.items():
        if sdata:
            sname = SECTION_DISPLAY_NAMES.get(sid, sid)
            context_str += f"\n{sname}: {json.dumps(sdata, indent=2)}\n"

    instruction_suffix = ""
    if req.instruction:
        instruction_suffix = f"\n\nAdditional instruction from the user: {req.instruction}"

    section_schema = BusinessPlan.model_json_schema()
    single_section_schema = {
        "type": "object",
        "properties": {req.section_id: section_schema["properties"][req.section_id]},
        "required": [req.section_id],
        "additionalProperties": False,
    }
    if "$defs" in section_schema:
        single_section_schema["$defs"] = section_schema["$defs"]

    user_msg = f"Here is the rest of the business plan for context:\n{context_str}\n\nNow rewrite the **{display_name}** section. Make it more specific, credible, and detailed than the original.{instruction_suffix}"

    try:
        if supports_structured_outputs():
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg},
                ],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": f"regenerate_{req.section_id}",
                        "strict": True,
                        "schema": single_section_schema,
                    },
                },
                temperature=0.7,
                stream=False,
            )
        else:
            schema_instruction = (
                f"\n\nYou MUST respond with a JSON object that exactly matches this schema:\n"
                f"```json\n{json.dumps(single_section_schema, indent=2)}\n```\n"
                f"Do not include any text outside the JSON object."
            )
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg + schema_instruction},
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
                stream=False,
            )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail={"error": {"code": "UPSTREAM_ERROR", "message": f"Could not reach upstream: {exc}"}},
        )

    content = response.choices[0].message.content
    if not content:
        raise HTTPException(
            status_code=502,
            detail={"error": {"code": "UPSTREAM_ERROR", "message": "Empty response from model"}},
        )

    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail={"error": {"code": "UPSTREAM_ERROR", "message": "Model returned invalid JSON"}},
        )

    return {"section_id": req.section_id, "data": result.get(req.section_id, result)}


INVESTOR_SYSTEM_PROMPT = """You are a seasoned early-stage venture capitalist. Given a complete \
business plan, identify the 5 hardest questions an investor would ask the founder during a pitch \
meeting. These should be questions that expose weaknesses, test assumptions, or reveal blind spots. \
Each question should be specific to the plan's content, not generic investor advice."""

@app.post("/api/investor-questions")
@limiter.limit("5/minute")
async def investor_questions(request: Request, req: InvestorQuestionsRequest):
    api_key = check_api_key()
    if not api_key and os.environ.get("LLM_PROVIDER", "openai").lower() != "ollama":
        raise HTTPException(
            status_code=500,
            detail={"error": {"code": "MISSING_API_KEY", "message": f"{os.environ.get('LLM_PROVIDER', 'openai').upper()}_API_KEY environment variable is not set"}},
        )

    client = get_client()
    model = get_model()

    plan_json = req.plan.model_dump()
    user_msg = f"Here is the business plan:\n\n```json\n{json.dumps(plan_json, indent=2)}\n```"

    try:
        result = call_structured(
            client=client,
            model=model,
            messages=[
                {"role": "system", "content": INVESTOR_SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            schema=investor_questions_schema_json(),
            schema_name="investor_questions",
            pydantic_model=InvestorQuestionsResponse,
            temperature=0.5,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=502,
            detail={"error": {"code": "UPSTREAM_ERROR", "message": str(exc)}},
        )

    return {"questions": [q.model_dump() for q in result.parsed.questions]}


@app.get("/api/health")
async def health():
    info = provider_info()
    return {"status": "ok", **info}