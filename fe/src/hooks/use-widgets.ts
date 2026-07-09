import { useQueries, useQueryClient } from '@tanstack/react-query';
import {
  getGetDashboardQueryKey,
  getGetWidgetDataQueryKey,
  getListWidgetsQueryKey,
  getListWidgetsQueryOptions,
  useCreateDashboard as useCreateDashboardGenerated,
  useCreateWidget,
  useDeleteWidget,
  useListWidgets,
  usePlaceWidget,
  useRegenerateWidget,
  useReorderWidgets,
  useUpdateWidget,
} from '@/lib/api/generated/api';
import type { Widget, WidgetPage } from '@/lib/api/generated/model';

/**
 * Widgets are fetched a chunk of *rows* at a time — rows are the unit the server
 * stores and the unit the virtualizer scrolls, so the two agree without arithmetic.
 * A board of at most CHUNK_ROWS rows is covered whole by chunk 0, which is what lets
 * the small draggable grid work from a single query.
 */
export const CHUNK_ROWS = 20;

/** Cache key for a chunk of rows. */
const chunkKey = (key: string, chunk: number) =>
  getListWidgetsQueryKey(key, { fromRow: chunk * CHUNK_ROWS, toRow: (chunk + 1) * CHUNK_ROWS - 1 });

/** All row chunks share the `[…/widgets]` key prefix — invalidate them together. */
function useInvalidateWidgets(key: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: getListWidgetsQueryKey(key) });
}

/**
 * A freshly created dashboard is always empty. Seed the dashboard + first-chunk
 * caches from the create response so it renders its empty state immediately —
 * no loading skeleton flashing phantom widget cards.
 */
export function useCreateDashboard() {
  const queryClient = useQueryClient();
  return useCreateDashboardGenerated({
    mutation: {
      onSuccess: (dashboard) => {
        queryClient.setQueryData(getGetDashboardQueryKey(dashboard.key), dashboard);
        queryClient.setQueryData<WidgetPage>(chunkKey(dashboard.key, 0), {
          items: [],
          total: 0,
          totalRows: 0,
          fromRow: 0,
          toRow: CHUNK_ROWS - 1,
        });
      },
    },
  });
}

/** One chunk of a dashboard's rows. Chunk 0 also carries `total` and `totalRows`. */
export function useWidgetChunk(key: string, chunk: number) {
  return useListWidgets(
    key,
    { fromRow: chunk * CHUNK_ROWS, toRow: (chunk + 1) * CHUNK_ROWS - 1 },
    { query: { enabled: key.length > 0 } },
  );
}

/**
 * Fetch the chunks overlapping the virtualizer's scroll window and group the
 * widgets by their row. Each chunk is its own cached query, so scrolling only
 * fetches rows not already loaded. A row missing from the map is one whose chunk
 * hasn't arrived — the grid renders a skeleton for it.
 */
export function useWidgetRowWindow(key: string, chunks: number[]) {
  const results = useQueries({
    queries: chunks.map((chunk) =>
      getListWidgetsQueryOptions(
        key,
        { fromRow: chunk * CHUNK_ROWS, toRow: (chunk + 1) * CHUNK_ROWS - 1 },
        { query: { enabled: key.length > 0 } },
      ),
    ),
  });

  const byRow = new Map<number, Widget[]>();
  for (const result of results) {
    for (const widget of result.data?.items ?? []) {
      const row = byRow.get(widget.row);
      if (row) row.push(widget);
      else byRow.set(widget.row, [widget]);
    }
  }
  // The API orders by (row, col), but chunks arrive independently.
  for (const row of byRow.values()) row.sort((a, b) => a.col - b.col);
  return byRow;
}

/**
 * Thin wrappers over the generated mutation hooks. Structural changes (add /
 * delete / place / reorder) invalidate the row chunks so the affected windows
 * refetch. An edit that doesn't move the widget is patched into every cached
 * chunk in place — but a resize *can* move it, so that one invalidates.
 */

export function useAddWidget(key: string) {
  const invalidate = useInvalidateWidgets(key);
  return useCreateWidget({ mutation: { onSuccess: () => invalidate() } });
}

export function useEditWidget(key: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateWidgets(key);
  return useUpdateWidget({
    mutation: {
      onSuccess: (updated, variables) => {
        // A size change re-places the widget and can collapse a row: the whole
        // board below it may have shifted, so nothing local can be patched.
        if (variables.data.size !== undefined) {
          invalidate();
          return;
        }
        queryClient.setQueriesData<WidgetPage>({ queryKey: getListWidgetsQueryKey(key) }, (chunk) =>
          chunk ? { ...chunk, items: chunk.items.map((w) => (w.id === updated.id ? updated : w)) } : chunk,
        );
      },
    },
  });
}

export function useRemoveWidget(key: string) {
  const invalidate = useInvalidateWidgets(key);
  return useDeleteWidget({ mutation: { onSuccess: () => invalidate() } });
}

/** Drop one widget on a `(row, col)` slot — the move menu and drag both land here. */
export function usePlace(key: string) {
  const invalidate = useInvalidateWidgets(key);
  return usePlaceWidget({ mutation: { onSuccess: () => invalidate() } });
}

/** Compact the board into a full order — the small draggable grid's drop handler. */
export function useReorder(key: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateWidgets(key);
  const key0 = chunkKey(key, 0);
  return useReorderWidgets({
    mutation: {
      // Apply the new order optimistically on the loaded chunk so the drag doesn't
      // flash back; reconcile with the server on settle. Slots are left stale on
      // purpose — the server compacts, and guessing that here would flicker twice.
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: key0 });
        const previous = queryClient.getQueryData<WidgetPage>(key0);
        if (previous) {
          const byId = new Map(previous.items.map((w) => [w.id, w]));
          const items = variables.data.orderedIds.map((id) => byId.get(id)).filter((w): w is Widget => Boolean(w));
          queryClient.setQueryData<WidgetPage>(key0, { ...previous, items });
        }
        return { previous };
      },
      onError: (_err, _variables, context) => {
        if (context?.previous) queryClient.setQueryData(key0, context.previous);
      },
      onSettled: () => invalidate(),
    },
  });
}

export function useRegenerate(key: string) {
  const queryClient = useQueryClient();
  return useRegenerateWidget({
    mutation: {
      onSuccess: (_data, variables) =>
        queryClient.invalidateQueries({ queryKey: getGetWidgetDataQueryKey(key, variables.id) }),
    },
  });
}
