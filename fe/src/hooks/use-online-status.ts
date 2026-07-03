import { useSyncExternalStore } from 'react';
import { onlineManager } from '@tanstack/react-query';

/**
 * Live online/offline flag from React Query's `onlineManager` — the same source
 * it uses to pause queries — so the UI stays in sync with actual fetch behavior
 * (defaults to `navigator.onLine` + window online/offline events).
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
    () => true,
  );
}
