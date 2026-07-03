import type {
  FastifyBaseLogger,
  FastifyInstance,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

/**
 * The Fastify instance with the TypeBox type provider wired in — route schemas
 * declared with TypeBox give fully-typed `request.body` / `params` / `querystring`.
 * Controllers register their routes against this type.
 */
export type AppInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;

/** Every feature controller implements this; `buildApp` calls `register` on each. */
export interface Controller {
  register(app: AppInstance): void;
}
