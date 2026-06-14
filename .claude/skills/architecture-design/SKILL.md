---
name: architecture-design
description: How to design and document a proportional software architecture using ISO/IEC/IEEE 42010, the 4+1 View Model, Attribute-Driven Design, and ATAM, with Mermaid diagrams and justified tech choices. Use for any architecture work.
---

## Method (in order)
1. **Stakeholders & concerns (ISO/IEC/IEEE 42010).** List who cares and what
   they care about (engineers: modifiability; ops: deployability; security/
   compliance: confidentiality; product: usability). Concerns drive the views.
2. **Quality-attribute scenarios (ADD + ISO/IEC 25010).** Turn concerns into
   measurable scenarios: source -> stimulus -> environment -> response ->
   measure. Categorize by ISO/IEC 25010: functional suitability, performance
   efficiency, compatibility, usability, reliability, security,
   maintainability, portability. These scenarios are what the design must
   satisfy — design to them, not to a diagram you like.
3. **Design across the 4+1 views (Kruchten).** Each view answers a different
   question and gets its own diagram:
   - Logical — components/classes and their responsibilities.
   - Process — runtime, concurrency, request flows.
   - Development — module/package/file organization.
   - Physical/Deployment — execution topology onto nodes/cloud.
   - Scenarios (+1) — the key use cases that tie the four together.
4. **Evaluate (ATAM).** Against each quality scenario, identify:
   sensitivity points (decisions that strongly affect one attribute),
   trade-off points (decisions affecting two attributes in tension),
   risks, and non-risks. Surface these BEFORE code is written.

## Diagram as code (Mermaid)
Render diagrams in fenced ```mermaid blocks so they live in version control,
diff cleanly, and re-render. Example (process view):
    ```mermaid
    flowchart LR
      Browser -->|POST /api/links| API[Express API]
      API --> Repo[(links store)]
      Browser -->|GET /:code| API
      API -->|302 redirect| Browser
    ```

## Tech selection
- Justify each choice against a specific quality scenario or requirement — not
  popularity. Prefer what's already in the project.
- State exact package names; never assert an unverified version or a library
  you have not confirmed exists. Flag any new dependency as "to be added".

## Proportionality (scale the rigor to the system)
- Small app: collapse to a Logical + Deployment view, a short quality-scenario
  list, and a brief trade-off note. Do NOT manufacture microservices, queues,
  or layers a single-feature app doesn't need.
- Substantial/distributed system: apply the full 4+1 + ATAM, and for banking/
  financial-services domains align service boundaries to BIAN service domains
  to avoid bespoke, debt-prone integrations.

## Don'ts
- No premature services, caches, gateways, or abstraction layers.
- No invented libraries, versions, or compatibility claims.
- No decision without a requirement behind it.
