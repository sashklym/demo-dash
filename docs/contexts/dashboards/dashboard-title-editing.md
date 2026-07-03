---
status: draft
type: enhancement
priority: low
context: dashboards
---

# Editable dashboard title

Let users rename a dashboard (currently defaults to "My Dashboard"); show it in the header.

## Phases

- [ ] `PATCH /api/dashboards/:key` accepting `{ title }`
- [ ] Regenerate OpenAPI + client
- [ ] Inline-edit the title in `DashboardHeader`
- [ ] Tests

## Acceptance

The title persists and appears in the header; restoring the key shows the chosen title.
