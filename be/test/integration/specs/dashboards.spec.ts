import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, type TestApp } from '../helpers/test-app';

let ctx: TestApp;

beforeAll(async () => {
  ctx = await buildTestApp();
});
afterAll(async () => {
  await ctx.close();
});
beforeEach(async () => {
  await ctx.reset();
});

describe('dashboards', () => {
  it('creates a dashboard with a key and the default title', async () => {
    const res = await ctx.app.inject({ method: 'POST', url: '/api/dashboards', payload: {} });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(typeof body.key).toBe('string');
    expect(body.key.length).toBeGreaterThan(10);
    expect(body.title).toBe('My Dashboard');
  });

  it('uses a provided title', async () => {
    const res = await ctx.app.inject({ method: 'POST', url: '/api/dashboards', payload: { title: 'Ops board' } });
    expect(res.json().title).toBe('Ops board');
  });

  it('restores a dashboard by key', async () => {
    const key = (await ctx.app.inject({ method: 'POST', url: '/api/dashboards', payload: {} })).json().key;
    const res = await ctx.app.inject({ method: 'GET', url: `/api/dashboards/${key}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().key).toBe(key);
  });

  it('returns 404 for an unknown key', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/dashboards/does-not-exist' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('NOT_FOUND');
  });

  it('returns 400 when the title is too long', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/dashboards',
      payload: { title: 'x'.repeat(200) },
    });
    expect(res.statusCode).toBe(400);
  });
});
