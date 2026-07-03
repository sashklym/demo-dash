import { defineConfig, devices } from '@playwright/test';

/**
 * Boots the real backend (temp SQLite) and frontend, then drives the whole service
 * in a browser. Both servers are started by Playwright and torn down after the run.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run dev',
      cwd: '../be',
      url: 'http://localhost:3000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        PORT: '3000',
        NODE_ENV: 'test',
        DATABASE_PATH: './data/e2e.sqlite',
        CORS_ORIGIN: '*',
        LOG_LEVEL: 'silent',
      },
    },
    {
      command: 'npm run dev',
      cwd: '../fe',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { VITE_API_BASE_URL: 'http://localhost:3000' },
    },
  ],
});
