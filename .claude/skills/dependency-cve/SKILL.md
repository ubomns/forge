---
name: dependency-cve
description: How to check dependencies for known vulnerabilities using audit tooling and authoritative sources, without fabricating CVE data. Use for dependency changes.
---

## Procedure
1. Identify exact package versions from the lockfile, not ranges.
2. Run available audit tooling: npm audit / pnpm audit / yarn audit.
3. For flagged packages, confirm against an authoritative source (advisory
   database or vendor) BEFORE reporting an identifier.
4. Report: package@version, CVE/advisory id, severity, fixed-in version,
   upgrade path or mitigation.

## Rules
- A CVE id or CVSS score MUST come from real audit output or a fetched
  authoritative source. Never recall or guess one.
- If you cannot confirm, report "potential — unverified" and the step to
  confirm it.
- Prefer the minimal safe upgrade; flag breaking changes.
