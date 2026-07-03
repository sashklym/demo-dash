import { inject, injectable } from 'inversify';
import { Type } from '@sinclair/typebox';
import { TYPES } from '../../types';
import type { AppInstance, Controller } from '../../core/http';
import { ErrorSchema } from '../../core/schemas';
import { DashboardService } from './dashboard.service';
import { CreateDashboardBody, DashboardKeyParams, DashboardSchema } from './dashboard.schemas';

@injectable()
export class DashboardController implements Controller {
  constructor(@inject(TYPES.DashboardService) private readonly service: DashboardService) {}

  register(app: AppInstance): void {
    app.addSchema(DashboardSchema);
    app.addSchema(CreateDashboardBody);

    app.post(
      '/api/dashboards',
      {
        schema: {
          operationId: 'createDashboard',
          tags: ['dashboards'],
          summary: 'Create a new anonymous dashboard',
          description: 'Returns a fresh capability key. Persist it to restore the dashboard later.',
          body: Type.Ref(CreateDashboardBody),
          response: { 201: Type.Ref(DashboardSchema) },
        },
      },
      async (request, reply) => {
        const dashboard = await this.service.create(request.body.title);
        reply.status(201);
        return { key: dashboard.key, title: dashboard.title };
      },
    );

    app.get(
      '/api/dashboards/:key',
      {
        schema: {
          operationId: 'getDashboard',
          tags: ['dashboards'],
          summary: 'Fetch a dashboard by key',
          description: 'Used by the frontend to validate a pasted key and restore a saved dashboard.',
          params: DashboardKeyParams,
          response: { 200: Type.Ref(DashboardSchema), 404: Type.Ref(ErrorSchema) },
        },
      },
      async (request) => {
        const dashboard = await this.service.requireByKey(request.params.key);
        return { key: dashboard.key, title: dashboard.title };
      },
    );
  }
}
