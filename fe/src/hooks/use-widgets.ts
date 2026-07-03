import { useQueryClient } from '@tanstack/react-query';
import {
  getGetDashboardQueryKey,
  getGetWidgetDataQueryKey,
  getListWidgetsQueryKey,
  useCreateDashboard as useCreateDashboardGenerated,
  useCreateWidget,
  useDeleteWidget,
  useListWidgets,
  useRegenerateWidget,
  useReorderWidgets,
  useUpdateWidget,
} from '@/lib/api/generated/api';
import type { Widget } from '@/lib/api/generated/model';

/**
 * A freshly created dashboard is always empty. Seed the dashboard + widget-list
 * caches from the create response so it renders its empty state immediately —
 * no loading skeleton flashing phantom widget cards.
 */
export function useCreateDashboard() {
  const queryClient = useQueryClient();
  return useCreateDashboardGenerated({
    mutation: {
      onSuccess: (dashboard) => {
        queryClient.setQueryData(getGetDashboardQueryKey(dashboard.key), dashboard);
        queryClient.setQueryData<Widget[]>(getListWidgetsQueryKey(dashboard.key), []);
      },
    },
  });
}

/**
 * Thin wrappers over the generated hooks that keep the widget list query fresh
 * after every mutation — the generated hooks don't invalidate on their own.
 */

export function useWidgets(key: string) {
  return useListWidgets(key, { query: { enabled: key.length > 0 } });
}

export function useAddWidget(key: string) {
  const queryClient = useQueryClient();
  return useCreateWidget({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListWidgetsQueryKey(key) }) },
  });
}

export function useEditWidget(key: string) {
  const queryClient = useQueryClient();
  return useUpdateWidget({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListWidgetsQueryKey(key) }) },
  });
}

export function useRemoveWidget(key: string) {
  const queryClient = useQueryClient();
  return useDeleteWidget({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListWidgetsQueryKey(key) }) },
  });
}

export function useReorder(key: string) {
  const queryClient = useQueryClient();
  const listKey = getListWidgetsQueryKey(key);
  return useReorderWidgets({
    mutation: {
      // Optimistically apply the new order; onSettled re-fetches to reconcile
      // (which also reverts if the request fails).
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: listKey });
        const previous = queryClient.getQueryData<Widget[]>(listKey);
        if (previous) {
          const byId = new Map(previous.map((w) => [w.id, w]));
          const next = variables.data.orderedIds
            .map((id) => byId.get(id))
            .filter((w): w is Widget => Boolean(w));
          queryClient.setQueryData(listKey, next);
        }
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
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
