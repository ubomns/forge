# Claude Code Dev-Team Bundle (Opus 4.6+)

A Claude Code port of the OpenCode dev-team bundle: a top-level **Engineering Lead**
orchestrator plus **12 specialist subagents**, backed by a shared on-demand skills
library. The Engineering Lead delegates all work by default via the **Task tool**;
the human is the only approval gate.

> This was adapted from `.opencode/` to Claude Code conventions. See
> **§ Differences from the OpenCode bundle** for what changed and why.

---

## Layout

```
.claude/
  output-styles/
    engineering-lead.md     ← orchestrator persona (the MAIN session)
  agents/                   ← 12 specialist subagents (Task-tool invoked)
    product-manager.md      business-analyst.md     solution-architect.md
    scrum-master.md         ux-designer.md          frontend-dev.md
    backend-dev.md          devops-engineer.md      qa-tester.md
    code-reviewer.md        security-engineer.md    technical-writer.md
  skills/                   ← 20 on-demand skills (see list below)
  settings.json             ← project permissions + MCP enablement
.mcp.json                   ← github + jira servers (disabled by default)
```

---

## The orchestrator is the main session

Claude Code subagents **cannot spawn their own subagents** and share no memory with
the caller. So the Engineering Lead is not an agent file — it is an **output style**
that reshapes the main session into the orchestrator. The 12 specialists are true
subagents the main session invokes with the Task tool.

**Activate it:**

```
/output-style Engineering Lead
/model claude-opus-4-8
```

(Or set `"outputStyle": "Engineering Lead"` in `.claude/settings.json`.) Run the
main session on **Opus 4.8** for the orchestrator role — that's the model this
persona is tuned for.

---

## Model assignments

| Agent | Model | Rationale |
|---|---|---|
| engineering-lead (output style) | **Opus 4.8** | Decomposition, delegation, gate judgment, integration |
| solution-architect | **Opus 4.8** | Hardest design reasoning, trade-offs, STRIDE |
| code-reviewer | **Opus 4.8** | Catching subtle correctness/logic bugs |
| security-engineer | **Opus 4.8** | High-stakes vulnerability detection |
| backend-dev | **Opus 4.6** | Code quality & structure |
| frontend-dev | **Opus 4.6** | Code quality & structure |
| business-analyst | **Opus 4.6** | Rigorous, precise requirements |
| ux-designer | **Opus 4.6** | Design reasoning & taste |
| devops-engineer | **Opus 4.6** | Pipeline/infra correctness |
| product-manager | **Sonnet 4.6** | Structured framing/writing |
| scrum-master | **Sonnet 4.6** | Mostly mechanical decomposition |
| qa-tester | **Sonnet 4.6** | Test authoring + execution |
| technical-writer | **Sonnet 4.6** | Documentation |

Each subagent pins its model in frontmatter (`model: claude-opus-4-8` /
`claude-opus-4-6` / `claude-sonnet-4-6`). To change one, edit that one line. If a
Claude Code build only accepts aliases, swap to `opus` / `sonnet` (note: the alias
`opus` resolves to the latest Opus, so it cannot express the 4.8-vs-4.6 split).

---

## Pipeline & human approval gates

```
PM/BA (scope + requirements)                                 [Gate G1]
  └─► solution-architect (ARCHITECTURE.md + ADRs + threat model)   [Gate G2]
        └─► scrum-master (WBS.md + Jira tickets)            [Gate G3]
              └─► ux-designer (DESIGN-SPEC.md)              [Gate G4]
                    └─► frontend-dev / backend-dev / devops-engineer (build)
                          └─► qa-tester (tests + regression + coverage)
                                └─► code-reviewer + security-engineer (audit)
                                      └─► technical-writer (docs)
                                            └─► Engineering Lead   [Gate G5]
                                                  └─► YOU (approve merge)
```

| Gate | After | You approve |
|---|---|---|
| G1 | PM/BA output | Scope and requirements |
| G2 | Solution Architect | Architecture and ADRs |
| G3 | Scrum Master | WBS and sprint plan |
| G4 | UX Designer | Design spec |
| G5 | QA + Code Review + Security | Merge |

No phase advances without your explicit sign-off.

---

## Skills (20)

`prd-template` · `brd-template` · `acceptance-criteria` · `architecture-design` ·
`wbs-scrum` · `api-design` · `data-modeling` · `component-patterns` ·
`design-system` · `accessibility-audit` · `test-authoring` · `review-checklist` ·
`security-audit` · `dependency-cve` · `deployment-workflow` (new) ·
`codebase-conventions` (anti-hallucination charter) · `delegation-playbook` ·
`feature-dev` · `git-workflow` · `github-pr`.

Skills are invoked via the **Skill tool**. Unlike OpenCode (which hard-gated skills
per agent), Claude Code makes skills globally available; each agent's prompt names
the skills it should load. The frontend-dev and ux-designer agents also reference
your installed design plugins (`impeccable`, `ui-ux-pro-max`, `frontend-design`,
`design-taste-frontend`, etc.) — load one primary aesthetic per project rather than
all at once.

---

## MCP servers (disabled by default)

`.mcp.json` defines **github** and **jira**, both listed in
`disabledMcpjsonServers` in `settings.json` so they stay off until the dev phase.

**Enable for the dev phase:**
1. GitHub: create a PAT (`repo` + `pull_request` + `read:org`) and export it:
   `setx GITHUB_PERSONAL_ACCESS_TOKEN ghp_…` (the `.mcp.json` reads
   `${GITHUB_PERSONAL_ACCESS_TOKEN}`).
2. Remove `"github"` (and/or `"jira"`) from `disabledMcpjsonServers` in
   `.claude/settings.json`.
3. Restart Claude Code; approve the project MCP server when prompted.
4. Authenticate Jira via its OAuth flow on first use.

The GitHub MCP adds significant context per session — keep it off except when the
dev/PR phase actually needs it.

---

## Permissions

`settings.json` allowlists the common dev commands (npm/pnpm/yarn, tsc, eslint,
vitest/jest/playwright/cypress, pytest, read-only git, audit) and asks before
`git push`.

**Important difference from OpenCode:** OpenCode scoped Bash *commands* per agent
(e.g. the architect could only `cat`/`ls`). In Claude Code, command-level
permissions are **project-global** (`settings.json`), not per-agent. Per-agent
capability is instead enforced by each agent's **`tools:` allowlist** — e.g.
`code-reviewer` and `security-engineer` have **no `Edit`/`Write` tools at all**, so
read-only is guaranteed by construction, not by prose.

---

## Continuous integration

`.github/workflows/ci.yml` (owned by `devops-engineer`, implementing the
`deployment-workflow` stage order) runs on PRs to **`dev`** and **`main`** and on
pushes to them, so both the `feature/* → dev` and the `dev → main` release PR hit
the same gate. Jobs:

| Job | Steps | Blocking |
|---|---|---|
| **frontend** | `npm ci` → `npm run lint` → `tsc --noEmit` → `npm run build` | yes |
| **backend** | `pip install -r requirements.txt` → `compileall api` → import smoke | yes |
| **security** | `npm audit --audit-level=high` + `pip-audit` | informational (security-engineer is the enforcing gate) |
| **e2e** | Playwright (chromium); FastAPI started in the background; the OpenAI full-flow test stays gated behind `RUN_FULL_FLOW`, so **no `OPENAI_API_KEY` secret is needed** | yes |

The human **G5** approval for `dev → main` is enforced by **branch protection**
(required reviewers on `main`), not by CI. First-run note: if the e2e suite needs
no FastAPI proxy, the background-server step is harmless; tune Node/Python versions
(`env:` at the top) to match production if they drift.

## Differences from the OpenCode bundle

| OpenCode | This bundle | Why |
|---|---|---|
| `engineering-lead` as `mode: primary` agent | **Output style** on the main session | Subagents can't spawn subagents in Claude Code |
| Per-agent `permission.bash` globs | Global `settings.json` + per-agent `tools:` | Claude Code permission model |
| `permission.edit: deny` (prose) | Read-only agents omit `Edit`/`Write` tools | Hard-enforced, not convention |
| `temperature` per agent | (dropped — unsupported) | Compensated via model choice + instructions |
| `skill: {deny/allow}` per agent | Skills global; named in each prompt | Claude Code skill model |
| `model: opencode-go/kimi-*` | `claude-opus-4-8/4-6`, `claude-sonnet-4-6` | Claude models, tiered by role |
| `opencode.json` mcp block | `.mcp.json` + `disabledMcpjsonServers` | Claude Code MCP config |
| 11 agents | 13 roles (added **devops-engineer**, **technical-writer**) | Filled the CI/CD + docs gaps |
| Returns implicit | Each agent emits a **return envelope** | Subagents return only a final message — standardised for the orchestrator |

### Branch model
`git-workflow` / `github-pr` are tuned to this repo's model: a single integration
branch **`dev`** (feature branches start from it and PR back to it) and **`main`**
as the protected release target (`dev` → `main` PRs need user approval). Both
skills include **create-if-missing** logic — they create `dev` from `main` (and the
feature branch from `dev`) if it doesn't exist yet, via GitHub MCP, `gh`, or plain
git (bash + PowerShell snippets). To adopt a different model, edit the branch names
in those two skills.

---

## Quick start
1. `/output-style Engineering Lead` and `/model claude-opus-4-8`.
2. Give the Lead a goal. It delegates to `product-manager` / `business-analyst`
   and stops at **Gate G1** for your approval.
3. Approve each gate as the work progresses. The Lead reports status grounded only
   in evidence specialists actually returned.
