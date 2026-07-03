import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CenteredMessage } from '@/components/CenteredMessage';
import { Button } from '@/components/ui/button';
import { useCreateDashboard } from '@/hooks/use-widgets';
import { getStoredKey, setStoredKey } from '@/lib/dashboard-key';

/**
 * Entry route ("/"): reopen the remembered dashboard, or create a fresh one and
 * redirect to /d/:key. First-visit users never see an empty URL.
 */
export function BootstrapRoute() {
  const navigate = useNavigate();
  const createDashboard = useCreateDashboard();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const existing = getStoredKey();
    if (existing) {
      navigate(`/d/${existing}`, { replace: true });
      return;
    }

    // mutateAsync (not mutate + per-call callbacks): the promise resolves regardless
    // of the component's mount state, so navigation survives StrictMode's dev remount.
    createDashboard
      .mutateAsync({ data: {} })
      .then((dashboard) => {
        setStoredKey(dashboard.key);
        navigate(`/d/${dashboard.key}`, { replace: true });
      })
      .catch(() => toast.error('Could not reach the API to create a dashboard.'));
  }, [createDashboard, navigate]);

  if (createDashboard.isError) {
    return (
      <CenteredMessage>
        <p className="text-muted-foreground">We couldn’t set up a dashboard. Is the backend running?</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </CenteredMessage>
    );
  }

  return (
    <CenteredMessage>
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <p className="text-muted-foreground">Setting up your dashboard…</p>
    </CenteredMessage>
  );
}
