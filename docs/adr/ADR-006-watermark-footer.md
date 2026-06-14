# ADR-006: Watermark as Document Footer

**Date:** 2026-06-11
**Status:** Proposed

## Context

Free-tier exports (.docx and .pdf) must include a "Generated with Forge" watermark to create upgrade incentive and brand free output (M5). We need to decide:
1. Where the watermark appears (footer, header, every page, first page only)
2. How it is implemented (template change, post-processing, conditional rendering)
3. How the tier is communicated to the export modules

## Decision

**Watermark is a subtle footer text** on every page of .docx and .pdf exports for anonymous and free-tier users. Pro and Team tiers have no watermark.

- `.docx`: Add a footer paragraph with "Generated with Forge — forgeplans.com" in `api/export.py`
- `.pdf`: Add a footer cell in `_PlanPDF.footer()` in `api/export_pdf.py`
- Tier is determined by:
  - If request is authenticated: look up user's subscription tier from DB
  - If request is anonymous: `tier = "anonymous"` (from request body or inferred)
  - Export modules receive a `tier: str` parameter and conditionally include footer
- Watermark styling: small font (8-9pt), gray color, centered or right-aligned — subtle, not intrusive

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| Watermark on every page | Strong brand presence | May feel spammy; PRD assumption A5 says users may tolerate it |
| Watermark on first page only | Less intrusive | Weak brand presence; easy to remove by deleting first page |
| Watermark as diagonal banner across page | Very visible | Looks cheap; high complaint risk; PRD risk assessment flags this |
| No watermark on free tier | Best UX | Removes upgrade incentive; undermines monetization |
| Footer text on every page (chosen) | Visible but professional; easy to implement; easy to remove for Pro | Still visible; some users may complain |

## Consequences

**Positive:**
- Implementation is simple: add conditional footer logic to existing export builders
- Professional appearance (footer text, not banner)
- Clear upgrade incentive: "Pro = clean exports"

**Negative:**
- Some users may perceive it as cheap (mitigation: keep it subtle and gray)
- Export modules now have tier-awareness, adding a small coupling

## Requirement traceability

- M5: Watermark on free-tier exports
- FR-8: Free-tier exports include "Generated with Forge" footer
- FR-7: Pro exports have no watermark
- PRD A5: Users will tolerate a watermark
