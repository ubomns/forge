---
name: feature-dev
description: Guide a feature implementation through a structured seven-phase workflow with deep codebase understanding, clarifying questions, parallel architecture design, and quality review. Use this skill when the user asks to build a new feature, add functionality, or wants a methodical approach to implementation rather than diving straight to code.
---

## Feature Development Workflow

This skill guides developers through the complete lifecycle of a feature or sprint work package — from implementation to verified delivery via Pull Request.

### Phase 1 — Understand (READ FIRST)
Before writing any code:
1. Read docs/WBS.md to confirm your assigned work packages, dependencies, and Definition of Done.
2. Read docs/ARCHITECTURE.md (backend-dev) or docs/DESIGN_SPEC.md (frontend-dev) for boundaries and contracts.
3. Read docs/BRD.md for acceptance criteria.
4. Confirm the ACTUAL schema, interfaces, and existing patterns — never assume.

### Phase 2 — Implement
1. Create a feature branch from the appropriate integration branch:
   - Backend work: branch from `BE-Branch`
   - Frontend work: branch from `FE-Branch`
2. Branch naming: `feature/<JIRA-KEY>-<short-kebab-desc>`
3. Implement with explicit input validation and error handling.
4. Follow existing patterns; do not reinvent conventions.
5. Commit using Conventional Commits: `<type>(<scope>): <description> [JIRA-KEY]`

### Phase 3 — Test
1. Author tests at the appropriate level (unit/integration/e2e).
2. Run the full test suite; capture real output.
3. Verify against acceptance criteria from docs/BRD.md.
4. Document any untested areas or known limitations.

### Phase 4 — Self-Review
1. Run `git diff` against the integration branch and review your own changes.
2. Check for: correctness, readability, error handling, test coverage, conventions.
3. Fix issues before requesting external review.

### Phase 5 — Code Review (code-reviewer agent)
1. Push your branch to the remote repository.
2. The Engineering Lead will delegate to `code-reviewer` for quality review.
3. Address all feedback: fix blockers and majors, respond to minors/nits.
4. Re-push fixes to the same branch; do not close and reopen the PR.

### Phase 6 — QA Verification (qa-tester agent)
1. The Engineering Lead will delegate to `qa-tester` to verify against acceptance criteria.
2. QA runs tests and reports pass/fail per criterion with evidence.
3. Fix any failures and re-verify.

### Phase 7 — Security Audit (security-engineer agent)
1. The Engineering Lead will delegate to `security-engineer` for vulnerability audit.
2. Address any High/Critical findings before merge.

### Phase 8 — Raise Pull Request
Once all reviews and tests pass:
1. Ensure your branch is up to date with the integration branch (`git rebase` or `git merge`).
2. Create a Pull Request targeting the integration branch (`FE-Branch` or `BE-Branch`).
   - **Note:** PRs to `main` are reserved for sprint-level integration and require explicit user approval.
3. PR title: `[JIRA-KEY] Brief description matching the WBS work package`
4. PR body must include:
   - Summary of what the PR delivers
   - Jira ticket reference
   - Architecture/design reference
   - List of changes
   - **Test evidence** (paste real command output)
   - Definition of Done checklist

### Phase 9 — Merge to Integration Branch
After PR approval:
1. Merge using SQUASH AND MERGE strategy.
2. Delete the feature branch.
3. Update Jira ticket status.

### Phase 10 — Sprint Completion & PR to Main
When a full sprint is complete and all work packages are merged to the integration branch:
1. The Engineering Lead coordinates final verification.
2. All code review, QA testing, and security audit must be completed and verified.
3. The Engineering Lead (or delegated dev) raises a PR from `FE-Branch` or `BE-Branch` to `main`.
4. **This PR requires explicit user (Product Owner) approval before merging.**
5. The user reviews and approves; no direct merges to `main` without approval.

## Rules
- One work package = one Jira ticket = one branch = one PR to integration branch.
- Never bundle multiple WBS items into a single branch or PR.
- Never push directly to `main`, `FE-Branch`, or `BE-Branch`. Always use feature branches.
- Never fabricate test evidence — paste real command output.
- Never merge your own PR without reviewer approval.
- All merges to `main` require explicit user approval.

## Skills to Load
- `git-workflow` — for branch and commit conventions
- `github-pr` — for PR creation and review mechanics
- `codebase-conventions` — for project-specific patterns
- Backend: `api-design`, `data-modeling`
- Frontend: `design-system`, `component-patterns`
