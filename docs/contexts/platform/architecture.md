# Platform Architecture

> Scope: cross-cutting infrastructure across `be/`, `fe/`, `e2e/`, and CI.

## Backend bootstrap

`main.ts` initializes the TypeORM DataSource, builds the Inversify container, assembles the Fastify app (`app.ts`), installs graceful shutdown, and listens. DI uses explicit `@inject(TYPES.x)` so no `emitDecoratorMetadata` is required (esbuild/tsx/vitest all work without swc).

## The OpenAPI contract pipeline

TypeBox route schemas → `@fastify/swagger` (OpenAPI 3.1). `scripts/export-openapi.ts` writes `openapi.json` to `be/` and `fe/src/lib/api/`. **orval** generates the frontend client + React Query hooks. Both artifacts are committed; CI fails on drift.

## Observability & lifecycle

- **Logging** — pino via Fastify (silent in tests, pretty in dev, JSON in prod; credentials redacted).
- **Errors** — one `setErrorHandler`: AJV → 400, `AppError` subclasses → their status, else → 500 (logged). Consistent `{ statusCode, error, message }` body.
- **Graceful shutdown** — `close-with-grace` drains in-flight requests and closes the DB on SIGINT/SIGTERM and on uncaught exception / unhandled rejection.
- **Migrations** — run as their own process (`src/migrate.ts`), never on app boot.

## Persistence

SQLite via better-sqlite3. Dev/prod use migrations; integration tests use an in-memory DB with `synchronize`.

## Tests & CI

Vitest (BE unit + integration, FE unit), Playwright (whole-service e2e). GitHub Actions runs backend, frontend, and e2e jobs with contract-drift gates, then deploys to Coolify on green `main`. See [`ops/testing.md`](../../ops/testing.md) and [`ops/deployment.md`](../../ops/deployment.md).
