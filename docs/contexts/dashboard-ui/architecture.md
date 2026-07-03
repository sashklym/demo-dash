# Dashboard UI Architecture

> Scope: `fe/src/` — routing, the widget grid, and widget rendering.

## Routing

- `/` (`BootstrapRoute`) — reads the localStorage key and redirects to `/d/:key`, or creates a dashboard first. Uses `mutateAsync` so the redirect survives React StrictMode's dev remount.
- `/d/:key` (`DashboardPage`) — validates the key (loading / not-found / ready), then renders the header + grid. Stores the key once confirmed valid.

## Persistent key bar

`DashboardHeader` shows the current key with **Copy key** / **Copy link**, an **Open key** input (navigate to another `/d/:key`), and **New dashboard**.

## Widget grid

`WidgetGrid` renders loading skeletons, an empty state (add-widget CTA), or a `grid-cols-1/2/3` of `WidgetCard`s. Each card renders `ChartWidget` (line/bar) or `TextWidget` by type, plus a delete action.

- **`ChartWidget`** runs its own `useGetWidgetData` query → Skeleton → Recharts chart, with an error + Retry and a Regenerate button. Genuine per-widget states, not simulated.
- **`TextWidget`** toggles view/edit; Save `PATCH`es the text and it persists across reload.

## Data layer

The generated React Query client (`lib/api/generated/`) is wrapped by `hooks/use-widgets.ts`, which adds cache invalidation so the list refreshes after every mutation. No HTTP is hand-written.

## Key files

`main.tsx`, `router.tsx`, `routes/`, `components/`, `hooks/use-widgets.ts`, `lib/api/`.
