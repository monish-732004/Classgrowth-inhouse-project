import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  deadline: string; // ISO string
  className?: string;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Closed';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

export function DeadlineCountdown({ deadline, className }: Props) {
  const [ms, setMs] = useState(() => new Date(deadline).getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => setMs(new Date(deadline).getTime() - Date.now()), 30_000);
    return () => clearInterval(id);
  }, [deadline]);

  const urgent = ms > 0 && ms < 24 * 3600 * 1000;
  const warning = ms > 0 && ms < 72 * 3600 * 1000;
  const closed = ms <= 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
        closed  ? 'bg-muted text-muted-foreground' :
        urgent  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
        warning ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        className,
      )}
    >
      <Clock className="h-3 w-3" />
      {formatCountdown(ms)}
    </span>
  );
}
