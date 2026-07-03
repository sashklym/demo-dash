# Backend — AI Coding Rules

Fastify + Inversify + TypeORM + SQLite. Full conventions in [`.claude/skills/fastify-backend`](../.claude/skills/fastify-backend/SKILL.md).

## Structure

```
src/
├── main.ts            bootstrap (initialize DataSource, build app, graceful shutdown, listen)
├── migrate.ts         standalone migration runner (own process)
├── app.ts             buildApp(container) — plugins, error handler, health, controllers
├── container.ts       Inversify bindings
├── config/            env parsing
├── core/              logger, errors, error-handler, random (key + PRNG), http types, shutdown
├── db/                data-source, migrations/
├── plugins/           swagger, cors
└── modules/<name>/    entity, schemas (TypeBox), service, controller, *.spec.ts
```

## Forbidden

- `console.*` → use the pino `logger`.
- `any` → concrete types, `unknown`, or generics.
- Swallowed errors / empty catch blocks.
- Unscoped queries → every widget query resolves `:key` → dashboard, then filters `dashboard_id`.
- Running migrations inside app boot → they run via `src/migrate.ts` (own process).
- DTO fields without TypeBox validation; routes without `operationId` + `response` schemas.

## Required per endpoint

TypeBox `schema` with `operationId`, `tags`, `summary`, typed `params`/`body`/`querystring`, and `response` (success + `Type.Ref(ErrorSchema)` for errors). Reusable schemas get `$id` + `app.addSchema` + `Type.Ref`.

## Verification gate (before commit)

```bash
npm run lint && npm run typecheck && npm run test:unit \
  && npm run test:integration && npm run build && npm run openapi:export
```

If any controller/DTO changed, also regenerate the frontend client (`cd ../fe && npm run api:generate`) and commit both.

## Migrations

```bash
npm run migration:generate -- src/db/migrations/<Name>   # from entity diff
npm run migration:run                                    # apply (own process)
npm run migration:show                                   # status
```
