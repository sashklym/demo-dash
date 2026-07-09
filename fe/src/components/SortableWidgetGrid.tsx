import { useEffect, useState, type CSSProperties } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
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
import { EmptySlot } from './EmptySlot';
import { WidgetCard } from './WidgetCard';
import type { MoveTarget, WidgetMoveActions } from './WidgetMoveMenu';
import { cn } from '@/lib/utils';
import { boardCells, slotClass, type Gap, type Slot } from '@/lib/widget-slot';
import type { Widget } from '@/lib/api/generated/model';

/** Marks a droppable as a hole, so `handleDragEnd` can tell it from a card. */
interface GapDropData {
  kind: 'gap';
  gap: Gap;
}

/**
 * Whatever sits under the cursor wins, falling back to the nearest card.
 *
 * `closestCenter` alone compares the *dragged card's* centre, which is half a card
 * to the right of the grip you're holding — for a 2-wide card that centre lands on
 * the neighbouring card, so a hole under the cursor could never win. The fallback
 * still covers the keyboard sensor, which has no pointer.
 */
const collisionDetection: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args);
  return underPointer.length > 0 ? underPointer : closestCenter(args);
};

/**
 * A hole the dragged widget can be dropped into.
 *
 * It stays a drop target even when the widget is too wide for it, so that it still
 * wins collision detection and the drop lands here — as a no-op with a "too narrow"
 * hint. Disabling it instead would hand the drop to the nearest *card*, silently
 * re-flowing the board when the user aimed at a hole.
 */
function DroppableEmptySlot({ gap, canDrop }: { gap: Gap; canDrop: boolean }) {
  const data: GapDropData = { kind: 'gap', gap };
  const { setNodeRef, isOver } = useDroppable({ id: `gap:${gap.row}:${gap.col}`, data });
  return <EmptySlot ref={setNodeRef} gap={gap} isOver={isOver} canDrop={canDrop} />;
}

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
    <div ref={setNodeRef} style={style} id={`widget-card-${widget.id}`} className={cn(slotClass(widget))}>
      <WidgetCard dashboardKey={dashboardKey} widget={widget} dragHandle={handle} moveActions={moveActions} />
    </div>
  );
}

/**
 * Draggable grid for normal-sized dashboards. Every card is mounted so dnd-kit can
 * compute drop targets; above a row threshold WidgetGrid switches to the virtualized
 * grid instead (which can't support drag-to-reorder).
 *
 * Cards carry their stored slot as `col-span` / `col-start` classes, so at `lg` the
 * board renders exactly the rows the server stored — holes included. Dropping a card
 * sends the full order to `reorder`, which compacts the board and squeezes holes out.
 */
export function SortableWidgetGrid({
  dashboardKey,
  items,
  onMove,
  onPlace,
  applyOrder,
  movePending,
  scrollToId,
  onScrollHandled,
}: {
  dashboardKey: string;
  items: Widget[];
  onMove: (ordered: Widget[], id: string, index: number, target: MoveTarget) => void;
  onPlace: (id: string, slot: Slot) => void;
  applyOrder: (orderedIds: string[]) => void;
  movePending: boolean;
  scrollToId: string | null;
  onScrollHandled: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Which widget is in the air — a hole narrower than it must refuse the drop.
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeSize = (activeId && items.find((w) => w.id === activeId)?.size) || 1;

  // Scroll a freshly-added widget into view once it renders (the list re-fetches
  // after the create mutation, so the node may not exist on the first effect run).
  // First fit places a new widget in the earliest gap, so this can scroll *up*.
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
    setActiveId(null);
    if (!over) return;

    // Dropped on a hole: place the widget in that exact slot, leaving the board's
    // other holes untouched. A hole too narrow for it swallows the drop rather than
    // re-flowing the board behind the user's back.
    const drop = over.data.current as GapDropData | undefined;
    if (drop?.kind === 'gap') {
      const size = items.find((w) => w.id === active.id)?.size ?? 1;
      if (size <= drop.gap.size) onPlace(String(active.id), { row: drop.gap.row, col: drop.gap.col });
      return;
    }

    if (active.id === over.id) return;
    const oldIndex = items.findIndex((w) => w.id === active.id);
    const newIndex = items.findIndex((w) => w.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const orderedIds = arrayMove(items, oldIndex, newIndex).map((w) => w.id);
    applyOrder(orderedIds);
  }

  // `items` is already in reading order, so a widget's index is its move-menu index.
  const indexById = new Map(items.map((widget, index) => [widget.id, index]));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((w) => w.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {boardCells(items).map((cell) => {
            if (cell.kind === 'gap') {
              const { row, col } = cell.gap;
              return (
                <DroppableEmptySlot key={`gap-${row}-${col}`} gap={cell.gap} canDrop={activeSize <= cell.gap.size} />
              );
            }
            const { widget } = cell;
            const index = indexById.get(widget.id)!;
            return (
              <SortableWidgetCard
                key={widget.id}
                dashboardKey={dashboardKey}
                widget={widget}
                moveActions={{
                  onMove: (target) => onMove(items, widget.id, index, target),
                  isFirst: index === 0,
                  isLast: index === items.length - 1,
                  isPending: movePending,
                }}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
