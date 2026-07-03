import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartWidget } from './ChartWidget';
import { TextWidget } from './TextWidget';
import { useRemoveWidget } from '@/hooks/use-widgets';
import type { Widget } from '@/lib/api/generated/model';

export function WidgetCard({ dashboardKey, widget }: { dashboardKey: string; widget: Widget }) {
  const remove = useRemoveWidget(dashboardKey);

  return (
    <Card className="flex flex-col" data-testid={`widget-${widget.type}`}>
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b py-3">
        <CardTitle className="truncate text-sm" title={widget.title}>
          {widget.title}
        </CardTitle>
        <Button
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          aria-label="Delete widget"
          disabled={remove.isPending}
          onClick={() =>
            remove.mutate({ key: dashboardKey, id: widget.id }, { onError: () => toast.error('Delete failed') })
          }
        >
          <Trash2 />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 pt-4">
        {widget.type === 'text' ? (
          <TextWidget dashboardKey={dashboardKey} widget={widget} />
        ) : (
          <ChartWidget dashboardKey={dashboardKey} widget={widget} />
        )}
      </CardContent>
    </Card>
  );
}
