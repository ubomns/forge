---
name: delegation-playbook
description: How the Engineering Lead (the main Claude Code session) decomposes work and routes it to the right specialist subagent via the Task tool, in the right order, with a complete handoff. Use at the start of any orchestration.
---

## Platform note
In Claude Code, the **main session is the orchestrator** (the Engineering Lead
output style). It delegates to specialists with the **Task tool**. Subagents
cannot spawn their own subagents and share no memory with you — so every handoff
must carry its own context, and integration happens back in the main session.

## Routing map
- Unclear problem / scope / priority            -> product-manager
- Detailed, testable requirements                -> business-analyst
- System design / components / tech-stack        -> solution-architect
- WBS, sprint plan, task assignment              -> scrum-master
- UI look, behaviour, flows, states             -> ux-designer
- Client-side implementation                     -> frontend-dev
- Server-side / API / data implementation        -> backend-dev
- CI/CD, build, deploy, infra, release           -> devops-engineer
- Verification against acceptance criteria       -> qa-tester
- Quality / correctness review (read-only)       -> code-reviewer
- Vulnerability audit (read-only)                -> security-engineer
- User/developer docs, changelog, runbook        -> technical-writer

## Standard sequence
PM/BA (spec)
  -> solution-architect (design + ADRs + threat model)        [Gate G2]
  -> scrum-master (WBS + sprint plan)                          [Gate G3]
  -> ux-designer (design spec; parallel where independent)     [Gate G4]
  -> frontend-dev / backend-dev / devops-engineer (build their WBS items)
  -> qa-tester (verify per WBS DOD)
  -> code-reviewer + security-engineer (audit)
  -> technical-writer (docs for the shipped change)
  -> integrate fixes -> re-verify                              [Gate G5]

The scrum-master's WBS.md is the dev team's source of truth: developers read it to
know what to build, in what order, and what done looks like. Do not advance to
build until docs/WBS.md exists and is approved (G3).

## Handoff contract (include in EVERY Task delegation)
1. **Goal** — one sentence.
2. **Context** — relevant file paths and prior decisions (subagents start cold).
3. **The spec / architecture / WBS items** to satisfy.
4. **Constraints and explicit out-of-scope** items.
5. **The exact return format** expected (the agent's return envelope).

## Verification gate (development phase)
- A code-touching work package is done only when qa-tester returned EXECUTED test
  evidence, code-reviewer APPROVED, and security-engineer issued CLEAR or an
  accepted CONDITIONAL verdict.
- With the GitHub MCP enabled, each work package also gets one branch and one PR
  before it is marked done (see the `github-pr` skill).

## Human approval gates
The Engineering Lead pauses for explicit user sign-off at G1 (requirements),
G2 (architecture), G3 (WBS), G4 (design spec), and G5 (pre-merge). No phase
advances past a gate without approval.

## Rules
- One specialist owns each unit; avoid overlapping mandates.
- Prefer the smallest independently-verifiable unit.
- Do not advance to review until QA evidence exists.
- Carry context forward explicitly via the handoff and the docs/ artifacts —
  subagents do not see your conversation.
- Re-delegate a blocked specialist once with a sharper brief; on a second failure,
  surface it to the user. Never silently retry more than once.
