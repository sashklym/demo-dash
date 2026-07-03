import { BarChart3, LineChart, Type } from 'lucide-react';
import type { WidgetType } from '@/lib/api/generated/model';

const TYPE_META: Record<WidgetType, { label: string; Icon: typeof LineChart }> = {
  line: { label: 'Line', Icon: LineChart },
  bar: { label: 'Bar', Icon: BarChart3 },
  text: { label: 'Text', Icon: Type },
};

/** A small pill that keeps the widget's type visible next to its (renameable) title. */
export function WidgetTypeBadge({ type }: { type: WidgetType }) {
  const { label, Icon } = TYPE_META[type];
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <Icon className="size-3" />
      {label}
    </span>
  );
}
