import 'reflect-metadata';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Dashboard } from '../modules/dashboards/dashboard.entity';
import { Widget } from '../modules/widgets/widget.entity';
import { CreateDashboards1710000000000 } from './migrations/1710000000000-CreateDashboards';
import { CreateWidgets1710000001000 } from './migrations/1710000001000-CreateWidgets';
import { AddWidgetPeriod1710000002000 } from './migrations/1710000002000-AddWidgetPeriod';
import { AddWidgetRank1710000003000 } from './migrations/1710000003000-AddWidgetRank';
import { AddWidgetRowLayout1710000004000 } from './migrations/1710000004000-AddWidgetRowLayout';

export interface CreateDataSourceOptions {
  /** SQLite file path, or ':memory:' for tests. */
  database: string;
  /** Auto-create the schema from entities (tests only). Prod/dev use migrations. */
  synchronize?: boolean;
  logging?: boolean;
}

export function createDataSource(opts: CreateDataSourceOptions): DataSource {
  if (opts.database !== ':memory:') {
    const dir = dirname(opts.database);
    if (dir && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  const options: DataSourceOptions = {
    type: 'better-sqlite3',
    database: opts.database,
    entities: [Dashboard, Widget],
    migrations: [
      CreateDashboards1710000000000,
      CreateWidgets1710000001000,
      AddWidgetPeriod1710000002000,
      AddWidgetRank1710000003000,
      AddWidgetRowLayout1710000004000,
    ],
    synchronize: opts.synchronize ?? false,
    logging: opts.logging ?? false,
  };

  return new DataSource(options);
}
