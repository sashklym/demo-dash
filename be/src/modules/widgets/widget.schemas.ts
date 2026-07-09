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

/** Column span on the canonical 3-column grid. A size-3 widget fills its row. */
const SizeSchema = Type.Integer({ minimum: 1, maximum: 3, description: 'Column span, 1–3' });

/** Public widget shape (internal `dashboard_id` and `seed` are never exposed). */
export const WidgetSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    type: Type.Ref(WidgetTypeSchema),
    row: Type.Integer({ description: 'Row on the 3-column grid; reading order is (row, col)' }),
    col: Type.Integer({ description: 'Start column, 0-based; col + size <= 3' }),
    size: SizeSchema,
    title: Type.String(),
    text: Type.Union([Type.String(), Type.Null()], { description: 'Body of a text widget; null for charts' }),
    period: Type.Ref(PeriodSchema),
  },
  { $id: 'Widget' },
);

/** A range of a dashboard’s rows, ordered by (row, col), plus the board’s totals. */
export const WidgetPageSchema = Type.Object(
  {
    items: Type.Array(Type.Ref(WidgetSchema)),
    total: Type.Integer({ description: 'Total widgets on the dashboard (across all rows)' }),
    totalRows: Type.Integer({ description: 'Number of rows; sizes the virtualized scrollbar' }),
    fromRow: Type.Integer(),
    toRow: Type.Integer(),
  },
  { $id: 'WidgetPage' },
);

export const CreateWidgetBody = Type.Object(
  {
    type: Type.Ref(WidgetTypeSchema),
    title: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
    text: Type.Optional(Type.String({ maxLength: 5000, description: 'Initial text (text widgets only)' })),
    size: Type.Optional(SizeSchema),
  },
  { $id: 'CreateWidgetBody' },
);

export const UpdateWidgetBody = Type.Object(
  {
    title: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
    text: Type.Optional(Type.Union([Type.String({ maxLength: 5000 }), Type.Null()])),
    period: Type.Optional(Type.Ref(PeriodSchema)),
    size: Type.Optional(SizeSchema),
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

/**
 * Drop a widget on a slot. A free run wide enough moves the widget and preserves
 * every other hole; an occupied slot re-packs the board from that row down.
 */
export const PlaceWidgetBody = Type.Object(
  {
    row: Type.Integer({ minimum: 0, description: 'Target row' }),
    col: Type.Integer({ minimum: 0, maximum: 2, description: 'Target start column' }),
  },
  { $id: 'PlaceWidgetBody' },
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

/** A window of rows. `toRow` defaults to a 20-row span and is capped at 100. */
export const ListWidgetsQuery = Type.Object({
  fromRow: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
  toRow: Type.Optional(Type.Integer({ minimum: 0 })),
});
