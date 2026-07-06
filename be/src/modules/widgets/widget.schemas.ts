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
    rank: Type.String({ description: 'Fractional order key; widgets sort by this ascending' }),
    title: Type.String(),
    text: Type.Union([Type.String(), Type.Null()], { description: 'Body of a text widget; null for charts' }),
    period: Type.Ref(PeriodSchema),
  },
  { $id: 'Widget' },
);

/** One page of a dashboard’s widgets, ordered by rank, plus the full count. */
export const WidgetPageSchema = Type.Object(
  {
    items: Type.Array(Type.Ref(WidgetSchema)),
    total: Type.Integer({ description: 'Total widgets on the dashboard (across all pages)' }),
    offset: Type.Integer(),
    limit: Type.Integer(),
  },
  { $id: 'WidgetPage' },
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

/** Move a single widget to a target index in the dashboard order (clamped). */
export const MoveWidgetBody = Type.Object(
  {
    position: Type.Integer({ minimum: 0, description: 'Target index in the ordered list' }),
  },
  { $id: 'MoveWidgetBody' },
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

export const ListWidgetsQuery = Type.Object({
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 200, default: 50 })),
});
