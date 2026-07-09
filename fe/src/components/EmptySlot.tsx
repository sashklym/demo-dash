import { cn } from '@/lib/utils';
import { slotClass, type Gap } from '@/lib/widget-slot';

/**
 * A hole in the board — a run of columns no widget occupies, drawn so the space
 * reads as deliberately empty rather than as a rendering glitch.
 *
 * Only shown from `lg` up, the one breakpoint where the stored 3-column layout is
 * honoured. Below it the grid packs greedily and there are no holes to draw, so a
 * placeholder there would invent a gap that doesn't exist.
 */
export function EmptySlot({ gap }: { gap: Gap }) {
  return (
    <div
      aria-hidden
      data-testid="empty-slot"
      className={cn(
        'hidden min-h-[360px] place-items-center rounded-xl border border-dashed bg-muted/20 lg:grid',
        slotClass(gap),
      )}
    >
      <span className="text-xs text-muted-foreground">Empty</span>
    </div>
  );
}
