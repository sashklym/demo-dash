---
status: done
type: feature
priority: high
context: dashboard-ui
---

# Routing & persistent key bar

Bootstrap/restore routing and the always-present key bar.

## Phases

- [x] Router: `/` (bootstrap) + `/d/:key`
- [x] `BootstrapRoute` creates/restores via `mutateAsync` (StrictMode-safe)
- [x] `DashboardPage` loading / not-found / ready states
- [x] `DashboardHeader`: key chip, copy key/link, open key, new dashboard
- [x] RTL tests

## Acceptance

First visit creates a dashboard and redirects; the key bar copies the key/link, opens another key, and creates a new dashboard.
