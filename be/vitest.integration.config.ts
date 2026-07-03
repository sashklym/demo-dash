import { defineConfig } from 'vitest/config';

// Integration tests: boot the real Fastify app against an in-memory SQLite DB and
// exercise it through app.inject(). Run serially in one process so the shared
// in-memory database is deterministic between specs.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['test/integration/**/*.spec.ts'],
    setupFiles: ['./test/vitest.setup.ts'],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
