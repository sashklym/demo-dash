import { inject, injectable } from 'inversify';
import { Between, DataSource, type Repository } from 'typeorm';
import { TYPES } from '../../types';
import { BadRequestError, NotFoundError } from '../../core/errors';
import { COLUMNS, buildMasks, clampSize, compact, firstFit, fitsAt } from '../../core/place-widget';
import type { Placement } from '../../core/place-widget';
import { mulberry32, randomSeed } from '../../core/random';
import { DashboardService } from '../dashboards/dashboard.service';
import { Widget, type Period, type WidgetType } from './widget.entity';

export interface CreateWidgetInput {
  type: WidgetType;
  title?: string;
  text?: string;
  size?: number;
}

export interface UpdateWidgetInput {
  title?: string;
  text?: string | null;
  period?: Period;
  size?: number;
}

export interface ListOptions {
  fromRow?: number;
  toRow?: number;
}

export interface WidgetPage {
  items: Widget[];
  total: number;
  totalRows: number;
  fromRow: number;
  toRow: number;
}

/** A placement carrying the row it belongs to, so the service can match widgets to it. */
interface IdentifiedPlacement extends Placement {
  id: string;
}

const DEFAULT_ROW_SPAN = 20;
const MAX_ROW_SPAN = 100;

/** A bucket of YouScan-style sentiment counts. */
export interface SentimentPoint {
  label: string;
  positive: number;
  neutral: number;
  negative: number;
}

export interface ChartData {
  period: Period;
  points: SentimentPoint[];
}

function defaultTitle(type: WidgetType): string {
  return type === 'line' ? 'Line chart' : type === 'bar' ? 'Bar chart' : 'Text';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Bucket count, x-axis labels, volume scale, and a distinct seed salt per period. */
const PERIODS: Record<Period, { count: number; label: (i: number) => string; scale: number; salt: number }> = {
  day: { count: 8, label: (i) => `${String(i * 3).padStart(2, '0')}:00`, scale: 0.5, salt: 17 },
  week: { count: 7, label: (i) => WEEKDAYS[i] ?? '', scale: 1, salt: 31 },
  month: { count: 4, label: (i) => `W${i + 1}`, scale: 4, salt: 53 },
  year: { count: 12, label: (i) => MONTHS[i] ?? '', scale: 12, salt: 97 },
};

/**
 * Deterministic YouScan-flavoured sentiment series from a seed + period. Neutral
 * mentions dominate, positive tracks a gentle wave, negative stays low with the
 * occasional PR-crisis spike. Identical across reloads; distinct per period.
 */
function sentimentSeries(seed: number, period: Period): SentimentPoint[] {
  const cfg = PERIODS[period];
  const next = mulberry32(seed + cfg.salt);
  return Array.from({ length: cfg.count }, (_, i) => {
    const wave = 0.55 + 0.45 * Math.sin((i / cfg.count) * Math.PI * 2 + (seed % 7));
    const base = (35 + wave * 55 + next() * 25) * cfg.scale;
    const positive = Math.round(base * (0.3 + next() * 0.15));
    const neutral = Math.round(base * (0.45 + next() * 0.15));
    const spike = next() < 0.15 ? next() * 30 * cfg.scale : 0;
    const negative = Math.round(base * (0.08 + next() * 0.08) + spike);
    return { label: cfg.label(i), positive, neutral, negative };
  });
}

@injectable()
export class WidgetService {
  private readonly repo: Repository<Widget>;

  constructor(
    @inject(TYPES.DataSource) dataSource: DataSource,
    @inject(TYPES.DashboardService) private readonly dashboards: DashboardService,
  ) {
    this.repo = dataSource.getRepository(Widget);
  }

  /**
   * The widgets in a range of rows, plus the dashboard's row and widget counts.
   * `totalRows` sizes the virtualizer's scrollbar without reading a single widget.
   */
  async list(key: string, options: ListOptions = {}): Promise<WidgetPage> {
    const dashboard = await this.dashboards.requireByKey(key);
    const fromRow = Math.max(0, Math.trunc(options.fromRow ?? 0));
    const requested = options.toRow === undefined ? fromRow + DEFAULT_ROW_SPAN - 1 : Math.trunc(options.toRow);
    const toRow = Math.max(fromRow, Math.min(requested, fromRow + MAX_ROW_SPAN - 1));

    const items = await this.repo.find({
      where: { dashboard_id: dashboard.id, row_index: Between(fromRow, toRow) },
      order: { row_index: 'ASC', col_index: 'ASC', created_at: 'ASC' },
    });
    const total = await this.repo.count({ where: { dashboard_id: dashboard.id } });
    const totalRows = (await this.lastRow(dashboard.id)) + 1;

    return { items, total, totalRows, fromRow, toRow };
  }

  /** Place a new widget in the first row from the top with a run of free columns. */
  async create(key: string, input: CreateWidgetInput): Promise<Widget> {
    const dashboard = await this.dashboards.requireByKey(key);
    const size = clampSize(input.size ?? 1);
    const slot = firstFit(await this.placements(dashboard.id), size);

    const widget = this.repo.create({
      dashboard_id: dashboard.id,
      type: input.type,
      row_index: slot.row,
      col_index: slot.col,
      size,
      title: input.title?.trim() || defaultTitle(input.type),
      text: input.type === 'text' ? (input.text ?? '') : null,
      seed: randomSeed(),
    });
    return this.repo.save(widget);
  }

  async update(key: string, id: string, input: UpdateWidgetInput): Promise<Widget> {
    const widget = await this.requireWidget(key, id);
    if (input.title !== undefined) widget.title = input.title;
    if (input.text !== undefined) widget.text = input.text;
    if (input.period !== undefined) widget.period = input.period;

    if (input.size !== undefined) {
      const size = clampSize(input.size);
      if (size !== widget.size) {
        await this.resize(widget, size);
        return widget;
      }
    }
    return this.repo.save(widget);
  }

  /**
   * Free the widget's columns. The hole stays open for the next `create`; only a
   * row with nothing left in it collapses, pulling the rows below up by one.
   */
  async delete(key: string, id: string): Promise<void> {
    const widget = await this.requireWidget(key, id);
    const { dashboard_id, row_index } = widget;
    await this.repo.remove(widget);

    const survivors = await this.repo.count({ where: { dashboard_id, row_index } });
    if (survivors === 0) {
      await this.shiftRowsAfter(dashboard_id, row_index, -1);
    }
  }

  /**
   * Compact the whole board: re-place every widget by a greedy fill in the given
   * order, squeezing out every hole. Unlisted widgets keep their relative order at
   * the end. This is the only operation that deliberately destroys holes.
   */
  async reorder(key: string, orderedIds: string[]): Promise<Widget[]> {
    const dashboard = await this.dashboards.requireByKey(key);
    const widgets = await this.repo.find({
      where: { dashboard_id: dashboard.id },
      order: { row_index: 'ASC', col_index: 'ASC', created_at: 'ASC' },
    });
    const byId = new Map(widgets.map((w) => [w.id, w]));

    const listed = orderedIds.map((id) => byId.get(id)).filter((w): w is Widget => Boolean(w));
    const listedIds = new Set(listed.map((w) => w.id));
    const leftovers = widgets.filter((w) => !listedIds.has(w.id));
    const ordered = [...listed, ...leftovers];

    const slots = compact(ordered.map((w) => w.size));
    ordered.forEach((widget, i) => {
      widget.row_index = slots[i]!.row;
      widget.col_index = slots[i]!.col;
    });

    await this.repo.save(ordered);
    return ordered;
  }

  /**
   * Drop a widget on the slot `(row, col)`.
   *
   * If the slot has a free run wide enough, the widget simply moves there and every
   * other hole on the board is preserved — that is the drag-onto-a-gap case. If the
   * slot is taken, the widget is spliced into reading order at that point and the
   * board is compacted from the topmost affected row downward, so the occupant and
   * everything after it push down. Rows above are never touched.
   */
  async place(key: string, id: string, row: number, col: number): Promise<Widget> {
    const widget = await this.requireWidget(key, id);
    const targetRow = Math.max(0, Math.trunc(row));
    const targetCol = Math.max(0, Math.trunc(col));
    if (targetCol + widget.size > COLUMNS) {
      throw new BadRequestError(`A size-${widget.size} widget cannot start at column ${targetCol}`);
    }

    const others = await this.placements(widget.dashboard_id, widget.id);
    const masks = buildMasks(others);
    const sourceRow = widget.row_index;

    if (targetRow <= masks.length && fitsAt(masks[targetRow] ?? 0, targetCol, widget.size)) {
      widget.row_index = targetRow;
      widget.col_index = targetCol;
      await this.repo.save(widget);
      await this.collapseIfEmptied(widget, others, sourceRow);
      return widget;
    }

    await this.spliceAndCompact(widget, targetRow, targetCol, Math.min(sourceRow, targetRow));
    return widget;
  }

  /**
   * Grow or shrink a widget in place when its row still has the room, otherwise
   * re-place it by first fit. An emptied source row collapses.
   */
  private async resize(widget: Widget, size: number): Promise<void> {
    const others = await this.placements(widget.dashboard_id, widget.id);
    const masks = buildMasks(others);
    const sourceRow = widget.row_index;

    if (fitsAt(masks[sourceRow] ?? 0, widget.col_index, size)) {
      widget.size = size;
      await this.repo.save(widget);
      return;
    }

    const slot = firstFit(others, size);
    widget.size = size;
    widget.row_index = slot.row;
    widget.col_index = slot.col;
    await this.repo.save(widget);
    await this.collapseIfEmptied(widget, others, sourceRow);
  }

  /**
   * Splice `widget` into reading order at `(targetRow, targetCol)` and re-pack every
   * widget from `startRow` down. Rows above `startRow` keep their slots, holes included.
   */
  private async spliceAndCompact(
    widget: Widget,
    targetRow: number,
    targetCol: number,
    startRow: number,
  ): Promise<void> {
    const all = await this.repo.find({
      where: { dashboard_id: widget.dashboard_id },
      order: { row_index: 'ASC', col_index: 'ASC', created_at: 'ASC' },
    });
    const rest = all.filter((w) => w.id !== widget.id);
    const at = rest.findIndex(
      (w) => w.row_index > targetRow || (w.row_index === targetRow && w.col_index >= targetCol),
    );
    const ordered = at < 0 ? [...rest, widget] : [...rest.slice(0, at), widget, ...rest.slice(at)];

    const below = ordered.filter((w) => w.id === widget.id || w.row_index >= startRow);
    const slots = compact(
      below.map((w) => w.size),
      startRow,
    );
    below.forEach((w, i) => {
      w.row_index = slots[i]!.row;
      w.col_index = slots[i]!.col;
    });
    await this.repo.save(below);
  }

  /** Collapse `sourceRow` if the move left nothing in it, keeping `widget` consistent. */
  private async collapseIfEmptied(widget: Widget, others: IdentifiedPlacement[], sourceRow: number): Promise<void> {
    if (widget.row_index === sourceRow || others.some((o) => o.row === sourceRow)) return;

    await this.shiftRowsAfter(widget.dashboard_id, sourceRow, -1);
    if (widget.row_index > sourceRow) {
      widget.row_index -= 1;
    }
  }

  /** One indexed bulk UPDATE, not N round-trips. */
  private async shiftRowsAfter(dashboardId: string, row: number, delta: number): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Widget)
      .set({ row_index: () => `"row_index" + ${delta}` })
      .where('dashboard_id = :dashboardId AND row_index > :row', { dashboardId, row })
      .execute();
  }

  /** Current slots on a dashboard, optionally excluding one widget. */
  private async placements(dashboardId: string, excludeId?: string): Promise<IdentifiedPlacement[]> {
    const rows = await this.repo.find({
      where: { dashboard_id: dashboardId },
      order: { row_index: 'ASC', col_index: 'ASC' },
      select: { id: true, row_index: true, col_index: true, size: true },
    });
    return rows
      .filter((w) => w.id !== excludeId)
      .map((w) => ({ id: w.id, row: w.row_index, col: w.col_index, size: w.size }));
  }

  /** Highest occupied row index, or -1 on an empty dashboard. */
  private async lastRow(dashboardId: string): Promise<number> {
    const last = await this.repo.findOne({
      where: { dashboard_id: dashboardId },
      order: { row_index: 'DESC' },
      select: { row_index: true },
    });
    return last?.row_index ?? -1;
  }

  async chartData(key: string, id: string, period?: Period): Promise<ChartData> {
    const widget = await this.requireWidget(key, id);
    if (widget.type === 'text') {
      throw new BadRequestError('Text widgets have no chart data');
    }
    const resolved = period ?? widget.period;
    return { period: resolved, points: sentimentSeries(widget.seed, resolved) };
  }

  async regenerate(key: string, id: string): Promise<Widget> {
    const widget = await this.requireWidget(key, id);
    if (widget.type === 'text') {
      throw new BadRequestError('Text widgets cannot be regenerated');
    }
    widget.seed = randomSeed();
    return this.repo.save(widget);
  }

  /** Fetch a widget scoped to its dashboard, or 404 — prevents cross-dashboard access. */
  private async requireWidget(key: string, id: string): Promise<Widget> {
    const dashboard = await this.dashboards.requireByKey(key);
    const widget = await this.repo.findOne({ where: { id, dashboard_id: dashboard.id } });
    if (!widget) {
      throw new NotFoundError(`Widget "${id}" not found`);
    }
    return widget;
  }
}
