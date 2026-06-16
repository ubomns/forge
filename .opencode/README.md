# OpenCode Dev Team Bundle (v5 — 11 agents)

A primary orchestrator (Engineering Lead) plus ten specialist subagents,
backed by a shared on-demand skills library. The Engineering Lead delegates
all work by default — the human (you) is the only approval gate.

---

## What's new in v5

- **Human approval gates** formalised in the Engineering Lead (G1–G5). No
  phase advances without your explicit sign-off.
- **Engineering Lead** can now act directly when you instruct it to
  (`edit: allow`, `bash: allow`). Defaults to delegation.
- **Frontend Dev** now loads your design skills (`frontend-design`,
  `impeccable`, `ui-ux-pro-max`, `design-taste`) and defaults to
  Tailwind + shadcn. Full code structure standards added.
- **Backend Dev** upgraded with: module/service/repository structure
  standards, API design standards (consistent error shapes, status codes,
  pagination), secrets and environment rules, structured logging standards,
  and performance/data access discipline.
- **Security Engineer** upgraded with: secrets scanning on every audit,
  SAST-style pattern detection (injection, XSS, command injection, path
  traversal, SSRF, etc.), expanded bash permissions for grep/cat/find, auth
  and session deep-check, security headers review, supply chain checks, and
  a clear merge verdict (CLEAR / BLOCK / CONDITIONAL) on every report.
- **Code Reviewer** now has a full explicit checklist: correctness, structure
  and reusability, readability, error handling, test quality, security smells,
  documentation, and PR hygiene. Duplicate code detection added.
  `webfetch: ask` enabled.
- **QA Tester** upgraded with: regression testing scope, test organisation
  standards (file location, naming, fixtures, isolation), coverage reporting
  with thresholds, structured defect reporting format, and `vitest`/`jest`/
  `cypress` added to bash permissions.
- **Solution Architect** upgraded with: Architecture Decision Records (ADRs)
  in `docs/adr/`, STRIDE threat modelling per trust boundary, data
  architecture (PII classification, residency, retention), and `webfetch: ask`
  for library/service verification.
- **UX Designer** upgraded with: design skills loaded (`frontend-design`,
  `impeccable`, `ui-ux-pro-max`, `design-taste`), motion and animation spec,
  dark mode / theming considerations, and a structured handoff format for
  `docs/DESIGN-SPEC.md`. `webfetch: ask` enabled.
- **Scrum Master** upgraded with: Jira ticket creation instructions and format,
  sprint capacity guidance (T-shirt sizing mapped to days), XL item flagging,
  blocker escalation procedure, and capacity risk flags on overloaded sprints.
- **Product Manager** upgraded with: read-existing-features-first step to
  prevent duplicate definitions, stricter scope-addition rules, and
  `webfetch: ask` enabled.
- **Business Analyst** upgraded with: regulatory and compliance constraint
  checking via `webfetch`, data validation rule format (table per entity),
  requirement quality checklist (testable, unambiguous, atomic, traceable,
  feasible), stricter no-vague-language constraint.
- **Provider comment** added at the top of every agent file for fast model
  updates when switching providers.

---

## Model assignments
> ⚙️ Update the `model:` field at the top of each agent file when switching
> providers. All agents use whichever provider is currently connected —
> mixing providers in one session will cause failures.

| Model | Agents |
|---|---|
| `opencode-go/kimi-k2.6` | engineering-lead, solution-architect, scrum-master, backend-dev, security-engineer |
| `opencode-go/kimi-k2.5` | product-manager, business-analyst, ux-designer, frontend-dev, qa-tester, code-reviewer |

---

## MCP servers (both disabled until needed)

| Server | Purpose | Auth |
|---|---|---|
| `github` | Branch, PR, review via GitHub MCP | PAT via `GITHUB_PERSONAL_ACCESS_TOKEN` env var |
| `jira` | Ticket create / update / transition | OAuth — run `opencode mcp auth jira` |

### Activating GitHub MCP (dev phase only)
1. Create a GitHub PAT with `repo` + `pull_request` + `read:org` scopes.
2. Export: `export GITHUB_PERSONAL_ACCESS_TOKEN=ghp_yourtoken`
3. In `opencode.json` set `mcp.github.enabled` to `true`.
4. Restart OpenCode. Confirm: `opencode mcp list`.
5. Note: the GitHub MCP server adds ~20k tokens per session — enable for dev
   agents only where possible.

### Activating Jira MCP (dev phase only)
1. Set `mcp.jira.enabled` to `true`.
2. Run: `opencode mcp auth jira` (browser OAuth flow).
3. Enable alongside GitHub at the start of the dev phase, not before.

---

## The Jira ↔ GitHub pattern
One WBS work package → one Jira ticket → one branch → one PR → one merge.
Jira auto-links via the ticket key in branch name + commit message.
A PR is required before any work package is marked done.
The Engineering Lead's Gate G5 (pre-merge) is the human approval checkpoint.

---

## Full pipeline (v5)

```
PM/BA (scope + requirements)
  └─► solution-architect (ARCHITECTURE.md + ADRs + threat model)   [Gate G2]
        └─► scrum-master (WBS.md + Jira tickets)                   [Gate G3]
              └─► ux-designer (DESIGN-SPEC.md)                     [Gate G4]
                    └─► frontend-dev / backend-dev (branch + implement + PR)
                          └─► qa-tester (tests + regression + coverage)
                                └─► code-reviewer (PR review)
                                      └─► security-engineer (audit + verdict)
                                            └─► Engineering Lead   [Gate G5]
                                                  └─► YOU (approve merge)
```

---

## Human approval gates

| Gate | Triggered after | You approve |
|---|---|---|
| G1 | PM/BA output | Scope and requirements |
| G2 | Solution Architect output | Architecture and ADRs |
| G3 | Scrum Master output | WBS and sprint plan |
| G4 | UX Designer output | Design spec |
| G5 | QA + Code Review + Security | Merge to main |

No phase advances without your explicit sign-off.

---

## Repository doc structure (produced by agents)

```
docs/
  PRD.md              ← Product Manager
  BRD.md              ← Business Analyst
  ARCHITECTURE.md     ← Solution Architect
  adr/
    ADR-001-*.md      ← Solution Architect (one per decision)
  WBS.md              ← Scrum Master
  DESIGN-SPEC.md      ← UX Designer
  REVIEW.md           ← Code Reviewer (fallback, no GitHub MCP)
CONVENTIONS.md        ← Engineering Lead / Architect sets this up
.env.example          ← Backend Dev (placeholder values only)
```

---

## Agents (11)

| Agent | Role | Key outputs |
|---|---|---|
| `engineering-lead` | Orchestrator + human gate keeper | Delegation, status, G1–G5 gates |
| `product-manager` | Scope and PRD | `docs/PRD.md` |
| `business-analyst` | Requirements and AC | `docs/BRD.md` |
| `solution-architect` | Architecture and decisions | `docs/ARCHITECTURE.md`, `docs/adr/` |
| `scrum-master` | WBS and Jira | `docs/WBS.md`, Jira tickets |
| `ux-designer` | Design spec | `docs/DESIGN-SPEC.md` |
| `frontend-dev` | Client implementation | Source code, PRs |
| `backend-dev` | Server implementation | Source code, PRs, migrations |
| `qa-tester` | Test authoring and execution | Test files, coverage report, defect log |
| `code-reviewer` | PR review | Review verdict (APPROVE / REQUEST_CHANGES) |
| `security-engineer` | Security audit | Audit report, merge verdict |

---

## Install
1. Copy `.opencode/` into your project root.
2. Set `GITHUB_PERSONAL_ACCESS_TOKEN` before enabling GitHub MCP.
3. Run `opencode mcp auth jira` before enabling Jira MCP.
4. Update the `model:` field at the top of each agent file to match your
   connected provider before starting a session.
