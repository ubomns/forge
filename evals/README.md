# Forge Evaluation Suite

This directory contains fixture business ideas and a rubric for evaluating the quality of generated plans and critiques.

## Structure

- `fixtures/` — 8 business idea descriptions across different industries and stages
- `run_eval.py` — Runs generator + critic for each fixture and produces a report
- Reference: `docs/critic-rubric.md` for severity definitions

## Running

```bash
# Requires OPENAI_API_KEY and FastAPI running on :8000
pip install -r requirements.txt
cd evals
python run_eval.py
```

## What we evaluate

1. **Schema compliance** — Does the generator produce valid `BusinessPlan` JSON for every fixture?
2. **Section completeness** — Does every section have substantive content (not just filler)?
3. **Critique quality** — Does the critic produce at least one `medium` or `high` critique per plan?
4. **Severity calibration** — Do `high` critiques flag real contradictions or missing info? Do `low` critiques stay at nit level?
5. **Cross-section coherence** — Do later sections (GTM, financials) follow from earlier ones (problem, market)?

## Grading

| Criterion | Pass | Fail |
|-----------|------|------|
| Schema compliance | All 8 fixtures produce valid BusinessPlan | Any fixture fails validation |
| Section completeness | Every section has ≥1 non-trivial field | Any section has only filler/generic text |
| Critique coverage | ≥1 medium+ critique per plan | Plan with zero medium+ critiques |
| Severity calibration | ≥1 high critique across all fixtures | No high critiques (critic is too soft) |
| Cross-section coherence | No obvious contradictions in ≥6/8 plans | Contradictions in >2/8 plans |