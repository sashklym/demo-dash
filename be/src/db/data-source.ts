import 'reflect-metadata';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

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
    // Registered as feature modules are added:
    entities: [],
    migrations: [],
    synchronize: opts.synchronize ?? false,
    logging: opts.logging ?? false,
  };

  return new DataSource(options);
}
