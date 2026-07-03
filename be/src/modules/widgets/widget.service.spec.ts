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

  it('serves deterministic chart data of the requested length', async () => {
    const { service, repo } = makeService();
    repo.findOne.mockResolvedValue({ id: 'w', dashboard_id: 'dash-1', type: 'line', seed: 999 });
    const a = await service.chartData('k', 'w', 10);
    const b = await service.chartData('k', 'w', 10);
    expect(a).toEqual(b);
    expect(a).toHaveLength(10);
  });

  it('rejects chart data for text widgets with BadRequestError', async () => {
    const { service, repo } = makeService();
    repo.findOne.mockResolvedValue({ id: 'w', dashboard_id: 'dash-1', type: 'text', seed: 1 });
    await expect(service.chartData('k', 'w', 5)).rejects.toBeInstanceOf(BadRequestError);
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
