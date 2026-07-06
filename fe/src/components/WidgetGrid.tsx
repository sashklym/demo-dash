import { useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { AddWidgetMenu } from './AddWidgetMenu';
import { SortableWidgetGrid } from './SortableWidgetGrid';
import { VirtualWidgetGrid } from './VirtualWidgetGrid';
import { WidgetGridSkeleton } from './WidgetGridSkeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMove, useReorder, useWidgetsPage } from '@/hooks/use-widgets';
import type { MoveTarget } from './WidgetMoveMenu';

// Above this many widgets, drag-to-reorder (which needs every card mounted) gives
// way to a virtualized grid that only renders on-screen rows and lazily loads
// their pages. Below it, the whole board fits in the first page and the draggable
// grid stays — reordering matters more than virtualization when there are few.
// Must be ≤ PAGE_SIZE so a non-virtualized board is fully covered by page 0.
const VIRTUALIZE_THRESHOLD = 60;

export function WidgetGrid({ dashboardKey }: { dashboardKey: string }) {
  const page = useWidgetsPage(dashboardKey, 0);
  const reorder = useReorder(dashboardKey);
  const move = useMove(dashboardKey);
  const [scrollToId, setScrollToId] = useState<string | null>(null);

  if (page.isPending) {
    return <WidgetGridSkeleton />;
  }

  if (page.isError) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <p className="text-muted-foreground">Couldn’t load widgets.</p>
        <Button variant="outline" onClick={() => page.refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  const total = page.data.total;
  const firstPage = page.data.items;
  const virtualized = total > VIRTUALIZE_THRESHOLD;
  const movePending = move.isPending || reorder.isPending;

  const applyOrder = (orderedIds: string[]) => reorder.mutate({ key: dashboardKey, data: { orderedIds } });

  // Resolve a start/prev/next/end action against the widget's current index and
  // the total, then move it to that absolute index (server rewrites one rank).
  function moveWidget(id: string, index: number, target: MoveTarget) {
    const to =
      target === 'start' ? 0 : target === 'end' ? total - 1 : target === 'prev' ? index - 1 : index + 1;
    if (to < 0 || to >= total || to === index) return;
    move.mutate({ key: dashboardKey, id, data: { position: to } });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {total} widget{total === 1 ? '' : 's'}
        </h2>
        {total > 0 && <AddWidgetMenu dashboardKey={dashboardKey} onCreated={(w) => setScrollToId(w.id)} />}
      </div>

      {total === 0 ? (
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
          total={total}
          onMove={moveWidget}
          movePending={movePending}
          scrollToId={scrollToId}
          onScrollHandled={() => setScrollToId(null)}
        />
      ) : (
        <SortableWidgetGrid
          dashboardKey={dashboardKey}
          items={firstPage}
          onMove={moveWidget}
          applyOrder={applyOrder}
          movePending={movePending}
          scrollToId={scrollToId}
          onScrollHandled={() => setScrollToId(null)}
        />
      )}
    </div>
  );
}
