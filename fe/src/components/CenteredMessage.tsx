import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Full-viewport centered layout for loading / error / bootstrap states. */
export function CenteredMessage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid min-h-screen place-items-center p-8 text-center', className)}>
      <div className="flex flex-col items-center gap-4">{children}</div>
    </div>
  );
}
