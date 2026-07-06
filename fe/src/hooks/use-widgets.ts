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
  useMoveWidget,
  useRegenerateWidget,
  useReorderWidgets,
  useUpdateWidget,
} from '@/lib/api/generated/api';
import type { Widget, WidgetPage } from '@/lib/api/generated/model';

/**
 * Widgets are fetched a page at a time. The grid loads page 0 to learn the total
 * (and to render small dashboards whole); the virtualized grid fetches the extra
 * pages that overlap the scroll window. One page comfortably covers a
 * non-virtualized board (see VIRTUALIZE_THRESHOLD in WidgetGrid).
 */
export const PAGE_SIZE = 60;

/** Cache key for a specific page. */
const pageKey = (key: string, offset: number) => getListWidgetsQueryKey(key, { offset, limit: PAGE_SIZE });

/** All pages of a dashboard share the `[…/widgets]` key prefix — invalidate them together. */
function useInvalidateWidgets(key: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: getListWidgetsQueryKey(key) });
}

/**
 * A freshly created dashboard is always empty. Seed the dashboard + first-page
 * caches from the create response so it renders its empty state immediately —
 * no loading skeleton flashing phantom widget cards.
 */
export function useCreateDashboard() {
  const queryClient = useQueryClient();
  return useCreateDashboardGenerated({
    mutation: {
      onSuccess: (dashboard) => {
        queryClient.setQueryData(getGetDashboardQueryKey(dashboard.key), dashboard);
        queryClient.setQueryData<WidgetPage>(pageKey(dashboard.key, 0), {
          items: [],
          total: 0,
          offset: 0,
          limit: PAGE_SIZE,
        });
      },
    },
  });
}

/** One page of a dashboard's widgets (offset in items, not pages). */
export function useWidgetsPage(key: string, offset: number) {
  return useListWidgets(key, { offset, limit: PAGE_SIZE }, { query: { enabled: key.length > 0 } });
}

/**
 * Fetch the given pages together (for the virtualized grid's scroll window) and
 * flatten them into a global-index → widget map. Each page is its own cached
 * query, so scrolling only fetches pages not already loaded.
 */
export function useWidgetWindow(key: string, pageIndices: number[]) {
  const results = useQueries({
    queries: pageIndices.map((page) =>
      getListWidgetsQueryOptions(
        key,
        { offset: page * PAGE_SIZE, limit: PAGE_SIZE },
        { query: { enabled: key.length > 0 } },
      ),
    ),
  });

  const byIndex = new Map<number, Widget>();
  results.forEach((result, i) => {
    const page = result.data;
    if (!page) return;
    const base = pageIndices[i]! * PAGE_SIZE;
    page.items.forEach((widget, j) => byIndex.set(base + j, widget));
  });
  return byIndex;
}

/**
 * Thin wrappers over the generated mutation hooks. Structural changes (add /
 * delete / move / reorder) invalidate the page queries so the affected windows
 * refetch — cheap now that only the on-screen pages are ever loaded. An edit
 * doesn't change order, so it's patched into every cached page in place.
 */

export function useAddWidget(key: string) {
  const invalidate = useInvalidateWidgets(key);
  return useCreateWidget({ mutation: { onSuccess: () => invalidate() } });
}

export function useEditWidget(key: string) {
  const queryClient = useQueryClient();
  return useUpdateWidget({
    mutation: {
      onSuccess: (updated) =>
        queryClient.setQueriesData<WidgetPage>({ queryKey: getListWidgetsQueryKey(key) }, (page) =>
          page ? { ...page, items: page.items.map((w) => (w.id === updated.id ? updated : w)) } : page,
        ),
    },
  });
}

export function useRemoveWidget(key: string) {
  const invalidate = useInvalidateWidgets(key);
  return useDeleteWidget({ mutation: { onSuccess: () => invalidate() } });
}

/** Move one widget to a target index — O(1) on the server (single rank rewrite). */
export function useMove(key: string) {
  const invalidate = useInvalidateWidgets(key);
  return useMoveWidget({ mutation: { onSuccess: () => invalidate() } });
}

/** Full-order reorder for the small draggable grid, which loads the whole first page. */
export function useReorder(key: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateWidgets(key);
  const key0 = pageKey(key, 0);
  return useReorderWidgets({
    mutation: {
      // Apply the new order optimistically on the loaded page so the drag doesn't
      // flash back; reconcile with the server on settle.
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: key0 });
        const previous = queryClient.getQueryData<WidgetPage>(key0);
        if (previous) {
          const byId = new Map(previous.items.map((w) => [w.id, w]));
          const items = variables.data.orderedIds
            .map((id) => byId.get(id))
            .filter((w): w is Widget => Boolean(w));
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
