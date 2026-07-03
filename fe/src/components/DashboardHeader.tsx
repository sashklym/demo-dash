import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Link2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateDashboard } from '@/hooks/use-widgets';
import { setStoredKey } from '@/lib/dashboard-key';

/**
 * Persistent top bar shown on every dashboard. Surfaces the current key (with copy
 * key / copy link), an input to open another key, and a "New dashboard" button.
 */
export function DashboardHeader({ dashboardKey }: { dashboardKey: string }) {
  const navigate = useNavigate();
  const [entry, setEntry] = useState('');
  const createDashboard = useCreateDashboard();

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Copy failed');
    }
  }

  function openKey(event: FormEvent) {
    event.preventDefault();
    const next = entry.trim();
    if (!next) return;
    navigate(`/d/${encodeURIComponent(next)}`);
    setEntry('');
  }

  function createNew() {
    createDashboard.mutate(
      { data: {} },
      {
        onSuccess: (dashboard) => {
          setStoredKey(dashboard.key);
          navigate(`/d/${dashboard.key}`);
          toast.success('New dashboard created');
        },
        onError: () => toast.error('Could not create a dashboard'),
      },
    );
  }

  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <div className="mr-auto flex min-w-0 items-center gap-2">
          <span className="whitespace-nowrap text-lg font-semibold">YouScan Dashboard</span>
          <code
            className="max-w-[10rem] truncate rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground"
            title={dashboardKey}
            data-testid="dashboard-key"
          >
            {dashboardKey}
          </code>
          <Button size="icon" variant="ghost" onClick={() => copy(dashboardKey, 'Key')} aria-label="Copy key">
            <Copy />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => copy(`${window.location.origin}/d/${dashboardKey}`, 'Link')}
            aria-label="Copy link"
          >
            <Link2 />
          </Button>
        </div>

        <form onSubmit={openKey} className="flex items-center gap-2">
          <Input
            value={entry}
            onChange={(event) => setEntry(event.target.value)}
            placeholder="Enter a dashboard key…"
            aria-label="Dashboard key"
            className="w-48"
          />
          <Button type="submit" variant="outline">
            Open
          </Button>
        </form>

        <Button variant="secondary" onClick={createNew} disabled={createDashboard.isPending}>
          <Plus /> New dashboard
        </Button>
      </div>
    </header>
  );
}
