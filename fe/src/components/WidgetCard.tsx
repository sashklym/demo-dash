import type { ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartWidget } from './ChartWidget';
import { TextWidget } from './TextWidget';
import { useRemoveWidget } from '@/hooks/use-widgets';
import type { Widget } from '@/lib/api/generated/model';

export function WidgetCard({
  dashboardKey,
  widget,
  dragHandle,
}: {
  dashboardKey: string;
  widget: Widget;
  dragHandle?: ReactNode;
}) {
  const remove = useRemoveWidget(dashboardKey);

  return (
    <Card className="flex h-[360px] flex-col" data-testid={`widget-${widget.type}`}>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 border-b py-3">
        <div className="flex min-w-0 items-center gap-1">
          {dragHandle}
          <CardTitle className="truncate text-sm" title={widget.title}>
            {widget.title}
          </CardTitle>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          aria-label="Delete widget"
          disabled={remove.isPending}
          onClick={() =>
            remove.mutate({ key: dashboardKey, id: widget.id }, { onError: () => toast.error('Delete failed') })
          }
        >
          <Trash2 />
        </Button>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col p-4">
        {widget.type === 'text' ? (
          <TextWidget dashboardKey={dashboardKey} widget={widget} />
        ) : (
          <ChartWidget dashboardKey={dashboardKey} widget={widget} />
        )}
      </CardContent>
    </Card>
  );
}
