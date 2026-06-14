---
name: test-authoring
description: How to author tests at the right level and run them, mapping each acceptance criterion to executed evidence. Use for all QA work.
---

## Test pyramid
- Many unit (pure logic), fewer integration (modules/IO), few e2e (flows).
- Choose the lowest level that actually proves the criterion.

## Authoring (Arrange-Act-Assert)
- Arrange -> Act -> Assert; one behavior per test; descriptive names.
- Cover happy path, errors, boundaries, empty/null, and idempotency.
- Deterministic: stub network, time, and randomness.

## Running (evidence)
- ALWAYS execute and capture the real command and output.
- Map each acceptance criterion to at least one test and its result.

## Don'ts
- Never report results you did not run. Never weaken a test to pass.
- Distinguish "written" from "passing".
