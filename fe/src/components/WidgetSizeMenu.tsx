import { Check, Columns3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const SIZES = [
  { value: 1, label: '1 column' },
  { value: 2, label: '2 columns' },
  { value: 3, label: '3 columns' },
] as const;

/**
 * Set a widget's column span. Resizing can push the widget to another row (the
 * server re-places it by first fit), so the grid refetches rather than guessing.
 */
export function WidgetSizeMenu({
  size,
  onResize,
  isPending,
}: {
  size: number;
  onResize: (size: number) => void;
  isPending?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Widget width"
          disabled={isPending}
        >
          <Columns3 />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Width</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SIZES.map((option) => (
          <DropdownMenuItem
            key={option.value}
            aria-current={option.value === size}
            onClick={() => option.value !== size && onResize(option.value)}
          >
            <Check className={option.value === size ? 'opacity-100' : 'opacity-0'} />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
