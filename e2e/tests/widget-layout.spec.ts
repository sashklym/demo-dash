import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const API = 'http://localhost:3000';

/** The canonical grid is 3 columns at `lg`; pin the viewport so rows are deterministic. */
test.use({ viewport: { width: 1280, height: 900 } });

async function newDashboard(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API}/api/dashboards`, { data: {} });
  return (await res.json()).key;
}

async function addWidget(request: APIRequestContext, key: string, size: number, title: string) {
  const res = await request.post(`${API}/api/dashboards/${key}/widgets`, {
    data: { type: 'text', size, title },
  });
  return res.json();
}

/** The board as the server stores it: `[row, col, size]` in reading order. */
async function serverSlots(request: APIRequestContext, key: string) {
  const page = await (await request.get(`${API}/api/dashboards/${key}/widgets`)).json();
  return {
    totalRows: page.totalRows as number,
    slots: page.items.map((w: { row: number; col: number; size: number }) => [w.row, w.col, w.size]),
  };
}

/**
 * The board as the browser actually lays it out: cards grouped by their y position,
 * left to right. Asserting on geometry rather than class names is the point — it
 * checks what the user sees, not what we told CSS to do.
 */
async function renderedRows(page: Page): Promise<{ title: string; width: number }[][]> {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-testid^="widget-"]')];
    const byY = new Map<number, { title: string; x: number; width: number }[]>();
    for (const card of cards) {
      const box = card.getBoundingClientRect();
      const title =
        [...card.querySelectorAll('button')].map((b) => b.textContent?.trim() ?? '').find((t) => /^[A-Z]\d?$/.test(t)) ??
        '?';
      // Cards in the same row share a y; round to absorb sub-pixel drift.
      const y = Math.round(window.scrollY + box.y);
      const row = byY.get(y);
      const entry = { title, x: Math.round(box.x), width: Math.round(box.width) };
      if (row) row.push(entry);
      else byY.set(y, [entry]);
    }
    return [...byY.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, row]) => row.sort((a, b) => a.x - b.x).map(({ title, width }) => ({ title, width })));
  });
}

/** Widths of one grid column and of the full grid, for relative-width assertions. */
const ONE_COL = 400;
const TOLERANCE = 40;

function isSpan(width: number, columns: number): boolean {
  // A span-N card is N columns wide plus the (N-1) gaps it swallows.
  const expected = columns * ONE_COL + (columns - 1) * 16;
  return Math.abs(width - expected) <= TOLERANCE;
}

test.describe('widget column span', () => {
  test('resizes an existing widget and the choice survives a reload', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/d\/.+/);
    await page.getByRole('button', { name: 'Add widget' }).click();
    await page.getByRole('menuitem', { name: 'Line chart', exact: true }).click();

    const card = page.getByTestId('widget-line');
    await expect(card).toHaveAttribute('data-size', '1');
    const before = (await card.boundingBox())!.width;

    await card.getByRole('button', { name: 'Widget width' }).click();
    await page.getByRole('menuitem', { name: '2 columns' }).click();
    await expect(card).toHaveAttribute('data-size', '2');

    const after = (await card.boundingBox())!.width;
    expect(after).toBeGreaterThan(before * 1.8);

    await page.reload();
    await expect(page.getByTestId('widget-line')).toHaveAttribute('data-size', '2');
  });

  test('a size-3 widget owns its row', async ({ page, request }) => {
    const key = await newDashboard(request);
    await addWidget(request, key, 3, 'A');
    await addWidget(request, key, 1, 'B');
    await page.goto(`/d/${key}`);
    await expect(page.getByText('2 widgets')).toBeVisible();

    const rows = await renderedRows(page);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.map((c) => c.title)).toEqual(['A']);
    expect(isSpan(rows[0]![0]!.width, 3)).toBe(true);
    expect(rows[1]!.map((c) => c.title)).toEqual(['B']);
  });

  // Each case is a board of sizes; the expectation is how they group into rows.
  const COMPLEX_ROWS: { sizes: number[]; rows: string[][]; note: string }[] = [
    { sizes: [1, 1, 1], rows: [['A', 'B', 'C']], note: 'three singles fill one row' },
    { sizes: [2, 1], rows: [['A', 'B']], note: 'wide then narrow' },
    { sizes: [1, 2], rows: [['A', 'B']], note: 'narrow then wide' },
    { sizes: [2, 2], rows: [['A'], ['B']], note: 'second wide wraps, hole at end of row 0' },
    { sizes: [3], rows: [['A']], note: 'full-width alone' },
    { sizes: [1, 3], rows: [['A'], ['B']], note: 'full-width cannot share a row' },
    { sizes: [3, 1, 1, 1], rows: [['A'], ['B', 'C', 'D']], note: 'full row then three singles' },
    {
      sizes: [2, 1, 1, 2],
      rows: [
        ['A', 'B'],
        ['C', 'D'],
      ],
      note: 'both rows exactly full',
    },
  ];

  for (const { sizes, rows: expected, note } of COMPLEX_ROWS) {
    test(`packs [${sizes.join(',')}] — ${note}`, async ({ page, request }) => {
      const key = await newDashboard(request);
      for (const [i, size] of sizes.entries()) {
        await addWidget(request, key, size, String.fromCharCode(65 + i));
      }
      await page.goto(`/d/${key}`);
      await expect(page.getByText(`${sizes.length} widget${sizes.length === 1 ? '' : 's'}`)).toBeVisible();

      const rendered = await renderedRows(page);
      expect(rendered.map((row) => row.map((c) => c.title))).toEqual(expected);

      // The browser's rows must be the rows the server stored.
      const { totalRows } = await serverSlots(request, key);
      expect(totalRows).toBe(expected.length);
    });
  }

  test('a new widget fills the nearest hole from the top, not the bottom', async ({ page, request }) => {
    const key = await newDashboard(request);
    await addWidget(request, key, 2, 'A'); // row 0, hole at col 2
    await addWidget(request, key, 2, 'B'); // wraps to row 1
    await page.goto(`/d/${key}`);
    await expect(page.getByText('2 widgets')).toBeVisible();

    // Add through the UI so the whole create → refetch → render path is exercised.
    await page.getByRole('button', { name: 'Add widget' }).click();
    await page.getByRole('menuitem', { name: 'Text', exact: true }).click();
    await expect(page.getByText('3 widgets')).toBeVisible();

    const { slots } = await serverSlots(request, key);
    expect(slots).toEqual([
      [0, 0, 2],
      [0, 2, 1], // the new widget took row 0's hole
      [1, 0, 2],
    ]);

    const rows = await renderedRows(page);
    expect(rows[0]).toHaveLength(2); // A + the newcomer
    expect(rows[1]!.map((c) => c.title)).toEqual(['B']);
  });

  // A free column is not a free *run*: this is the case a naive `free >= size` passes
  // the hole-filling test but fails here.
  test('a size-2 widget skips a row whose free columns are not adjacent', async ({ request }) => {
    const key = await newDashboard(request);
    await addWidget(request, key, 1, 'A'); // (0,0)
    const b = await addWidget(request, key, 1, 'B'); // (0,1)
    await addWidget(request, key, 1, 'C'); // (0,2)
    await request.delete(`${API}/api/dashboards/${key}/widgets/${b.id}`);

    // Row 0 is now A . C — one free column at index 1, no run of two.
    const wide = await addWidget(request, key, 2, 'W');
    expect([wide.row, wide.col]).toEqual([1, 0]);

    // …but a size-1 widget does fit that leftover column.
    const narrow = await addWidget(request, key, 1, 'N');
    expect([narrow.row, narrow.col]).toEqual([0, 1]);
  });

  test('deleting a widget leaves its hole open for the next one', async ({ page, request }) => {
    const key = await newDashboard(request);
    await addWidget(request, key, 2, 'A'); // row 0, cols 0-1
    await addWidget(request, key, 1, 'B'); // row 0, col 2
    await addWidget(request, key, 1, 'C'); // row 1, col 0
    await page.goto(`/d/${key}`);
    await expect(page.getByText('3 widgets')).toBeVisible();

    const rowsBefore = await renderedRows(page);
    const cRowBefore = rowsBefore.findIndex((row) => row.some((c) => c.title === 'C'));

    // Delete B; the board below must not reflow.
    await page
      .locator('[data-testid^="widget-"]', { hasText: 'B' })
      .getByRole('button', { name: 'Delete widget' })
      .click();
    await page.getByRole('button', { name: /^delete$/i }).click();
    await expect(page.getByText('2 widgets')).toBeVisible();

    const { slots } = await serverSlots(request, key);
    expect(slots).toEqual([
      [0, 0, 2],
      [1, 0, 1], // C stayed on row 1 — the hole at (0,2) is still open
    ]);
    const rowsAfter = await renderedRows(page);
    expect(rowsAfter.findIndex((row) => row.some((c) => c.title === 'C'))).toBe(cRowBefore);

    // The next widget fills the gap rather than opening a row.
    await page.getByRole('button', { name: 'Add widget' }).click();
    await page.getByRole('menuitem', { name: 'Text', exact: true }).click();
    await expect(page.getByText('3 widgets')).toBeVisible();
    expect((await serverSlots(request, key)).slots).toEqual([
      [0, 0, 2],
      [0, 2, 1],
      [1, 0, 1],
    ]);
  });

  test('emptying a row collapses it and pulls the rows below up', async ({ request }) => {
    const key = await newDashboard(request);
    await addWidget(request, key, 3, 'A');
    const mid = await addWidget(request, key, 3, 'B');
    await addWidget(request, key, 3, 'C');
    expect((await serverSlots(request, key)).totalRows).toBe(3);

    await request.delete(`${API}/api/dashboards/${key}/widgets/${mid.id}`);
    const { slots, totalRows } = await serverSlots(request, key);
    expect(totalRows).toBe(2);
    expect(slots).toEqual([
      [0, 0, 3],
      [1, 0, 3],
    ]);
  });

  test('a wide widget never overflows the grid at any breakpoint', async ({ page, request }) => {
    const key = await newDashboard(request);
    await addWidget(request, key, 3, 'A');
    await page.goto(`/d/${key}`);
    await expect(page.getByText('1 widget')).toBeVisible();

    for (const width of [1280, 768, 375]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(() => {
        const doc = document.scrollingElement!;
        return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
      });
      expect(overflow.scrollWidth, `no horizontal scroll at ${width}px`).toBeLessThanOrEqual(overflow.clientWidth);
    }
  });

  test('a virtualized board packs and scrolls by the server’s rows', async ({ page, request }) => {
    const key = await newDashboard(request);
    // Past the 20-row virtualization threshold, with mixed spans.
    const sizes = Array.from({ length: 60 }, (_, i) => [1, 1, 2, 3, 1, 2][i % 6]!);
    for (const [i, size] of sizes.entries()) await addWidget(request, key, size, `W${i}`);

    const { totalRows } = await serverSlots(request, key);
    expect(totalRows).toBeGreaterThan(20);

    await page.goto(`/d/${key}`);
    await expect(page.getByText('60 widgets')).toBeVisible();

    // Virtualized: far fewer cards mounted than exist.
    const mounted = await page.locator('[data-testid^="widget-"]').count();
    expect(mounted).toBeLessThan(60);
    expect(mounted).toBeGreaterThan(0);

    // The scrollbar is sized from totalRows, not from a widget count / column guess.
    const pageHeight = await page.evaluate(() => document.scrollingElement!.scrollHeight);
    expect(pageHeight).toBeGreaterThan(totalRows * 300);

    // Scrolling to the bottom reaches the last widget the server placed.
    await page.evaluate(() => window.scrollTo(0, document.scrollingElement!.scrollHeight));
    await expect(page.locator('[data-testid^="widget-"]', { hasText: 'W59' })).toBeVisible();
  });
});
