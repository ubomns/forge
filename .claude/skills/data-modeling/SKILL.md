---
name: data-modeling
description: Data modeling and safe migration practices — normalization, constraints, indexing, and reversible migrations. Use before any schema or data-access change.
---

## Modeling
- Confirm the EXISTING schema before changing it — never assume columns.
- Normalize to remove duplication; denormalize only with a stated reason.
- Enforce integrity with constraints: NOT NULL, FK, UNIQUE, CHECK.
- Choose types deliberately; store timestamps in UTC.
- Index for actual query patterns; avoid over-indexing writes.

## Migrations (safety)
- Additive first: add columns/tables before switching reads.
- Expand -> migrate -> contract for breaking changes.
- Every migration has a tested rollback.
- Backfills are batched and resumable; avoid long table locks.

## Don'ts
- No destructive op (DROP/RENAME) without flagging data-loss risk + rollback.
- Don't fabricate table/column names — verify against the live schema.
