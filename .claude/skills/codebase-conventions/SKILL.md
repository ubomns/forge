---
name: codebase-conventions
description: How to discover and follow this project's existing conventions before writing or reviewing code. Doubles as the shared anti-hallucination charter for all agents.
---

## Discover before acting
- Read neighboring files; infer the real structure, naming, and patterns.
- Check config: package.json, tsconfig, linter/formatter, framework configs.
- Identify the test framework and how tests are organized.

## Follow
- Match existing naming, file layout, and import style.
- Use the established libraries; do not add dependencies without flagging.
- Respect the formatter/linter; do not reformat unrelated code.

## Anti-hallucination charter (ALL roles)
- Confirm a symbol / path / API exists (grep or read) before referencing it.
- Quote real file:line for any claim about the code.
- If something is unknown, investigate or flag it — never invent it.
- Report only actions you actually performed and outputs you actually saw.
- Label every assumption explicitly; never present a guess as a fact.
