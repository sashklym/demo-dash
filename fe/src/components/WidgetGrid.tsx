import { useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { AddWidgetMenu } from './AddWidgetMenu';
import { SortableWidgetGrid } from './SortableWidgetGrid';
import { VirtualWidgetGrid } from './VirtualWidgetGrid';
import { WidgetGridSkeleton } from './WidgetGridSkeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useReorder, useWidgets } from '@/hooks/use-widgets';
import type { MoveTarget } from './WidgetMoveMenu';

// Above this many widgets, drag-to-reorder (which needs every card mounted) gives
// way to a virtualized grid that only renders on-screen rows and lazily loads
// their data. Below it, the draggable grid stays — reordering matters more than
// virtualization when there are few widgets.
const VIRTUALIZE_THRESHOLD = 60;

export function WidgetGrid({ dashboardKey }: { dashboardKey: string }) {
  const widgets = useWidgets(dashboardKey);
  const reorder = useReorder(dashboardKey);
  const [scrollToId, setScrollToId] = useState<string | null>(null);

  if (widgets.isPending) {
    return <WidgetGridSkeleton />;
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
  const virtualized = items.length > VIRTUALIZE_THRESHOLD;

  const applyOrder = (orderedIds: string[]) => reorder.mutate({ key: dashboardKey, data: { orderedIds } });

  function moveWidget(id: string, target: MoveTarget) {
    const ids = items.map((w) => w.id);
    const from = ids.indexOf(id);
    if (from < 0) return;
    const to =
      target === 'start' ? 0 : target === 'end' ? ids.length - 1 : target === 'prev' ? from - 1 : from + 1;
    if (to < 0 || to >= ids.length || to === from) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    applyOrder(ids);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {items.length} widget{items.length === 1 ? '' : 's'}
        </h2>
        {items.length > 0 && <AddWidgetMenu dashboardKey={dashboardKey} onCreated={(w) => setScrollToId(w.id)} />}
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
          <AddWidgetMenu dashboardKey={dashboardKey} onCreated={(w) => setScrollToId(w.id)} />
        </Card>
      ) : virtualized ? (
        <VirtualWidgetGrid
          dashboardKey={dashboardKey}
          items={items}
          onMove={moveWidget}
          reorderPending={reorder.isPending}
          scrollToId={scrollToId}
          onScrollHandled={() => setScrollToId(null)}
        />
      ) : (
        <SortableWidgetGrid
          dashboardKey={dashboardKey}
          items={items}
          onMove={moveWidget}
          applyOrder={applyOrder}
          reorderPending={reorder.isPending}
          scrollToId={scrollToId}
          onScrollHandled={() => setScrollToId(null)}
        />
      )}
    </div>
  );
}
