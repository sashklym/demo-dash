---
status: done
type: feature
priority: high
context: widgets
---

# Paginated widget list + move-to-position API

Let a dashboard hold thousands of widgets without shipping the whole list on every
load. Paginate `GET …/widgets`, and add a single-widget move endpoint so reordering
no longer needs the client to send the full order.

> **Shipped with fractional ranking.** Widgets are ordered by a fractional string
> `rank` (see [fractional-widget-ranking](fractional-widget-ranking.md)), not a
> contiguous integer `position`. That changed two things from the original plan
> below: the list is ordered by `rank`, and the move endpoint rewrites **one**
> row's rank instead of shifting the trailing rows. Recorded inline in the phases.

## Why

`GET /api/dashboards/:key/widgets` returns **every** widget, always. At 1k that's a
~150KB payload on open; at 10k, ~1.5MB. The frontend already virtualizes rendering
and chart-data fetches ([windowed-widget-fetching](../dashboard-ui/windowed-widget-fetching.md)),
but it still can't fetch widgets in windows because the endpoint has no paging — and
it can't reorder in windows because [widget-reorder-api](widget-reorder-api.md) takes
the entire `orderedIds`.

## Phases

- [x] `GET …/widgets?offset&limit` — `offset` (default 0), `limit` (default 50, max 200), ordered by `rank`
- [x] Response envelope `WidgetPage { items, total, offset, limit }` (replaces bare `Widget[]`); `total` from a dashboard-scoped count
- [x] `PUT …/widgets/:id/position` with `{ position }` — clamp target to a valid index; rewrites the moved widget's `rank` between its new neighbors (single row)
- [x] Service: `list(key, {offset, limit})` → page + total; `moveToPosition(key, id, target)` — both dashboard-scoped
- [x] TypeBox schemas (`ListWidgetsQuery`, `WidgetPage`, `MoveWidgetBody`) with `$id` + `operationId`
- [x] Integration tests: slice + total correctness, offset/limit bounds, move + clamp + is key-scoped
- [x] Regenerate `openapi.json` + fe client; update all consumers (FE now fetches windowed pages)

## Design decisions

- **Envelope over `X-Total-Count` header.** A typed `{ items, total, … }` shape survives orval generation cleanly; the frontend needs `total` to size the virtual scrollbar. This is a **breaking contract change** — every consumer of the list response updated in the same PR.
- **Keep `PUT …/reorder` (full `orderedIds`)** for the draggable small-board grid, which loads the whole first page. The `…/:id/position` endpoint serves the virtualized grid's move actions (start / up / down / end), which only know a single widget + a target index.
- **Fractional rank instead of shifting positions.** A move rewrites one row's rank (a key between its new neighbors), so trailing pages don't renumber. Deleting/moving still reorders items across pages, so the frontend invalidates the shared `[…/widgets]` page prefix and the on-screen windows refetch. See [fractional-widget-ranking](fractional-widget-ranking.md).
- **Windowed fetching over `X-Total-Count` polling.** The virtualized grid asks `useQueries` for exactly the pages overlapping the scroll range; each page is its own cached query, so scrolling only fetches what's newly visible and unloaded slots render as skeletons.

## Acceptance

`GET …/widgets?offset=0&limit=50` returns the first 50 widgets plus an accurate
`total`; out-of-range `offset` is clamped and over-max `limit` is rejected by the
schema. `PUT …/widgets/:id/position` moves one widget to a target index (single
rank rewrite) and is rejected for a key that doesn't own the widget. `openapi.json`
and the generated client are regenerated and committed.
