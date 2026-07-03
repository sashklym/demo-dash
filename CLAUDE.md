# YouScan Dashboard — AI Agent Guide

Entry point for AI agents. Read this first, then the sub-project guide for the area you're touching.

## Routing

| Working in… | Read | Skill |
|---|---|---|
| `be/` — Fastify backend | [`be/CLAUDE.md`](be/CLAUDE.md) | [`.claude/skills/fastify-backend`](.claude/skills/fastify-backend/SKILL.md) |
| `fe/` — React frontend | [`fe/CLAUDE.md`](fe/CLAUDE.md) | [`.claude/skills/react-frontend`](.claude/skills/react-frontend/SKILL.md) |
| `e2e/` — Playwright | [`docs/ops/testing.md`](docs/ops/testing.md) | — |

## Docs routing

Documentation is organized by **bounded context** under [`docs/contexts/`](docs/contexts/):

| Context | Scope |
|---|---|
| [`dashboards`](docs/contexts/dashboards/) | anonymous dashboard session — key generation, capability-URL access, tenant scoping, restore-by-key |
| [`widgets`](docs/contexts/widgets/) | the Widget resource — CRUD, positioning, seed-based deterministic chart data |
| [`dashboard-ui`](docs/contexts/dashboard-ui/) | the React dashboard — routing, key bar, grid, the three widget types |
| [`platform`](docs/contexts/platform/) | cross-cutting infra — bootstrap, contract pipeline, logging/shutdown, tests, CI/CD |

Each context has a hand-curated `architecture.md`, short dev-plan files (YAML frontmatter), and an auto-generated `README.md`. [`docs/ROADMAP.md`](docs/ROADMAP.md) and the per-context indexes are rebuilt by `npm run docs:index` from plan frontmatter — never hand-edit them.

## The core concept — a single API contract

```
be/ (TypeBox route schemas) → openapi.json → fe/ (orval-generated client)
```

The backend is the single source of truth for the API. After any change to a controller, DTO, or response shape:

```bash
cd be && npm run openapi:export      # regenerate openapi.json (be/ + fe/src/lib/api/)
cd ../fe && npm run api:generate     # regenerate the typed client
```

Commit both artifacts. CI fails if either drifts. The frontend never hand-writes HTTP — all calls go through `fe/src/lib/api/generated/`.

## Conventions

- **Backend**: no `console` (use pino), no `any`, every route has a TypeBox schema + `operationId`, every widget query is scoped by dashboard key, migrations run as their own process. See [`be/CLAUDE.md`](be/CLAUDE.md).
- **Frontend**: never edit generated code, use the `use-widgets` wrapper hooks, mount-triggered mutations use `mutateAsync`. See [`fe/CLAUDE.md`](fe/CLAUDE.md).
- Keep comments lean — let the code speak. Commit per logical change with conventional-commit messages; no `Co-Authored-By` trailer.
