import 'reflect-metadata';
import { config } from './config/config';
import { logger } from './core/logger';
import { createDataSource } from './db/data-source';
import { buildContainer } from './container';
import { buildApp } from './app';
import { setupGracefulShutdown } from './core/graceful-shutdown';

async function main(): Promise<void> {
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error({ err: reason }, 'Unhandled rejection');
  });
  process.on('uncaughtException', (err: Error) => {
    logger.error({ err }, 'Uncaught exception');
    process.exit(1);
  });

  const dataSource = createDataSource({ database: config.DATABASE_PATH });
  await dataSource.initialize();

  const container = buildContainer(dataSource);
  const app = await buildApp(container);

  // SIGINT/SIGTERM → drain in-flight requests, then close the DB.
  setupGracefulShutdown(app, dataSource, logger);

  await app.listen({ port: config.PORT, host: config.HOST });
  logger.info(`YouScan Dashboard API listening on http://${config.HOST}:${config.PORT} — docs at /docs`);
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
