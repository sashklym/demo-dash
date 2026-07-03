import 'reflect-metadata';
import { config } from './config/config';
import { logger } from './core/logger';
import { createDataSource } from './db/data-source';
import { buildContainer } from './container';
import { buildApp } from './app';
import { setupGracefulShutdown } from './core/graceful-shutdown';

async function main(): Promise<void> {
  const dataSource = createDataSource({ database: config.DATABASE_PATH });
  await dataSource.initialize();

  const container = buildContainer(dataSource);
  const app = await buildApp(container);

  // Installs the process-level safety net: SIGINT/SIGTERM AND uncaughtException /
  // unhandledRejection are all caught here → logged via pino, then in-flight requests
  // are drained and the DB is closed before exit. See core/graceful-shutdown.ts.
  setupGracefulShutdown(app, dataSource, logger);

  await app.listen({ port: config.PORT, host: config.HOST });
  logger.info(`YouScan Dashboard API listening on http://${config.HOST}:${config.PORT} — docs at /docs`);
}

// Catches any rejection during the awaited startup sequence (before the shutdown
// hooks above are installed); steady-state process errors are handled by them.
main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
