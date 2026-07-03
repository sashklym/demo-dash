import type { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

/**
 * The OpenAPI spec is derived from the TypeBox route schemas — a single source of
 * truth that both validates requests and generates the frontend client. Swagger UI
 * is served at /docs and the raw JSON at /docs/json.
 */
export async function registerSwagger(app: FastifyInstance): Promise<void> {
  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'YouScan Dashboard API',
        description:
          'Anonymous widget dashboards — create a dashboard, add line/bar/text widgets, ' +
          'restore later by key. The frontend client is generated from this spec.',
        version: '1.0.0',
      },
      tags: [
        { name: 'dashboards', description: 'Anonymous dashboard sessions (create + restore by key)' },
        { name: 'widgets', description: 'Widgets scoped to a dashboard' },
      ],
    },
    // Name OpenAPI components by their schema $id (e.g. "Dashboard") instead of the
    // default "def-0" — this gives the generated frontend client clean model names.
    refResolver: {
      buildLocalReference(json, _baseUri, _fragment, i) {
        return typeof json.$id === 'string' ? json.$id : `def-${i}`;
      },
    },
  });

  await app.register(fastifySwaggerUi, { routePrefix: '/docs' });
}
