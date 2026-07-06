import { inject, injectable } from 'inversify';
import { DataSource, type Repository } from 'typeorm';
import { TYPES } from '../../types';
import { BadRequestError, NotFoundError } from '../../core/errors';
import { generateKeyBetween, generateNKeysBetween } from '../../core/fractional-index';
import { mulberry32, randomSeed } from '../../core/random';
import { DashboardService } from '../dashboards/dashboard.service';
import { Widget, type Period, type WidgetType } from './widget.entity';

export interface CreateWidgetInput {
  type: WidgetType;
  title?: string;
  text?: string;
}

export interface UpdateWidgetInput {
  title?: string;
  text?: string | null;
  period?: Period;
}

export interface ListOptions {
  offset?: number;
  limit?: number;
}

export interface WidgetPage {
  items: Widget[];
  total: number;
  offset: number;
  limit: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

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

  /** A page of widgets (ordered by rank) plus the dashboard-scoped total. */
  async list(key: string, options: ListOptions = {}): Promise<WidgetPage> {
    const dashboard = await this.dashboards.requireByKey(key);
    const offset = Math.max(0, Math.trunc(options.offset ?? 0));
    const limit = Math.min(MAX_LIMIT, Math.max(1, Math.trunc(options.limit ?? DEFAULT_LIMIT)));
    const [items, total] = await this.repo.findAndCount({
      where: { dashboard_id: dashboard.id },
      order: { rank: 'ASC', created_at: 'ASC' },
      skip: offset,
      take: limit,
    });
    return { items, total, offset, limit };
  }

  async create(key: string, input: CreateWidgetInput): Promise<Widget> {
    const dashboard = await this.dashboards.requireByKey(key);
    const last = await this.repo.findOne({
      where: { dashboard_id: dashboard.id },
      order: { rank: 'DESC' },
      select: { rank: true },
    });

    const widget = this.repo.create({
      dashboard_id: dashboard.id,
      type: input.type,
      rank: generateKeyBetween(last?.rank ?? null, null),
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
    return this.repo.save(widget);
  }

  async delete(key: string, id: string): Promise<void> {
    const widget = await this.requireWidget(key, id);
    await this.repo.remove(widget);
  }

  /**
   * Reassign fresh, evenly-spaced ranks from the given order; unlisted widgets
   * keep their relative order at the end. Used by the small draggable grid, which
   * loads the whole list and sends the full order.
   */
  async reorder(key: string, orderedIds: string[]): Promise<Widget[]> {
    const dashboard = await this.dashboards.requireByKey(key);
    const widgets = await this.repo.find({
      where: { dashboard_id: dashboard.id },
      order: { rank: 'ASC', created_at: 'ASC' },
    });
    const byId = new Map(widgets.map((w) => [w.id, w]));

    const listed = orderedIds.map((id) => byId.get(id)).filter((w): w is Widget => Boolean(w));
    const listedIds = new Set(listed.map((w) => w.id));
    const leftovers = widgets.filter((w) => !listedIds.has(w.id));
    const ordered = [...listed, ...leftovers];

    const ranks = generateNKeysBetween(null, null, ordered.length);
    ordered.forEach((widget, i) => (widget.rank = ranks[i]!));

    await this.repo.save(ordered);
    return ordered;
  }

  /**
   * Move one widget to a target index in the dashboard order. Computes a rank
   * between the widgets that will surround it and writes only that row — O(1)
   * regardless of dashboard size. `target` is clamped to a valid index.
   */
  async moveToPosition(key: string, id: string, target: number): Promise<Widget> {
    const widget = await this.requireWidget(key, id);
    const siblings = await this.repo.find({
      where: { dashboard_id: widget.dashboard_id },
      order: { rank: 'ASC', created_at: 'ASC' },
      select: { id: true, rank: true },
    });

    // The order the widget moves *within* excludes the widget itself.
    const others = siblings.filter((w) => w.id !== id);
    const index = Math.min(Math.max(0, Math.trunc(target)), others.length);
    const before = index > 0 ? others[index - 1]!.rank : null;
    const after = index < others.length ? others[index]!.rank : null;

    widget.rank = generateKeyBetween(before, after);
    return this.repo.save(widget);
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
