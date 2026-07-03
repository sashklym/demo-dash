---
status: draft
type: feature
priority: low
context: platform
---

# Anonymous dashboard expiry

Clean up dashboards that haven't been opened in a long time (anonymous data shouldn't accumulate forever).

## Phases

- [ ] Track `last_seen_at` on `Dashboard` (touch on GET)
- [ ] Scheduled job to delete dashboards idle > N days (cascades widgets)
- [ ] Config for the retention window

## Acceptance

Idle dashboards are removed after the retention window; active ones are untouched.
