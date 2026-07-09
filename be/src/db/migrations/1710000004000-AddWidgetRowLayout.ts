import type { MigrationInterface, QueryRunner } from 'typeorm';
import { generateNKeysBetween } from '../../core/fractional-index';
import { COLUMNS } from '../../core/place-widget';

/**
 * Replace the flat fractional `rank` with an explicit `(row_index, col_index, size)`
 * slot on the canonical 3-column grid.
 *
 * Every existing widget is size 1, so reading the current `rank` order and dealing
 * widgets left-to-right, three per row, reproduces exactly the layout users already
 * see — no board visibly reshuffles. `(row_index, col_index)` is then a total order
 * and `rank` is redundant, so it is dropped.
 *
 * SQLite has no `ALTER TABLE … ADD COLUMN … NOT NULL` without a default, so the two
 * slot columns land with a default of 0, get backfilled, and keep the default. The
 * CHECK constraint can't be added to an existing SQLite table by `ALTER`, so it is
 * left to `synchronize` in tests and to the entity definition; the service enforces
 * `col + size <= 3` on every write regardless.
 */
export class AddWidgetRowLayout1710000004000 implements MigrationInterface {
  name = 'AddWidgetRowLayout1710000004000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "widgets" ADD COLUMN "size" integer NOT NULL DEFAULT (1)`);
    await queryRunner.query(`ALTER TABLE "widgets" ADD COLUMN "row_index" integer NOT NULL DEFAULT (0)`);
    await queryRunner.query(`ALTER TABLE "widgets" ADD COLUMN "col_index" integer NOT NULL DEFAULT (0)`);

    const rows: { id: string; dashboard_id: string }[] = await queryRunner.query(
      `SELECT "id", "dashboard_id" FROM "widgets" ORDER BY "dashboard_id" ASC, "rank" ASC, "created_at" ASC`,
    );
    for (const group of groupByDashboard(rows).values()) {
      for (let i = 0; i < group.length; i++) {
        await queryRunner.query(`UPDATE "widgets" SET "row_index" = ?, "col_index" = ? WHERE "id" = ?`, [
          Math.floor(i / COLUMNS),
          i % COLUMNS,
          group[i]!.id,
        ]);
      }
    }

    await queryRunner.query(
      `CREATE INDEX "IDX_widgets_dashboard_row_col" ON "widgets" ("dashboard_id", "row_index", "col_index")`,
    );
    await queryRunner.query(`DROP INDEX "IDX_widgets_dashboard_rank"`);
    await queryRunner.query(`ALTER TABLE "widgets" DROP COLUMN "rank"`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "widgets" ADD COLUMN "rank" varchar`);

    const rows: { id: string; dashboard_id: string }[] = await queryRunner.query(
      `SELECT "id", "dashboard_id" FROM "widgets"
        ORDER BY "dashboard_id" ASC, "row_index" ASC, "col_index" ASC, "created_at" ASC`,
    );
    for (const group of groupByDashboard(rows).values()) {
      const ranks = generateNKeysBetween(null, null, group.length);
      for (let i = 0; i < group.length; i++) {
        await queryRunner.query(`UPDATE "widgets" SET "rank" = ? WHERE "id" = ?`, [ranks[i], group[i]!.id]);
      }
    }

    await queryRunner.query(`CREATE INDEX "IDX_widgets_dashboard_rank" ON "widgets" ("dashboard_id", "rank")`);
    await queryRunner.query(`DROP INDEX "IDX_widgets_dashboard_row_col"`);
    await queryRunner.query(`ALTER TABLE "widgets" DROP COLUMN "col_index"`);
    await queryRunner.query(`ALTER TABLE "widgets" DROP COLUMN "row_index"`);
    await queryRunner.query(`ALTER TABLE "widgets" DROP COLUMN "size"`);
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
