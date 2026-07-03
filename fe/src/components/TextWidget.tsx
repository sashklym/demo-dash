import { useEffect, useState } from 'react';
import { Pencil, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useEditWidget } from '@/hooks/use-widgets';
import type { Widget } from '@/lib/api/generated/model';

export function TextWidget({ dashboardKey, widget }: { dashboardKey: string; widget: Widget }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(widget.text ?? '');
  const edit = useEditWidget(dashboardKey);

  useEffect(() => {
    if (!editing) setDraft(widget.text ?? '');
  }, [widget.text, editing]);

  function save() {
    edit.mutate(
      { key: dashboardKey, id: widget.id, data: { text: draft } },
      {
        onSuccess: () => {
          setEditing(false);
          toast.success('Saved');
        },
        onError: () => toast.error('Save failed'),
      },
    );
  }

  if (editing) {
    return (
      <div className="flex h-full flex-col gap-2">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="Widget text"
          autoFocus
          className="min-h-0 flex-1 resize-none"
        />
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft(widget.text ?? '');
              setEditing(false);
            }}
          >
            <X /> Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={edit.isPending}>
            <Save /> Save
          </Button>
        </div>
      </div>
    );
  }

  const hasText = Boolean(widget.text && widget.text.trim());

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <p className="whitespace-pre-wrap text-sm" data-testid="text-body">
          {hasText ? widget.text : <span className="text-muted-foreground">Empty — click Edit to add text.</span>}
        </p>
      </div>
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setEditing(true)}>
          <Pencil /> Edit
        </Button>
      </div>
    </div>
  );
}
