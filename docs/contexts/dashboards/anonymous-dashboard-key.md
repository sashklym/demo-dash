---
status: done
type: feature
priority: high
context: dashboards
---

# Anonymous dashboard key

Identify each dashboard by an unguessable capability key instead of a user account.

## Phases

- [x] `Dashboard` entity + migration (unique indexed `key`)
- [x] `generateKey()` — URL-safe `crypto.randomBytes(16).base64url`
- [x] `DashboardService.create` / `findByKey` / `requireByKey`
- [x] `POST /api/dashboards`, `GET /api/dashboards/:key`
- [x] Unit + integration tests

## Acceptance

Creating a dashboard returns a key; fetching a valid key returns it; an unknown key 404s. `requireByKey` is the scoping gate reused by widgets.
