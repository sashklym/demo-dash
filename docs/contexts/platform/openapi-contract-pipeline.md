---
status: done
type: feature
priority: high
context: platform
---

# OpenAPI contract pipeline

Single source of truth: backend schemas → OpenAPI → generated frontend client.

## Phases

- [x] TypeBox route schemas → `@fastify/swagger` (OpenAPI 3.1)
- [x] `$id` components named cleanly (refResolver) + `operationId`s
- [x] `openapi:export` writes to `be/` + `fe/src/lib/api/`
- [x] orval generates typed client + React Query hooks
- [x] CI drift checks on both artifacts

## Acceptance

Changing a DTO and regenerating updates the committed spec + client; CI fails if either is stale.
