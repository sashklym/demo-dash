import 'reflect-metadata';
import { config } from './config/config';
import { logger } from './core/logger';
import { createDataSource } from './db/data-source';

/**
 * Standalone migration runner — its own process, run BEFORE the app starts:
 *   - dev:  `npm run migration:run`  (also chained into `npm run dev`)
 *   - prod: `node dist/migrate.js`   (the deploy's release/pre-start command)
 *
 * Keeping this separate from main.ts means app replicas never race to migrate and
 * a bad migration fails the deploy step instead of crash-looping the server.
 */
async function migrate(): Promise<void> {
  const dataSource = createDataSource({ database: config.DATABASE_PATH });
  await dataSource.initialize();
  const applied = await dataSource.runMigrations();
  logger.info(
    { count: applied.length, migrations: applied.map((m) => m.name) },
    applied.length ? 'Applied migrations' : 'No pending migrations',
  );
  await dataSource.destroy();
  process.exit(0);
}

migrate().catch((err) => {
  logger.error({ err }, 'Migration failed');
  process.exit(1);
});
