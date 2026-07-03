import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Shown while the dashboard validates AND while widgets load — the same skeleton
 * across both phases, so there's a single steady placeholder (no flicker), shaped
 * like real widget cards so the swap to content is seamless.
 */
export function WidgetGridSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="flex h-[360px] flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b p-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="size-7 rounded-md" />
            </div>
            <div className="flex-1 p-4">
              <Skeleton className="h-full w-full rounded-md" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
