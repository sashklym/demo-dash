import { BarChart3, LineChart, Plus, Type } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAddWidget } from '@/hooks/use-widgets';
import type { WidgetType } from '@/lib/api/generated/model';

const OPTIONS: Array<{ type: WidgetType; label: string; Icon: typeof LineChart }> = [
  { type: 'line', label: 'Line chart', Icon: LineChart },
  { type: 'bar', label: 'Bar chart', Icon: BarChart3 },
  { type: 'text', label: 'Text', Icon: Type },
];

export function AddWidgetMenu({ dashboardKey }: { dashboardKey: string }) {
  const add = useAddWidget(dashboardKey);

  function create(type: WidgetType) {
    add.mutate(
      { key: dashboardKey, data: { type } },
      { onError: () => toast.error('Could not add widget') },
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={add.isPending}>
          <Plus /> Add widget
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Widget type</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map(({ type, label, Icon }) => (
          <DropdownMenuItem key={type} onClick={() => create(type)}>
            <Icon /> {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
