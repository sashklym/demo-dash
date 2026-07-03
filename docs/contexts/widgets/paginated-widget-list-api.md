---
status: draft
type: feature
priority: high
context: widgets
---

# Paginated widget list + move-to-position API

Let a dashboard hold thousands of widgets without shipping the whole list on every
load. Paginate `GET …/widgets`, and add a single-widget move endpoint so reordering
no longer needs the client to send the full order.

## Why

`GET /api/dashboards/:key/widgets` returns **every** widget, always. At 1k that's a
~150KB payload on open; at 10k, ~1.5MB. The frontend already virtualizes rendering
and chart-data fetches ([windowed-widget-fetching](../dashboard-ui/windowed-widget-fetching.md)),
but it still can't fetch widgets in windows because the endpoint has no paging — and
it can't reorder in windows because [widget-reorder-api](widget-reorder-api.md) takes
the entire `orderedIds`.

## Phases

- [ ] `GET …/widgets?offset&limit` — `offset` (default 0), `limit` (default 50, max 200), still ordered by position
- [ ] Response envelope `WidgetPage { items, total, offset, limit }` (replaces bare `Widget[]`); `total` from a dashboard-scoped count
- [ ] `PUT …/widgets/:id/position` with `{ position }` — clamp to `[0, total-1]`, shift affected rows, keep positions contiguous, in a transaction
- [ ] Service: `list(key, {offset, limit})` → page + total; `moveToPosition(key, id, target)` — both dashboard-scoped
- [ ] TypeBox schemas (`ListWidgetsQuery`, `WidgetPage`, `MoveWidgetBody`) with `$id` + `operationId`
- [ ] Integration tests: slice + total correctness, offset/limit bounds, move shifts + clamps + is key-scoped
- [ ] Regenerate `openapi.json` + fe client; update all consumers

## Design decisions

- **Envelope over `X-Total-Count` header.** A typed `{ items, total, … }` shape survives orval generation cleanly; the frontend needs `total` to size the virtual scrollbar. This is a **breaking contract change** — every consumer of the list response updates in the same PR.
- **Keep `PUT …/reorder` (full `orderedIds`)** for the draggable small-board grid, which still loads the whole list. The new `…/:id/position` endpoint serves the virtualized grid's move actions (start / up / down / end), which only know a single widget + a target index.
- **Offset paging + edits shift positions.** Deleting or moving a widget renumbers everything after it, so trailing pages go stale — the frontend plan handles this by invalidating the affected page range. A position-cursor scheme could avoid it later; not worth the complexity now.

## Acceptance

`GET …/widgets?offset=0&limit=50` returns the first 50 widgets plus an accurate
`total`; out-of-range `offset`/`limit` are clamped, not errors. `PUT …/widgets/:id/position`
moves one widget to a target index, keeps positions contiguous, and is rejected for a
key that doesn't own the widget. `openapi.json` and the generated client are regenerated
and committed.
