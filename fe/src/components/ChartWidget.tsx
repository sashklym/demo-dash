import { RefreshCw } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetWidgetData } from '@/lib/api/generated/api';
import { useRegenerate } from '@/hooks/use-widgets';
import type { Widget } from '@/lib/api/generated/model';

const STROKE = 'hsl(var(--chart-1))';
const GRID = 'hsl(var(--border))';

export function ChartWidget({ dashboardKey, widget }: { dashboardKey: string; widget: Widget }) {
  const data = useGetWidgetData(dashboardKey, widget.id, { points: 12 });
  const regenerate = useRegenerate(dashboardKey);
  const series = data.data?.series ?? [];
  const isBar = widget.type === 'bar';

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="min-h-0 flex-1" data-testid="chart-body">
        {data.isPending ? (
          <Skeleton className="h-full w-full" />
        ) : data.isError ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <p>Couldn’t load chart data.</p>
            <Button size="sm" variant="outline" onClick={() => data.refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {isBar ? (
              <BarChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} width={40} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                <Bar dataKey="value" fill={STROKE} radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} width={40} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke={STROKE} strokeWidth={2} dot={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          disabled={regenerate.isPending}
          onClick={() => regenerate.mutate({ key: dashboardKey, id: widget.id })}
        >
          <RefreshCw /> Regenerate
        </Button>
      </div>
    </div>
  );
}
