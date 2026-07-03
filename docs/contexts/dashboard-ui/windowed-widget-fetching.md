---
status: draft
type: feature
priority: high
context: dashboard-ui
---

# Windowed widget fetching

Fetch widgets in pages as the user scrolls, instead of loading the whole list up
front. Pairs with the already-shipped grid virtualization so a large dashboard
opens fast and only ever holds the widgets near the viewport.

## Why

The grid already renders and fetches chart data only for on-screen widgets, but
`useWidgets` still does one `GET …/widgets` for the entire list. Once the API is
paginated ([paginated-widget-list-api](../widgets/paginated-widget-list-api.md)),
the virtualizer can drive fetching: it knows the visible index range, so it can
request just the pages covering it.

## Phases

- [ ] Replace `useWidgets` with a windowed hook: fetch `total` from page 0, then fetch pages keyed by `[key, offset, limit]` on demand (React Query `useQueries` / infinite)
- [ ] `VirtualWidgetGrid` maps its visible row range → item index range → page numbers, and requests those pages (+overscan)
- [ ] Sparse item array indexed by absolute position; unloaded indices render the existing card skeleton (`WidgetGridSkeleton` cell)
- [ ] Virtualizer `count` = `total`; scrollbar reflects the full board before pages load
- [ ] Move actions call `PUT …/:id/position` with the widget's absolute target index (start=0, end=total-1, up/down=±1) instead of building `orderedIds`
- [ ] Cache updates per page: edit → patch item in its page; add → bump `total` + last page; delete/move → invalidate the affected page range (positions shift)
- [ ] Small boards (≤ threshold) keep the draggable grid, fetching one page with `limit ≥ threshold` so drag still has the full set
- [ ] RTL tests: only in-range pages fetched; scrolling fetches the next page; skeletons for unloaded rows

## Design decisions

- **Keep the 60-widget threshold.** Below it, one page holds everything and the drag grid + full-list reorder work unchanged. Above it, the windowed virtual grid takes over and move actions use the position endpoint.
- **Skeletons for unloaded rows.** The virtualizer sizes the whole board from `total` immediately; rows whose page is still in flight show the card skeleton, so scroll position and the scrollbar never jump.
- **Delete/move invalidate a page range, not one item.** Because positions renumber, the simplest correct thing is to drop cached pages from the changed index onward and let them refetch. Edits (title/text) don't move anything, so they patch in place — no refetch. Builds on the [no-refetch-on-mutation](../widgets/widget-crud-api.md) cache work.

## Acceptance

Opening a 1k / 10k dashboard fetches only the first page(s) of widgets, not the
whole list; scrolling fetches pages incrementally with skeletons in the gaps;
renaming, adding, deleting, and moving a widget stay correct without re-GETting
every widget.
