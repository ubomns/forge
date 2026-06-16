---
name: deployment-workflow
description: CI/CD and release checklist — pipeline stages, reproducible builds, environment/secrets wiring, safe deploy with rollback, and post-deploy verification. Use for any build, pipeline, infrastructure, or release work.
---

## Pipeline stages (fail fast, in order)
1. Install (cached, locked dependencies)
2. Build
3. Type-check
4. Lint / format check
5. Test (unit → integration → e2e as configured)
6. Security & dependency scan (`npm/pnpm/yarn audit` or equivalent)
7. Package / artifact
8. Deploy (gated; environment-specific)

Pin tool and action versions. Keep secrets out of logs. Pipelines must be
idempotent and re-runnable — no flaky `sleep`-based waits.

## Build & packaging
- Reproducible builds from a clean checkout. No reliance on machine-local state.
- Containers (where used): minimal base image, non-root user, least-privilege
  runtime, no secrets baked into layers.

## Environments & secrets
- Maintain environment parity (dev/preview/prod differ only in config, not code).
- Secrets come from the platform's secret store or env — never committed.
- Keep `.env.example` current with every required variable (placeholders only).
- Document, per environment, exactly which variables a deploy needs.

## Deploy & rollback
- Prefer the platform's native path (preview → production promotion; rolling or
  canary where supported).
- **Every deploy has a documented, tested rollback.** No deploy without one.
- Production deploys, DNS changes, secret rotation, and teardown are
  outward-facing and hard to reverse — confirm with the user before executing
  unless pre-authorised for the run.

## Observability
- Health check endpoint or equivalent liveness/readiness signal.
- Logs aggregated; the minimum metrics/alerts to know a release is healthy.
- State explicitly what is monitored and what is not.

## Post-deploy verification
- Run a smoke check against the deployed target; capture the real result.
- Never report a deploy as successful without evidence (status, health check,
  smoke test output).

## Supply chain
- Pin dependency and action versions; verify sources; review lockfile changes.
- Scope tokens, roles, and network egress to least privilege.

## Don'ts
- Don't weaken or skip CI test/security gates to make a pipeline green.
- Don't make manual console changes that drift from IaC — if unavoidable, document.
- Don't commit secrets, tokens, or credentials, or print them to logs.
- Don't replace the project's platform/pipeline without flagging it with justification.
