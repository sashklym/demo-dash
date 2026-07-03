import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CenteredMessage } from '@/components/CenteredMessage';
import { DashboardHeader } from '@/components/DashboardHeader';
import { WidgetGrid } from '@/components/WidgetGrid';
import { WidgetGridSkeleton } from '@/components/WidgetGridSkeleton';
import { Button } from '@/components/ui/button';
import { useCreateDashboard, useGetDashboard } from '@/lib/api/generated/api';
import { setStoredKey } from '@/lib/dashboard-key';

/** "/d/:key" — validates the key, then renders the header + widget grid. */
export function DashboardPage() {
  const { key = '' } = useParams();
  const navigate = useNavigate();
  const dashboard = useGetDashboard(key, { query: { retry: false, enabled: key.length > 0 } });
  const createDashboard = useCreateDashboard();

  // Remember a key only once it's confirmed valid (e.g. opened via a shared link).
  useEffect(() => {
    if (dashboard.isSuccess) setStoredKey(key);
  }, [dashboard.isSuccess, key]);

  if (dashboard.isError) {
    return (
      <CenteredMessage>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Dashboard not found</h1>
          <p className="text-muted-foreground">
            The key <code className="font-mono">{key}</code> doesn’t match any dashboard.
          </p>
        </div>
        <Button
          disabled={createDashboard.isPending}
          onClick={() =>
            createDashboard.mutate(
              { data: {} },
              {
                onSuccess: (created) => {
                  setStoredKey(created.key);
                  navigate(`/d/${created.key}`, { replace: true });
                },
              },
            )
          }
        >
          Create a new dashboard
        </Button>
      </CenteredMessage>
    );
  }

  // Header shows immediately; the grid area holds one steady skeleton while the
  // dashboard validates and widgets load, then swaps to the real grid.
  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader dashboardKey={key} />
      <main className="px-4 py-6 sm:px-6">
        {dashboard.isSuccess ? <WidgetGrid dashboardKey={key} /> : <WidgetGridSkeleton />}
      </main>
    </div>
  );
}
