---
name: git-workflow
description: Branching, commit, and PR conventions for safe, reviewable changes. Use when coordinating or committing work.
---

## Branch Strategy

| Branch | Purpose | Owner |
|--------|---------|-------|
| `main` | Production-ready code. **Protected** — requires user PR approval. | Product Owner |
| `FE-Branch` | Frontend integration. All frontend feature branches merge here. | frontend-dev |
| `BE-Branch` | Backend integration. All backend feature branches merge here. | backend-dev |

### Feature Branches
- Backend work: branch from `BE-Branch` as `feature/<short-desc>`
- Frontend work: branch from `FE-Branch` as `feature/<short-desc>`
- **Never branch from `main` for feature work.**
- **Never branch from another feature branch** unless explicitly sequenced in WBS.

### Integration Branches
- `FE-Branch` and `BE-Branch` collect completed, reviewed work packages.
- Direct pushes to integration branches are **not allowed** — only via PR merge.

---

## Commits (Conventional Commits)
- <type>(scope): summary — types: feat, fix, refactor, test, docs, chore.
- Imperative mood; one logical change per commit; explain WHY in the body.
- Include Jira key: `feat(api): add user endpoint [KAN-42]`

---

## Pull requests
- Small and focused; describe what, why, and how to test.
- Link the requirement; include test evidence.
- Require review and passing checks before merge.
- **Individual work packages:** PR to `FE-Branch` or `BE-Branch`.
- **Sprint completion:** PR from integration branch to `main` — requires explicit user approval.

---

## Rules
- Never force-push shared branches; never commit secrets.
- Keep diffs scoped to the task — no drive-by refactors.
- Never push directly to `main`, `FE-Branch`, or `BE-Branch`.
- All merges to `main` require explicit user (Product Owner) approval.

## Pull Requests (see github-pr skill for full mechanics)
Every WBS work package gets exactly one branch and one PR to the appropriate
integration branch. The PR title must contain the Jira key; the body must
include test evidence and a DOD checklist.

The github-pr skill defines the full branch → commit → PR → review → merge
workflow. Use it in conjunction with these commit conventions.

For sprint completion, the Engineering Lead coordinates a PR from the
integration branch (`FE-Branch` or `BE-Branch`) to `main`, which requires
explicit user approval.
