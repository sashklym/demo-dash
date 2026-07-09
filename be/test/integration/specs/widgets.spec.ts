import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, type TestApp } from '../helpers/test-app';

let ctx: TestApp;

async function newDashboard(): Promise<string> {
  return (await ctx.app.inject({ method: 'POST', url: '/api/dashboards', payload: {} })).json().key;
}

async function addWidget(key: string, payload: Record<string, unknown>) {
  return (await ctx.app.inject({ method: 'POST', url: `/api/dashboards/${key}/widgets`, payload })).json();
}

function listPage(key: string, query = '') {
  return ctx.app.inject({ method: 'GET', url: `/api/dashboards/${key}/widgets${query}` }).then((r) => r.json());
}

async function listItems(key: string) {
  return (await listPage(key)).items;
}

/** Every widget's slot, in reading order — the shape the layout assertions read. */
async function slots(key: string): Promise<[number, number, number][]> {
  const items = await listItems(key);
  return items.map((w: { row: number; col: number; size: number }) => [w.row, w.col, w.size]);
}

function place(key: string, id: string, row: number, col: number) {
  return ctx.app.inject({ method: 'PUT', url: `/api/dashboards/${key}/widgets/${id}/place`, payload: { row, col } });
}

function resize(key: string, id: string, size: number) {
  return ctx.app.inject({ method: 'PATCH', url: `/api/dashboards/${key}/widgets/${id}`, payload: { size } });
}

beforeAll(async () => {
  ctx = await buildTestApp();
});
afterAll(async () => {
  await ctx.close();
});
beforeEach(async () => {
  await ctx.reset();
});

describe('widgets', () => {
  it('starts empty', async () => {
    const key = await newDashboard();
    const res = await ctx.app.inject({ method: 'GET', url: `/api/dashboards/${key}/widgets` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ items: [], total: 0, totalRows: 0, fromRow: 0, toRow: 19 });
  });

  it('deals new widgets left to right, three to a row', async () => {
    const key = await newDashboard();
    for (let i = 0; i < 4; i++) await addWidget(key, { type: 'line' });
    expect(await slots(key)).toEqual([
      [0, 0, 1],
      [0, 1, 1],
      [0, 2, 1],
      [1, 0, 1],
    ]);
  });

  it('gives a size-3 widget its own row', async () => {
    const key = await newDashboard();
    await addWidget(key, { type: 'line', size: 3 });
    await addWidget(key, { type: 'bar' });
    expect(await slots(key)).toEqual([
      [0, 0, 3],
      [1, 0, 1],
    ]);
  });

  // First fit from the top, not append at the end.
  it('fills the nearest hole from the top rather than appending', async () => {
    const key = await newDashboard();
    await addWidget(key, { type: 'line', size: 2 });
    await addWidget(key, { type: 'bar', size: 2 });
    // Rows: [2, hole] / [2, hole]. A size-1 widget takes row 0's hole.
    const c = await addWidget(key, { type: 'text' });
    expect([c.row, c.col]).toEqual([0, 2]);
  });

  // The contiguity case: a free column is not the same as a free *run*.
  it('skips a row whose free columns are not adjacent', async () => {
    const key = await newDashboard();
    const a = await addWidget(key, { type: 'line' }); // (0,0)
    await addWidget(key, { type: 'bar' }); // (0,1)
    await addWidget(key, { type: 'text' }); // (0,2)
    await ctx.app.inject({ method: 'DELETE', url: `/api/dashboards/${key}/widgets/${a.id}` });
    // Row 0 now holds cols 1 and 2 — one free column at 0, no run of two.
    const wide = await addWidget(key, { type: 'line', size: 2 });
    expect([wide.row, wide.col]).toEqual([1, 0]);
    // …but a size-1 widget does fit the leftover column.
    const narrow = await addWidget(key, { type: 'bar' });
    expect([narrow.row, narrow.col]).toEqual([0, 0]);
  });

  it('pages by row range and reports totals', async () => {
    const key = await newDashboard();
    for (let i = 0; i < 7; i++) await addWidget(key, { type: 'line' }); // rows 0,0,0,1,1,1,2
    const page = await listPage(key, '?fromRow=1&toRow=1');
    expect(page).toMatchObject({ total: 7, totalRows: 3, fromRow: 1, toRow: 1 });
    expect(page.items).toHaveLength(3);
    expect(page.items.every((w: { row: number }) => w.row === 1)).toBe(true);
  });

  it('returns an empty range past the end of the board', async () => {
    const key = await newDashboard();
    await addWidget(key, { type: 'line' });
    const page = await listPage(key, '?fromRow=50&toRow=60');
    expect(page.items).toEqual([]);
    expect(page.totalRows).toBe(1);
  });

  it('caps an over-wide row window instead of erroring', async () => {
    const key = await newDashboard();
    await addWidget(key, { type: 'line' });
    const page = await listPage(key, '?fromRow=0&toRow=99999');
    expect(page.toRow).toBe(99);
  });

  it('places a widget on a free slot and leaves the other holes alone', async () => {
    const key = await newDashboard();
    await addWidget(key, { type: 'line', size: 2 }); // (0,0) size 2, hole at (0,2)
    await addWidget(key, { type: 'bar', size: 2 }); // (1,0) size 2
    const c = await addWidget(key, { type: 'text' }); // fills (0,2)
    // Move `c` down to row 1's hole; row 0's hole re-opens and stays open.
    const res = await place(key, c.id, 1, 2);
    expect(res.statusCode).toBe(200);
    expect(await slots(key)).toEqual([
      [0, 0, 2],
      [1, 0, 2],
      [1, 2, 1],
    ]);
  });

  it('re-packs from the target row down when the slot is taken', async () => {
    const key = await newDashboard();
    const a = await addWidget(key, { type: 'line' }); // (0,0)
    const b = await addWidget(key, { type: 'bar' }); // (0,1)
    const c = await addWidget(key, { type: 'text' }); // (0,2)
    // Drop `c` onto `a`'s slot: c takes (0,0), a and b shift right.
    await place(key, c.id, 0, 0);
    const items = await listItems(key);
    expect(items.map((w: { id: string }) => w.id)).toEqual([c.id, a.id, b.id]);
    expect(await slots(key)).toEqual([
      [0, 0, 1],
      [0, 1, 1],
      [0, 2, 1],
    ]);
  });

  it('rejects a slot the widget would overflow', async () => {
    const key = await newDashboard();
    const w = await addWidget(key, { type: 'line', size: 2 });
    expect((await place(key, w.id, 0, 2)).statusCode).toBe(400);
  });

  it('rejects a place for a widget the key does not own', async () => {
    const k1 = await newDashboard();
    const k2 = await newDashboard();
    const w = await addWidget(k1, { type: 'line' });
    expect((await place(k2, w.id, 0, 0)).statusCode).toBe(404);
  });

  it('re-places a widget whose row can no longer hold it', async () => {
    const key = await newDashboard();
    const a = await addWidget(key, { type: 'line' }); // (0,0)
    await addWidget(key, { type: 'bar' }); // (0,1)
    // `a` cannot grow into (0,1) — it is taken — so it opens row 1.
    expect((await resize(key, a.id, 2)).statusCode).toBe(200);
    expect(await slots(key)).toEqual([
      [0, 1, 1],
      [1, 0, 2],
    ]);
  });

  it('grows a widget in place when its row still has the run', async () => {
    const key = await newDashboard();
    const a = await addWidget(key, { type: 'line' }); // (0,0)
    expect((await resize(key, a.id, 3)).statusCode).toBe(200);
    expect(await slots(key)).toEqual([[0, 0, 3]]);
  });

  it('shrinking a widget re-opens the columns for the next create', async () => {
    const key = await newDashboard();
    const a = await addWidget(key, { type: 'line', size: 3 });
    await resize(key, a.id, 1);
    const b = await addWidget(key, { type: 'bar' });
    expect([b.row, b.col]).toEqual([0, 1]);
  });

  it('rejects a size outside 1–3', async () => {
    const key = await newDashboard();
    const w = await addWidget(key, { type: 'line' });
    expect((await resize(key, w.id, 4)).statusCode).toBe(400);
    expect((await resize(key, w.id, 0)).statusCode).toBe(400);
  });

  it('leaves a hole on delete and collapses an emptied row', async () => {
    const key = await newDashboard();
    const a = await addWidget(key, { type: 'line', size: 2 }); // row 0
    const b = await addWidget(key, { type: 'bar' }); // (0,2)
    const c = await addWidget(key, { type: 'text' }); // row 1

    // Deleting `b` leaves row 0's hole open; `c` does not move up.
    await ctx.app.inject({ method: 'DELETE', url: `/api/dashboards/${key}/widgets/${b.id}` });
    expect(await slots(key)).toEqual([
      [0, 0, 2],
      [1, 0, 1],
    ]);

    // Deleting `c` empties row 1, which collapses (nothing below to pull up).
    await ctx.app.inject({ method: 'DELETE', url: `/api/dashboards/${key}/widgets/${c.id}` });
    expect((await listPage(key)).totalRows).toBe(1);

    // Deleting `a` empties row 0 entirely.
    await ctx.app.inject({ method: 'DELETE', url: `/api/dashboards/${key}/widgets/${a.id}` });
    expect((await listPage(key)).totalRows).toBe(0);
  });

  it('collapses a middle row and pulls the rows below up', async () => {
    const key = await newDashboard();
    await addWidget(key, { type: 'line', size: 3 }); // row 0
    const mid = await addWidget(key, { type: 'bar', size: 3 }); // row 1
    await addWidget(key, { type: 'text', size: 3 }); // row 2

    await ctx.app.inject({ method: 'DELETE', url: `/api/dashboards/${key}/widgets/${mid.id}` });
    expect(await slots(key)).toEqual([
      [0, 0, 3],
      [1, 0, 3],
    ]);
    expect((await listPage(key)).totalRows).toBe(2);
  });

  it('defaults chart text to null and a text widget to an empty string', async () => {
    const key = await newDashboard();
    expect((await addWidget(key, { type: 'line' })).text).toBeNull();
    expect((await addWidget(key, { type: 'text' })).text).toBe('');
  });

  it('serves deterministic sentiment data (restored across calls)', async () => {
    const key = await newDashboard();
    const w = await addWidget(key, { type: 'line' });
    const d1 = (
      await ctx.app.inject({ method: 'GET', url: `/api/dashboards/${key}/widgets/${w.id}/data?period=week` })
    ).json();
    const d2 = (
      await ctx.app.inject({ method: 'GET', url: `/api/dashboards/${key}/widgets/${w.id}/data?period=week` })
    ).json();
    expect(d1.period).toBe('week');
    expect(d1.points).toHaveLength(7);
    expect(d1.points[0]).toHaveProperty('positive');
    expect(d1.points[0]).toHaveProperty('negative');
    expect(d1).toEqual(d2);
  });

  it('defaults chart data to the widget’s saved period', async () => {
    const key = await newDashboard();
    const w = await addWidget(key, { type: 'line' });
    const d = (await ctx.app.inject({ method: 'GET', url: `/api/dashboards/${key}/widgets/${w.id}/data` })).json();
    expect(d.period).toBe('month');
  });

  it('regenerate changes the series', async () => {
    const key = await newDashboard();
    const w = await addWidget(key, { type: 'bar' });
    const before = (await ctx.app.inject({ method: 'GET', url: `/api/dashboards/${key}/widgets/${w.id}/data` })).json();
    await ctx.app.inject({ method: 'POST', url: `/api/dashboards/${key}/widgets/${w.id}/regenerate` });
    const after = (await ctx.app.inject({ method: 'GET', url: `/api/dashboards/${key}/widgets/${w.id}/data` })).json();
    expect(after).not.toEqual(before);
  });

  it('returns 400 for chart data on a text widget', async () => {
    const key = await newDashboard();
    const w = await addWidget(key, { type: 'text' });
    const res = await ctx.app.inject({ method: 'GET', url: `/api/dashboards/${key}/widgets/${w.id}/data` });
    expect(res.statusCode).toBe(400);
  });

  it('persists a text edit', async () => {
    const key = await newDashboard();
    const w = await addWidget(key, { type: 'text', text: 'hi' });
    const upd = (
      await ctx.app.inject({ method: 'PATCH', url: `/api/dashboards/${key}/widgets/${w.id}`, payload: { text: 'edited' } })
    ).json();
    expect(upd.text).toBe('edited');
    expect((await listItems(key))[0].text).toBe('edited');
  });

  it('reorders widgets', async () => {
    const key = await newDashboard();
    const a = await addWidget(key, { type: 'line' });
    const b = await addWidget(key, { type: 'bar' });
    const c = await addWidget(key, { type: 'text' });
    const res = (
      await ctx.app.inject({
        method: 'PUT',
        url: `/api/dashboards/${key}/widgets/reorder`,
        payload: { orderedIds: [c.id, a.id, b.id] },
      })
    ).json();
    expect(res.map((w: { id: string }) => w.id)).toEqual([c.id, a.id, b.id]);
  });

  it('deletes a widget', async () => {
    const key = await newDashboard();
    const w = await addWidget(key, { type: 'line' });
    const del = await ctx.app.inject({ method: 'DELETE', url: `/api/dashboards/${key}/widgets/${w.id}` });
    expect(del.statusCode).toBe(204);
    expect(await listItems(key)).toEqual([]);
  });

  it('returns 404 when deleting an unknown widget', async () => {
    const key = await newDashboard();
    const res = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/dashboards/${key}/widgets/00000000-0000-0000-0000-000000000000`,
    });
    expect(res.statusCode).toBe(404);
  });

  it('isolates widgets across dashboards', async () => {
    const k1 = await newDashboard();
    const k2 = await newDashboard();
    const w = await addWidget(k1, { type: 'line' });
    // k2 must not be able to read k1's widget.
    const res = await ctx.app.inject({ method: 'GET', url: `/api/dashboards/${k2}/widgets/${w.id}/data` });
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 listing widgets for an unknown dashboard', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/dashboards/nope/widgets' });
    expect(res.statusCode).toBe(404);
  });

  it('returns 400 for an invalid widget type', async () => {
    const key = await newDashboard();
    const res = await ctx.app.inject({ method: 'POST', url: `/api/dashboards/${key}/widgets`, payload: { type: 'pie' } });
    expect(res.statusCode).toBe(400);
  });
});
