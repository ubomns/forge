---
name: security-audit
description: Application security audit checklist aligned to OWASP Top 10 and ASVS, with severity and CWE mapping. Use for any change touching auth, input, data, or secrets.
---

## OWASP Top 10 focus
- Broken access control: authorization checked server-side on every op.
- Injection: parameterized queries; no string-built SQL/commands; encode output.
- Cryptographic failures: TLS; strong hashing; secrets never in code.
- Insecure design: threat-model the feature's abuse cases.
- Misconfiguration: safe defaults; no debug in prod; least privilege.
- Vulnerable components: see dependency-cve.
- Auth failures: session handling, brute-force protection, secure cookies.
- Integrity / SSRF: validate URLs; verify sources.
- Logging: log security events; never log secrets or PII.

## Input handling
- Validate, sanitize, and encode all untrusted input at the boundary.

## Reporting
- Severity Critical/High/Medium/Low; map to OWASP category and a CWE id.
- Cite file:line or pkg@version. Give remediation, not exploit code.

## Rules
- Never invent a CVE / CVSS / CWE. Unverified -> "potential — unverified".
- Never declare code "secure" — report scope and residual unknowns.
