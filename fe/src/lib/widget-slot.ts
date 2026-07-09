import { cn } from '@/lib/utils';
import type { Widget } from '@/lib/api/generated/model';

/**
 * Grid classes for a widget's stored slot.
 *
 * The board is canonical at 3 columns (`lg` and up), which is where `col-start`
 * applies — it is what reproduces the server's rows, holes included. An item whose
 * explicit start column sits behind the auto-placement cursor moves to the next
 * row, so a gap left by a delete stays a gap instead of being backfilled.
 *
 * Below `lg` the stored columns can't be honoured (a 3-wide row doesn't fit in 2
 * columns), so `col-start` is deliberately absent and CSS grid packs the row
 * greedily — the same left-to-right fill, just wrapped.
 *
 * These are literal strings because Tailwind cannot see interpolated class names.
 */
const SPAN_CLASS: Record<number, string> = {
  1: '',
  2: 'md:col-span-2',
  3: 'md:col-span-2 lg:col-span-3',
};

const START_CLASS: Record<number, string> = {
  0: 'lg:col-start-1',
  1: 'lg:col-start-2',
  2: 'lg:col-start-3',
};

export function slotClass(widget: Pick<Widget, 'size' | 'col'>): string {
  return cn(SPAN_CLASS[widget.size], START_CLASS[widget.col]);
}

export type MoveTarget = 'start' | 'prev' | 'next' | 'end';

/**
 * Resolve a move action against the widget's neighbours in reading order, and
 * return the slot to drop it on — or null when there is nowhere to go.
 *
 * `place` splices the widget in *before* the slot's occupant, so "move down" means
 * targeting the widget two ahead: landing after the immediate next one. Past the end
 * of the board, row `totalRows` is a fresh row.
 */
export function moveTargetSlot(
  ordered: Pick<Widget, 'row' | 'col'>[],
  index: number,
  target: MoveTarget,
  totalRows: number,
): { row: number; col: number } | null {
  const end = { row: totalRows, col: 0 };
  if (target === 'start') return { row: 0, col: 0 };
  if (target === 'end') return end;
  if (target === 'prev') {
    const prev = ordered[index - 1];
    return prev ? { row: prev.row, col: prev.col } : null;
  }
  const after = ordered[index + 2];
  return after ? { row: after.row, col: after.col } : end;
}
