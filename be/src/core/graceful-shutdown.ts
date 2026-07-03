import closeWithGrace from 'close-with-grace';
import type { FastifyInstance } from 'fastify';
import type { DataSource } from 'typeorm';
import type { Logger } from 'pino';

/**
 * Drain in-flight requests, then release the DB, on SIGINT/SIGTERM and on
 * uncaughtException/unhandledRejection (all handled by close-with-grace).
 */
export function setupGracefulShutdown(app: FastifyInstance, dataSource: DataSource, log: Logger): void {
  closeWithGrace({ delay: 10_000 }, async ({ signal, err }) => {
    if (err) {
      log.error({ err }, 'Shutting down after fatal error');
    } else {
      log.info({ signal }, 'Shutdown signal received — draining');
    }
    await app.close();
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    log.info('Shutdown complete');
  });
}
