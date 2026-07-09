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

/** The canonical grid width, mirroring the server's `core/place-widget`. */
export const COLUMNS = 3;

/** A run of columns in a row that no widget occupies. */
export interface Gap {
  row: number;
  col: number;
  size: number;
}

export type SlotCell = { kind: 'widget'; widget: Widget } | { kind: 'gap'; gap: Gap };

/**
 * One row's widgets, in column order, with its holes made explicit.
 *
 * A hole is any run of columns between — or after — the row's widgets: left by a
 * delete, or by a wide widget that couldn't fit in the tail of the row above. The
 * cells come back sorted by column so their DOM order matches the grid's
 * auto-placement cursor, which is what stops an explicit `col-start` from wrapping.
 */
export function rowCells(widgets: Widget[]): SlotCell[] {
  if (widgets.length === 0) return [];
  const sorted = [...widgets].sort((a, b) => a.col - b.col);
  const row = sorted[0]!.row;
  const cells: SlotCell[] = [];
  let cursor = 0;

  for (const widget of sorted) {
    if (widget.col > cursor) {
      cells.push({ kind: 'gap', gap: { row, col: cursor, size: widget.col - cursor } });
    }
    cells.push({ kind: 'widget', widget });
    cursor = widget.col + widget.size;
  }
  if (cursor < COLUMNS) {
    cells.push({ kind: 'gap', gap: { row, col: cursor, size: COLUMNS - cursor } });
  }
  return cells;
}

/** Every row of a board, top to bottom, each expanded into its widgets and holes. */
export function boardCells(items: Widget[]): SlotCell[] {
  const byRow = new Map<number, Widget[]>();
  for (const widget of items) {
    const row = byRow.get(widget.row);
    if (row) row.push(widget);
    else byRow.set(widget.row, [widget]);
  }
  return [...byRow.entries()].sort(([a], [b]) => a - b).flatMap(([, widgets]) => rowCells(widgets));
}

export type MoveTarget = 'start' | 'prev' | 'next' | 'end';

export interface Slot {
  row: number;
  col: number;
}

/**
 * The furthest-right column a `size`-wide widget may start at. The API rejects a
 * slot the widget would overflow, and a splice only uses the column as an insert
 * position, so pulling it back to the last legal start is both safe and faithful.
 */
const clampCol = (col: number, size: number): number => Math.min(col, COLUMNS - size);

/** Can this hole host the widget? Its columns are contiguous, so width decides. */
const fits = (gap: Gap, size: number): boolean => gap.size >= size;

/**
 * Resolve a move action against the widget's neighbouring *slots* — holes included
 * — and return the slot to drop it on, or null when there is nowhere to go.
 *
 * Stepping over slots rather than over widgets is what lets "move up/down" walk a
 * widget into an adjacent hole instead of skipping past it. A hole too narrow for
 * the widget is stepped over, as though it weren't there.
 *
 * When the neighbour is a widget rather than a hole, the target is that widget's
 * slot: `place` splices *before* its target, so landing after the next widget means
 * aiming at whatever cell follows it. Past the end of the board, row `totalRows` is
 * a fresh row.
 */
export function moveTargetSlot(
  ordered: Widget[],
  index: number,
  target: MoveTarget,
  totalRows: number,
): Slot | null {
  const widget = ordered[index];
  if (!widget) return null;

  const end: Slot = { row: totalRows, col: 0 };
  if (target === 'start') return { row: 0, col: 0 };

  const cells = boardCells(ordered);
  const at = cells.findIndex((cell) => cell.kind === 'widget' && cell.widget.id === widget.id);
  if (at < 0) return null;

  if (target === 'end') {
    const last = cells[cells.length - 1];
    // A trailing hole on the last row is the end of the board — no new row needed.
    if (last?.kind === 'gap' && fits(last.gap, widget.size)) {
      return { row: last.gap.row, col: last.gap.col };
    }
    return end;
  }

  if (target === 'prev') {
    for (let i = at - 1; i >= 0; i--) {
      const cell = cells[i]!;
      if (cell.kind === 'widget') {
        return { row: cell.widget.row, col: clampCol(cell.widget.col, widget.size) };
      }
      // Land flush against the widget the hole sits behind.
      if (fits(cell.gap, widget.size)) {
        return { row: cell.gap.row, col: cell.gap.col + cell.gap.size - widget.size };
      }
    }
    return null;
  }

  // 'next' — one slot forward is the hole immediately ahead, when it fits.
  const ahead = cells[at + 1];
  if (ahead?.kind === 'gap' && fits(ahead.gap, widget.size)) {
    return { row: ahead.gap.row, col: ahead.gap.col };
  }

  // Otherwise land past the next widget: aim at the first slot beyond it.
  let next = at + 1;
  while (next < cells.length && cells[next]!.kind === 'gap') next++;
  if (next >= cells.length) return end;

  for (let i = next + 1; i < cells.length; i++) {
    const cell = cells[i]!;
    if (cell.kind === 'widget') {
      return { row: cell.widget.row, col: clampCol(cell.widget.col, widget.size) };
    }
    if (fits(cell.gap, widget.size)) return { row: cell.gap.row, col: cell.gap.col };
  }
  return end;
}
