import { afterEach, describe, expect, it } from 'vitest';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Dashboard } from '../../../src/modules/dashboards/dashboard.entity';
import { Widget } from '../../../src/modules/widgets/widget.entity';
import { CreateDashboards1710000000000 } from '../../../src/db/migrations/1710000000000-CreateDashboards';
import { CreateWidgets1710000001000 } from '../../../src/db/migrations/1710000001000-CreateWidgets';
import { AddWidgetPeriod1710000002000 } from '../../../src/db/migrations/1710000002000-AddWidgetPeriod';
import { AddWidgetRank1710000003000 } from '../../../src/db/migrations/1710000003000-AddWidgetRank';
import { AddWidgetRowLayout1710000004000 } from '../../../src/db/migrations/1710000004000-AddWidgetRowLayout';

/** Migrations up to (but not including) the row-layout one — i.e. the shipped schema. */
const BEFORE = [
  CreateDashboards1710000000000,
  CreateWidgets1710000001000,
  AddWidgetPeriod1710000002000,
  AddWidgetRank1710000003000,
];

let ds: DataSource;

afterEach(async () => {
  if (ds?.isInitialized) await ds.destroy();
});

/** Boot an in-memory DB at the pre-migration schema, seeded with rank-ordered widgets. */
async function seedLegacyBoard(ranks: string[]): Promise<DataSource> {
  ds = new DataSource({
    type: 'better-sqlite3',
    database: ':memory:',
    entities: [Dashboard, Widget],
    migrations: [...BEFORE, AddWidgetRowLayout1710000004000],
    synchronize: false,
  });
  await ds.initialize();

  // Run only the migrations that predate the one under test.
  const runner = ds.createQueryRunner();
  for (const Migration of BEFORE) {
    await new Migration().up(runner);
  }

  await runner.query(
    `INSERT INTO "dashboards" ("id", "key", "title", "created_at", "updated_at")
     VALUES ('d1', 'key-1', 'Board', datetime('now'), datetime('now'))`,
  );
  for (const [i, rank] of ranks.entries()) {
    await runner.query(
      `INSERT INTO "widgets" ("id", "dashboard_id", "type", "rank", "title", "text", "seed", "period", "created_at", "updated_at")
       VALUES (?, 'd1', 'text', ?, ?, '', 1, 'month', datetime('now'), datetime('now'))`,
      [`w${i}`, rank, `Widget ${i}`],
    );
  }
  await runner.release();
  return ds;
}

describe('AddWidgetRowLayout', () => {
  it('deals rank-ordered widgets into 3-column rows, preserving reading order', async () => {
    const dataSource = await seedLegacyBoard(['a0', 'a1', 'a2', 'a3', 'a4']);
    const runner = dataSource.createQueryRunner();

    await new AddWidgetRowLayout1710000004000().up(runner);

    const rows: { id: string; row_index: number; col_index: number; size: number }[] = await runner.query(
      `SELECT "id", "row_index", "col_index", "size" FROM "widgets" ORDER BY "row_index", "col_index"`,
    );
    expect(rows.map((r) => [r.id, r.row_index, r.col_index, r.size])).toEqual([
      ['w0', 0, 0, 1],
      ['w1', 0, 1, 1],
      ['w2', 0, 2, 1],
      ['w3', 1, 0, 1],
      ['w4', 1, 1, 1],
    ]);
    await runner.release();
  });

  it('drops rank on the way up and restores an equivalent order on the way down', async () => {
    const dataSource = await seedLegacyBoard(['a0', 'a1', 'a2', 'a3']);
    const runner = dataSource.createQueryRunner();
    const migration = new AddWidgetRowLayout1710000004000();

    await migration.up(runner);
    const columns: { name: string }[] = await runner.query(`PRAGMA table_info("widgets")`);
    expect(columns.map((c) => c.name)).not.toContain('rank');

    await migration.down(runner);
    const after: { id: string; rank: string }[] = await runner.query(
      `SELECT "id", "rank" FROM "widgets" ORDER BY "rank" ASC`,
    );
    // The original reading order survives the round trip…
    expect(after.map((r) => r.id)).toEqual(['w0', 'w1', 'w2', 'w3']);
    // …and the ranks are strictly ascending again.
    expect(after.every((r, i) => i === 0 || after[i - 1]!.rank < r.rank)).toBe(true);

    const back: { name: string }[] = await runner.query(`PRAGMA table_info("widgets")`);
    expect(back.map((c) => c.name)).not.toContain('row_index');
    await runner.release();
  });

  it('scopes the backfill per dashboard', async () => {
    const dataSource = await seedLegacyBoard(['a0', 'a1', 'a2', 'a3']);
    const runner = dataSource.createQueryRunner();
    await runner.query(
      `INSERT INTO "dashboards" ("id", "key", "title", "created_at", "updated_at")
       VALUES ('d2', 'key-2', 'Other', datetime('now'), datetime('now'))`,
    );
    await runner.query(
      `INSERT INTO "widgets" ("id", "dashboard_id", "type", "rank", "title", "text", "seed", "period", "created_at", "updated_at")
       VALUES ('x0', 'd2', 'text', 'a0', 'X', '', 1, 'month', datetime('now'), datetime('now'))`,
    );

    await new AddWidgetRowLayout1710000004000().up(runner);

    // The second dashboard's lone widget starts its own row 0 — counters don't leak.
    const [x]: { row_index: number; col_index: number }[] = await runner.query(
      `SELECT "row_index", "col_index" FROM "widgets" WHERE "id" = 'x0'`,
    );
    expect([x!.row_index, x!.col_index]).toEqual([0, 0]);
    await runner.release();
  });
});
