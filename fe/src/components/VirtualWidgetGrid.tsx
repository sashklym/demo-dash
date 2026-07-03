import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { WidgetCard } from './WidgetCard';
import type { MoveTarget } from './WidgetMoveMenu';
import { useColumnCount } from '@/hooks/use-column-count';
import type { Widget } from '@/lib/api/generated/model';

// Cards are a fixed height (`h-[360px]` in WidgetCard) with a 16px grid gap, so
// every row is exactly this tall — the virtualizer needs no dynamic measurement.
const CARD_HEIGHT = 360;
const ROW_GAP = 16;
const ROW_HEIGHT = CARD_HEIGHT + ROW_GAP;

/**
 * Windowed grid for large dashboards: only the rows near the viewport are
 * mounted, so a dashboard with thousands of widgets renders a couple dozen cards
 * at a time. Because each ChartWidget fetches its own data on mount, this also
 * makes data-loading lazy — off-screen widgets fire no requests until scrolled to.
 *
 * Reordering is intentionally absent here (see WidgetGrid): dnd-kit needs every
 * card mounted to compute drop targets, which defeats virtualization.
 */
export function VirtualWidgetGrid({
  dashboardKey,
  items,
  onMove,
  reorderPending,
  scrollToId,
  onScrollHandled,
}: {
  dashboardKey: string;
  items: Widget[];
  onMove: (id: string, target: MoveTarget) => void;
  reorderPending: boolean;
  scrollToId: string | null;
  onScrollHandled: () => void;
}) {
  const cols = useColumnCount();
  const parentRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const rowCount = Math.ceil(items.length / cols);

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

  // A freshly-added widget lands at the end of the list, likely far below the
  // fold and unmounted — drive the virtualizer by row index instead of the DOM.
  useEffect(() => {
    if (!scrollToId) return;
    const index = items.findIndex((widget) => widget.id === scrollToId);
    if (index < 0) return;
    virtualizer.scrollToIndex(Math.floor(index / cols), { align: 'center' });
    onScrollHandled();
  }, [scrollToId, items, cols, virtualizer, onScrollHandled]);

  return (
    <div ref={parentRef}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((row) => {
          const start = row.index * cols;
          const rowItems = items.slice(start, start + cols);
          const lastIndex = items.length - 1;
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
              {rowItems.map((widget, colIndex) => {
                const index = start + colIndex;
                return (
                  <div key={widget.id} id={`widget-card-${widget.id}`}>
                    <WidgetCard
                      dashboardKey={dashboardKey}
                      widget={widget}
                      moveActions={{
                        onMove: (target) => onMove(widget.id, target),
                        isFirst: index === 0,
                        isLast: index === lastIndex,
                        isPending: reorderPending,
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
