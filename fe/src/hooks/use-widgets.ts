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
 * Thin wrappers over the generated hooks. Each mutation patches the cached widget
 * list in place from its own response — never refetching the whole list. On a
 * large dashboard, re-GETting all widgets after every rename/move/delete moves a
 * lot of data for a one-row change, so we surgically update the one widget instead.
 */

export function useWidgets(key: string) {
  return useListWidgets(key, { query: { enabled: key.length > 0 } });
}

export function useAddWidget(key: string) {
  const queryClient = useQueryClient();
  const listKey = getListWidgetsQueryKey(key);
  return useCreateWidget({
    mutation: {
      // A new widget gets the next position, so it belongs at the end of the list.
      onSuccess: (widget) =>
        queryClient.setQueryData<Widget[]>(listKey, (prev) => (prev ? [...prev, widget] : [widget])),
    },
  });
}

export function useEditWidget(key: string) {
  const queryClient = useQueryClient();
  const listKey = getListWidgetsQueryKey(key);
  return useUpdateWidget({
    mutation: {
      onSuccess: (updated) =>
        queryClient.setQueryData<Widget[]>(listKey, (prev) =>
          prev?.map((w) => (w.id === updated.id ? updated : w)),
        ),
    },
  });
}

export function useRemoveWidget(key: string) {
  const queryClient = useQueryClient();
  const listKey = getListWidgetsQueryKey(key);
  return useDeleteWidget({
    mutation: {
      onSuccess: (_data, variables) =>
        queryClient.setQueryData<Widget[]>(listKey, (prev) => prev?.filter((w) => w.id !== variables.id)),
    },
  });
}

export function useReorder(key: string) {
  const queryClient = useQueryClient();
  const listKey = getListWidgetsQueryKey(key);
  return useReorderWidgets({
    mutation: {
      // Apply the new order optimistically; the server just persists it, so there's
      // nothing to refetch. Roll back to the snapshot if the request fails.
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
        return { previous };
      },
      onError: (_err, _variables, context) => {
        if (context?.previous) queryClient.setQueryData(listKey, context.previous);
      },
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
