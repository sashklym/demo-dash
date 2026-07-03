import { type ReactNode, useState } from 'react';
import { Maximize2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChartWidget } from './ChartWidget';
import { TextWidget } from './TextWidget';
import { useRemoveWidget } from '@/hooks/use-widgets';
import type { Widget } from '@/lib/api/generated/model';

function WidgetBody({ dashboardKey, widget }: { dashboardKey: string; widget: Widget }) {
  return widget.type === 'text' ? (
    <TextWidget dashboardKey={dashboardKey} widget={widget} />
  ) : (
    <ChartWidget dashboardKey={dashboardKey} widget={widget} />
  );
}

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
  const [expanded, setExpanded] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function handleDelete() {
    remove.mutate(
      { key: dashboardKey, id: widget.id },
      { onError: () => toast.error('Delete failed') },
    );
    setConfirmingDelete(false);
  }

  return (
    <>
      <Card className="flex h-[360px] flex-col" data-testid={`widget-${widget.type}`}>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 border-b py-3">
          <div className="flex min-w-0 items-center gap-1">
            {dragHandle}
            <CardTitle className="truncate text-sm" title={widget.title}>
              {widget.title}
            </CardTitle>
          </div>
          <div className="flex shrink-0 items-center">
            <Button
              size="icon"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Expand widget"
              onClick={() => setExpanded(true)}
            >
              <Maximize2 />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              aria-label="Delete widget"
              disabled={remove.isPending}
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col p-4">
          <WidgetBody dashboardKey={dashboardKey} widget={widget} />
        </CardContent>
      </Card>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="h-[85vh] max-w-5xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8" title={widget.title}>
              {widget.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            {expanded && <WidgetBody dashboardKey={dashboardKey} widget={widget} />}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent className="max-w-md" role="alertdialog">
          <DialogHeader>
            <DialogTitle>Delete widget?</DialogTitle>
            <DialogDescription>
              “{widget.title}” will be permanently removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={remove.isPending}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
