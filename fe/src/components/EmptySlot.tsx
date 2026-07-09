import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { slotClass, type Gap } from '@/lib/widget-slot';

/**
 * A hole in the board — a run of columns no widget occupies, drawn so the space
 * reads as deliberately empty rather than as a rendering glitch.
 *
 * Only shown from `lg` up, the one breakpoint where the stored 3-column layout is
 * honoured. Below it the grid packs greedily and there are no holes to draw, so a
 * placeholder there would invent a gap that doesn't exist. Being `display: none`
 * there also keeps it from registering as a drop target.
 *
 * The ref and drag flags exist for the draggable grid, which makes each hole a drop
 * target; the virtualized grid renders it as plain decoration. A hole narrower than
 * the widget in the air says so rather than silently swallowing the drop.
 */
export const EmptySlot = forwardRef<HTMLDivElement, { gap: Gap; isOver?: boolean; canDrop?: boolean }>(
  function EmptySlot({ gap, isOver = false, canDrop = true }, ref) {
    const rejecting = isOver && !canDrop;
    return (
      <div
        ref={ref}
        aria-hidden
        data-testid="empty-slot"
        className={cn(
          'hidden min-h-[360px] place-items-center rounded-xl border border-dashed bg-muted/20 transition-colors lg:grid',
          isOver && canDrop && 'border-primary bg-primary/10',
          rejecting && 'border-destructive/60 bg-destructive/5',
          slotClass(gap),
        )}
      >
        <span
          className={cn(
            'text-xs',
            isOver && canDrop && 'font-medium text-primary',
            rejecting && 'font-medium text-destructive',
            !isOver && 'text-muted-foreground',
          )}
        >
          {rejecting ? 'Too narrow' : isOver ? 'Drop here' : 'Empty'}
        </span>
      </div>
    );
  },
);
