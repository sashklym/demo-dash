---
name: fastify-backend
description: Build and maintain the YouScan dashboard backend — Fastify + Inversify + TypeORM + SQLite in be/. Use for entities, modules, endpoints, TypeBox schemas, migrations, and tests.
---

# Fastify Backend — YouScan Dashboard

The backend owns the API contract. Every endpoint is declared with a TypeBox schema that both validates requests and generates the OpenAPI spec the frontend client is built from.

## Stack

- **Fastify 5** — HTTP framework (pino logging, AJV validation)
- **Inversify 6** — DI; explicit `@inject(TYPES.x)`, no reliance on `emitDecoratorMetadata`
- **TypeORM 0.3 + better-sqlite3** — entities, migrations, repositories
- **TypeBox** — one schema per route → AJV validation + `@fastify/swagger` OpenAPI
- **Vitest** — unit (mocked repos) + integration (`app.inject`, in-memory SQLite)

## Module layout (`src/modules/<name>/`)

```
<name>.entity.ts      TypeORM entity (explicit @Column types)
<name>.schemas.ts     TypeBox schemas ($id'd so they become named OpenAPI components)
<name>.service.ts     @injectable business logic; throws AppError subclasses
<name>.controller.ts  @injectable; register(app) declares routes with schemas + operationId
<name>.service.spec.ts unit test with a mocked repository
```

Wire a new module: register its entity + migration in `src/db/data-source.ts`, bind its service + controller (to `TYPES.Controller`) in `src/container.ts`, add tables to the test reset in `test/integration/helpers/test-app.ts`.

## Rules

1. **Every route has a TypeBox `schema`** with `operationId`, `tags`, `summary`, typed `params`/`body`/`querystring`, and `response` (including error statuses `Type.Ref(ErrorSchema)`). This is what makes the generated client clean and typed.
2. **Reusable schemas get an `$id`** and are `app.addSchema(...)`'d once in the controller, then referenced with `Type.Ref(Schema)` → named components + full type inference.
3. **Scope every query by the dashboard.** Resolve `:key` → `Dashboard` via `DashboardService.requireByKey` (404 if absent), then filter on `dashboard_id`. A widget from another dashboard must be invisible.
4. **No `console`** — use the pino logger. No `any` — concrete types, `unknown`, or generics. Handle/propagate errors; never swallow.
5. **Migrations run as their own process** (`src/migrate.ts`), never on app boot. Hand-write SQL migrations under `src/db/migrations/`.
6. **Services stay thin.** Input shaping (trim, null-handling) belongs on the DTO/schema, not the service.

## Contract pipeline (mandatory after any controller/DTO change)

```bash
cd be && npm run openapi:export        # writes be/openapi.json + ../fe/src/lib/api/openapi.json
cd ../fe && npm run api:generate       # regenerates the typed client
```
Commit both. CI fails on drift.

## Verification gate (before every commit)

```bash
cd be && npm run lint && npm run typecheck && npm run test:unit \
  && npm run test:integration && npm run build && npm run openapi:export
```
