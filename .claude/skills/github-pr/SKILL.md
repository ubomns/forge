---
name: github-pr
description: How to create branches (creating them if missing), commit, raise PRs, and review on GitHub for this repo's dev→main model, via the GitHub MCP server or the gh CLI. Jira linking is optional. Use for every code change in the development phase.
---

## The flow
```
WBS work package  ->  [Jira ticket]  ->  Git branch (from dev)  ->  PR to dev  ->  review  ->  squash-merge
```
One work package = one branch = one PR (= one Jira ticket, when Jira is enabled).
Never bundle multiple WBS items into a single branch or PR.

> **Jira is optional.** This repo has no Jira wired up by default. When the Jira
> MCP is enabled, put the issue key (e.g. `KAN-42`) in the branch name, commit, and
> PR title and Jira auto-links it. When it's off, drop the key — everything else is
> identical.

## Branch model (this repo)
| Branch | Purpose | Base for |
|--------|---------|----------|
| `main` | Production. **Protected** — user approval to merge. | Release PRs only |
| `dev`  | Integration. Feature branches merge here. | All feature branches |

Branch feature work from `dev`, never from `main` or another feature branch.

---

## Step 0 — Ensure `dev` exists (create if missing)

**GitHub MCP** — `create_branch` needs a source branch, so create `dev` from
`main` if it isn't there yet:
```
# Check first:
list_branches(owner, repo)            # is "dev" present?

# If "dev" is absent, create it from the repo's default branch (main):
create_branch(owner, repo, branch="dev", from_branch="main")
```

**gh CLI fallback** (when MCP is off):
```bash
# create dev from main on the remote if it doesn't exist
gh api repos/:owner/:repo/branches/dev >/dev/null 2>&1 \
  || gh api repos/:owner/:repo/git/refs -f ref="refs/heads/dev" \
       -f sha="$(gh api repos/:owner/:repo/git/refs/heads/main --jq .object.sha)"
```

Or with plain git (see the `git-workflow` skill's "Ensure the integration branch
exists" snippet for the full bash/PowerShell guard).

---

## Step 1 — Create the work branch (create if missing)

Naming (add the Jira key only when Jira is on):
```
feature/<short-kebab-desc>   or  feature/<JIRA-KEY>-<short-kebab-desc>
fix/<short-kebab-desc>        chore/<short-kebab-desc>
```

**GitHub MCP** — branch from `dev` (idempotent: if it already exists, the call
errors with "Reference already exists" — switch to it locally instead and continue):
```
create_branch(owner, repo, branch="feature/email-capture", from_branch="dev")
```

**git CLI** (creates, or resumes the branch if it already exists):
```bash
git fetch origin
git switch dev && git pull --ff-only
git switch -c feature/email-capture 2>/dev/null || git switch feature/email-capture
```

---

## Step 2 — Commit (Conventional Commits [+ Jira Smart Commit])
```
<type>(<scope>): <description> [JIRA-KEY]
```
Examples:
```
feat(api): add POST /api/subscribe with email validation [KAN-42]
fix(nav): restrict sticky header to scroll-down only [KAN-51]
test(api): add unit tests for subscribe endpoint [KAN-42]
```
Smart-commit transitions (only when Jira is on): append `#in-progress` /
`#done` after the key (`[KAN-42] #done` — only on the final commit).

```bash
git add -A
git commit -m "feat(api): add subscribe endpoint [KAN-42]"
git push -u origin feature/email-capture
```
Rules: atomic commits; never commit to `main`/`dev` directly; never commit
secrets/credentials/`.env`.

---

## Step 3 — Open the PR (head → base)

**Work package:** base `dev`, head `feature/...`.
**Release / sprint completion:** base `main`, head `dev` — **requires user approval.**

**GitHub MCP:**
```
create_pull_request(
  owner, repo,
  title="[KAN-42] Add email-capture endpoint",   # drop [KAN-42] if Jira off
  head="feature/email-capture",
  base="dev",
  body=<PR body template below>
)
```

**gh CLI fallback:**
```bash
gh pr create --base dev --head feature/email-capture \
  --title "[KAN-42] Add email-capture endpoint" \
  --body-file .github/pr-body.md
```

### PR body template
```
## Summary
[What this PR delivers and why — tie it to the WBS item.]

## Jira ticket        (omit if Jira is off)
[KAN-42] — [ticket title]

## Architecture reference
Implements: [component from docs/ARCHITECTURE.md]

## Changes
- [file/module]: [what changed and why]

## Test evidence
[Paste the REAL test command and output. Do NOT fabricate.]

## Definition of Done checklist
- [ ] WBS DOD met (ref: WBS item ID)
- [ ] All acceptance criteria in docs/BRD.md pass
- [ ] No regressions in prior items
- [ ] Build passes
- [ ] Review requested
- [ ] QA testing completed
- [ ] Security audit passed (no High/Critical findings)
```

---

## Step 4 — Code review (code-reviewer agent)
Use GitHub MCP tools (don't rely on `git diff` alone):
`get_pull_request` → `list_pull_request_files` → `create_pull_request_review`
(APPROVE / REQUEST_CHANGES / COMMENT) → `create_review_comment` for inline
`file:line` notes. Reviewers never merge. On REQUEST_CHANGES, push fixes to the
same branch/PR — do not close and reopen.

gh CLI fallback: `gh pr diff <num>`, `gh pr review <num> --approve|--request-changes|--comment`.

---

## Step 5 — Merge to `dev`
Strategy: **squash and merge** (one clean commit per feature).
```
merge_pull_request(owner, repo, pullNumber, merge_method="squash")
```
gh CLI: `gh pr merge <num> --squash --delete-branch`
After merge: delete the feature branch; Jira auto-transitions to Done if `#done`
was used (else move it manually via the Jira MCP).

---

## Step 6 — Release PR (`dev` → `main`)
When a sprint/release is complete and all of code review + QA + security are
verified, the Engineering Lead opens a PR `dev` → `main`:
```
create_pull_request(owner, repo, title="[Release] <summary>", head="dev", base="main", body=...)
```
**This PR requires explicit user (Product Owner) approval before merging. No direct
merges to `main`.**

---

## Context cost caution
The GitHub MCP server adds significant context per session. Keep it in
`disabledMcpjsonServers` (`.claude/settings.json`) except during the active dev/PR
phase; enable it only for the agents that need it (frontend-dev, backend-dev,
devops-engineer, code-reviewer).

## Don'ts
- Never push directly to `main` or `dev`; never bundle multiple work packages in
  one PR (except the release PR); never fabricate test evidence; never merge your
  own PR without reviewer approval; never merge to `main` without user approval.
- Never invent a Jira key or a GitHub tool/branch name. If a call fails, report the
  error — don't retry silently or claim success.
