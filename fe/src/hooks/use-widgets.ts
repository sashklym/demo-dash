import { useQueryClient } from '@tanstack/react-query';
import {
  getGetWidgetDataQueryKey,
  getListWidgetsQueryKey,
  useCreateWidget,
  useDeleteWidget,
  useListWidgets,
  useRegenerateWidget,
  useReorderWidgets,
  useUpdateWidget,
} from '@/lib/api/generated/api';

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
  return useReorderWidgets({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListWidgetsQueryKey(key) }) },
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
