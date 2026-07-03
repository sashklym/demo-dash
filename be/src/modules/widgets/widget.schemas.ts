import { Type } from '@sinclair/typebox';
import type { Period, WidgetType } from './widget.entity';

/** The three widget kinds — a proper string enum in the OpenAPI spec. */
export const WidgetTypeSchema = Type.Unsafe<WidgetType>({
  $id: 'WidgetType',
  type: 'string',
  enum: ['line', 'bar', 'text'],
  description: 'line | bar | text',
});

/** Chart time granularity — a proper string enum in the OpenAPI spec. */
export const PeriodSchema = Type.Unsafe<Period>({
  $id: 'Period',
  type: 'string',
  enum: ['day', 'week', 'month', 'year'],
  description: 'day | week | month | year',
});

/** Public widget shape (internal `dashboard_id` and `seed` are never exposed). */
export const WidgetSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    type: Type.Ref(WidgetTypeSchema),
    position: Type.Integer(),
    title: Type.String(),
    text: Type.Union([Type.String(), Type.Null()], { description: 'Body of a text widget; null for charts' }),
    period: Type.Ref(PeriodSchema),
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
    period: Type.Optional(Type.Ref(PeriodSchema)),
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

/** One bucket of sentiment counts (Positive / Neutral / Negative mentions). */
export const SentimentPointSchema = Type.Object({
  label: Type.String(),
  positive: Type.Integer(),
  neutral: Type.Integer(),
  negative: Type.Integer(),
});

export const ChartDataSchema = Type.Object(
  {
    period: Type.Ref(PeriodSchema),
    points: Type.Array(SentimentPointSchema),
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
  period: Type.Optional(Type.Ref(PeriodSchema)),
});
