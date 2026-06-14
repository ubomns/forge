---
name: wbs-scrum
description: How to build a PMI-standard WBS and Scrum sprint plan from a PRD, aligned to PMBOK 7 performance domains, the PMI WBS Practice Standard, and Scrum Guide best practices. Use for all project planning and WBS authoring.
---

## Methodology: PMBOK 7 Hybrid Approach
This skill applies a tailored hybrid model per PMBOK 7's performance domain
**Development Approach and Life Cycle**: predictive for scope baseline (WBS),
adaptive for execution (Scrum). Tailor to project size and complexity.

### Relevant PMBOK 7 performance domains (apply proportionally)
- **Planning**: scope baseline (WBS), schedule, effort sizing. Enough planning
  to be useful; not so much that it becomes waste.
- **Delivery**: increment-based value delivery; sprint goals that ship working
  software; Definition of Done as the quality gate.
- **Measurement**: progress against WBS; sprint velocity; DOD pass rate.
- **Uncertainty**: top risks captured with owner + mitigation before sprints start.
- **Team**: one assignee per work package; clear accountabilities.
- **Development Approach**: the WBS anchors scope (predictive baseline); the
  sprint backlog allows re-prioritisation sprint-to-sprint (adaptive execution).

### PMBOK 7 guiding principles (honour these in every plan)
- Tailor the methodology to the project's size and context.
- Focus on value delivery, not compliance.
- Build in quality — DOD enforced, not assumed.
- Embrace adaptability — the WBS is a baseline, not a cage.

---

## WBS Construction (PMI WBS Practice Standard)

### Rules
- **Deliverable-oriented**: WBS elements are THINGS PRODUCED, not activities.
  "Link Creation Endpoint" not "Write the link creation function".
- **100% Rule**: the WBS must include 100% of project scope — nothing added,
  nothing omitted. Every scope item in the PRD has a WBS element.
- **Unique IDs**: every element has a unique hierarchical ID (1.0, 1.1, 1.1.1).
- **Work package**: the lowest level element — assignable to one role, estimable,
  independently verifiable against a DOD, and traceable to a requirement.
- **Mutual exclusion**: no work package duplicates another.
- **8–80 rule**: a work package should represent 8–80 hours of effort. For a
  small project, scale down proportionally (S/M/L T-shirts).

### WBS levels
- Level 1 — Major deliverable areas (e.g. Backend API, Frontend UI, QA Suite).
- Level 2 — Feature / component (e.g. Link Creation, Redirect Engine).
- Level 3 — Work package (assignable task with DOD and requirement trace).

---

## WBS.md Template

```markdown
# WBS: [Project Name]

## Metadata
| Field | Value |
|-------|-------|
| Project | [name] |
| Version | [v1.0] |
| Sources | docs/PRD.md · docs/BRD.md · docs/ARCHITECTURE.md |
| Standard | PMI WBS Practice Standard · PMBOK 7 Hybrid |
| Sprint length | [n days] |
| Team | backend-dev · frontend-dev · qa-tester · ux-designer |
| Created | [date] |

---

## WBS Hierarchy

### 1.0 [Major Deliverable — e.g. Backend API]

#### 1.1 [Feature — e.g. Link Creation Endpoint]

| ID | Work Package | Assignee | Depends On | Size | DOD | Req. Ref |
|----|-------------|----------|------------|------|-----|----------|
| 1.1.1 | [name] | backend-dev | — | S | [verifiable criterion] | FR-1 |
| 1.1.2 | [name] | backend-dev | 1.1.1 | S | [criterion] | FR-1, AC-1.2 |

#### 1.2 [Next feature]
...

### 2.0 [Next deliverable area — e.g. Frontend UI]
...

### 3.0 QA Suite
...

---

## Sprint Plan

### Sprint 0 — Setup & Baseline (pre-sprint)
**Goal:** All gates passed before a line of feature code is written.
| ID | Item | Owner | Status |
|----|------|-------|--------|
| S0.1 | Architecture approved | engineering-lead | gate |
| S0.2 | WBS approved | scrum-master | gate |

### Sprint 1 — [Goal: one sentence of user value]
**Includes WBS IDs:** 1.1.1, 1.1.2, 1.2.1 ...
| ID | Work Package | Assignee |
|----|-------------|----------|
| 1.1.1 | ... | backend-dev |

### Sprint 2 — [Goal]
...

---

## Definition of Done

### Project-level (applies to the final increment)
- [ ] All acceptance criteria in docs/BRD.md pass (qa-tester evidence).
- [ ] All WBS work packages delivered and verified.
- [ ] Code review passed (no open blockers or majors).
- [ ] No unresolved High/Critical security findings.
- [ ] docs/ARCHITECTURE.md reflects what was actually built.

### Sprint-level (applies to each sprint increment)
- [ ] All sprint WBS items completed and independently verified.
- [ ] Tests written and passing for all items in this sprint.
- [ ] No regression in prior sprint items.
- [ ] Sprint review conducted; outcomes documented.

---

## Delivery Risks

| # | Risk | Probability | Impact | Owner | Mitigation |
|---|------|-------------|--------|-------|-----------|
| R1 | [risk] | Low/Med/High | Low/Med/High | [role] | [action] |
| R2 | ... | | | | |
| R3 | ... | | | | |
```

---

## Scrum artifacts in the hybrid model
- **Product Backlog** (from BRD FRs) → the full ordered list; maps to the WBS.
- **Sprint Backlog** (from WBS Sprint N) → the committed items for the sprint.
- **Increment** → the working, DOD-passing output of each sprint.
- **Velocity** (optional) → track T-shirt-size points delivered per sprint to
  calibrate future plans; label as "observed, not committed".

## Anti-patterns to avoid
- Activity-based WBS (verb-noun tasks instead of deliverable-nouns).
- Gold-plating (WBS items without a requirement reference).
- Fabricated estimates stated as facts.
- Assigning tasks to roles not in the team.
- Sprints with no clear goal (just a task list).
