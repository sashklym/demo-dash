# Deployment (Coolify, local-triggered)

Two Coolify applications built from Dockerfiles. Coolify runs on a **private (Tailscale) network**, so deploys are **triggered from a local machine** that can reach it — not from public CI. Coolify pulls the public GitHub repo (`sashklym/demo-dash`) and builds the Dockerfiles.

**Live:** frontend [dash.youscan.sashklym.cc](https://dash.youscan.sashklym.cc) · API [api.youscan.sashklym.cc/docs](https://api.youscan.sashklym.cc/docs)

## Topology

| App | Coolify UUID | Source | Serves | Domain |
|---|---|---|---|---|
| `youscan-be` | `u4hddmf963aq3ite6w352afh` | `be/Dockerfile` | Fastify on :3000 | `api.youscan.sashklym.cc` |
| `youscan-fe` | `fnig01dqj420vrgt7v1hw644` | `fe/Dockerfile` | nginx on :80 | `dash.youscan.sashklym.cc` |

Coolify's proxy routes `api.` → backend and `dash.` → frontend by hostname.

## DNS (Spaceship, zone `sashklym.cc`)

```
api.youscan   A   <server-ip>
dash.youscan  A   <server-ip>
```

Both point at the Coolify server's public IP; ports 80/443 must be open there.

## Per-app config (Coolify)

**`youscan-fe`** — one **build** env var (baked into the bundle, so it must be set before the build):
```
VITE_API_BASE_URL = https://api.youscan.sashklym.cc
```

**`youscan-be`** — one runtime env var + a persistent volume:
```
CORS_ORIGIN = https://dash.youscan.sashklym.cc
```
- **Volume** (so SQLite survives redeploys): app → **Storages → Add → Volume Mount**:
  - **Name**: `youscan-be-data`
  - **Source Path**: *leave empty* (empty = a Docker-managed named volume; filling it makes a host bind-mount, which we don't want)
  - **Destination Path**: `/app/data` (where the app writes `youscan.sqlite`)
- Redeploy `youscan-be` after adding the volume — it starts empty (one-time reset), then persists across all future redeploys.

The backend image runs `node dist/migrate.js && node dist/main.js` — migrations apply as their own process against the volume before the server starts.

## Deploying manually from your local machine

Coolify is only reachable on the private network, so deploy from a machine on it (e.g. via Tailscale). Three equivalent ways:

**1. npm script (recommended)** — triggers both apps:
```bash
export COOLIFY_URL=http://<coolify-host>:8000
export COOLIFY_TOKEN=<Coolify API token with write+deploy permission>   # never commit
npm run deploy
```

**2. Deploy one app by UUID** (Coolify API):
```bash
curl -X POST "$COOLIFY_URL/api/v1/deploy?uuid=u4hddmf963aq3ite6w352afh&force=true" \
  -H "Authorization: Bearer $COOLIFY_TOKEN"      # backend; swap UUID for the frontend
```

**3. Coolify UI** — open each app and click **Deploy** (backend first, then frontend).

Coolify pulls the latest `main` from GitHub and rebuilds. There is **no GitHub Actions** — the CI workflow was removed because public runners can't reach the private Coolify. `scripts/deploy.sh` reads `COOLIFY_URL` / `COOLIFY_TOKEN` from the environment and hard-codes the two app UUIDs (overridable via `BE_UUID` / `FE_UUID`).

> **Token hygiene:** the deploy token needs `write` + `deploy` permission. Keep it in your shell env or a gitignored file — never commit it. Rotate anytime and mint a fresh one for `npm run deploy`.
