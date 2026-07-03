import type { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import { config } from '../config/config';

export async function registerCors(app: FastifyInstance): Promise<void> {
  const origin =
    config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(',').map((o) => o.trim());

  await app.register(fastifyCors, {
    origin,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });
}
