---
name: delegation-playbook
description: How the Engineering Lead decomposes work and routes it to the right specialist subagent, in the right order, with a complete handoff. Use at the start of any orchestration.
---

## Routing map
- Unclear problem / scope / priority            -> product-manager
- Need detailed, testable requirements           -> business-analyst
- System design / components / tech-stack       -> solution-architect
- WBS, sprint plan, task assignment, delivery    -> scrum-master
- UI look, behavior, flows, states              -> ux-designer
- Client-side implementation                    -> frontend-dev
- Server-side / API / data implementation       -> backend-dev
- Verification against acceptance criteria       -> qa-tester
- Quality / correctness review                  -> code-reviewer
- Vulnerability audit                           -> security-engineer

## Standard sequence
PM/BA (spec)
  -> solution-architect (design + tech stack)
  -> scrum-master (WBS + sprint plan)
  -> ux-designer (design spec, parallel where independent)
  -> frontend-dev / backend-dev (implement their WBS items)
  -> qa-tester (verify per WBS DOD)
  -> code-reviewer + security-engineer (audit)
  -> integrate fixes -> re-verify.

The scrum-master's WBS.md becomes the dev team's source of truth:
developers read it to know what to build, in what order, and what
done looks like. Do not advance to build until docs/WBS.md exists and
is approved.

## Handoff contract (include in EVERY delegation)
1. Goal — one sentence.
2. Context — relevant file paths and prior decisions.
3. The spec / architecture / WBS items to satisfy.
4. Constraints and explicit out-of-scope items.
5. The exact return format expected.

## PR gate (development phase)
Every WBS work package that touches code must result in a PR before it is
marked done. The Lead verifies: Jira ticket exists -> branch created ->
code implemented -> PR raised with test evidence -> reviewer approved -> merged.
No work package is done without a merged, approved PR.

## Rules
- One specialist owns each unit; avoid overlapping mandates.
- Prefer the smallest independently-verifiable unit.
- Do not advance to review until QA evidence exists.
- Subagents do not share memory — carry context forward explicitly via
  the handoff docs under docs/.
