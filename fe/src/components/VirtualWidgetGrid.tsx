import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { WidgetCard } from './WidgetCard';
import type { MoveTarget } from './WidgetMoveMenu';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useColumnCount } from '@/hooks/use-column-count';
import { PAGE_SIZE, useWidgetWindow } from '@/hooks/use-widgets';

// Cards are a fixed height (`h-[360px]` in WidgetCard) with a 16px grid gap, so
// every row is exactly this tall — the virtualizer needs no dynamic measurement.
const CARD_HEIGHT = 360;
const ROW_GAP = 16;
const ROW_HEIGHT = CARD_HEIGHT + ROW_GAP;

/** Placeholder for an on-screen widget whose page hasn't arrived yet. */
function WidgetCardSkeleton() {
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
 * Windowed grid for large dashboards: only the rows near the viewport are
 * mounted, and only the widget *pages* overlapping that window are fetched. A
 * dashboard with thousands of widgets renders a couple dozen cards and holds a
 * couple of pages in memory at a time; the rest are skeletons until scrolled to.
 *
 * Reordering is intentionally absent here (see WidgetGrid): dnd-kit needs every
 * card mounted to compute drop targets, which defeats virtualization. The move
 * menu (start / up / down / end) drives the O(1) move endpoint instead.
 */
export function VirtualWidgetGrid({
  dashboardKey,
  total,
  onMove,
  movePending,
  scrollToId,
  onScrollHandled,
}: {
  dashboardKey: string;
  total: number;
  onMove: (id: string, index: number, target: MoveTarget) => void;
  movePending: boolean;
  scrollToId: string | null;
  onScrollHandled: () => void;
}) {
  const cols = useColumnCount();
  const parentRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const rowCount = Math.ceil(total / cols);

  // The window scrolls the whole document, so the virtualizer needs the list's
  // offset from the top of the page to know which rows are on screen.
  useLayoutEffect(() => {
    setScrollMargin(parentRef.current?.offsetTop ?? 0);
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => ROW_HEIGHT,
    overscan: 3,
    scrollMargin,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const firstRow = virtualRows[0]?.index ?? 0;
  const lastRow = virtualRows[virtualRows.length - 1]?.index ?? 0;

  // Which widget pages overlap the visible rows? Only those get fetched.
  const pageIndices = useMemo(() => {
    const firstItem = firstRow * cols;
    const lastItem = Math.min(total - 1, lastRow * cols + cols - 1);
    const pages: number[] = [];
    for (let p = Math.floor(firstItem / PAGE_SIZE); p <= Math.floor(lastItem / PAGE_SIZE); p++) {
      pages.push(p);
    }
    return pages;
  }, [firstRow, lastRow, cols, total]);

  const byIndex = useWidgetWindow(dashboardKey, pageIndices);

  // A freshly-added widget is appended, so it lands on the last row — likely
  // below the fold and unmounted. Drive the virtualizer to the end by index.
  useEffect(() => {
    if (!scrollToId) return;
    virtualizer.scrollToIndex(rowCount - 1, { align: 'center' });
    onScrollHandled();
  }, [scrollToId, rowCount, virtualizer, onScrollHandled]);

  return (
    <div ref={parentRef}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualRows.map((row) => {
          const start = row.index * cols;
          return (
            <div
              key={row.key}
              data-index={row.index}
              className="grid gap-4"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: CARD_HEIGHT,
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                transform: `translateY(${row.start - virtualizer.options.scrollMargin}px)`,
              }}
            >
              {Array.from({ length: Math.min(cols, total - start) }, (_, colIndex) => {
                const index = start + colIndex;
                const widget = byIndex.get(index);
                if (!widget) {
                  return <WidgetCardSkeleton key={index} />;
                }
                return (
                  <div key={widget.id} id={`widget-card-${widget.id}`}>
                    <WidgetCard
                      dashboardKey={dashboardKey}
                      widget={widget}
                      moveActions={{
                        onMove: (target) => onMove(widget.id, index, target),
                        isFirst: index === 0,
                        isLast: index === total - 1,
                        isPending: movePending,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
