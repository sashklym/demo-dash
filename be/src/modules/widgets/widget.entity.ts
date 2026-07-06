import {
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
 * `period` is the chart's saved day/week/month/year granularity.
 */
@Entity('widgets')
@Index('IDX_widgets_dashboard_id', ['dashboard_id'])
@Index('IDX_widgets_dashboard_rank', ['dashboard_id', 'rank'])
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
   * Fractional order key (see core/fractional-index). Widgets sort by `rank ASC`;
   * a move computes a key between neighbors and writes only this row — no
   * O(n) position renumbering.
   */
  @Column({ type: 'varchar' })
  rank!: string;

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
