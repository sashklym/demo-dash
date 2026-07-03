import { Container } from 'inversify';
import type { DataSource } from 'typeorm';
import { TYPES } from './types';
import type { Controller } from './core/http';
import { DashboardService } from './modules/dashboards/dashboard.service';
import { DashboardController } from './modules/dashboards/dashboard.controller';
import { WidgetService } from './modules/widgets/widget.service';
import { WidgetController } from './modules/widgets/widget.controller';

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

  // Widgets
  container.bind<WidgetService>(TYPES.WidgetService).to(WidgetService);
  container.bind<Controller>(TYPES.Controller).to(WidgetController);

  return container;
}
