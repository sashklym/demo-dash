import { Type } from '@sinclair/typebox';
import type { WidgetType } from './widget.entity';

/** The three widget kinds — a proper string enum in the OpenAPI spec. */
export const WidgetTypeSchema = Type.Unsafe<WidgetType>({
  $id: 'WidgetType',
  type: 'string',
  enum: ['line', 'bar', 'text'],
  description: 'line | bar | text',
});

/** Public widget shape (internal `dashboard_id` and `seed` are never exposed). */
export const WidgetSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    type: Type.Ref(WidgetTypeSchema),
    position: Type.Integer(),
    title: Type.String(),
    text: Type.Union([Type.String(), Type.Null()], { description: 'Body of a text widget; null for charts' }),
  },
  { $id: 'Widget' },
);

export const CreateWidgetBody = Type.Object(
  {
    type: Type.Ref(WidgetTypeSchema),
    title: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
    text: Type.Optional(Type.String({ maxLength: 5000, description: 'Initial text (text widgets only)' })),
  },
  { $id: 'CreateWidgetBody' },
);

export const UpdateWidgetBody = Type.Object(
  {
    title: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
    text: Type.Optional(Type.Union([Type.String({ maxLength: 5000 }), Type.Null()])),
    position: Type.Optional(Type.Integer({ minimum: 0 })),
  },
  { $id: 'UpdateWidgetBody' },
);

export const ReorderBody = Type.Object(
  {
    orderedIds: Type.Array(Type.String({ format: 'uuid' }), {
      description: 'Widget ids in the desired grid order',
    }),
  },
  { $id: 'ReorderBody' },
);

export const ChartDataSchema = Type.Object(
  {
    series: Type.Array(Type.Object({ label: Type.String(), value: Type.Number() })),
  },
  { $id: 'ChartData' },
);

/** Params + query */
export const DashboardScopeParams = Type.Object({
  key: Type.String({ minLength: 1, description: 'Dashboard key' }),
});

export const WidgetItemParams = Type.Object({
  key: Type.String({ minLength: 1, description: 'Dashboard key' }),
  id: Type.String({ minLength: 1, description: 'Widget id' }),
});

export const ChartDataQuery = Type.Object({
  points: Type.Optional(
    Type.Integer({ minimum: 2, maximum: 100, default: 12, description: 'Number of data points' }),
  ),
});
