import { Container } from 'inversify';
import type { DataSource } from 'typeorm';
import { TYPES } from './types';

/**
 * Builds the Inversify container for a given DataSource. Feature services and
 * controllers are registered here as modules are added — controllers all bind to
 * TYPES.Controller so `buildApp` can resolve and register them uniformly.
 */
export function buildContainer(dataSource: DataSource): Container {
  const container = new Container({ defaultScope: 'Singleton' });

  container.bind<DataSource>(TYPES.DataSource).toConstantValue(dataSource);

  // Feature bindings are appended below as modules are added (phases 2–3).

  return container;
}
