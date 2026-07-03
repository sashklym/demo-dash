import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';

mkdirSync('screenshots', { recursive: true });

test('golden path: create → add widgets → persist text → reload → delete', async ({ page }) => {
  // "/" bootstraps a dashboard and redirects to /d/:key
  await page.goto('/');
  await expect(page).toHaveURL(/\/d\/.+/);
  await expect(page.getByText(/your dashboard is empty/i)).toBeVisible();
  await page.screenshot({ path: 'screenshots/01-empty-dashboard.png', fullPage: true });

  // Add all three widget types
  for (const name of ['Line chart', 'Bar chart', 'Text']) {
    await page.getByRole('button', { name: 'Add widget' }).click();
    await page.getByRole('menuitem', { name, exact: true }).click();
  }
  await expect(page.getByText('3 widgets')).toBeVisible();

  // Charts render their data
  await expect(page.getByTestId('widget-line').locator('svg').first()).toBeVisible();
  await expect(page.getByTestId('widget-bar').locator('svg').first()).toBeVisible();
  await page.screenshot({ path: 'screenshots/02-three-widgets.png', fullPage: true });

  // Edit + save the text widget
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Widget text').fill('Persisted note ✅');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Persisted note ✅')).toBeVisible();
  await page.screenshot({ path: 'screenshots/03-text-saved.png', fullPage: true });

  // Reload → positions, widgets, chart data, and text are all restored
  await page.reload();
  await expect(page.getByText('3 widgets')).toBeVisible();
  await expect(page.getByText('Persisted note ✅')).toBeVisible();
  await expect(page.getByTestId('widget-line').locator('svg').first()).toBeVisible();
  await page.screenshot({ path: 'screenshots/04-after-reload.png', fullPage: true });

  // Delete the text widget → reload → it stays gone
  await page.getByTestId('widget-text').getByRole('button', { name: 'Delete widget' }).click();
  await expect(page.getByText('2 widgets')).toBeVisible();
  await page.reload();
  await expect(page.getByText('2 widgets')).toBeVisible();
  await expect(page.getByText('Persisted note ✅')).toHaveCount(0);
});

test('restores a saved dashboard by key in a fresh browser', async ({ page, browser }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/d\/.+/);
  const key = (await page.getByTestId('dashboard-key').textContent())?.trim();
  expect(key).toBeTruthy();

  await page.getByRole('button', { name: 'Add widget' }).click();
  await page.getByRole('menuitem', { name: 'Text', exact: true }).click();
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Widget text').fill('Shared across devices');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Shared across devices')).toBeVisible();

  // A fresh context has no localStorage — opening the key must restore the dashboard.
  const fresh = await browser.newContext();
  const page2 = await fresh.newPage();
  await page2.goto(`/d/${key}`);
  await expect(page2.getByText('Shared across devices')).toBeVisible();
  await page2.screenshot({ path: 'screenshots/05-restored-fresh-browser.png', fullPage: true });
  await fresh.close();
});

test('shows a not-found state for an unknown key', async ({ page }) => {
  await page.goto('/d/this-key-does-not-exist');
  await expect(page.getByText(/dashboard not found/i)).toBeVisible();
  await page.screenshot({ path: 'screenshots/06-not-found.png', fullPage: true });

  await page.getByRole('button', { name: /create a new dashboard/i }).click();
  await expect(page).toHaveURL(/\/d\/.+/);
  await expect(page.getByText(/your dashboard is empty/i)).toBeVisible();
});
