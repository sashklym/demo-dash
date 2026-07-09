import { describe, expect, it } from 'vitest';
import { boardCells, moveTargetSlot, rowCells, slotClass } from './widget-slot';
import type { Widget } from '@/lib/api/generated/model';

/** A size-1 widget at a given reading position, three to a row. */
const widget = (i: number, over: Partial<Widget> = {}): Widget => ({
  id: String(i),
  type: 'line',
  row: Math.floor(i / 3),
  col: i % 3,
  size: 1,
  title: `W${i}`,
  text: null,
  period: 'month',
  ...over,
});

describe('slotClass', () => {
  it('gives a size-1 widget no span, only its start column', () => {
    expect(slotClass({ size: 1, col: 0 })).toBe('lg:col-start-1');
    expect(slotClass({ size: 1, col: 2 })).toBe('lg:col-start-3');
  });

  it('spans a size-2 widget from `md` up', () => {
    expect(slotClass({ size: 2, col: 0 })).toBe('md:col-span-2 lg:col-start-1');
  });

  // A size-3 widget is full-width at `md` (2 of 2) and at `lg` (3 of 3).
  it('spans a size-3 widget across the whole row', () => {
    expect(slotClass({ size: 3, col: 0 })).toBe('md:col-span-2 lg:col-span-3 lg:col-start-1');
  });
});

/** Shorthand: the (col, size) of each gap a row yields. */
const gapsOf = (cells: ReturnType<typeof rowCells>) =>
  cells.filter((c) => c.kind === 'gap').map((c) => (c.kind === 'gap' ? [c.gap.col, c.gap.size] : []));

describe('rowCells', () => {
  it('yields no gaps for a full row', () => {
    const cells = rowCells([widget(0), widget(1), widget(2)]);
    expect(gapsOf(cells)).toEqual([]);
    expect(cells).toHaveLength(3);
  });

  it('reports the trailing hole of a partly-filled row', () => {
    expect(gapsOf(rowCells([widget(0)]))).toEqual([[1, 2]]);
    expect(gapsOf(rowCells([widget(0), widget(1)]))).toEqual([[2, 1]]);
  });

  it('reports a hole between two widgets (a delete in the middle)', () => {
    const cells = rowCells([widget(0, { col: 0 }), widget(2, { col: 2 })]);
    expect(gapsOf(cells)).toEqual([[1, 1]]);
    // Cells stay in column order so the grid's auto-placement cursor advances.
    expect(cells.map((c) => (c.kind === 'gap' ? 'gap' : 'widget'))).toEqual(['widget', 'gap', 'widget']);
  });

  it('accounts for a wide widget’s span', () => {
    expect(gapsOf(rowCells([widget(0, { size: 2, col: 0 })]))).toEqual([[2, 1]]);
    expect(gapsOf(rowCells([widget(0, { size: 1, col: 2 })]))).toEqual([[0, 2]]);
    expect(gapsOf(rowCells([widget(0, { size: 3, col: 0 })]))).toEqual([]);
  });

  it('is empty for a row with no widgets', () => {
    expect(rowCells([])).toEqual([]);
  });
});

describe('boardCells', () => {
  it('expands every row, top to bottom, holes included', () => {
    // Row 0 full; row 1 holds one widget, so it trails a 2-wide hole.
    const cells = boardCells([widget(0), widget(1), widget(2), widget(3)]);
    const gaps = cells.filter((c) => c.kind === 'gap').map((c) => (c.kind === 'gap' ? c.gap : null));
    expect(gaps).toEqual([{ row: 1, col: 1, size: 2 }]);
    expect(cells.filter((c) => c.kind === 'widget')).toHaveLength(4);
  });
});

describe('moveTargetSlot', () => {
  // Reading order w0..w3: (0,0) (0,1) (0,2) (1,0), so totalRows = 2.
  const ordered = [widget(0), widget(1), widget(2), widget(3)];

  it('sends "start" to the very first slot', () => {
    expect(moveTargetSlot(ordered, 2, 'start', 2)).toEqual({ row: 0, col: 0 });
  });

  // w3 sits alone on row 1, so the board trails a 2-wide hole at (1,1).
  it('sends "end" to the trailing hole rather than opening a new row', () => {
    expect(moveTargetSlot(ordered, 0, 'end', 2)).toEqual({ row: 1, col: 1 });
  });

  it('sends "end" to a fresh row when the last row is full', () => {
    const full = [widget(0), widget(1), widget(2)];
    expect(moveTargetSlot(full, 0, 'end', 1)).toEqual({ row: 1, col: 0 });
  });

  it('sends "prev" to the previous widget’s slot', () => {
    expect(moveTargetSlot(ordered, 2, 'prev', 2)).toEqual({ row: 0, col: 1 });
  });

  it('has no target for "prev" on the first widget', () => {
    expect(moveTargetSlot(ordered, 0, 'prev', 2)).toBeNull();
  });

  // `place` splices in *before* the slot's occupant, so landing after the next
  // widget means targeting the cell beyond it.
  it('sends "next" to the slot two ahead', () => {
    expect(moveTargetSlot(ordered, 0, 'next', 2)).toEqual({ row: 0, col: 2 });
  });

  it('sends "next" into the trailing hole once past the last widget', () => {
    expect(moveTargetSlot(ordered, 2, 'next', 2)).toEqual({ row: 1, col: 1 });
  });

  it('sends "next" past the end when the last row has no room', () => {
    const full = [widget(0), widget(1), widget(2)];
    expect(moveTargetSlot(full, 1, 'next', 1)).toEqual({ row: 1, col: 0 });
  });

  describe('holes are move targets', () => {
    // Row 0: A(0,0) · hole(0,1) · B(0,2). This is the board a delete leaves behind.
    const holed = [widget(0, { row: 0, col: 0 }), widget(1, { row: 0, col: 2 })];

    it('steps "next" into the hole immediately ahead', () => {
      expect(moveTargetSlot(holed, 0, 'next', 1)).toEqual({ row: 0, col: 1 });
    });

    it('steps "prev" into the hole immediately behind, flush against the widget', () => {
      expect(moveTargetSlot(holed, 1, 'prev', 1)).toEqual({ row: 0, col: 1 });
    });

    // A 2-wide widget cannot enter a 1-wide hole, so the hole is stepped over.
    it('steps over a hole too narrow for the widget', () => {
      const wide = [widget(0, { row: 0, col: 0 }), widget(1, { row: 0, col: 2, size: 1 }), widget(2, { row: 1, col: 0, size: 2 })];
      // Moving the size-2 widget up skips the 1-wide hole and targets B's slot,
      // clamped to the last column a 2-wide widget may start at.
      expect(moveTargetSlot(wide, 2, 'prev', 2)).toEqual({ row: 0, col: 1 });
    });

    it('lands "prev" flush against the widget inside a wide hole', () => {
      // Row 0 is just hole(0,0)-(0,1) · B(0,2); B steps back to column 1, not 0.
      const board = [widget(0, { row: 0, col: 2 })];
      expect(moveTargetSlot(board, 0, 'prev', 1)).toEqual({ row: 0, col: 1 });
    });
  });

  it('honours a wide widget’s actual slot rather than assuming three per row', () => {
    const wide = [widget(0, { size: 2, row: 0, col: 0 }), widget(1, { row: 0, col: 2 }), widget(2, { row: 1, col: 0 })];
    expect(moveTargetSlot(wide, 2, 'prev', 2)).toEqual({ row: 0, col: 2 });
  });
});
