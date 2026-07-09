import { ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, MoveVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { MoveTarget } from '@/lib/widget-slot';

export type { MoveTarget };

export type WidgetMoveActions = {
  onMove: (target: MoveTarget) => void;
  isFirst: boolean;
  isLast: boolean;
  isPending?: boolean;
};

/**
 * Action-based reordering: move a widget to the start, one step back/forward, or
 * to the end. The keyboard-and-click alternative to drag-and-drop — and the only
 * way to reorder on large (virtualized) dashboards, where drag isn't available.
 */
export function WidgetMoveMenu({ onMove, isFirst, isLast, isPending }: WidgetMoveActions) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Move widget"
          disabled={isPending || (isFirst && isLast)}
        >
          <MoveVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={isFirst} onClick={() => onMove('start')}>
          <ChevronsUp /> Move to start
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isFirst} onClick={() => onMove('prev')}>
          <ChevronUp /> Move up
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isLast} onClick={() => onMove('next')}>
          <ChevronDown /> Move down
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isLast} onClick={() => onMove('end')}>
          <ChevronsDown /> Move to end
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
