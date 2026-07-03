---
status: done
type: feature
priority: medium
context: widgets
---

# Widget reorder API

Bulk-reassign widget positions from an ordered id list.

## Phases

- [x] `PUT …/widgets/reorder` accepting `{ orderedIds }`
- [x] Contiguous positions; unlisted widgets keep relative order at the end
- [x] Static `/reorder` route declared before `/:id`
- [x] Integration test

## Acceptance

Reordering returns the list in the requested order and persists it. (Frontend drag-and-drop that drives this endpoint is tracked separately.)
