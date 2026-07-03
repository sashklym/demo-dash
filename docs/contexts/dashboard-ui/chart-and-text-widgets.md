---
status: done
type: feature
priority: high
context: dashboard-ui
---

# Chart & text widgets

Render line/bar charts from backend data and an editable, persisting text widget.

## Phases

- [x] `ChartWidget` — own `useGetWidgetData` query → skeleton → Recharts
- [x] Per-widget error + Retry; Regenerate button
- [x] `TextWidget` — view → edit → Save → `PATCH` (persists)
- [x] Delete action on every card
- [x] RTL tests (text edit→save; render smoke)

## Acceptance

Charts render their series with genuine per-widget loading/error; text edits persist across reload; widgets delete.
