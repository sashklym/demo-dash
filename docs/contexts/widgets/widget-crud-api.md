---
status: done
type: feature
priority: high
context: widgets
---

# Widget CRUD API

Dashboard-scoped create/list/update/delete for the three widget types.

## Phases

- [x] `Widget` entity + migration (FK, indexed, seed)
- [x] TypeBox schemas ($id'd → named OpenAPI components)
- [x] Service: list/create/update/delete, all scoped by dashboard
- [x] Controller: routes nested under `/api/dashboards/:key/widgets` with `operationId`
- [x] Cross-dashboard isolation (404) + unit + integration tests

## Acceptance

Widgets are created with correct defaults (chart `text` null, text widget empty string), listed by position, updated, and deleted — never visible across dashboards.
