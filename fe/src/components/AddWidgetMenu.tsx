import { useState } from 'react';
import { BarChart3, LineChart, Plus, Type } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAddWidget } from '@/hooks/use-widgets';
import type { Widget, WidgetType } from '@/lib/api/generated/model';

const OPTIONS: Array<{ type: WidgetType; label: string; Icon: typeof LineChart }> = [
  { type: 'line', label: 'Line chart', Icon: LineChart },
  { type: 'bar', label: 'Bar chart', Icon: BarChart3 },
  { type: 'text', label: 'Text', Icon: Type },
];

/** Column spans a widget can claim on the canonical 3-column grid. */
const SIZES: Array<{ size: number; label: string }> = [
  { size: 1, label: '1 column' },
  { size: 2, label: '2 columns' },
  { size: 3, label: 'Full row' },
];

export function AddWidgetMenu({
  dashboardKey,
  onCreated,
}: {
  dashboardKey: string;
  onCreated?: (widget: Widget) => void;
}) {
  const add = useAddWidget(dashboardKey);
  const [size, setSize] = useState(1);

  function create(type: WidgetType) {
    add.mutate(
      { key: dashboardKey, data: { type, size } },
      {
        onSuccess: (widget) => onCreated?.(widget),
        onError: () => toast.error('Could not add widget'),
      },
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={add.isPending}>
          <Plus /> Add widget
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Width</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={String(size)} onValueChange={(value) => setSize(Number(value))}>
          {SIZES.map(({ size: value, label }) => (
            <DropdownMenuRadioItem
              key={value}
              value={String(value)}
              // The width is a choice *for* the type click that follows, so keep the
              // menu open instead of letting Radix close it on select.
              onSelect={(event) => event.preventDefault()}
            >
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Widget type</DropdownMenuLabel>
        {OPTIONS.map(({ type, label, Icon }) => (
          <DropdownMenuItem key={type} onClick={() => create(type)}>
            <Icon /> {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
