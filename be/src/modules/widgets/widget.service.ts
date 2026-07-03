import { inject, injectable } from 'inversify';
import { DataSource, type Repository } from 'typeorm';
import { TYPES } from '../../types';
import { BadRequestError, NotFoundError } from '../../core/errors';
import { mulberry32, randomSeed } from '../../core/random';
import { DashboardService } from '../dashboards/dashboard.service';
import { Widget, type WidgetType } from './widget.entity';

export interface CreateWidgetInput {
  type: WidgetType;
  title?: string;
  text?: string;
}

export interface UpdateWidgetInput {
  title?: string;
  text?: string | null;
  position?: number;
}

export interface ChartPoint {
  label: string;
  value: number;
}

function defaultTitle(type: WidgetType): string {
  return type === 'line' ? 'Line chart' : type === 'bar' ? 'Bar chart' : 'Text';
}

/** Deterministic series from a seed — identical across reloads for the same widget. */
function seriesFromSeed(seed: number, points: number): ChartPoint[] {
  const next = mulberry32(seed);
  return Array.from({ length: points }, (_, i) => ({
    label: `P${i + 1}`,
    value: Math.round(next() * 100),
  }));
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

  async chartData(key: string, id: string, points: number): Promise<ChartPoint[]> {
    const widget = await this.requireWidget(key, id);
    if (widget.type === 'text') {
      throw new BadRequestError('Text widgets have no chart data');
    }
    return seriesFromSeed(widget.seed, points);
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
