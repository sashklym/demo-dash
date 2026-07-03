import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, type TestApp } from '../helpers/test-app';

let ctx: TestApp;

async function newDashboard(): Promise<string> {
  return (await ctx.app.inject({ method: 'POST', url: '/api/dashboards', payload: {} })).json().key;
}

async function addWidget(key: string, payload: Record<string, unknown>) {
  return (await ctx.app.inject({ method: 'POST', url: `/api/dashboards/${key}/widgets`, payload })).json();
}

function listWidgets(key: string) {
  return ctx.app.inject({ method: 'GET', url: `/api/dashboards/${key}/widgets` }).then((r) => r.json());
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
    expect(res.json()).toEqual([]);
  });

  it('appends widgets at increasing positions', async () => {
    const key = await newDashboard();
    const a = await addWidget(key, { type: 'line' });
    const b = await addWidget(key, { type: 'bar' });
    expect(a.position).toBe(0);
    expect(b.position).toBe(1);
    expect((await listWidgets(key)).map((w: { type: string }) => w.type)).toEqual(['line', 'bar']);
  });

  it('defaults chart text to null and a text widget to an empty string', async () => {
    const key = await newDashboard();
    expect((await addWidget(key, { type: 'line' })).text).toBeNull();
    expect((await addWidget(key, { type: 'text' })).text).toBe('');
  });

  it('serves deterministic chart data (restored across calls)', async () => {
    const key = await newDashboard();
    const w = await addWidget(key, { type: 'line' });
    const d1 = (
      await ctx.app.inject({ method: 'GET', url: `/api/dashboards/${key}/widgets/${w.id}/data?points=8` })
    ).json();
    const d2 = (
      await ctx.app.inject({ method: 'GET', url: `/api/dashboards/${key}/widgets/${w.id}/data?points=8` })
    ).json();
    expect(d1.series).toHaveLength(8);
    expect(d1).toEqual(d2);
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
    expect((await listWidgets(key))[0].text).toBe('edited');
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
    expect(await listWidgets(key)).toEqual([]);
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
