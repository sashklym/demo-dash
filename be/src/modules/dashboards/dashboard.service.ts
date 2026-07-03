import { inject, injectable } from 'inversify';
import { DataSource, type Repository } from 'typeorm';
import { TYPES } from '../../types';
import { NotFoundError } from '../../core/errors';
import { generateKey } from '../../core/random';
import { Dashboard } from './dashboard.entity';

@injectable()
export class DashboardService {
  private readonly repo: Repository<Dashboard>;

  constructor(@inject(TYPES.DataSource) dataSource: DataSource) {
    this.repo = dataSource.getRepository(Dashboard);
  }

  async create(title?: string): Promise<Dashboard> {
    const dashboard = this.repo.create({
      key: generateKey(),
      title: title?.trim() || 'My Dashboard',
    });
    return this.repo.save(dashboard);
  }

  async findByKey(key: string): Promise<Dashboard | null> {
    return this.repo.findOne({ where: { key } });
  }

  /** Resolve a dashboard by key or 404 — the scoping gate reused by the widgets module. */
  async requireByKey(key: string): Promise<Dashboard> {
    const dashboard = await this.findByKey(key);
    if (!dashboard) {
      throw new NotFoundError(`Dashboard "${key}" not found`);
    }
    return dashboard;
  }
}
