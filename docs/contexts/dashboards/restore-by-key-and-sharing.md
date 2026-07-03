---
status: done
type: feature
priority: high
context: dashboards
---

# Restore by key & sharing

Let a user re-open a saved dashboard on any device via its key / shareable link.

## Phases

- [x] Persist the key in `localStorage` (`lib/dashboard-key.ts`)
- [x] `/` bootstraps or restores; `/d/:key` is a shareable capability URL
- [x] Key bar: Copy key, Copy link, Open key, New dashboard
- [x] Store the key only once confirmed valid (shared links)
- [x] E2E: restore in a fresh browser context

## Acceptance

Opening a copied key in a browser with no prior state restores the same dashboard (widgets + chart data + text).
