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

/**
 * A widget on a dashboard. `seed` drives deterministic chart data (so a reload
 * shows the same series); `text` holds the editable body of a text widget.
 */
@Entity('widgets')
@Index('IDX_widgets_dashboard_id', ['dashboard_id'])
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

  @Column({ type: 'integer' })
  position!: number;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'varchar', nullable: true })
  text!: string | null;

  @Column({ type: 'integer' })
  seed!: number;

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;
}
