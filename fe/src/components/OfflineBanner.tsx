import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-online-status';

/**
 * A persistent top banner shown while the browser is offline. Without it, queries
 * silently pause (React Query's default `networkMode: 'online'`) and the grid just
 * spins on skeletons with no explanation. It clears itself once the connection is
 * back and the paused queries resume.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="alert"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-center text-sm font-medium text-destructive-foreground"
    >
      <WifiOff className="size-4 shrink-0" />
      You’re offline — data may be out of date and changes won’t be saved until you reconnect.
    </div>
  );
}
