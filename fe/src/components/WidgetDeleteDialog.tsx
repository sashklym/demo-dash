import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRemoveWidget } from '@/hooks/use-widgets';
import type { Widget } from '@/lib/api/generated/model';

/** Trash button + a confirmation dialog — deletion never fires on a single click. */
export function WidgetDeleteDialog({ dashboardKey, widget }: { dashboardKey: string; widget: Widget }) {
  const remove = useRemoveWidget(dashboardKey);
  const [open, setOpen] = useState(false);

  function handleDelete() {
    remove.mutate({ key: dashboardKey, id: widget.id }, { onError: () => toast.error('Delete failed') });
    setOpen(false);
  }

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className="text-muted-foreground hover:text-destructive"
        aria-label="Delete widget"
        disabled={remove.isPending}
        onClick={() => setOpen(true)}
      >
        <Trash2 />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
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
