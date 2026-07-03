# Docs

Documentation organized by **bounded context**. Each context owns an `architecture.md` (hand-curated), short dev-plan files (YAML frontmatter), and an auto-generated `README.md` index.

## Start here

- **[ROADMAP.md](ROADMAP.md)** — active plans across all contexts, by priority.
- **[contexts/](contexts/)** — per-context architecture + plans + index.

## Contexts

| Context | Scope |
|---|---|
| [dashboards](contexts/dashboards/) | anonymous dashboard session — key generation, capability-URL access, tenant scoping, restore-by-key |
| [widgets](contexts/widgets/) | the Widget resource — CRUD, positioning, seed-based deterministic chart data |
| [dashboard-ui](contexts/dashboard-ui/) | the React dashboard — routing, key bar, grid, the three widget types |
| [platform](contexts/platform/) | cross-cutting infra — bootstrap, contract pipeline, observability, tests, CI/CD |

## Cross-cutting

- **[ops/](ops/)** — [deployment](ops/deployment.md) (Coolify) and [testing](ops/testing.md).

## Plan frontmatter

Every file under `contexts/<ctx>/` except `README.md` and `architecture.md` is a dev plan:

```yaml
---
status: done          # draft | in-progress | done | outdated
type: feature         # feature | enhancement | refactor | test
priority: high        # critical | high | medium | low
context: widgets      # matches the parent folder
---
```

`npm run docs:index` parses the frontmatter (status is auto-detected from checkbox progress when present) and rebuilds each context `README.md` + the global `ROADMAP.md`. Don't edit those by hand.
