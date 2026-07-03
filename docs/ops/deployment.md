# Deployment (Coolify, local-triggered)

Two Coolify applications built from Dockerfiles. Coolify runs on a **private (Tailscale) network**, so deploys are **triggered from a local machine** that can reach it — not from public CI. Coolify pulls the public GitHub repo (`sashklym/demo-dash`) and builds the Dockerfiles.

## Topology

| App | Source | Serves | Domain |
|---|---|---|---|
| `youscan-be` | `be/Dockerfile` | Fastify (Node) on :3000 | `api.youscan.sashklym.cc` |
| `youscan-fe` | `fe/Dockerfile` | static build via nginx on :80 | `dash.youscan.sashklym.cc` |

Coolify's proxy routes `api.` → backend and `dash.` → frontend by hostname.

## DNS (Spaceship, zone `sashklym.cc`)

```
api.youscan   A   <server-ip>
dash.youscan  A   <server-ip>
```

Both point at the Coolify server's public IP; ports 80/443 must be open there.

## Per-app config (Coolify)

**youscan-fe** — build arg (must be set before the build, it's baked into the bundle):
```
VITE_API_BASE_URL = https://api.youscan.sashklym.cc
```

**youscan-be** — runtime env + persistent storage:
```
CORS_ORIGIN = https://dash.youscan.sashklym.cc
```
Attach a **persistent volume** at `/app/data` so the SQLite file survives redeploys. The image runs `node dist/migrate.js && node dist/main.js` — migrations apply (own process) against the volume before the server starts.

## Deploying

From a machine on the Coolify network (e.g. via Tailscale):

```bash
export COOLIFY_URL=http://<coolify-host>:8000
export COOLIFY_TOKEN=<write-scoped Coolify API token>   # never commit
npm run deploy          # triggers both apps (scripts/deploy.sh)
```

Or click **Deploy** on each app in the Coolify UI. There is **no GitHub Actions** — the repo builds are pulled by Coolify and triggered locally.
