import { defineConfig, devices } from '@playwright/test';

/**
 * Runs the same scenarios against the LIVE deployment (no local servers).
 *   npm run test:live
 * Overridable via LIVE_BASE_URL (default: the production frontend).
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.LIVE_BASE_URL ?? 'https://dash.youscan.sashklym.cc',
    trace: 'off',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // No webServer — we are testing the already-deployed apps.
});
