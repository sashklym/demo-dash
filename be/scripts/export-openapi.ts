import 'reflect-metadata';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createDataSource } from '../src/db/data-source';
import { buildContainer } from '../src/container';
import { buildApp } from '../src/app';

/**
 * Boots the app in-process (no HTTP listen), reads the generated OpenAPI document,
 * and writes it to two committed locations:
 *   - be/openapi.json            (reference + CI drift check)
 *   - fe/src/lib/api/openapi.json (input to the frontend client generator)
 *
 * This is the single source of truth for the fe ↔ be contract. Re-run after any
 * controller/DTO change, then regenerate the frontend client (fe: npm run api:generate).
 */
async function main(): Promise<void> {
  const dataSource = createDataSource({ database: ':memory:', synchronize: true });
  await dataSource.initialize();
  const container = buildContainer(dataSource);
  const app = await buildApp(container);
  await app.ready();

  const spec = app.swagger();
  const json = `${JSON.stringify(spec, null, 2)}\n`;

  const targets = [
    resolve(__dirname, '../openapi.json'),
    resolve(__dirname, '../../fe/src/lib/api/openapi.json'),
  ];
  for (const target of targets) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, json, 'utf-8');
    console.log(`OpenAPI spec written to ${target}`);
  }

  await app.close();
  await dataSource.destroy();
  // Force exit so a pending pino transport worker never keeps the process alive.
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
