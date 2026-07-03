import { defineConfig } from 'vitest/config';

// Unit tests: fast, no external I/O. Services are tested with mocked repositories.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts'],
    setupFiles: ['./test/vitest.setup.ts'],
  },
});
