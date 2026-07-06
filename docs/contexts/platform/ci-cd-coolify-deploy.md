---
status: in-progress
type: feature
priority: high
context: platform
---

# Coolify deploy (local-triggered)

Deploy two Coolify apps built from Dockerfiles. Coolify is on a private network, so deploys are triggered locally (no public CI).

## Phases

- [x] `be/Dockerfile` (Node, migrate-then-start) + `fe/Dockerfile` (nginx, SPA)
- [x] Coolify project `youscan-demo` + `youscan-be` / `youscan-fe` apps (pull public repo)
- [x] `scripts/deploy.sh` (`npm run deploy`) — trigger both deploys over the private network
- [x] DNS: `api.` / `dash.youscan.sashklym.cc` → server IP
- [x] Set `youscan-fe` build arg `VITE_API_BASE_URL` + `youscan-be` `CORS_ORIGIN` (volume: pending, UI)
- [x] First successful deploy — live at dash./api.youscan.sashklym.cc

## Notes

**CI vs. deploy are split.** GitHub Actions (`.github/workflows/ci.yml`) runs the quality gates on every push/PR — three parallel jobs: backend (lint · typecheck · unit + integration), frontend (lint · typecheck · unit · build), and a contract job that regenerates `openapi.json` + the orval client and fails on drift. There is **no deploy step in CI**: Coolify is only reachable on the private network, so public runners can't trigger it. Builds are pulled by Coolify and triggered from a local machine (`npm run deploy`).
