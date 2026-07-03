import { LayoutGrid } from 'lucide-react';
import { AddWidgetMenu } from './AddWidgetMenu';
import { WidgetCard } from './WidgetCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useWidgets } from '@/hooks/use-widgets';

export function WidgetGrid({ dashboardKey }: { dashboardKey: string }) {
  const widgets = useWidgets(dashboardKey);

  if (widgets.isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (widgets.isError) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <p className="text-muted-foreground">Couldn’t load widgets.</p>
        <Button variant="outline" onClick={() => widgets.refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  const items = widgets.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {items.length} widget{items.length === 1 ? '' : 's'}
        </h2>
        {items.length > 0 && <AddWidgetMenu dashboardKey={dashboardKey} />}
      </div>

      {items.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 border-dashed bg-transparent p-14 text-center shadow-none">
          <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <LayoutGrid className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Your dashboard is empty</h3>
            <p className="text-sm text-muted-foreground">Add a line chart, bar chart, or text widget to get started.</p>
          </div>
          <AddWidgetMenu dashboardKey={dashboardKey} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((widget) => (
            <WidgetCard key={widget.id} dashboardKey={dashboardKey} widget={widget} />
          ))}
        </div>
      )}
    </div>
  );
}
