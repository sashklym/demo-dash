---
status: done
type: feature
priority: high
context: dashboard-ui
---

# Widget grid & empty state

Responsive 3-per-row grid with add-widget, loading, error, and empty states.

## Phases

- [x] `grid-cols-1 md:2 lg:3`; `WidgetCard` per widget
- [x] Empty-state card with add-widget CTA
- [x] Loading skeletons + error/retry for the list query
- [x] `AddWidgetMenu` dropdown (line / bar / text)
- [x] RTL tests for each state

## Acceptance

An empty dashboard shows the add CTA; adding widgets fills a responsive grid; the widget count updates.
