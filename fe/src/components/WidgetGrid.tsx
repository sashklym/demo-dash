import { useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { AddWidgetMenu } from './AddWidgetMenu';
import { SortableWidgetGrid } from './SortableWidgetGrid';
import { VirtualWidgetGrid } from './VirtualWidgetGrid';
import { WidgetGridSkeleton } from './WidgetGridSkeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CHUNK_ROWS, usePlace, useReorder, useWidgetChunk } from '@/hooks/use-widgets';
import { moveTargetSlot, type MoveTarget } from '@/lib/widget-slot';
import type { Widget } from '@/lib/api/generated/model';

// Above this many *rows*, drag-to-reorder (which needs every card mounted) gives
// way to a virtualized grid that only renders on-screen rows and lazily loads their
// chunks. Must be ≤ CHUNK_ROWS so a non-virtualized board is covered by chunk 0.
const VIRTUALIZE_ROW_THRESHOLD = CHUNK_ROWS;

export function WidgetGrid({ dashboardKey }: { dashboardKey: string }) {
  const chunk = useWidgetChunk(dashboardKey, 0);
  const reorder = useReorder(dashboardKey);
  const place = usePlace(dashboardKey);
  const [scrollToId, setScrollToId] = useState<string | null>(null);

  if (chunk.isPending) {
    return <WidgetGridSkeleton />;
  }

  if (chunk.isError) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <p className="text-muted-foreground">Couldn’t load widgets.</p>
        <Button variant="outline" onClick={() => chunk.refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  const { total, totalRows, items: firstChunk } = chunk.data;
  const virtualized = totalRows > VIRTUALIZE_ROW_THRESHOLD;
  const movePending = place.isPending || reorder.isPending;

  const applyOrder = (orderedIds: string[]) => reorder.mutate({ key: dashboardKey, data: { orderedIds } });

  function moveWidget(ordered: Widget[], id: string, index: number, target: MoveTarget) {
    const slot = moveTargetSlot(ordered, index, target, totalRows);
    if (!slot) return;
    place.mutate({ key: dashboardKey, id, data: slot });
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
          totalRows={totalRows}
          onMove={moveWidget}
          movePending={movePending}
          scrollToId={scrollToId}
          onScrollHandled={() => setScrollToId(null)}
        />
      ) : (
        <SortableWidgetGrid
          dashboardKey={dashboardKey}
          items={firstChunk}
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
