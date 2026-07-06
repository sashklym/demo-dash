import type { MigrationInterface, QueryRunner } from 'typeorm';
import { generateNKeysBetween } from '../../core/fractional-index';

/**
 * Replace the integer `position` with a fractional string `rank`. Backfills
 * ranks per dashboard from the existing position order so nothing reshuffles,
 * then drops `position`. See core/fractional-index for why.
 */
export class AddWidgetRank1710000003000 implements MigrationInterface {
  name = 'AddWidgetRank1710000003000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "widgets" ADD COLUMN "rank" varchar`);

    const rows: { id: string; dashboard_id: string }[] = await queryRunner.query(
      `SELECT "id", "dashboard_id" FROM "widgets" ORDER BY "dashboard_id" ASC, "position" ASC, "created_at" ASC`,
    );
    await this.backfillRanks(queryRunner, rows);

    await queryRunner.query(`CREATE INDEX "IDX_widgets_dashboard_rank" ON "widgets" ("dashboard_id", "rank")`);
    await queryRunner.query(`ALTER TABLE "widgets" DROP COLUMN "position"`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "widgets" ADD COLUMN "position" integer NOT NULL DEFAULT (0)`);

    const rows: { id: string; dashboard_id: string }[] = await queryRunner.query(
      `SELECT "id", "dashboard_id" FROM "widgets" ORDER BY "dashboard_id" ASC, "rank" ASC, "created_at" ASC`,
    );
    const byDashboard = groupByDashboard(rows);
    for (const group of byDashboard.values()) {
      for (let i = 0; i < group.length; i++) {
        await queryRunner.query(`UPDATE "widgets" SET "position" = ? WHERE "id" = ?`, [i, group[i]!.id]);
      }
    }

    await queryRunner.query(`DROP INDEX "IDX_widgets_dashboard_rank"`);
    await queryRunner.query(`ALTER TABLE "widgets" DROP COLUMN "rank"`);
  }

  private async backfillRanks(
    queryRunner: QueryRunner,
    rows: { id: string; dashboard_id: string }[],
  ): Promise<void> {
    for (const group of groupByDashboard(rows).values()) {
      const ranks = generateNKeysBetween(null, null, group.length);
      for (let i = 0; i < group.length; i++) {
        await queryRunner.query(`UPDATE "widgets" SET "rank" = ? WHERE "id" = ?`, [ranks[i], group[i]!.id]);
      }
    }
  }
}

function groupByDashboard<T extends { dashboard_id: string }>(rows: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const group = groups.get(row.dashboard_id);
    if (group) group.push(row);
    else groups.set(row.dashboard_id, [row]);
  }
  return groups;
}
