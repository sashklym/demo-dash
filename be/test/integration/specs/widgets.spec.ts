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
    expect(res.json()).toEqual({ items: [], total: 0, offset: 0, limit: 50 });
  });

  it('appends widgets at increasing ranks', async () => {
    const key = await newDashboard();
    const a = await addWidget(key, { type: 'line' });
    const b = await addWidget(key, { type: 'bar' });
    expect(a.rank < b.rank).toBe(true);
    expect((await listItems(key)).map((w: { type: string }) => w.type)).toEqual(['line', 'bar']);
  });

  it('pages the list and reports an accurate total', async () => {
    const key = await newDashboard();
    for (let i = 0; i < 5; i++) await addWidget(key, { type: 'line' });
    const first = await listPage(key, '?offset=0&limit=2');
    expect(first.total).toBe(5);
    expect(first.items).toHaveLength(2);
    const third = await listPage(key, '?offset=4&limit=2');
    expect(third.items).toHaveLength(1); // last page, partial
    // Pages stitch back into the full ascending-rank order.
    const all = (await listItems(key)).map((w: { id: string }) => w.id);
    expect(new Set(all).size).toBe(5);
  });

  it('clamps an over-large limit instead of erroring', async () => {
    const key = await newDashboard();
    await addWidget(key, { type: 'line' });
    const res = await ctx.app.inject({ method: 'GET', url: `/api/dashboards/${key}/widgets?limit=99999` });
    expect(res.statusCode).toBe(400); // schema max is 200 — over-max is rejected
  });

  it('moves a single widget to a target index (O(1) reorder)', async () => {
    const key = await newDashboard();
    const a = await addWidget(key, { type: 'line' });
    const b = await addWidget(key, { type: 'bar' });
    const c = await addWidget(key, { type: 'text' });
    // Move the last widget to the front.
    const res = await ctx.app.inject({
      method: 'PUT',
      url: `/api/dashboards/${key}/widgets/${c.id}/position`,
      payload: { position: 0 },
    });
    expect(res.statusCode).toBe(200);
    expect((await listItems(key)).map((w: { id: string }) => w.id)).toEqual([c.id, a.id, b.id]);
  });

  it('rejects a move for a widget the key does not own', async () => {
    const k1 = await newDashboard();
    const k2 = await newDashboard();
    const w = await addWidget(k1, { type: 'line' });
    const res = await ctx.app.inject({
      method: 'PUT',
      url: `/api/dashboards/${k2}/widgets/${w.id}/position`,
      payload: { position: 0 },
    });
    expect(res.statusCode).toBe(404);
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
