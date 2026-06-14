---
name: git-workflow
description: Branching, commit, and PR conventions for safe, reviewable changes on this repo's dev→main model. Use when coordinating or committing work. Includes create-the-branch-if-missing logic.
---

## Branch model (this repo)

| Branch | Purpose | Protection |
|--------|---------|------------|
| `main` | Production-ready code. Release target. | **Protected** — PR + explicit user approval to merge. |
| `dev`  | Integration branch. All feature branches merge here. | No direct pushes — merge via PR only. |
| `feature/*`, `fix/*`, `chore/*` | One work package each. Branch from `dev`. | Deleted after merge. |

> This repo uses a **single integration branch (`dev`)**, not separate FE/BE
> branches. Feature branches start from `dev` and PR back to `dev`; releases PR
> `dev` → `main`. If your project adopts a different model, change the branch
> names here and in `github-pr`.

### Rules
- Branch feature work from `dev` — **never from `main`**, never from another
  feature branch (unless explicitly sequenced in the WBS).
- Never push directly to `main` or `dev`. Never force-push shared branches.
- Never commit secrets or `.env`. Keep diffs scoped — no drive-by refactors.
- All merges to `main` require explicit user (Product Owner) approval.

---

## Ensure the integration branch exists (create if missing)

Before branching feature work, make sure `dev` exists locally and on the remote.
These snippets are idempotent — safe to run when `dev` already exists.

**bash / git (cross-platform git commands):**
```bash
git fetch origin --prune

if git ls-remote --exit-code --heads origin dev >/dev/null 2>&1; then
  # dev exists on the remote — track it locally
  git switch dev 2>/dev/null || git switch -c dev --track origin/dev
  git pull --ff-only
else
  # dev does not exist anywhere — create it from main and publish
  git switch main
  git pull --ff-only origin main
  git switch -c dev
  git push -u origin dev
fi
```

**PowerShell (Windows — this repo's shell):**
```powershell
git fetch origin --prune
git ls-remote --exit-code --heads origin dev *> $null
if ($LASTEXITCODE -eq 0) {
  git switch dev; if ($LASTEXITCODE -ne 0) { git switch -c dev --track origin/dev }
  git pull --ff-only
} else {
  git switch main
  git pull --ff-only origin main
  git switch -c dev
  git push -u origin dev
}
```

---

## Create a feature branch (create if missing, from latest dev)

Naming — `<type>/<short-kebab-desc>`, or `<type>/<JIRA-KEY>-<desc>` when Jira is
in use (`feature/` new capability, `fix/` bug, `chore/` infra/tests):

```bash
git fetch origin
git switch dev && git pull --ff-only          # start from latest dev

BR=feature/email-capture                        # or feature/KAN-42-email-capture
git switch -c "$BR" 2>/dev/null || git switch "$BR"   # create, or resume if it exists
```

PowerShell equivalent:
```powershell
git fetch origin; git switch dev; git pull --ff-only
$BR = "feature/email-capture"
git switch -c $BR; if ($LASTEXITCODE -ne 0) { git switch $BR }
```

---

## Commits (Conventional Commits)
- `<type>(scope): summary` — types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.
- Imperative mood; one logical change per commit; explain WHY in the body.
- Append the Jira key when Jira is in use: `feat(api): add email-capture endpoint [KAN-42]`.

```bash
git add -A
git commit -m "feat(api): add email-capture endpoint [KAN-42]"
git push -u origin "$BR"        # publishes the branch on first push
```

---

## Pull requests
- One work package = one branch = one PR (= one Jira ticket, when Jira is on).
- Small and focused; describe what, why, how to test; link the requirement;
  include real test evidence.
- **Work package:** PR `feature/*` → `dev`.
- **Release / sprint completion:** PR `dev` → `main` — requires explicit user approval.
- See the `github-pr` skill for the full branch → commit → PR → review → merge
  mechanics (CLI and GitHub MCP).

---

## Don'ts
- Never push directly to `main` or `dev`.
- Never force-push a shared branch; never commit secrets.
- Never bundle multiple work packages into one branch/PR (except the release PR).
- Never merge to `main` without explicit user approval.
