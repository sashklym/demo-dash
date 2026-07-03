import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useGetWidgetData } from '@/lib/api/generated/api';
import { Period } from '@/lib/api/generated/model';
import { useEditWidget, useRegenerate } from '@/hooks/use-widgets';
import type { Widget } from '@/lib/api/generated/model';

const GRID = 'hsl(var(--border))';

// YouScan sentiment breakdown — neutral dominates, negative is the alarm signal.
const SERIES = [
  { key: 'positive', label: 'Positive', color: 'hsl(142 71% 42%)' },
  { key: 'neutral', label: 'Neutral', color: 'hsl(215 16% 55%)' },
  { key: 'negative', label: 'Negative', color: 'hsl(0 74% 55%)' },
] as const;

const PERIODS: { value: Period; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

export function ChartWidget({ dashboardKey, widget }: { dashboardKey: string; widget: Widget }) {
  const [period, setPeriod] = useState<Period>(widget.period);
  const data = useGetWidgetData(dashboardKey, widget.id, { period });
  const regenerate = useRegenerate(dashboardKey);
  const edit = useEditWidget(dashboardKey);
  const points = data.data?.points ?? [];
  const isBar = widget.type === 'bar';

  function changePeriod(next: Period) {
    if (next === period) return;
    setPeriod(next); // update the view immediately…
    edit.mutate({ key: dashboardKey, id: widget.id, data: { period: next } }); // …and persist for reload
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center gap-0.5" role="group" aria-label="Chart period">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            aria-pressed={p.value === period}
            className={cn(
              'rounded px-2 py-0.5 text-xs font-medium transition-colors',
              p.value === period ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
            )}
            onClick={() => changePeriod(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

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
              <BarChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} width={44} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                {SERIES.map((s) => (
                  <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[2, 2, 0, 0]} />
                ))}
              </BarChart>
            ) : (
              <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} width={44} />
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                {SERIES.map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
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
