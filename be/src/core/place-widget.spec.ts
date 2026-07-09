import { describe, expect, it } from 'vitest';
import { buildMasks, clampSize, compact, firstFit, firstFitInRow, fitsAt } from './place-widget';
import type { Placement } from './place-widget';

/** `[w][ ][w]` → columns 0 and 2 taken. */
const mask = (...cols: number[]) => cols.reduce((m, c) => m | (1 << c), 0);

describe('firstFitInRow', () => {
  it('places any size in an empty row at column 0', () => {
    expect(firstFitInRow(0, 1)).toBe(0);
    expect(firstFitInRow(0, 2)).toBe(0);
    expect(firstFitInRow(0, 3)).toBe(0);
  });

  it('skips occupied columns to the leftmost free run', () => {
    expect(firstFitInRow(mask(0), 1)).toBe(1);
    expect(firstFitInRow(mask(0), 2)).toBe(1);
    expect(firstFitInRow(mask(0), 3)).toBeNull();
  });

  it('finds a run at the front when only the tail is taken', () => {
    expect(firstFitInRow(mask(2), 1)).toBe(0);
    expect(firstFitInRow(mask(2), 2)).toBe(0);
    expect(firstFitInRow(mask(2), 3)).toBeNull();
  });

  // The contiguity case: one free column, but not a *run* of two.
  it('rejects a size-2 widget when the free columns are not adjacent', () => {
    expect(firstFitInRow(mask(0, 2), 1)).toBe(1);
    expect(firstFitInRow(mask(0, 2), 2)).toBeNull();
    expect(firstFitInRow(mask(0, 2), 3)).toBeNull();
  });

  it('rejects everything in a full row', () => {
    expect(firstFitInRow(mask(0, 1, 2), 1)).toBeNull();
    expect(firstFitInRow(mask(0, 1, 2), 2)).toBeNull();
  });
});

describe('fitsAt', () => {
  it('accepts a free run and rejects an overlapping or overflowing one', () => {
    expect(fitsAt(mask(0), 1, 2)).toBe(true);
    expect(fitsAt(mask(0), 0, 1)).toBe(false);
    expect(fitsAt(mask(2), 1, 2)).toBe(false); // would overlap column 2
    expect(fitsAt(0, 2, 2)).toBe(false); // would run past the grid
    expect(fitsAt(0, -1, 1)).toBe(false);
  });
});

describe('buildMasks', () => {
  it('is empty for an empty board', () => {
    expect(buildMasks([])).toEqual([]);
  });

  it('ors every placement into its row', () => {
    const placements: Placement[] = [
      { row: 0, col: 0, size: 2 },
      { row: 0, col: 2, size: 1 },
      { row: 1, col: 0, size: 1 },
    ];
    expect(buildMasks(placements)).toEqual([mask(0, 1, 2), mask(0)]);
  });
});

describe('firstFit', () => {
  it('opens row 0 on an empty board', () => {
    expect(firstFit([], 3)).toEqual({ row: 0, col: 0 });
  });

  it('fills the hole beside a size-2 widget', () => {
    const board: Placement[] = [
      { row: 0, col: 0, size: 2 },
      { row: 1, col: 0, size: 2 },
    ];
    expect(firstFit(board, 1)).toEqual({ row: 0, col: 2 });
  });

  // A size-2 widget must skip a row whose two free columns aren't adjacent.
  it('skips a row with non-adjacent free columns and takes the next real run', () => {
    const board: Placement[] = [
      { row: 0, col: 0, size: 1 },
      { row: 0, col: 2, size: 1 },
      { row: 1, col: 2, size: 1 },
    ];
    expect(firstFit(board, 1)).toEqual({ row: 0, col: 1 });
    expect(firstFit(board, 2)).toEqual({ row: 1, col: 0 });
  });

  it('appends a new row when no row has a big enough run', () => {
    const board: Placement[] = [
      { row: 0, col: 0, size: 2 },
      { row: 1, col: 0, size: 1 },
      { row: 1, col: 1, size: 1 },
    ];
    expect(firstFit(board, 3)).toEqual({ row: 2, col: 0 });
    expect(firstFit(board, 2)).toEqual({ row: 2, col: 0 });
    expect(firstFit(board, 1)).toEqual({ row: 0, col: 2 });
  });

  it('scans from the top, not from the end', () => {
    const board: Placement[] = [
      { row: 0, col: 0, size: 1 },
      { row: 1, col: 0, size: 3 },
    ];
    expect(firstFit(board, 1)).toEqual({ row: 0, col: 1 });
  });
});

describe('compact', () => {
  const rowsOf = (sizes: number[]) => {
    const slots = compact(sizes);
    const rows: number[][] = [];
    slots.forEach((slot, i) => (rows[slot.row] ??= []).push(sizes[i]!));
    return rows;
  };

  it('is empty for no widgets', () => {
    expect(compact([])).toEqual([]);
  });

  it.each([
    [[1, 1, 1], [[1, 1, 1]]],
    [[2, 1], [[2, 1]]],
    [[1, 2], [[1, 2]]],
    [
      [2, 2],
      [[2], [2]],
    ],
    [[3], [[3]]],
    [
      [1, 3],
      [[1], [3]],
    ],
    [
      [3, 1, 1, 1],
      [[3], [1, 1, 1]],
    ],
    [
      [2, 1, 1, 2],
      [
        [2, 1],
        [1, 2],
      ],
    ],
  ])('packs %j into %j', (sizes, expected) => {
    expect(rowsOf(sizes)).toEqual(expected);
  });

  it('leaves the tail of a row empty rather than backfilling', () => {
    // [2,2,1] — the size-1 must NOT slip into row 0's leftover column.
    expect(compact([2, 2, 1])).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 1, col: 2 },
    ]);
  });

  it('offsets every slot by startRow', () => {
    expect(compact([2, 2], 4)).toEqual([
      { row: 4, col: 0 },
      { row: 5, col: 0 },
    ]);
  });

  it('clamps an oversized span instead of overflowing the grid', () => {
    expect(compact([9])).toEqual([{ row: 0, col: 0 }]);
    expect(clampSize(9)).toBe(3);
    expect(clampSize(0)).toBe(1);
  });
});
