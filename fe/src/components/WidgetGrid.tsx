import type { CSSProperties } from 'react';
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
import { GripVertical, LayoutGrid } from 'lucide-react';
import { AddWidgetMenu } from './AddWidgetMenu';
import { WidgetCard } from './WidgetCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useReorder, useWidgets } from '@/hooks/use-widgets';
import type { Widget } from '@/lib/api/generated/model';

function SortableWidgetCard({ dashboardKey, widget }: { dashboardKey: string; widget: Widget }) {
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
    <div ref={setNodeRef} style={style}>
      <WidgetCard dashboardKey={dashboardKey} widget={widget} dragHandle={handle} />
    </div>
  );
}

export function WidgetGrid({ dashboardKey }: { dashboardKey: string }) {
  const widgets = useWidgets(dashboardKey);
  const reorder = useReorder(dashboardKey);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (widgets.isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (widgets.isError) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <p className="text-muted-foreground">Couldn’t load widgets.</p>
        <Button variant="outline" onClick={() => widgets.refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  const items = widgets.data ?? [];

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((w) => w.id === active.id);
    const newIndex = items.findIndex((w) => w.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const orderedIds = arrayMove(items, oldIndex, newIndex).map((w) => w.id);
    reorder.mutate({ key: dashboardKey, data: { orderedIds } });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {items.length} widget{items.length === 1 ? '' : 's'}
        </h2>
        {items.length > 0 && <AddWidgetMenu dashboardKey={dashboardKey} />}
      </div>

      {items.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 border-dashed bg-transparent p-14 text-center shadow-none">
          <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <LayoutGrid className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Your dashboard is empty</h3>
            <p className="text-sm text-muted-foreground">Add a line chart, bar chart, or text widget to get started.</p>
          </div>
          <AddWidgetMenu dashboardKey={dashboardKey} />
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((w) => w.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((widget) => (
                <SortableWidgetCard key={widget.id} dashboardKey={dashboardKey} widget={widget} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
