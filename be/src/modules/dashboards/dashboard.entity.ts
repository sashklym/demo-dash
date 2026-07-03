import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * An anonymous dashboard. Its `key` is an unguessable capability token — whoever
 * holds it can view/edit the dashboard (via /d/:key on the frontend). There are no
 * users or passwords; the key IS the identity.
 */
@Entity('dashboards')
export class Dashboard {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_dashboards_key', { unique: true })
  @Column({ type: 'varchar' })
  key!: string;

  @Column({ type: 'varchar', default: 'My Dashboard' })
  title!: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;
}
