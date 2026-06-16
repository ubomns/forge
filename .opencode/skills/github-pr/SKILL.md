---
name: github-pr
description: How to create branches, commit, raise PRs, and conduct code reviews on GitHub linked to Jira tickets, using the GitHub MCP server. Use for every code change in the development phase.
---

## The Jira ↔ GitHub link (how it works)
Jira automatically detects a Jira issue key (e.g. PROJ-42) anywhere in a
branch name, commit message, or PR title/body. No manual linking needed.
The pattern to follow in EVERY step below:
  WBS work package  ->  Jira ticket (PROJ-x)  ->  Git branch  ->  PR  ->  merge

One work package = one Jira ticket = one branch = one PR. Never bundle
multiple WBS items into a single branch or PR.

---

## Branch Strategy

| Branch | Purpose | Base For |
|--------|---------|----------|
| `main` | Production-ready code. **Protected** — requires user approval. | Sprint integration PRs only |
| `FE-Branch` | Frontend integration branch. All frontend feature branches merge here. | Frontend feature branches |
| `BE-Branch` | Backend integration branch. All backend feature branches merge here. | Backend feature branches |

### Feature Branch Rules
- Backend work: branch from `BE-Branch`
- Frontend work: branch from `FE-Branch`
- **Never branch from `main` for feature work.**
- **Never branch from another feature branch** unless explicitly sequenced in the WBS.

---

## Step 1 — Create the branch (before writing a line of code)
Naming convention (must contain the Jira key):
  feature/<JIRA-KEY>-<short-kebab-desc>   # new capability
  fix/<JIRA-KEY>-<short-kebab-desc>        # bug fix
  chore/<JIRA-KEY>-<short-kebab-desc>      # non-feature work (infra, tests)

Examples:
  feature/PROJ-42-link-creation-endpoint
  fix/PROJ-51-open-redirect-validation
  chore/PROJ-33-add-unit-tests

Via GitHub MCP: use create_branch or push the branch via git and let it
register. Always branch from the appropriate integration branch (`FE-Branch` or
`BE-Branch`); never branch from `main` or another feature branch unless explicitly
sequenced that way in the WBS.

---

## Step 2 — Commit (Conventional Commits + Jira Smart Commit)
Format:
  <type>(<scope>): <description> [JIRA-KEY]

Examples:
  feat(links): implement POST /api/links with URL validation [PROJ-42]
  fix(redirect): restrict scheme to http/https only [PROJ-51]
  test(links): add unit tests for creation endpoint [PROJ-42]

Smart Commit status transitions (append after the key if moving the ticket):
  [PROJ-42] #in-progress   -> moves ticket to In Progress
  [PROJ-42] #done          -> moves ticket to Done (use only on final commit)

Rules:
- One logical change per commit; keep commits atomic.
- Never commit directly to `main`, `FE-Branch`, or `BE-Branch`.
- NEVER commit secrets, credentials, or .env files.

---

## Step 3 — Create the Pull Request (to Integration Branch)
Use the GitHub MCP create_pull_request tool.

**For individual work packages:**
Title format:   [JIRA-KEY] Brief description matching the WBS work package
Base branch:    FE-Branch (frontend) or BE-Branch (backend)
Head branch:    your feature/<JIRA-KEY>-... branch

**For sprint completion (to main):**
Title format:   [SPRINT-X] Sprint completion — <brief summary>
Base branch:    main
Head branch:    FE-Branch or BE-Branch
**Note:** Sprint-level PRs to `main` require explicit user approval.

PR body template:
```
## Summary
[One paragraph: what this PR delivers and why — tie it to the WBS item.]

## Jira ticket
[PROJ-KEY] — [link or paste the ticket title]

## Architecture reference
Implements: [component from docs/ARCHITECTURE.md]

## Changes
- [file or module changed]: [what changed and why]

## Test evidence
[Paste the real test command and its output. Do NOT fabricate.]
`npm test` result:
```
[paste here]
```

## Definition of Done checklist
- [ ] WBS DOD met (ref: WBS item ID)
- [ ] All acceptance criteria in docs/BRD.md pass
- [ ] No regressions in prior sprint items
- [ ] Build passes
- [ ] Review requested
- [ ] QA testing completed
- [ ] Security audit passed (no High/Critical findings)
```

---

## Step 4 — Code Review (code-reviewer agent)
Use GitHub MCP tools to review — do not rely on git diff alone:
- get_pull_request           — read the PR description and metadata
- list_pull_request_files    — list changed files with their diffs
- create_pull_request_review — submit APPROVE / REQUEST_CHANGES / COMMENT
- create_review_comment      — inline comment on a specific file:line

Reviewers NEVER merge. Verdict options:
- APPROVE: all checklist items pass, no blockers or majors.
- REQUEST_CHANGES: one or more blockers or majors; developer must fix and
  push new commits (same branch, same PR — do not close and reopen).
- COMMENT: observations only; does not block merge.

---

## Step 5 — Merge to Integration Branch
Merge strategy: SQUASH AND MERGE (keeps history clean; one commit per feature).
Developer or Engineering Lead triggers via merge_pull_request MCP tool.

After merge:
- Delete the feature branch.
- Jira ticket auto-transitions to Done (if Smart Commit #done was used, or
  trigger manually via Jira MCP).

---

## Step 6 — Sprint Completion PR to Main
When a full sprint is complete:
1. All work packages are merged to `FE-Branch` or `BE-Branch`.
2. All code review, QA testing, and security audit are completed and verified.
3. Engineering Lead raises a PR from `FE-Branch` or `BE-Branch` to `main`.
4. **This PR requires explicit user (Product Owner) approval before merging.**
5. User reviews and approves; no direct merges to `main` without approval.

---

## Context cost caution
The GitHub MCP server loads ~20k tokens per agent session when enabled. Keep
`"enabled": false` in opencode.json at all times except the active dev phase.
Enable only for the agents that need it (backend-dev, frontend-dev,
code-reviewer); avoid leaving it on project-wide throughout the whole sprint.

---

## Don'ts
- Never push directly to `main`, `FE-Branch`, or `BE-Branch`.
- Never raise a PR that bundles multiple WBS items (except sprint completion PRs).
- Never fabricate test evidence in the PR body — paste the real output.
- Never merge your own PR without a reviewer approval.
- Never merge to `main` without explicit user approval.
- Never invent a Jira key or GitHub tool name. If a tool call fails, report
  the error — do not retry silently or invent a success.
