---
status: draft
type: feature
priority: medium
context: widgets
---

# Drag-and-drop reorder (frontend)

Let users drag widgets to reorder the grid, persisting via the existing reorder API.

## Phases

- [x] Add `@dnd-kit/core` + sortable to the grid
- [x] Drag handle on `WidgetCard`; optimistic reorder
- [x] Call `useReorder` (already wired) on drop
- [x] E2E: drag reorders and survives reload

## Acceptance

Dragging a widget updates the order immediately and persists across reload. The backend `PUT …/reorder` endpoint already exists.
