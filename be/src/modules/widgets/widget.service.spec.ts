import { describe, expect, it, vi } from 'vitest';
import type { DataSource } from 'typeorm';
import { WidgetService } from './widget.service';
import type { DashboardService } from '../dashboards/dashboard.service';
import { BadRequestError, NotFoundError } from '../../core/errors';

/** Chainable stub for the bulk row-shift UPDATE. */
function queryBuilderStub(execute: ReturnType<typeof vi.fn>) {
  const qb = {
    update: vi.fn(() => qb),
    set: vi.fn(() => qb),
    where: vi.fn(() => qb),
    execute,
  };
  return qb;
}

function makeService(repoOverrides: Record<string, unknown> = {}) {
  const execute = vi.fn(async () => undefined);
  const repo = {
    find: vi.fn(async () => []),
    count: vi.fn(async () => 0),
    findOne: vi.fn(),
    create: vi.fn((x: unknown) => x),
    save: vi.fn(async (x: unknown) => x),
    remove: vi.fn(async () => undefined),
    createQueryBuilder: vi.fn(() => queryBuilderStub(execute)),
    ...repoOverrides,
  };
  const dataSource = { getRepository: () => repo } as unknown as DataSource;
  const dashboards = {
    requireByKey: vi.fn(async () => ({ id: 'dash-1', key: 'k', title: 't' })),
  } as unknown as DashboardService;
  return { service: new WidgetService(dataSource, dashboards), repo, dashboards, execute };
}

/** A stored widget row, defaulted to a size-1 slot. */
const slot = (over: Record<string, unknown> = {}) => ({
  id: 'w',
  dashboard_id: 'dash-1',
  row_index: 0,
  col_index: 0,
  size: 1,
  type: 'text',
  ...over,
});

describe('WidgetService.create', () => {
  it('opens row 0 on an empty dashboard, with a default title and null text for charts', async () => {
    const { service } = makeService({ find: vi.fn(async () => []) });
    const w = await service.create('k', { type: 'line' });
    expect(w).toMatchObject({ row_index: 0, col_index: 0, size: 1, title: 'Line chart', text: null });
    expect(typeof w.seed).toBe('number');
  });

  it('keeps text-widget text and honours an initial size', async () => {
    const { service } = makeService({ find: vi.fn(async () => []) });
    const w = await service.create('k', { type: 'text', text: 'hi', size: 3 });
    expect(w.text).toBe('hi');
    expect(w.size).toBe(3);
  });

  it('clamps an out-of-range size rather than overflowing the grid', async () => {
    const { service } = makeService({ find: vi.fn(async () => []) });
    expect((await service.create('k', { type: 'text', size: 9 })).size).toBe(3);
    expect((await service.create('k', { type: 'text', size: 0 })).size).toBe(1);
  });

  // First fit from the top: the hole beside the size-2 widget, not a new row.
  it('fills the nearest hole from the top', async () => {
    const board = [slot({ id: 'a', row_index: 0, col_index: 0, size: 2 }), slot({ id: 'b', row_index: 1, size: 2 })];
    const { service } = makeService({ find: vi.fn(async () => board) });
    const w = await service.create('k', { type: 'text' });
    expect(w).toMatchObject({ row_index: 0, col_index: 2 });
  });

  it('opens a new row when no row has a wide enough run', async () => {
    const board = [slot({ id: 'a', row_index: 0, col_index: 0, size: 1 }), slot({ id: 'b', row_index: 0, col_index: 2 })];
    const { service } = makeService({ find: vi.fn(async () => board) });
    // A size-2 widget can't use row 0's single free column at index 1.
    const w = await service.create('k', { type: 'text', size: 2 });
    expect(w).toMatchObject({ row_index: 1, col_index: 0 });
  });
});

describe('WidgetService.list', () => {
  it('returns the requested row range with the board’s totals', async () => {
    const items = [slot({ id: 'a' })];
    const { service, repo } = makeService({
      find: vi.fn(async () => items),
      count: vi.fn(async () => 42),
      findOne: vi.fn(async () => ({ row_index: 7 })),
    });
    const page = await service.list('k', { fromRow: 2, toRow: 5 });
    expect(page).toMatchObject({ total: 42, totalRows: 8, fromRow: 2, toRow: 5 });
    expect(page.items).toEqual(items);
    expect(repo.find).toHaveBeenCalledWith(
      expect.objectContaining({ order: { row_index: 'ASC', col_index: 'ASC', created_at: 'ASC' } }),
    );
  });

  it('reports zero rows for an empty dashboard', async () => {
    const { service } = makeService({ findOne: vi.fn(async () => null) });
    expect((await service.list('k')).totalRows).toBe(0);
  });

  it('defaults to a 20-row window and caps an over-wide one', async () => {
    const { service } = makeService({ findOne: vi.fn(async () => null) });
    expect(await service.list('k', { fromRow: 5 })).toMatchObject({ fromRow: 5, toRow: 24 });
    expect(await service.list('k', { fromRow: 0, toRow: 5000 })).toMatchObject({ toRow: 99 });
  });

  it('never returns an inverted range', async () => {
    const { service } = makeService({ findOne: vi.fn(async () => null) });
    expect(await service.list('k', { fromRow: 9, toRow: 2 })).toMatchObject({ fromRow: 9, toRow: 9 });
  });
});

describe('WidgetService.update', () => {
  it('grows a widget in place when its row has the room', async () => {
    const widget = slot({ id: 'a', size: 1 });
    const { service } = makeService({
      findOne: vi.fn(async () => widget),
      find: vi.fn(async () => [widget]),
    });
    const w = await service.update('k', 'a', { size: 3 });
    expect(w).toMatchObject({ size: 3, row_index: 0, col_index: 0 });
  });

  it('re-places a widget that no longer fits its row', async () => {
    const widget = slot({ id: 'a', row_index: 0, col_index: 0, size: 1 });
    const neighbour = slot({ id: 'b', row_index: 0, col_index: 1, size: 2 });
    const { service } = makeService({
      findOne: vi.fn(async () => widget),
      find: vi.fn(async () => [widget, neighbour]),
    });
    // Growing to 2 would collide with `b`; row 0 has no run of 2, so it opens row 1.
    const w = await service.update('k', 'a', { size: 2 });
    expect(w).toMatchObject({ size: 2, row_index: 1, col_index: 0 });
  });

  it('leaves the slot alone for a non-size edit', async () => {
    const widget = slot({ id: 'a', title: 'old' });
    const { service } = makeService({ findOne: vi.fn(async () => widget) });
    const w = await service.update('k', 'a', { title: 'new' });
    expect(w).toMatchObject({ title: 'new', row_index: 0, col_index: 0 });
  });

  it('throws NotFoundError when the widget is missing', async () => {
    const { service, repo } = makeService();
    repo.findOne.mockResolvedValue(null);
    await expect(service.update('k', 'missing', { title: 'x' })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('WidgetService.delete', () => {
  it('leaves the hole open when the row still holds a widget', async () => {
    const widget = slot({ id: 'a', row_index: 1 });
    const { service, execute } = makeService({
      findOne: vi.fn(async () => widget),
      count: vi.fn(async () => 1),
    });
    await service.delete('k', 'a');
    expect(execute).not.toHaveBeenCalled();
  });

  it('collapses a row it emptied, pulling the rows below up', async () => {
    const widget = slot({ id: 'a', row_index: 1 });
    const { service, execute } = makeService({
      findOne: vi.fn(async () => widget),
      count: vi.fn(async () => 0),
    });
    await service.delete('k', 'a');
    expect(execute).toHaveBeenCalledTimes(1);
  });
});

describe('WidgetService.place', () => {
  it('moves a widget onto a free slot and preserves the other holes', async () => {
    const widget = slot({ id: 'a', row_index: 2, col_index: 0, size: 1 });
    const other = slot({ id: 'b', row_index: 0, col_index: 0, size: 2 });
    const { service, repo } = makeService({
      findOne: vi.fn(async () => widget),
      find: vi.fn(async () => [other, widget]),
    });
    const w = await service.place('k', 'a', 0, 2);
    expect(w).toMatchObject({ row_index: 0, col_index: 2 });
    // One save for the move; no board-wide compaction.
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('rejects a slot the widget would overflow', async () => {
    const widget = slot({ id: 'a', size: 2 });
    const { service } = makeService({ findOne: vi.fn(async () => widget) });
    await expect(service.place('k', 'a', 0, 2)).rejects.toBeInstanceOf(BadRequestError);
  });

  it('re-packs from the target row down when the slot is taken', async () => {
    const widget = slot({ id: 'c', row_index: 1, col_index: 0, size: 1 });
    const a = slot({ id: 'a', row_index: 0, col_index: 0, size: 1 });
    const b = slot({ id: 'b', row_index: 0, col_index: 1, size: 1 });
    const { service } = makeService({
      findOne: vi.fn(async () => widget),
      find: vi.fn(async () => [a, b, widget]),
    });
    // Drop `c` onto `a`'s slot: `c` takes (0,0) and `a`, `b` shift right.
    await service.place('k', 'c', 0, 0);
    expect(widget).toMatchObject({ row_index: 0, col_index: 0 });
    expect(a).toMatchObject({ row_index: 0, col_index: 1 });
    expect(b).toMatchObject({ row_index: 0, col_index: 2 });
  });

  it('throws NotFoundError for a widget the key does not own', async () => {
    const { service, repo } = makeService();
    repo.findOne.mockResolvedValue(null);
    await expect(service.place('k', 'missing', 0, 0)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('WidgetService.reorder', () => {
  it('compacts the board into the requested order, squeezing out holes', async () => {
    const widgets = [
      slot({ id: 'a', row_index: 0, col_index: 0, size: 2 }),
      slot({ id: 'b', row_index: 1, col_index: 0, size: 2 }),
      slot({ id: 'c', row_index: 2, col_index: 0, size: 1 }),
    ];
    const { service } = makeService({ find: vi.fn(async () => widgets) });
    const result = await service.reorder('k', ['c', 'a', 'b']);
    expect(result.map((w) => w.id)).toEqual(['c', 'a', 'b']);
    // [1,2,2] → row 0: c(0) a(1..2); row 1: b(0..1)
    expect(result[0]).toMatchObject({ row_index: 0, col_index: 0 });
    expect(result[1]).toMatchObject({ row_index: 0, col_index: 1 });
    expect(result[2]).toMatchObject({ row_index: 1, col_index: 0 });
  });

  it('keeps unlisted widgets, in their existing order, at the end', async () => {
    const widgets = [slot({ id: 'a' }), slot({ id: 'b', col_index: 1 })];
    const { service } = makeService({ find: vi.fn(async () => widgets) });
    expect((await service.reorder('k', ['b'])).map((w) => w.id)).toEqual(['b', 'a']);
  });
});

describe('WidgetService chart data', () => {
  it('serves deterministic sentiment data for the widget’s period', async () => {
    const { service, repo } = makeService();
    repo.findOne.mockResolvedValue({ id: 'w', dashboard_id: 'dash-1', type: 'line', seed: 999, period: 'week' });
    const a = await service.chartData('k', 'w');
    const b = await service.chartData('k', 'w');
    expect(a).toEqual(b);
    expect(a.period).toBe('week');
    expect(a.points).toHaveLength(7);
    expect(a.points[0]).toMatchObject({
      label: expect.any(String),
      positive: expect.any(Number),
      neutral: expect.any(Number),
      negative: expect.any(Number),
    });
  });

  it('honours an explicit period override and changes the bucketing', async () => {
    const { service, repo } = makeService();
    repo.findOne.mockResolvedValue({ id: 'w', dashboard_id: 'dash-1', type: 'line', seed: 999, period: 'week' });
    const year = await service.chartData('k', 'w', 'year');
    expect(year.period).toBe('year');
    expect(year.points).toHaveLength(12);
  });

  it('rejects chart data for text widgets with BadRequestError', async () => {
    const { service, repo } = makeService();
    repo.findOne.mockResolvedValue({ id: 'w', dashboard_id: 'dash-1', type: 'text', seed: 1, period: 'month' });
    await expect(service.chartData('k', 'w')).rejects.toBeInstanceOf(BadRequestError);
  });

  it('regenerate assigns a new seed', async () => {
    const { service, repo } = makeService();
    const widget = { id: 'w', dashboard_id: 'dash-1', type: 'bar', seed: 1 };
    repo.findOne.mockResolvedValue(widget);
    await service.regenerate('k', 'w');
    expect(widget.seed).not.toBe(1);
  });
});
