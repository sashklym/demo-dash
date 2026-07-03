import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { useEditWidget } from '@/hooks/use-widgets';
import type { Widget } from '@/lib/api/generated/model';

/**
 * Click-to-rename title. Owns its own draft/edit state so typing a new name never
 * re-renders the rest of the card (or its siblings).
 */
export function WidgetTitle({ dashboardKey, widget }: { dashboardKey: string; widget: Widget }) {
  const edit = useEditWidget(dashboardKey);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(widget.title);

  useEffect(() => {
    if (!renaming) setDraft(widget.title);
  }, [widget.title, renaming]);

  function save() {
    const next = draft.trim();
    if (!next || next === widget.title) {
      setDraft(widget.title);
      setRenaming(false);
      return;
    }
    edit.mutate(
      { key: dashboardKey, id: widget.id, data: { title: next } },
      { onSuccess: () => setRenaming(false), onError: () => toast.error('Rename failed') },
    );
  }

  if (renaming) {
    return (
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === 'Enter') save();
          if (event.key === 'Escape') {
            setDraft(widget.title);
            setRenaming(false);
          }
        }}
        autoFocus
        maxLength={120}
        aria-label="Widget name"
        className="h-7 py-0 text-sm"
      />
    );
  }

  return (
    <button
      type="button"
      className="min-w-0 truncate rounded px-1 text-left text-sm font-semibold leading-none tracking-tight hover:bg-accent"
      title={`${widget.title} — click to rename`}
      onClick={() => setRenaming(true)}
    >
      {widget.title}
    </button>
  );
}
