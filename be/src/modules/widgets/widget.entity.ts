import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Dashboard } from '../dashboards/dashboard.entity';

export type WidgetType = 'line' | 'bar' | 'text';

/** Time granularity a chart widget renders its sentiment series over. */
export type Period = 'day' | 'week' | 'month' | 'year';

/**
 * A widget on a dashboard. `seed` drives deterministic chart data (so a reload
 * shows the same series); `text` holds the editable body of a text widget;
 * `period` is the chart's saved day/week/month/year granularity; `row_index` /
 * `col_index` / `size` are its slot on the canonical 3-column grid.
 */
@Entity('widgets')
@Index('IDX_widgets_dashboard_id', ['dashboard_id'])
@Index('IDX_widgets_dashboard_row_col', ['dashboard_id', 'row_index', 'col_index'])
@Check('CHK_widgets_span', '"col_index" + "size" <= 3')
export class Widget {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  dashboard_id!: string;

  @ManyToOne(() => Dashboard, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dashboard_id' })
  dashboard?: Dashboard;

  @Column({ type: 'varchar' })
  type!: WidgetType;

  /**
   * The widget's slot on the canonical 3-column grid (see core/place-widget).
   * Reading order is `row_index ASC, col_index ASC` — there is no separate rank.
   * Column names avoid `row`, which is a SQLite keyword; the public DTO exposes
   * them as `row` and `col`.
   */
  @Column({ type: 'integer' })
  row_index!: number;

  @Column({ type: 'integer' })
  col_index!: number;

  /** Column span, 1–3. `col_index + size <= 3` is a CHECK constraint. */
  @Column({ type: 'integer', default: 1 })
  size!: number;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'varchar', nullable: true })
  text!: string | null;

  @Column({ type: 'integer' })
  seed!: number;

  @Column({ type: 'varchar', default: 'month' })
  period!: Period;

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;
}
