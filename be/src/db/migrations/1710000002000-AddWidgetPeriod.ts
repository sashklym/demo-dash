import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWidgetPeriod1710000002000 implements MigrationInterface {
  name = 'AddWidgetPeriod1710000002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "widgets" ADD COLUMN "period" varchar NOT NULL DEFAULT ('month')`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "widgets" DROP COLUMN "period"`);
  }
}
