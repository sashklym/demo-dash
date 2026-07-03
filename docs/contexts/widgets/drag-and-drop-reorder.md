---
status: draft
type: feature
priority: medium
context: widgets
---

# Drag-and-drop reorder (frontend)

Let users drag widgets to reorder the grid, persisting via the existing reorder API.

## Phases

- [ ] Add `@dnd-kit/core` + sortable to the grid
- [ ] Drag handle on `WidgetCard`; optimistic reorder
- [ ] Call `useReorder` (already wired) on drop
- [ ] E2E: drag reorders and survives reload

## Acceptance

Dragging a widget updates the order immediately and persists across reload. The backend `PUT …/reorder` endpoint already exists.
