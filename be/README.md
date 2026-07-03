# Backend

Fastify + Inversify + TypeORM + SQLite. Owns the OpenAPI contract the frontend client is generated from.

## Run

```bash
cp .env.sample .env
npm install
npm run dev          # migrates, then starts on :3000 — Swagger UI at /docs
```

## Scripts

| Script | Does |
|---|---|
| `dev` | run migrations, then start with watch |
| `build` / `start` | compile to `dist/` / run `dist/main.js` |
| `test:unit` / `test:integration` | Vitest (mocked repos / in-memory SQLite via `app.inject`) |
| `lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `openapi:export` | write `openapi.json` (+ `../fe/src/lib/api/`) |
| `migration:run` / `:generate` / `:show` | migrations (their own process) |

## API

`POST /api/dashboards`, `GET /api/dashboards/:key`, and widgets nested under `/api/dashboards/:key/widgets` (list, create, update, delete, reorder, `:id/data`, `:id/regenerate`). Full contract at `/docs`.

See [`CLAUDE.md`](CLAUDE.md) for coding rules.
