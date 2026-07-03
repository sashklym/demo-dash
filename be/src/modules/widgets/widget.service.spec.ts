import { describe, expect, it, vi } from 'vitest';
import type { DataSource } from 'typeorm';
import { WidgetService } from './widget.service';
import type { DashboardService } from '../dashboards/dashboard.service';
import { BadRequestError, NotFoundError } from '../../core/errors';

function makeService(repoOverrides: Record<string, unknown> = {}) {
  const repo = {
    find: vi.fn(async () => []),
    findOne: vi.fn(),
    create: vi.fn((x: unknown) => x),
    save: vi.fn(async (x: unknown) => x),
    remove: vi.fn(async () => undefined),
    maximum: vi.fn(async () => null),
    ...repoOverrides,
  };
  const dataSource = { getRepository: () => repo } as unknown as DataSource;
  const dashboards = {
    requireByKey: vi.fn(async () => ({ id: 'dash-1', key: 'k', title: 't' })),
  } as unknown as DashboardService;
  return { service: new WidgetService(dataSource, dashboards), repo, dashboards };
}

describe('WidgetService', () => {
  it('appends at position max+1 with a default title and null text for charts', async () => {
    const { service } = makeService({ maximum: vi.fn(async () => 4) });
    const w = await service.create('k', { type: 'line' });
    expect(w.position).toBe(5);
    expect(w.title).toBe('Line chart');
    expect(w.text).toBeNull();
    expect(typeof w.seed).toBe('number');
  });

  it('places the first widget at position 0 and keeps text-widget text', async () => {
    const { service } = makeService({ maximum: vi.fn(async () => null) });
    const w = await service.create('k', { type: 'text', text: 'hi' });
    expect(w.position).toBe(0);
    expect(w.text).toBe('hi');
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
