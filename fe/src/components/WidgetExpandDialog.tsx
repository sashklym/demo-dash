import { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WidgetBody } from './WidgetBody';
import { WidgetTypeBadge } from './WidgetTypeBadge';
import type { Widget } from '@/lib/api/generated/model';

/** Maximize button that opens the widget's body in a full-screen dialog. */
export function WidgetExpandDialog({ dashboardKey, widget }: { dashboardKey: string; widget: Widget }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className="text-muted-foreground hover:text-foreground"
        aria-label="Expand widget"
        onClick={() => setOpen(true)}
      >
        <Maximize2 />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="h-[85vh] max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex min-w-0 items-center gap-2 pr-8">
              <WidgetTypeBadge type={widget.type} />
              <span className="truncate" title={widget.title}>
                {widget.title}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            {open && <WidgetBody dashboardKey={dashboardKey} widget={widget} />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
