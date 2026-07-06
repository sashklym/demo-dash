import { describe, expect, it, vi } from 'vitest';
import type { DataSource } from 'typeorm';
import { WidgetService } from './widget.service';
import type { DashboardService } from '../dashboards/dashboard.service';
import { BadRequestError, NotFoundError } from '../../core/errors';

function makeService(repoOverrides: Record<string, unknown> = {}) {
  const repo = {
    find: vi.fn(async () => []),
    findAndCount: vi.fn(async () => [[], 0]),
    findOne: vi.fn(),
    create: vi.fn((x: unknown) => x),
    save: vi.fn(async (x: unknown) => x),
    remove: vi.fn(async () => undefined),
    ...repoOverrides,
  };
  const dataSource = { getRepository: () => repo } as unknown as DataSource;
  const dashboards = {
    requireByKey: vi.fn(async () => ({ id: 'dash-1', key: 'k', title: 't' })),
  } as unknown as DashboardService;
  return { service: new WidgetService(dataSource, dashboards), repo, dashboards };
}

describe('WidgetService', () => {
  it('appends after the last rank with a default title and null text for charts', async () => {
    const { service } = makeService({ findOne: vi.fn(async () => ({ rank: 'a0' })) });
    const w = await service.create('k', { type: 'line' });
    expect(w.rank > 'a0').toBe(true);
    expect(w.title).toBe('Line chart');
    expect(w.text).toBeNull();
    expect(typeof w.seed).toBe('number');
  });

  it('gives the first widget a valid rank and keeps text-widget text', async () => {
    const { service } = makeService({ findOne: vi.fn(async () => null) });
    const w = await service.create('k', { type: 'text', text: 'hi' });
    expect(typeof w.rank).toBe('string');
    expect(w.rank.length).toBeGreaterThan(0);
    expect(w.text).toBe('hi');
  });

  it('moveToPosition places a widget between its new neighbors (single save)', async () => {
    const moved = { id: 'c', dashboard_id: 'dash-1', rank: 'a2' };
    const { service, repo } = makeService({
      findOne: vi.fn(async () => moved),
      find: vi.fn(async () => [
        { id: 'a', rank: 'a0' },
        { id: 'b', rank: 'a1' },
        { id: 'c', rank: 'a2' },
      ]),
    });
    // Move 'c' to the front (index 0): its rank must sort before 'a0'.
    const result = await service.moveToPosition('k', 'c', 0);
    expect(result.rank < 'a0').toBe(true);
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledWith(moved);
  });

  it('moveToPosition clamps an out-of-range target to the end', async () => {
    const moved = { id: 'a', dashboard_id: 'dash-1', rank: 'a0' };
    const { service } = makeService({
      findOne: vi.fn(async () => moved),
      find: vi.fn(async () => [
        { id: 'a', rank: 'a0' },
        { id: 'b', rank: 'a1' },
      ]),
    });
    const result = await service.moveToPosition('k', 'a', 999);
    // Others are [b(a1)]; appending after b means rank > 'a1'.
    expect(result.rank > 'a1').toBe(true);
  });

  it('reorder assigns fresh ascending ranks in the requested order', async () => {
    const widgets = [
      { id: 'a', rank: 'a0' },
      { id: 'b', rank: 'a1' },
      { id: 'c', rank: 'a2' },
    ];
    const { service } = makeService({ find: vi.fn(async () => widgets) });
    const result = await service.reorder('k', ['c', 'a', 'b']);
    expect(result.map((w) => w.id)).toEqual(['c', 'a', 'b']);
    expect(result[0]!.rank < result[1]!.rank).toBe(true);
    expect(result[1]!.rank < result[2]!.rank).toBe(true);
  });

  it('list returns a page envelope with the dashboard-scoped total', async () => {
    const items = [{ id: 'a', rank: 'a0' }];
    const { service } = makeService({ findAndCount: vi.fn(async () => [items, 42]) });
    const page = await service.list('k', { offset: 0, limit: 10 });
    expect(page.total).toBe(42);
    expect(page.items).toEqual(items);
    expect(page.limit).toBe(10);
  });

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

  it('throws NotFoundError when the widget is missing', async () => {
    const { service, repo } = makeService();
    repo.findOne.mockResolvedValue(null);
    await expect(service.update('k', 'missing', { title: 'x' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('regenerate assigns a new seed', async () => {
    const { service, repo } = makeService();
    const widget = { id: 'w', dashboard_id: 'dash-1', type: 'bar', seed: 1 };
    repo.findOne.mockResolvedValue(widget);
    await service.regenerate('k', 'w');
    expect(widget.seed).not.toBe(1);
  });
});
