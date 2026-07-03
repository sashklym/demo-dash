/** Inversify binding identifiers. Explicit symbols keep DI free of decorator metadata. */
export const TYPES = {
  DataSource: Symbol.for('DataSource'),
  DashboardService: Symbol.for('DashboardService'),
  WidgetService: Symbol.for('WidgetService'),
  // All controllers bind to this one symbol so buildApp can register them uniformly.
  Controller: Symbol.for('Controller'),
} as const;
