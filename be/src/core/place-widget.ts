/**
 * Widget placement on the canonical 3-column grid.
 *
 * A widget owns `size` contiguous columns starting at `col` in row `row`. A row's
 * occupancy is therefore three bits, and "is there room here?" is a mask test.
 * Everything in this file is pure — the service supplies the current placements
 * and persists whatever comes back.
 */

/** The canonical grid width. Narrower viewports re-pack; the stored layout is 3. */
export const COLUMNS = 3;

export interface Slot {
  row: number;
  col: number;
}

/** The part of a widget that matters to placement. */
export interface Placement extends Slot {
  size: number;
}

/** Clamp an arbitrary number to a legal span. */
export function clampSize(size: number): number {
  return Math.min(COLUMNS, Math.max(1, Math.trunc(size)));
}

/** Bit mask of the columns a placement occupies. */
function span(col: number, size: number): number {
  return ((1 << size) - 1) << col;
}

/**
 * Occupancy bitmask per row, indexed by row. Rows are contiguous (an emptied row
 * collapses), so a gap in this array would mean a broken invariant, not a blank row.
 */
export function buildMasks(placements: Placement[]): number[] {
  const rows = placements.reduce((max, p) => Math.max(max, p.row), -1) + 1;
  const masks = new Array<number>(rows).fill(0);
  for (const p of placements) {
    masks[p.row]! |= span(p.col, p.size);
  }
  return masks;
}

/**
 * Leftmost start column of a *run* of `size` free columns, or null. The run is the
 * point: a row holding size-1 widgets at columns 0 and 2 has a free column but no
 * run of two, so a size-2 widget must skip it.
 */
export function firstFitInRow(mask: number, size: number): number | null {
  for (let col = 0; col + size <= COLUMNS; col++) {
    if ((mask & span(col, size)) === 0) return col;
  }
  return null;
}

/** Is the run at `col` free in this row? */
export function fitsAt(mask: number, col: number, size: number): boolean {
  return col >= 0 && col + size <= COLUMNS && (mask & span(col, size)) === 0;
}

/**
 * First row from the top with a run of `size` free columns. When no row has one,
 * the widget opens a new row at the bottom.
 */
export function firstFit(placements: Placement[], size: number): Slot {
  const masks = buildMasks(placements);
  for (let row = 0; row < masks.length; row++) {
    const col = firstFitInRow(masks[row]!, size);
    if (col !== null) return { row, col };
  }
  return { row: masks.length, col: 0 };
}

/**
 * Greedy left-to-right, top-to-bottom placement of `sizes` onto empty rows,
 * starting at `startRow`. This is the compaction used by `reorder` and by a move
 * that lands on an occupied slot — it squeezes out every hole below `startRow`.
 *
 * A widget that doesn't fit in the remaining columns opens the next row and leaves
 * the tail of the current one empty; it never backfills, which is exactly what CSS
 * grid does with the default `grid-auto-flow: row`.
 */
export function compact(sizes: number[], startRow = 0): Slot[] {
  let row = startRow;
  let used = 0;
  return sizes.map((size) => {
    const width = clampSize(size);
    if (used + width > COLUMNS) {
      row++;
      used = 0;
    }
    const slot: Slot = { row, col: used };
    used += width;
    return slot;
  });
}
