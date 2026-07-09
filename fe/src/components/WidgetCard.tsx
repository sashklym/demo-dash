import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { WidgetBody } from './WidgetBody';
import { WidgetDeleteDialog } from './WidgetDeleteDialog';
import { WidgetExpandDialog } from './WidgetExpandDialog';
import { WidgetMoveMenu, type WidgetMoveActions } from './WidgetMoveMenu';
import { WidgetSizeMenu } from './WidgetSizeMenu';
import { WidgetTitle } from './WidgetTitle';
import { WidgetTypeBadge } from './WidgetTypeBadge';
import { useEditWidget } from '@/hooks/use-widgets';
import type { Widget } from '@/lib/api/generated/model';

export function WidgetCard({
  dashboardKey,
  widget,
  dragHandle,
  moveActions,
}: {
  dashboardKey: string;
  widget: Widget;
  dragHandle?: ReactNode;
  moveActions?: WidgetMoveActions;
}) {
  const edit = useEditWidget(dashboardKey);

  return (
    <Card className="flex h-[360px] flex-col" data-testid={`widget-${widget.type}`} data-size={widget.size}>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 border-b py-3">
        <div className="flex min-w-0 items-center gap-1.5">
          {dragHandle}
          <WidgetTypeBadge type={widget.type} />
          <WidgetTitle dashboardKey={dashboardKey} widget={widget} />
        </div>
        <div className="flex shrink-0 items-center">
          <WidgetSizeMenu
            size={widget.size}
            isPending={edit.isPending}
            onResize={(size) => edit.mutate({ key: dashboardKey, id: widget.id, data: { size } })}
          />
          {moveActions && <WidgetMoveMenu {...moveActions} />}
          <WidgetExpandDialog dashboardKey={dashboardKey} widget={widget} />
          <WidgetDeleteDialog dashboardKey={dashboardKey} widget={widget} />
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col p-4">
        <WidgetBody dashboardKey={dashboardKey} widget={widget} />
      </CardContent>
    </Card>
  );
}
