---
status: done
type: feature
priority: high
context: widgets
---

# Fractional widget ranking

Order widgets by a fractional string `rank` instead of a contiguous integer
`position`, so moving a widget is a single-row write regardless of dashboard size.

## Why

With integer positions, moving a widget from the end to the front renumbers every
row in between — O(n) writes per move, and it forces the list API to renumber
trailing rows too. Fractional indexing assigns each widget a string key that sorts
lexicographically, with room to always mint a new key *between* any two neighbors.
A move computes one key and saves one row; the rest are untouched.

## Phases

- [x] `core/fractional-index.ts` — `generateKeyBetween(a, b)` + `generateNKeysBetween` (base-62, integer-header scheme so appends stay short), with unit + fuzz tests
- [x] `Widget.rank: string` replaces `position`; index `(dashboard_id, rank)`
- [x] Migration `AddWidgetRank` — backfill ranks per dashboard from existing position order, then drop `position` (down reverses)
- [x] Service: `create` appends after the last rank; `moveToPosition` rewrites one rank between neighbors; `reorder` re-spreads fresh ranks (small grid)
- [x] Contract: `Widget.rank` in the OpenAPI schema; regenerate the fe client

## Design decisions

- **String keys, not floats.** A float midpoint (`(a+b)/2`) hits double-precision
  limits after ~50 same-gap inserts and needs a rebalance path early. Base-62
  strings sort in SQL directly and have no practical precision ceiling.
- **Integer-header scheme (rocicorp `fractional-indexing`).** The first character
  encodes the integer-part length, so append-at-end (the common create path)
  increments an integer and stays short — 1000 sequential appends keep keys ≤ 5
  chars, versus ~200 for a naive midpoint-to-end.
- **Rebalance is deferred, not needed at this scale.** Pathological repeated
  insertion into one gap grows keys slowly; a periodic re-spread (as `reorder`
  already does) is the escape hatch if it ever matters.

## Acceptance

Widgets sort by `rank ASC`. Creating appends after the last widget. Moving one
widget writes exactly one row and lands it strictly between its new neighbors.
The migration backfills existing dashboards without reshuffling their order.
