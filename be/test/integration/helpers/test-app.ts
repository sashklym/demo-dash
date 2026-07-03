import 'reflect-metadata';
import type { DataSource } from 'typeorm';
import { createDataSource } from '../../../src/db/data-source';
import { buildContainer } from '../../../src/container';
import { buildApp } from '../../../src/app';
import type { AppInstance } from '../../../src/core/http';
import { Dashboard } from '../../../src/modules/dashboards/dashboard.entity';
import { Widget } from '../../../src/modules/widgets/widget.entity';

export interface TestApp {
  app: AppInstance;
  dataSource: DataSource;
  /** Truncate all tables between tests. */
  reset(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Boots the real Fastify app against a fresh in-memory SQLite DB (schema created
 * from the entities). Exercise it with `app.inject(...)` — no network, same wiring
 * as production.
 */
export async function buildTestApp(): Promise<TestApp> {
  const dataSource = createDataSource({ database: ':memory:', synchronize: true });
  await dataSource.initialize();
  const container = buildContainer(dataSource);
  const app = await buildApp(container);

  return {
    app,
    dataSource,
    async reset() {
      await dataSource.getRepository(Widget).createQueryBuilder().delete().execute();
      await dataSource.getRepository(Dashboard).createQueryBuilder().delete().execute();
    },
    async close() {
      await app.close();
      if (dataSource.isInitialized) await dataSource.destroy();
    },
  };
}
