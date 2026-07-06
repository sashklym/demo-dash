import { inject, injectable } from 'inversify';
import { Type } from '@sinclair/typebox';
import { TYPES } from '../../types';
import type { AppInstance, Controller } from '../../core/http';
import { ErrorSchema } from '../../core/schemas';
import { WidgetService } from './widget.service';
import type { Widget } from './widget.entity';
import {
  ChartDataQuery,
  ChartDataSchema,
  CreateWidgetBody,
  DashboardScopeParams,
  ListWidgetsQuery,
  MoveWidgetBody,
  PeriodSchema,
  ReorderBody,
  UpdateWidgetBody,
  WidgetItemParams,
  WidgetPageSchema,
  WidgetSchema,
  WidgetTypeSchema,
} from './widget.schemas';

const BASE = '/api/dashboards/:key/widgets';

function toResponse(widget: Widget) {
  return {
    id: widget.id,
    type: widget.type,
    rank: widget.rank,
    title: widget.title,
    text: widget.text,
    period: widget.period,
  };
}

@injectable()
export class WidgetController implements Controller {
  constructor(@inject(TYPES.WidgetService) private readonly service: WidgetService) {}

  register(app: AppInstance): void {
    app.addSchema(WidgetTypeSchema);
    app.addSchema(PeriodSchema);
    app.addSchema(WidgetSchema);
    app.addSchema(WidgetPageSchema);
    app.addSchema(CreateWidgetBody);
    app.addSchema(UpdateWidgetBody);
    app.addSchema(ReorderBody);
    app.addSchema(MoveWidgetBody);
    app.addSchema(ChartDataSchema);

    app.get(
      BASE,
      {
        schema: {
          operationId: 'listWidgets',
          tags: ['widgets'],
          summary: 'List a dashboard’s widgets, paged and ordered by rank',
          params: DashboardScopeParams,
          querystring: ListWidgetsQuery,
          response: { 200: Type.Ref(WidgetPageSchema), 404: Type.Ref(ErrorSchema) },
        },
      },
      async (request) => {
        const page = await this.service.list(request.params.key, request.query);
        return { ...page, items: page.items.map(toResponse) };
      },
    );

    app.post(
      BASE,
      {
        schema: {
          operationId: 'createWidget',
          tags: ['widgets'],
          summary: 'Add a widget to a dashboard',
          params: DashboardScopeParams,
          body: Type.Ref(CreateWidgetBody),
          response: { 201: Type.Ref(WidgetSchema), 404: Type.Ref(ErrorSchema) },
        },
      },
      async (request, reply) => {
        const widget = await this.service.create(request.params.key, request.body);
        reply.status(201);
        return toResponse(widget);
      },
    );

    // Static `/reorder` must be declared before the `:id` routes so it is not
    // swallowed by the param route (find-my-way prefers static, but be explicit).
    app.put(
      `${BASE}/reorder`,
      {
        schema: {
          operationId: 'reorderWidgets',
          tags: ['widgets'],
          summary: 'Reorder a dashboard’s widgets',
          params: DashboardScopeParams,
          body: Type.Ref(ReorderBody),
          response: { 200: Type.Array(Type.Ref(WidgetSchema)), 404: Type.Ref(ErrorSchema) },
        },
      },
      async (request) => {
        const widgets = await this.service.reorder(request.params.key, request.body.orderedIds);
        return widgets.map(toResponse);
      },
    );

    // Single-widget move for the virtualized grid, which only knows a widget id
    // and a target index — not the full order. O(1): one row's rank changes.
    app.put(
      `${BASE}/:id/position`,
      {
        schema: {
          operationId: 'moveWidget',
          tags: ['widgets'],
          summary: 'Move a widget to a target index in the dashboard order',
          params: WidgetItemParams,
          body: Type.Ref(MoveWidgetBody),
          response: { 200: Type.Ref(WidgetSchema), 404: Type.Ref(ErrorSchema) },
        },
      },
      async (request) => {
        const widget = await this.service.moveToPosition(
          request.params.key,
          request.params.id,
          request.body.position,
        );
        return toResponse(widget);
      },
    );

    app.patch(
      `${BASE}/:id`,
      {
        schema: {
          operationId: 'updateWidget',
          tags: ['widgets'],
          summary: 'Update a widget (title, text, or position)',
          params: WidgetItemParams,
          body: Type.Ref(UpdateWidgetBody),
          response: { 200: Type.Ref(WidgetSchema), 404: Type.Ref(ErrorSchema) },
        },
      },
      async (request) => {
        const widget = await this.service.update(request.params.key, request.params.id, request.body);
        return toResponse(widget);
      },
    );

    app.delete(
      `${BASE}/:id`,
      {
        schema: {
          operationId: 'deleteWidget',
          tags: ['widgets'],
          summary: 'Delete a widget',
          params: WidgetItemParams,
          response: { 204: Type.Null(), 404: Type.Ref(ErrorSchema) },
        },
      },
      async (request, reply) => {
        await this.service.delete(request.params.key, request.params.id);
        reply.status(204);
        return null;
      },
    );

    app.get(
      `${BASE}/:id/data`,
      {
        schema: {
          operationId: 'getWidgetData',
          tags: ['widgets'],
          summary: 'Deterministic chart data for a chart widget',
          params: WidgetItemParams,
          querystring: ChartDataQuery,
          response: { 200: Type.Ref(ChartDataSchema), 400: Type.Ref(ErrorSchema), 404: Type.Ref(ErrorSchema) },
        },
      },
      async (request) => {
        return this.service.chartData(request.params.key, request.params.id, request.query.period);
      },
    );

    app.post(
      `${BASE}/:id/regenerate`,
      {
        schema: {
          operationId: 'regenerateWidget',
          tags: ['widgets'],
          summary: 'Reseed a chart widget (new random data)',
          params: WidgetItemParams,
          response: { 200: Type.Ref(WidgetSchema), 400: Type.Ref(ErrorSchema), 404: Type.Ref(ErrorSchema) },
        },
      },
      async (request) => {
        const widget = await this.service.regenerate(request.params.key, request.params.id);
        return toResponse(widget);
      },
    );
  }
}
