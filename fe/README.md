# Frontend

React 18 + Vite + Tailwind + shadcn/ui + Recharts + React Query. All API access goes through the client generated from the backend's OpenAPI spec.

## Run

```bash
cp .env.sample .env      # VITE_API_BASE_URL=http://localhost:3000
npm install
npm run dev              # http://localhost:5173
```

## Scripts

| Script | Does |
|---|---|
| `dev` / `build` / `preview` | Vite dev / production build / preview |
| `api:generate` | regenerate the typed client from `src/lib/api/openapi.json` (orval) |
| `test:unit` | Vitest + Testing Library |
| `lint` / `typecheck` | ESLint / `tsc -b` |

## Flow

`/` bootstraps a dashboard key and redirects to `/d/:key` (remembered in localStorage). The key is a shareable capability URL — open it anywhere to restore the dashboard. Charts pull deterministic data from the backend; the text widget edits persist.

See [`CLAUDE.md`](CLAUDE.md) for coding rules.
