---
status: in-progress
type: feature
priority: high
context: platform
---

# CI/CD → Coolify

GitHub Actions gates on tests, then deploys two Coolify apps.

## Phases

- [x] `ci.yml` — backend, frontend, e2e jobs + contract-drift gates
- [x] `be/Dockerfile` (Node, migrate-then-start) + `fe/Dockerfile` (nginx, SPA)
- [x] Deploy job triggers Coolify webhooks on green `main`
- [ ] Create the two Coolify apps (be + fe) and set `COOLIFY_*` secrets
- [ ] DNS: `api.` / `dash.` → Coolify server IP; volume for the SQLite file

## Acceptance

A push to `main` runs the full suite and, when green, deploys both apps. See [`ops/deployment.md`](../../ops/deployment.md).
