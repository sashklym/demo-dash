# Deployment (Coolify)

Two Coolify applications built from Dockerfiles, deployed by GitHub Actions on a green push to `main`.

## Topology

| App | Source | Serves | Public host (example) |
|---|---|---|---|
| `youscan-be` | `be/Dockerfile` | Fastify (Node) on :3000 | `api.youscan.sashklym.cc` |
| `youscan-fe` | `fe/Dockerfile` | static build via nginx on :80 | `dash.youscan.sashklym.cc` |

Coolify's built-in proxy routes by hostname, so both apps share one server IP.

## DNS

Point both subdomains (A records) at your **Coolify server's public IP** — the same IP for both:

```
api.youscan.sashklym.cc   A   <coolify-server-ip>
dash.youscan.sashklym.cc  A   <coolify-server-ip>
```

A wildcard `*.youscan.sashklym.cc → <coolify-server-ip>` works too. Find the IP in Coolify → Servers → your server.

## Coolify setup (once)

1. **Backend app** — new Application from this Git repo, Base Directory `be/`, Dockerfile build. Set the domain to `api.…`. Attach a **persistent volume** at `/app/data` (holds the SQLite file). No build args needed.
2. **Frontend app** — new Application from this repo, Base Directory `fe/`, Dockerfile build. Set the domain to `dash.…`. Add build arg `VITE_API_BASE_URL=https://api.youscan.sashklym.cc`.
3. Enable HTTPS (Let's Encrypt) on both domains.
4. Copy each app's **deploy webhook URL** and create an **API token** (Keys & Tokens).

## GitHub secrets

| Secret | Value |
|---|---|
| `COOLIFY_BE_WEBHOOK` | backend app deploy webhook URL |
| `COOLIFY_FE_WEBHOOK` | frontend app deploy webhook URL |
| `COOLIFY_TOKEN` | Coolify API token (Bearer) |

The `deploy` job in [`ci.yml`](../../.github/workflows/ci.yml) curls both webhooks after the backend, frontend, and e2e jobs pass on `main`.

## Migrations

The backend image runs `node dist/migrate.js && node dist/main.js` — migrations apply as their own process against the mounted volume before the server starts.
