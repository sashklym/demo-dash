import Fastify from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { Container } from 'inversify';
import { config } from './config/config';
import { buildLoggerOptions } from './core/logger';
import { registerCors } from './plugins/cors';
import { registerSwagger } from './plugins/swagger';
import { registerErrorHandler } from './core/error-handler';
import { ErrorSchema } from './core/schemas';
import { FAVICON_SVG, LANDING_HTML } from './core/branding';
import type { AppInstance, Controller } from './core/http';
import { TYPES } from './types';

/**
 * Assembles the Fastify instance: logging, CORS, OpenAPI, the error contract, a
 * health probe, and every controller bound in the DI container. Kept separate from
 * `main.ts` so tests can build the same app against an in-memory database.
 */
export async function buildApp(container: Container): Promise<AppInstance> {
  const app = Fastify({
    logger: buildLoggerOptions(config),
    ajv: { customOptions: { coerceTypes: true, removeAdditional: 'all', useDefaults: true } },
  }).withTypeProvider<TypeBoxTypeProvider>();

  await registerCors(app);
  await registerSwagger(app);
  registerErrorHandler(app);

  // Shared schemas referenced across modules (error responses).
  app.addSchema(ErrorSchema);

  app.get('/health', { schema: { hide: true } }, async () => ({ status: 'ok' }));

  app.get('/', { schema: { hide: true } }, async (_request, reply) => {
    reply.type('text/html').send(LANDING_HTML);
  });

  app.get('/favicon.svg', { schema: { hide: true } }, async (_request, reply) => {
    reply.header('cache-control', 'public, max-age=86400').type('image/svg+xml').send(FAVICON_SVG);
  });

  // Register every controller bound in the container (see modules' *.controller.ts).
  if (container.isBound(TYPES.Controller)) {
    for (const controller of container.getAll<Controller>(TYPES.Controller)) {
      controller.register(app);
    }
  }

  await app.ready();
  return app;
}
