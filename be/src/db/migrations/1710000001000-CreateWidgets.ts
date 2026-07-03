import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWidgets1710000001000 implements MigrationInterface {
  name = 'CreateWidgets1710000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "widgets" (
        "id"           varchar   PRIMARY KEY NOT NULL,
        "dashboard_id" varchar   NOT NULL,
        "type"         varchar   NOT NULL,
        "position"     integer   NOT NULL,
        "title"        varchar   NOT NULL,
        "text"         varchar,
        "seed"         integer   NOT NULL,
        "created_at"   datetime  NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        "updated_at"   datetime  NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        CONSTRAINT "FK_widgets_dashboard_id" FOREIGN KEY ("dashboard_id")
          REFERENCES "dashboards" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_widgets_dashboard_id" ON "widgets" ("dashboard_id")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_widgets_dashboard_id"`);
    await queryRunner.query(`DROP TABLE "widgets"`);
  }
}
