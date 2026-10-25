import { cn } from '@/lib/utils';

type ProgressTone = 'primary' | 'success' | 'warning' | 'critical' | 'secondary';

const toneClass: Record<ProgressTone, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  success: 'bg-success',
  warning: 'bg-warning',
  critical: 'bg-critical',
};

export function Progress({
  value,
  tone = 'primary',
  className,
  label,
}: {
  value: number;
  tone?: ProgressTone;
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'Progress'}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-border', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-300', toneClass[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
