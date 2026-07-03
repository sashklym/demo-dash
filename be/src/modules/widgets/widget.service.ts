import { inject, injectable } from 'inversify';
import { DataSource, type Repository } from 'typeorm';
import { TYPES } from '../../types';
import { BadRequestError, NotFoundError } from '../../core/errors';
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
  position?: number;
  period?: Period;
}

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

  async list(key: string): Promise<Widget[]> {
    const dashboard = await this.dashboards.requireByKey(key);
    return this.repo.find({
      where: { dashboard_id: dashboard.id },
      order: { position: 'ASC', created_at: 'ASC' },
    });
  }

  async create(key: string, input: CreateWidgetInput): Promise<Widget> {
    const dashboard = await this.dashboards.requireByKey(key);
    const maxPosition = await this.repo.maximum('position', { dashboard_id: dashboard.id });

    const widget = this.repo.create({
      dashboard_id: dashboard.id,
      type: input.type,
      position: (maxPosition ?? -1) + 1,
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
    if (input.position !== undefined) widget.position = input.position;
    if (input.period !== undefined) widget.period = input.period;
    return this.repo.save(widget);
  }

  async delete(key: string, id: string): Promise<void> {
    const widget = await this.requireWidget(key, id);
    await this.repo.remove(widget);
  }

  /** Reassign contiguous positions from the given order; unlisted widgets keep their relative order at the end. */
  async reorder(key: string, orderedIds: string[]): Promise<Widget[]> {
    const dashboard = await this.dashboards.requireByKey(key);
    const widgets = await this.repo.find({ where: { dashboard_id: dashboard.id } });
    const byId = new Map(widgets.map((w) => [w.id, w]));

    let position = 0;
    for (const id of orderedIds) {
      const widget = byId.get(id);
      if (widget) widget.position = position++;
    }
    const listed = new Set(orderedIds);
    const leftovers = widgets.filter((w) => !listed.has(w.id)).sort((a, b) => a.position - b.position);
    for (const widget of leftovers) widget.position = position++;

    await this.repo.save(widgets);
    return this.list(key);
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
