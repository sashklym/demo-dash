---
name: react-frontend
description: Build and maintain the YouScan dashboard frontend — React 18 + Vite + Tailwind + shadcn/ui + Recharts in fe/. Use for pages, widgets, routing, state, and tests.
---

# React Frontend — YouScan Dashboard

The frontend never hand-writes HTTP. All API access goes through the client generated from the backend's OpenAPI spec.

## Stack

- **Vite + React 18 + TypeScript**
- **Tailwind + shadcn/ui** — components live in `src/components/ui/` (copy-in, editable)
- **Recharts** — line + bar charts
- **React Query 5** — server state; **orval** generates typed hooks into `src/lib/api/generated/`
- **react-router-dom 6** — `/` bootstraps a key, `/d/:key` is the dashboard
- **Vitest + Testing Library** — component tests in jsdom

## Rules

1. **Never hand-write `fetch`/`axios`.** Use the generated hooks (`useListWidgets`, `useCreateWidget`, …) via the thin wrappers in `src/hooks/use-widgets.ts`, which add cache invalidation. `src/lib/api/generated/` is regenerated (`npm run api:generate`) and committed — never edit it.
2. **Mutations that fire on mount use `mutateAsync().then(...)`, not `mutate(vars, { onSuccess })`.** React StrictMode remounts in dev, and react-query discards per-call callbacks when the component unmounts before the mutation settles — so navigation/side-effects must come off the promise. (Click-triggered mutations can use per-call callbacks safely.)
3. **Per-widget states are real.** Each chart runs its own `useGetWidgetData` query → Skeleton → chart, with an error + Retry. Don't fake loading states.
4. **Keep the generated model as the type source.** Import `Widget`, `WidgetType`, etc. from `@/lib/api/generated/model`.
5. **shadcn primitives are imported from `@/components/ui/*`**; add new ones with the same Radix + CVA pattern. Charts are Recharts driven by CSS variables (`hsl(var(--chart-1))`).

## Adding a widget type (example flow)

1. Extend the backend `WidgetType` enum + schema, re-export OpenAPI, regenerate the client.
2. Add a renderer component, branch on `widget.type` in `WidgetCard.tsx`, add the option to `AddWidgetMenu.tsx`.
3. Add an RTL test (mock the `use-widgets` hook module).

## Testing notes

- jsdom needs polyfills for Radix/Recharts — already set in `src/test/setup.ts` (`hasPointerCapture`, `ResizeObserver`, `matchMedia`).
- Mock hook modules with `vi.mock('@/hooks/use-widgets')` + `vi.hoisted(() => ({ mutate: vi.fn() }))`.

## Verification gate (before every commit)

```bash
cd fe && npm run api:generate && npm run lint && npm run typecheck \
  && npm run test:unit && npm run build
```
