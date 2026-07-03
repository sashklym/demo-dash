---
status: done
type: feature
priority: high
context: widgets
---

# Seed-based deterministic chart data

Serve chart data from a stored seed so it restores identically after reload, with a regenerate action.

## Phases

- [x] `seed` column set at create; `mulberry32(seed)` PRNG
- [x] `GET …/widgets/:id/data?points=N` → deterministic series
- [x] `POST …/widgets/:id/regenerate` → new seed
- [x] 400 for chart data on a text widget
- [x] Tests assert determinism across calls + change after regenerate

## Acceptance

The same widget returns identical data on repeated calls; regenerate changes it; a reload shows the same chart.
