import { describe, expect, it, vi } from 'vitest';
import type { DataSource } from 'typeorm';
import { DashboardService } from './dashboard.service';
import { NotFoundError } from '../../core/errors';

function makeService() {
  const repo = {
    create: vi.fn((x: unknown) => x),
    save: vi.fn(async (x: Record<string, unknown>) => ({ id: 'id-1', ...x })),
    findOne: vi.fn(),
  };
  const dataSource = { getRepository: () => repo } as unknown as DataSource;
  return { service: new DashboardService(dataSource), repo };
}

describe('DashboardService', () => {
  it('generates a key and defaults the title', async () => {
    const { service, repo } = makeService();
    const dashboard = await service.create();
    expect(dashboard.title).toBe('My Dashboard');
    expect(typeof dashboard.key).toBe('string');
    expect(repo.save).toHaveBeenCalled();
  });

  it('trims a provided title', async () => {
    const { service } = makeService();
    expect((await service.create('  Board  ')).title).toBe('Board');
  });

  it('requireByKey throws NotFoundError when missing', async () => {
    const { service, repo } = makeService();
    repo.findOne.mockResolvedValue(null);
    await expect(service.requireByKey('nope')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('requireByKey returns the dashboard when found', async () => {
    const { service, repo } = makeService();
    repo.findOne.mockResolvedValue({ id: '1', key: 'k', title: 't' });
    await expect(service.requireByKey('k')).resolves.toMatchObject({ key: 'k' });
  });
});
