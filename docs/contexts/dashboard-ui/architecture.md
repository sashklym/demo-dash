# Dashboard UI Architecture

> Scope: `fe/src/` — routing, the widget grid, and widget rendering.

## Routing

- `/` (`BootstrapRoute`) — reads the localStorage key and redirects to `/d/:key`, or creates a dashboard first. Uses `mutateAsync` so the redirect survives React StrictMode's dev remount.
- `/d/:key` (`DashboardPage`) — validates the key (loading / not-found / ready), then renders the header + grid. Stores the key once confirmed valid.

## Persistent key bar

`DashboardHeader` shows the current key with **Copy key** / **Copy link**, an **Open key** input (navigate to another `/d/:key`), and **New dashboard**.

## Widget grid

`WidgetGrid` renders loading skeletons, an empty state (add-widget CTA), or a `grid-cols-1/2/3` of `WidgetCard`s. Each card renders `ChartWidget` (line/bar) or `TextWidget` by type, plus size, move, expand, and delete actions.

- **Slots.** A widget spans 1–3 columns from a stored `(row, col)` ([row-based-widget-layout](../widgets/row-based-widget-layout.md)). `lib/widget-slot.ts` turns that into static `col-span-*` / `lg:col-start-*` classes (Tailwind can't see interpolated class names). `col-start` is what preserves a hole: an item whose explicit start column sits behind the auto-placement cursor moves to the next line instead of backfilling. Below `lg` the stored columns can't be honoured, so those classes drop out and CSS packs the row greedily.
- **`SortableWidgetGrid`** (≤ 20 rows) mounts every card so dnd-kit can compute drop targets; a drop sends the full order to `reorder`, which compacts the board.
- **`VirtualWidgetGrid`** (> 20 rows) virtualizes the **server's rows**, not visual rows: `totalRows` sizes the scrollbar and each mounted row renders the widgets the API says are in it, so no index arithmetic is needed. Rows are their own CSS grid and grow taller below `lg`, hence `measureElement`. Drag is unavailable here; the move menu drives `place` instead.

- **`ChartWidget`** runs its own `useGetWidgetData` query → Skeleton → Recharts chart, with an error + Retry and a Regenerate button. Genuine per-widget states, not simulated.
- **`TextWidget`** toggles view/edit; Save `PATCH`es the text and it persists across reload.

## Data layer

The generated React Query client (`lib/api/generated/`) is wrapped by `hooks/use-widgets.ts`, which adds cache invalidation so the list refreshes after every mutation. Widgets are fetched a chunk of rows at a time (`useWidgetChunk`, `useWidgetRowWindow`); a board of at most `CHUNK_ROWS` rows is covered whole by chunk 0, which is what lets the draggable grid work from a single query. A resize invalidates rather than patches, because it can move the widget and collapse a row. No HTTP is hand-written.

## Key files

`main.tsx`, `router.tsx`, `routes/`, `components/`, `hooks/use-widgets.ts`, `lib/widget-slot.ts`, `lib/api/`.
