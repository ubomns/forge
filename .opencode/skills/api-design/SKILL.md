---
name: api-design
description: REST/HTTP API design conventions — resource naming, status codes, validation, error shape, and idempotency. Use before implementing endpoints.
---

## Conventions
- Resource-oriented, plural nouns: /users, /users/{id}/orders.
- Methods: GET (safe), POST (create), PUT/PATCH (update), DELETE.
- Status codes: 200/201/204; 400 validation, 401 auth, 403 forbidden,
  404 not found, 409 conflict, 422 unprocessable, 429 rate limit, 5xx server.
- Validate ALL inputs at the boundary; never trust client data.
- Consistent error shape: { error: { code, message, details? } }.
- Idempotency keys for create/payment operations where applicable.
- Pagination, filtering, sorting via query params; document defaults.
- Version via path or header; never break a published contract silently.

## Don'ts
- Don't leak internal errors or stack traces to clients.
- Don't invent framework APIs — confirm the installed version's interface.
- Don't put action verbs in paths when an HTTP method fits.
