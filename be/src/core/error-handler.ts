import type { FastifyError, FastifyInstance } from 'fastify';
import { AppError } from './errors';

export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
}

/**
 * Single place that turns any thrown error into the wire contract:
 *   - AJV schema failures → 400 with the validation detail
 *   - AppError subclasses  → their own statusCode + code
 *   - anything else        → 500 (logged; message not leaked)
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error.validation) {
      reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message,
        details: error.validation,
      });
      return;
    }

    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.code,
        message: error.message,
      });
      return;
    }

    const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500;
    if (statusCode >= 500) {
      request.log.error({ err: error }, 'Unhandled error');
    }
    reply.status(statusCode).send({
      statusCode,
      error: statusCode >= 500 ? 'Internal Server Error' : error.name || 'Error',
      message: statusCode >= 500 ? 'Internal Server Error' : error.message,
    });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
    });
  });
}
