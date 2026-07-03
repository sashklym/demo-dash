import { ChartWidget } from './ChartWidget';
import { TextWidget } from './TextWidget';
import type { Widget } from '@/lib/api/generated/model';

/** Renders the type-specific body — shared by the card and the expanded dialog. */
export function WidgetBody({ dashboardKey, widget }: { dashboardKey: string; widget: Widget }) {
  return widget.type === 'text' ? (
    <TextWidget dashboardKey={dashboardKey} widget={widget} />
  ) : (
    <ChartWidget dashboardKey={dashboardKey} widget={widget} />
  );
}
