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
  // Close the add-widget menu so the hero screenshot shows a clean grid.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
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

  // Give a widget a custom name; the type badge stays and the name survives reload
  const line = page.getByTestId('widget-line');
  await expect(line.getByText('Line', { exact: true })).toBeVisible();
  await line.getByRole('button', { name: 'Line chart' }).click();
  await line.getByLabel('Widget name').fill('Brand buzz');
  await line.getByLabel('Widget name').press('Enter');
  await expect(line.getByRole('button', { name: 'Brand buzz' })).toBeVisible();
  await expect(line.getByText('Line', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('widget-line').getByRole('button', { name: 'Brand buzz' })).toBeVisible();

  // Expand a widget to full-screen, then dismiss it
  await page.getByTestId('widget-line').getByRole('button', { name: 'Expand widget' }).click();
  await expect(page.getByRole('dialog').locator('svg').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Delete the text widget (confirm in the dialog) → reload → it stays gone
  await page.getByTestId('widget-text').getByRole('button', { name: 'Delete widget' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click();
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

test('reorders widgets by dragging and persists the new order', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/d\/.+/);
  for (const name of ['Line chart', 'Bar chart', 'Text']) {
    await page.getByRole('button', { name: 'Add widget' }).click();
    await page.getByRole('menuitem', { name, exact: true }).click();
  }
  await expect(page.getByText('3 widgets')).toBeVisible();

  // Initial order: line, bar, text.
  const cards = page.locator('[data-testid^="widget-"]');
  await expect(cards.first()).toHaveAttribute('data-testid', 'widget-line');

  // Drag the text widget's handle (3rd) onto the first card's position.
  const handles = page.getByRole('button', { name: 'Drag to reorder' });
  const src = await handles.nth(2).boundingBox();
  const dst = await handles.nth(0).boundingBox();
  if (!src || !dst) throw new Error('missing drag handles');
  await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
  await page.mouse.down();
  await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2 - 12, { steps: 5 }); // pass activation distance
  await page.mouse.move(dst.x + dst.width / 2, dst.y + dst.height / 2, { steps: 12 });
  await page.mouse.up();

  // Text is now first; the order survives a reload.
  await expect(cards.first()).toHaveAttribute('data-testid', 'widget-text');
  await page.reload();
  await expect(page.getByText('3 widgets')).toBeVisible();
  await expect(page.locator('[data-testid^="widget-"]').first()).toHaveAttribute('data-testid', 'widget-text');
});

test('scrolls a newly added widget into view', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/d\/.+/);

  // Nine size-1 widgets fill three rows exactly, leaving no hole — so the tenth
  // opens a new row at the bottom. (First fit only appends when nothing fits above.)
  for (let i = 0; i < 9; i++) {
    await page.getByRole('button', { name: 'Add widget' }).click();
    await page.getByRole('menuitem', { name: 'Text', exact: true }).click();
  }
  await expect(page.getByText('9 widgets')).toBeVisible();

  // The next widget (the only bar chart) should be scrolled into view on add.
  await page.getByRole('button', { name: 'Add widget' }).click();
  await page.getByRole('menuitem', { name: 'Bar chart', exact: true }).click();
  await expect(page.getByText('10 widgets')).toBeVisible();
  await expect(page.getByTestId('widget-bar')).toBeInViewport();
});

test('scrolls up to a new widget that first-fit placed above the fold', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/d\/.+/);

  // Four full rows of text widgets, so row 0 sits well above the fold.
  for (let i = 0; i < 12; i++) {
    await page.getByRole('button', { name: 'Add widget' }).click();
    await page.getByRole('menuitem', { name: 'Text', exact: true }).click();
  }
  await expect(page.getByText('12 widgets')).toBeVisible();

  // Punch a hole in row 0 by deleting its middle widget. A delete leaves the gap
  // open — nothing below reflows into it.
  await page.locator('[data-testid^="widget-"]').nth(1).getByRole('button', { name: 'Delete widget' }).click();
  await page.getByRole('button', { name: /^delete$/i }).click();
  await expect(page.getByText('11 widgets')).toBeVisible();

  // Scroll to the bottom, then add a bar chart: first fit drops it in row 0's hole,
  // far above the viewport — the grid must scroll back *up* to it.
  await page.evaluate(() => window.scrollTo(0, document.scrollingElement!.scrollHeight));
  await page.getByRole('button', { name: 'Add widget' }).click();
  await page.getByRole('menuitem', { name: 'Bar chart', exact: true }).click();
  await expect(page.getByText('12 widgets')).toBeVisible();

  const bar = page.getByTestId('widget-bar');
  await expect(bar).toBeInViewport();
  // It really did land in row 0's gap, beside the two survivors.
  const siblings = page.locator('[data-testid^="widget-"]');
  await expect(siblings.nth(1)).toHaveAttribute('data-testid', 'widget-bar');
});

test('charts show the sentiment series and persist the selected period', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/d\/.+/);
  await page.getByRole('button', { name: 'Add widget' }).click();
  await page.getByRole('menuitem', { name: 'Line chart', exact: true }).click();

  const chart = page.getByTestId('widget-line');
  // YouScan sentiment breakdown legend
  await expect(chart.getByText('Positive')).toBeVisible();
  await expect(chart.getByText('Neutral')).toBeVisible();
  await expect(chart.getByText('Negative')).toBeVisible();

  // Default period is Month; switching to Year persists across a reload.
  await expect(chart.getByRole('button', { name: 'Month', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await chart.getByRole('button', { name: 'Year', exact: true }).click();
  await expect(chart.getByRole('button', { name: 'Year', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(
    page.getByTestId('widget-line').getByRole('button', { name: 'Year', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('shows a not-found state for an unknown key', async ({ page }) => {
  await page.goto('/d/this-key-does-not-exist');
  await expect(page.getByText(/dashboard not found/i)).toBeVisible();
  await page.screenshot({ path: 'screenshots/06-not-found.png', fullPage: true });

  await page.getByRole('button', { name: /create a new dashboard/i }).click();
  await expect(page).toHaveURL(/\/d\/.+/);
  await expect(page.getByText(/your dashboard is empty/i)).toBeVisible();
});
