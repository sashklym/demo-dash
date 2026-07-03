import { useEffect, type CSSProperties } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { WidgetCard } from './WidgetCard';
import type { MoveTarget, WidgetMoveActions } from './WidgetMoveMenu';
import type { Widget } from '@/lib/api/generated/model';

function SortableWidgetCard({
  dashboardKey,
  widget,
  moveActions,
}: {
  dashboardKey: string;
  widget: Widget;
  moveActions: WidgetMoveActions;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 20 : undefined,
  };
  const handle = (
    <button
      type="button"
      aria-label="Drag to reorder"
      className="shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-accent active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" />
    </button>
  );
  return (
    <div ref={setNodeRef} style={style} id={`widget-card-${widget.id}`}>
      <WidgetCard dashboardKey={dashboardKey} widget={widget} dragHandle={handle} moveActions={moveActions} />
    </div>
  );
}

/**
 * Draggable grid for normal-sized dashboards. Every card is mounted so dnd-kit
 * can compute drop targets; above a threshold WidgetGrid switches to the
 * virtualized grid instead (which can't support drag-to-reorder).
 */
export function SortableWidgetGrid({
  dashboardKey,
  items,
  onMove,
  applyOrder,
  reorderPending,
  scrollToId,
  onScrollHandled,
}: {
  dashboardKey: string;
  items: Widget[];
  onMove: (id: string, target: MoveTarget) => void;
  applyOrder: (orderedIds: string[]) => void;
  reorderPending: boolean;
  scrollToId: string | null;
  onScrollHandled: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Scroll a freshly-added widget into view once it renders (the list re-fetches
  // after the create mutation, so the node may not exist on the first effect run).
  // The add menu is a Radix dropdown whose close restores focus to its trigger and
  // briefly locks scrolling — a smooth scroll fired in that window gets dropped, so
  // we defer one frame and scroll instantly.
  useEffect(() => {
    if (!scrollToId) return;
    const el = document.getElementById(`widget-card-${scrollToId}`);
    if (!el) return;
    onScrollHandled();
    const raf = requestAnimationFrame(() => el.scrollIntoView?.({ block: 'center' }));
    return () => cancelAnimationFrame(raf);
  }, [items, scrollToId, onScrollHandled]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((w) => w.id === active.id);
    const newIndex = items.findIndex((w) => w.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const orderedIds = arrayMove(items, oldIndex, newIndex).map((w) => w.id);
    applyOrder(orderedIds);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((w) => w.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {items.map((widget, index) => (
            <SortableWidgetCard
              key={widget.id}
              dashboardKey={dashboardKey}
              widget={widget}
              moveActions={{
                onMove: (target) => onMove(widget.id, target),
                isFirst: index === 0,
                isLast: index === items.length - 1,
                isPending: reorderPending,
              }}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
