import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDashboards1710000000000 implements MigrationInterface {
  name = 'CreateDashboards1710000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "dashboards" (
        "id"         varchar   PRIMARY KEY NOT NULL,
        "key"        varchar   NOT NULL,
        "title"      varchar   NOT NULL DEFAULT ('My Dashboard'),
        "created_at" datetime  NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        "updated_at" datetime  NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_dashboards_key" ON "dashboards" ("key")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_dashboards_key"`);
    await queryRunner.query(`DROP TABLE "dashboards"`);
  }
}
