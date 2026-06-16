---
name: review-checklist
description: Code review checklist covering correctness, quality, tests, and performance, with severity classification. Use for every review.
---

## Checklist
- Correctness: logic matches spec; edge cases; off-by-one; null/empty.
- Errors: failures handled; no swallowed exceptions; clear messages.
- Quality: readable; well named; no dead code; DRY without over-abstraction.
- Conventions: matches codebase-conventions; consistent style.
- Tests: meaningful coverage of the change; assertions actually assert.
- Performance: no obvious N+1, unbounded loops, needless allocations.
- Security-adjacent: input validated; no secrets; safe defaults (defer the
  deep audit to security-engineer).

## Severity
- Blocker: breaks correctness/security -> must fix before merge.
- Major: significant risk or debt -> fix soon.
- Minor: small improvement.
- Nit: style/preference (label clearly).

## Rules
- Cite file:line for every finding. No finding without a real location.
- Separate objective defects from preference.
