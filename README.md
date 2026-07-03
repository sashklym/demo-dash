# YouScan Widget Dashboard

A small full-stack widget dashboard: add **line-chart**, **bar-chart**, and **text** widgets to a 3-per-row grid.
Positions, text edits, and chart data are all persisted and restored across reloads.

> Full README (architecture, run/test/deploy, contract pipeline) is filled in during the docs phase.
> See [`docs/`](docs/) for the bounded-context documentation and [`docs/ROADMAP.md`](docs/ROADMAP.md) for the build roadmap.

## Layout

| Folder | What |
|--------|------|
| [`be/`](be/) | Fastify + Inversify + TypeORM + SQLite backend (owns the OpenAPI contract) |
| [`fe/`](fe/) | React 18 + Vite + Tailwind + shadcn/ui + Recharts frontend (generated API client) |
| [`e2e/`](e2e/) | Playwright whole-service end-to-end tests |
| [`docs/`](docs/) | Bounded-context documentation + roadmap |
