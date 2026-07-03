import closeWithGrace from 'close-with-grace';
import type { FastifyInstance } from 'fastify';
import type { DataSource } from 'typeorm';
import type { Logger } from 'pino';

/**
 * Drain in-flight requests, then release the DB, on SIGINT/SIGTERM.
 * (uncaughtException/unhandledRejection are handled explicitly in main.ts.)
 */
export function setupGracefulShutdown(app: FastifyInstance, dataSource: DataSource, log: Logger): void {
  closeWithGrace({ delay: 10_000, skip: ['uncaughtException', 'unhandledRejection'] }, async ({ signal }) => {
    log.info({ signal }, 'Shutdown signal received — draining');
    await app.close();
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    log.info('Shutdown complete');
  });
}
