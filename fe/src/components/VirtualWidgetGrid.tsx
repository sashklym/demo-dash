import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { WidgetCard } from './WidgetCard';
import type { MoveTarget } from './WidgetMoveMenu';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { slotClass } from '@/lib/widget-slot';
import { CHUNK_ROWS, useWidgetRowWindow } from '@/hooks/use-widgets';
import type { Widget } from '@/lib/api/generated/model';

// A row is one card tall at `lg`, where the stored 3-column layout is honoured. On
// narrower viewports a row wraps and grows, so the virtualizer measures rather than
// assumes — this is only the initial estimate.
const CARD_HEIGHT = 360;
const ROW_GAP = 16;
const ROW_HEIGHT = CARD_HEIGHT + ROW_GAP;

/** Placeholder for an on-screen row whose chunk hasn't arrived yet. */
function WidgetRowSkeleton() {
  return (
    <Card className="flex h-[360px] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b p-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="size-7 rounded-md" />
      </div>
      <div className="flex-1 p-4">
        <Skeleton className="h-full w-full rounded-md" />
      </div>
    </Card>
  );
}

/**
 * Windowed grid for large dashboards: only the rows near the viewport are mounted,
 * and only the row *chunks* overlapping that window are fetched.
 *
 * The virtualizer's unit is the server's own row, which is why no index arithmetic
 * appears here: `totalRows` sizes the scrollbar, and each mounted row renders the
 * widgets the API says are in it. Rows are their own CSS grid, so below `lg` a row
 * wraps and grows taller — hence `measureElement`.
 *
 * Reordering is intentionally absent (see WidgetGrid): dnd-kit needs every card
 * mounted to compute drop targets, which defeats virtualization. The move menu
 * (start / up / down / end) drives the `place` endpoint instead.
 */
export function VirtualWidgetGrid({
  dashboardKey,
  totalRows,
  onMove,
  movePending,
  scrollToId,
  onScrollHandled,
}: {
  dashboardKey: string;
  totalRows: number;
  onMove: (ordered: Widget[], id: string, index: number, target: MoveTarget) => void;
  movePending: boolean;
  scrollToId: string | null;
  onScrollHandled: () => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  // The window scrolls the whole document, so the virtualizer needs the list's
  // offset from the top of the page to know which rows are on screen.
  useLayoutEffect(() => {
    setScrollMargin(parentRef.current?.offsetTop ?? 0);
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: totalRows,
    estimateSize: () => ROW_HEIGHT,
    overscan: 3,
    scrollMargin,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const firstRow = virtualRows[0]?.index ?? 0;
  const lastRow = virtualRows[virtualRows.length - 1]?.index ?? 0;

  // Which row chunks overlap the visible rows? Only those get fetched.
  const chunks = useMemo(() => {
    const list: number[] = [];
    for (let c = Math.floor(firstRow / CHUNK_ROWS); c <= Math.floor(lastRow / CHUNK_ROWS); c++) {
      list.push(c);
    }
    return list;
  }, [firstRow, lastRow]);

  const byRow = useWidgetRowWindow(dashboardKey, chunks);

  // Reading order across the rows we hold — enough for the move menu to find a
  // widget's neighbours.
  const loaded = useMemo(
    () => [...byRow.entries()].sort(([a], [b]) => a - b).flatMap(([, widgets]) => widgets),
    [byRow],
  );

  // A new widget takes the first free slot, which may be anywhere on the board.
  // Drive the virtualizer to its row once the refetched chunk says where it landed.
  useEffect(() => {
    if (!scrollToId) return;
    const target = loaded.find((w) => w.id === scrollToId);
    if (!target) return;
    virtualizer.scrollToIndex(target.row, { align: 'center' });
    onScrollHandled();
  }, [scrollToId, loaded, virtualizer, onScrollHandled]);

  return (
    <div ref={parentRef}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualRows.map((row) => {
          const widgets = byRow.get(row.index);
          return (
            <div
              key={row.key}
              data-index={row.index}
              ref={virtualizer.measureElement}
              className="grid grid-cols-1 gap-4 pb-4 md:grid-cols-2 lg:grid-cols-3"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${row.start - virtualizer.options.scrollMargin}px)`,
              }}
            >
              {widgets ? (
                widgets.map((widget) => (
                  <div key={widget.id} id={`widget-card-${widget.id}`} className={cn(slotClass(widget))}>
                    <WidgetCard
                      dashboardKey={dashboardKey}
                      widget={widget}
                      moveActions={{
                        onMove: (target) =>
                          onMove(
                            loaded,
                            widget.id,
                            loaded.findIndex((w) => w.id === widget.id),
                            target,
                          ),
                        isFirst: widget.row === 0 && widget.col === 0,
                        isLast: widget.row === totalRows - 1 && widget === widgets[widgets.length - 1],
                        isPending: movePending,
                      }}
                    />
                  </div>
                ))
              ) : (
                <WidgetRowSkeleton />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
