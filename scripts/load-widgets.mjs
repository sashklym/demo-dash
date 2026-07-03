#!/usr/bin/env node
// Load-test helper: bulk-create widgets on a dashboard so you can see how the
// grid renders (and how the API holds up) under a large widget count.
//
// It talks to the public API only — same endpoints the frontend uses:
//   POST /api/dashboards               → { key, title }
//   POST /api/dashboards/:key/widgets  → { id, type, ... }
//
// Usage:
//   BASE_URL=https://api.example.com node scripts/load-widgets.mjs
//   BASE_URL=https://api.example.com KEY=abc123 COUNT=10000 CONCURRENCY=50 node scripts/load-widgets.mjs
//
// Env / options:
//   BASE_URL      API origin (required, no trailing slash) e.g. https://api.example.com
//   KEY           Target an existing dashboard. Omit to create a fresh one.
//   COUNT         Widgets to create (default 10000)
//   CONCURRENCY   In-flight requests (default 25). Raise carefully in prod.
//   APP_URL       Frontend origin, only used to print the final /d/{key} link.

const BASE_URL = (process.env.BASE_URL ?? '').replace(/\/$/, '');
const COUNT = Number(process.env.COUNT ?? 10_000);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 25);
const APP_URL = (process.env.APP_URL ?? '').replace(/\/$/, '');
let key = process.env.KEY ?? '';

if (!BASE_URL) {
  console.error('BASE_URL is required, e.g. BASE_URL=https://api.example.com node scripts/load-widgets.mjs');
  process.exit(1);
}
if (!Number.isInteger(COUNT) || COUNT < 1) {
  console.error(`COUNT must be a positive integer (got ${process.env.COUNT})`);
  process.exit(1);
}

// A realistic mix so the opened dashboard exercises all three renderers.
const TYPES = ['line', 'bar', 'line', 'bar', 'text'];

const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod ' +
  'tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.';

function widgetBody(i) {
  const type = TYPES[i % TYPES.length];
  const body = { type, title: `Widget #${i + 1} — ${type}` };
  if (type === 'text') body.text = `${LOREM} (widget ${i + 1})`;
  return body;
}

async function postJson(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`POST ${path} → ${res.status} ${res.statusText} ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function createDashboard() {
  const dashboard = await postJson('/api/dashboards', { title: `Load test ${COUNT} widgets` });
  return dashboard.key;
}

async function main() {
  if (!key) {
    key = await createDashboard();
    console.log(`Created dashboard: ${key}`);
  } else {
    console.log(`Using existing dashboard: ${key}`);
  }

  const path = `/api/dashboards/${encodeURIComponent(key)}/widgets`;
  const start = Date.now();
  let done = 0;
  let failed = 0;
  let next = 0;

  // Bounded worker pool: CONCURRENCY workers each pull the next index until drained.
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= COUNT) return;
      try {
        await postJson(path, widgetBody(i));
      } catch (err) {
        failed++;
        // Log the first few failures, then stay quiet to avoid flooding.
        if (failed <= 5) console.error(`  ✗ widget ${i + 1}: ${err.message}`);
      }
      done++;
      if (done % 250 === 0 || done === COUNT) {
        const secs = (Date.now() - start) / 1000;
        const rate = done / secs;
        const eta = rate > 0 ? (COUNT - done) / rate : 0;
        process.stdout.write(
          `\r  ${done}/${COUNT}  ${rate.toFixed(0)}/s  failed=${failed}  eta=${eta.toFixed(0)}s   `,
        );
      }
    }
  }

  console.log(`Creating ${COUNT} widgets with concurrency ${CONCURRENCY}…`);
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, COUNT) }, worker));

  const secs = (Date.now() - start) / 1000;
  console.log(
    `\nDone in ${secs.toFixed(1)}s — created ${done - failed}, failed ${failed}, ` +
      `avg ${(done / secs).toFixed(0)}/s`,
  );
  const link = APP_URL ? `${APP_URL}/d/${key}` : `/d/${key}`;
  console.log(`Open: ${link}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
