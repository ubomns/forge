---
name: acceptance-criteria
description: How to write objective, testable acceptance criteria in Given/When/Then (Gherkin) form. Use for every user story.
---

## Format
Given <initial context>
When <action or event>
Then <observable, verifiable outcome>

## Rules
- One behavior per scenario; split compound criteria.
- Outcomes must be objectively pass/fail — no "fast", "intuitive", "nice".
- Cover happy path, each error/validation case, boundaries, empty states.
- Reference concrete values (limits, formats, messages), not vague ones.

## Example
Given a registered user on the login page
When they submit a valid email and the correct password
Then they are redirected to /dashboard
And a session cookie is set

## Checklist
- [ ] Every story has at least one happy-path and one negative scenario
- [ ] Each Then is independently verifiable
- [ ] Boundary, empty, and error states are covered
