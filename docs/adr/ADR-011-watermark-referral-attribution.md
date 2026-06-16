# ADR-011: Watermark Referral Attribution (`ref=export`)

**Date:** 2026-06-15
**Status:** Accepted
**Extends:** ADR-006 (Watermark as Document Footer)

## Context

ADR-006 defines the free-tier export watermark as a subtle footer
("Generated with Forge — forgeplans.com", small/gray, every page). The
conversion playbook (S-P4, US-CP7, metric G6) reframes the watermark as a
**distribution channel**: every shared exported plan is a Forge impression, and
traffic arriving from those documents must be **attributable**. ADR-006 specifies
the text and placement but not attribution. This ADR adds the attribution
mechanism without changing ADR-006's styling constraints.

## Decision

**Append a referral query parameter to the watermark URL** so sessions
originating from exported documents are measurable.

1. **URL form.** The watermark URL carries `?ref=export`, e.g.
   `https://<forge-domain>/?ref=export`. The exact base domain is an open
   question (see Q-P3 / traceability) and is read from a single config value
   (`PUBLIC_BASE_URL`), not hard-coded in two export modules.
2. **Single source.** Both `api/export.py` (.docx footer paragraph) and
   `api/export_pdf.py` (`_PlanPDF.footer()`) build the watermark string from one
   shared helper (e.g. `api/watermark.py::watermark_url(tier)`), so the domain
   and parameter cannot drift between formats. This also addresses ADR-006
   sensitivity point SP-3 (scattered watermark logic).
3. **Capture at the edge.** `?ref=export` is captured on the **landing page**
   (the URL must resolve to the live landing page, never a 404 — AC-CP7.2). The
   client records the referral source into the analytics pipeline as
   `referral_source = "export_watermark"` (event property), and may persist it
   for the session (e.g. a first-touch attribution value in `sessionStorage`) so
   a later signup/checkout can be credited to the export channel.
4. **Tier scope.** Only **anonymous and free** tier exports carry the watermark
   (unchanged from ADR-006); therefore only those exports carry `ref=export`.
   Pro/Team white-label exports carry neither.
5. **Styling unchanged.** Adding the parameter must not enlarge or re-style the
   watermark (AC-CP7.4); it remains the ADR-006 subtle gray footer. The visible
   text may show a clean domain while the link target carries the parameter
   (in .docx a hyperlink; in PDF the printed string itself carries it, since PDF
   footer text is the link visitors type/scan — keep it short).
6. **No PII in the parameter.** `ref=export` is a static channel tag, not a
   per-user identifier. We deliberately do **not** embed user/plan ids in the
   shared document URL (privacy + the document is shared with third parties).

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| Static `?ref=export` channel tag (chosen) | Measurable, privacy-safe, trivial to implement, one helper | Channel-level only (cannot attribute to the specific sharer) — acceptable for G6 |
| Per-export unique token (`?ref=<token>`) | Attribute to the exact source plan/user | Embeds an identifier in a third-party-shared doc (privacy risk); needs a token table; over-engineered for a count metric |
| UTM suite (`utm_source/medium/campaign`) | Standard analytics convention | Verbose in a tiny gray footer; `ref=export` is sufficient and shorter; can map to UTM in the analytics layer |
| No attribution (ADR-006 as-is) | Nothing to build | G6 becomes unmeasurable; rejected by the playbook |

## Consequences

**Positive:**
- G6 (watermark referral traffic) becomes measurable.
- One shared watermark helper removes .docx/.pdf drift (resolves SP-3).
- No PII or per-user data leaves in a shared document.

**Negative:**
- Introduces a hard dependency on the analytics pipeline being live to realise
  the metric (already a PRD dependency, §7.2).
- Channel-level attribution only; cannot credit an individual sharer (accepted).
- Adds a new (low-severity) trust-boundary consideration: the referral param is
  attacker-controllable in the URL (see STRIDE, ARCHITECTURE §7.x) — treat it as
  untrusted analytics input, never as an authz/feature signal.

## Requirement traceability

- PRD-conversion-playbook S-P4, US-CP7 (AC-CP7.1–7.4); metric G6.
- ADR-006 (extends; styling constraints preserved); SP-3 (resolved).
- Open: Q-P3 (watermark base domain) — `PUBLIC_BASE_URL` must resolve live
  before this ships.
