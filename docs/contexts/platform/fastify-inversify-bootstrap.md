---
status: done
type: feature
priority: high
context: platform
---

# Fastify + Inversify bootstrap

Composable app bootstrap with DI, usable by both `main.ts` and tests.

## Phases

- [x] `container.ts` (Inversify, explicit `@inject`, no metadata reliance)
- [x] `app.ts` `buildApp(container)` — plugins, error handler, health, controllers
- [x] `main.ts` — init DataSource, build app, graceful shutdown, listen
- [x] Controllers bind to `TYPES.Controller`; `buildApp` registers them uniformly

## Acceptance

The same `buildApp` powers production and the integration test harness (`app.inject`).
