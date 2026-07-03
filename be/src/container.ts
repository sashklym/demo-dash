import { Container } from 'inversify';
import type { DataSource } from 'typeorm';
import { TYPES } from './types';
import type { Controller } from './core/http';
import { DashboardService } from './modules/dashboards/dashboard.service';
import { DashboardController } from './modules/dashboards/dashboard.controller';

/**
 * Builds the Inversify container for a given DataSource. Every controller binds to
 * TYPES.Controller so `buildApp` can resolve and register them uniformly.
 */
export function buildContainer(dataSource: DataSource): Container {
  const container = new Container({ defaultScope: 'Singleton' });

  container.bind<DataSource>(TYPES.DataSource).toConstantValue(dataSource);

  // Dashboards
  container.bind<DashboardService>(TYPES.DashboardService).to(DashboardService);
  container.bind<Controller>(TYPES.Controller).to(DashboardController);

  return container;
}
