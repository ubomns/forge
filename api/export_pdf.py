from __future__ import annotations

import io
from typing import Any

from fpdf import FPDF
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from slowapi import Limiter

from api.auth import get_optional_user
from api.schema import BusinessPlan, SECTION_DISPLAY_NAMES, SECTION_ORDER
from api.watermark import watermark_text


class _PlanPDF(FPDF):
    def __init__(self, tier: str = "anonymous"):
        super().__init__()
        self._tier = tier

    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(160, 154, 148)
        self.cell(0, 8, "Forge — Business Plan", align="R")
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(160, 154, 148)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

        # Watermark for anonymous/free tiers (ADR-011)
        watermark = watermark_text(self._tier)
        if watermark:
            self.set_y(-25)
            self.set_font("Helvetica", "I", 7)
            self.set_text_color(180, 174, 168)
            self.cell(0, 10, watermark, align="C")


def _build_pdf(plan: BusinessPlan, tier: str = "anonymous") -> bytes:
    pdf = _PlanPDF(tier)
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=25)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 24)
    pdf.set_text_color(28, 25, 23)
    pdf.cell(0, 14, plan.executive_summary.tagline, ln=True)
    pdf.ln(4)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(120, 113, 108)
    pdf.multi_cell(0, 5, plan.executive_summary.elevator_pitch)
    pdf.ln(8)

    for section_id in SECTION_ORDER:
        section = getattr(plan, section_id, None)
        if section is None:
            continue

        display_name = SECTION_DISPLAY_NAMES.get(section_id, section_id.replace("_", " ").title())
        data = section.model_dump()

        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(28, 25, 23)
        pdf.set_draw_color(232, 229, 224)
        pdf.set_x(10)
        cell_width = pdf.w - 20
        pdf.cell(cell_width, 8, display_name, ln=True)

        pdf.set_draw_color(232, 229, 224)
        pdf.line(10, pdf.get_y(), pdf.w - 10, pdf.get_y())
        pdf.ln(3)

        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(61, 53, 48)

        field_labels: dict[str, str] = {
            "tagline": "Tagline",
            "elevator_pitch": "Elevator Pitch",
            "description": None,
            "pain_points": "Pain Points",
            "key_features": "Key Features",
            "tam": "Total Addressable Market",
            "sam": "Serviceable Addressable Market",
            "som": "Serviceable Obtainable Market",
            "segments": "Target Segments",
            "overview": "Landscape",
            "advantages": "Advantages",
            "competitors": "Known Competitors",
            "strategy": "Strategy",
            "channels": "Channels",
            "milestones": "Milestones",
            "revenue_streams": "Revenue Streams",
            "pricing": "Pricing",
            "unit_economics": "Unit Economics",
            "needed_roles": "Key Roles",
            "current_gaps": "Current Gaps",
            "revenue_projection": "Revenue Projection",
            "key_costs": "Key Costs",
            "break_even": "Break-even",
            "amount": "Amount Sought",
            "use_of_funds": "Use of Funds",
            "vision": "Vision",
        }

        for field_name, value in data.items():
            if value is None:
                continue
            label = field_labels.get(field_name)
            if isinstance(value, list):
                if label:
                    pdf.set_font("Helvetica", "B", 9)
                    pdf.set_text_color(168, 162, 158)
                    pdf.cell(0, 5, label, ln=True)
                pdf.set_font("Helvetica", "", 10)
                pdf.set_text_color(61, 53, 48)
                for item in value:
                    pdf.set_x(18)
                    pdf.cell(4, 5, chr(8226))
                    pdf.cell(0, 5, str(item), ln=True)
                pdf.ln(2)
            else:
                if label:
                    pdf.set_font("Helvetica", "B", 9)
                    pdf.set_text_color(168, 162, 158)
                    pdf.cell(0, 5, label, ln=True)
                pdf.set_font("Helvetica", "", 10)
                pdf.set_text_color(61, 53, 48)
                pdf.multi_cell(0, 5, str(value))
                pdf.ln(1)

        pdf.ln(4)

    buf = io.BytesIO()
    pdf.output(buf)
    buf.seek(0)
    return buf.getvalue()


def register_pdf_routes(app: FastAPI, limiter: Limiter) -> None:
    @app.post("/api/export-pdf")
    @limiter.limit("10/minute")
    async def export_pdf(request: Request, body: dict[str, Any]):
        # Determine tier from auth cookie (anonymous if not authenticated)
        from api.models import User
        user: User | None = None
        try:
            user = await get_optional_user(request)
        except Exception:
            pass
        tier = user.tier if user else "anonymous"

        try:
            plan = BusinessPlan.model_validate(body)
        except Exception as exc:
            raise HTTPException(
                status_code=422,
                detail={"error": {"code": "INVALID_REQUEST", "message": f"Invalid plan data: {exc}"}},
            )

        try:
            pdf_bytes = _build_pdf(plan, tier)
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail={"error": {"code": "UPSTREAM_ERROR", "message": f"Failed to generate PDF: {exc}"}},
            )

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="forge-business-plan.pdf"'},
        )