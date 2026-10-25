import * as React from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const toneClasses = {
  neutral: 'text-primary bg-primary/10',
  success: 'text-success bg-success/10',
  warning: 'text-[#96660d] bg-warning/15',
  critical: 'text-critical bg-critical/10',
  info: 'text-secondary bg-secondary/10',
} as const;

export type StatTone = keyof typeof toneClasses;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
  to,
  meta,
  trend,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: StatTone;
  to?: string;
  meta?: React.ReactNode;
  trend?: { direction: 'up' | 'down'; label: string };
  className?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn('flex size-7 shrink-0 items-center justify-center rounded', toneClasses[tone])}>
            <Icon className="size-3.5" aria-hidden />
          </span>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
        <p className="text-[26px] font-semibold leading-none tracking-tight text-foreground">{value}</p>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-2xs font-medium',
              trend.direction === 'up' ? 'text-success' : 'text-critical',
            )}
          >
            {trend.direction === 'up' ? (
              <TrendingUp className="size-3" aria-hidden />
            ) : (
              <TrendingDown className="size-3" aria-hidden />
            )}
            {trend.label}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs leading-snug text-muted-foreground">{hint}</p>}
      {meta && <div className="mt-2">{meta}</div>}
    </>
  );

  const base = 'rounded-lg border border-border bg-card p-3.5 shadow-card';

  if (to) {
    return (
      <Link
        to={to}
        className={cn(base, 'group block transition-colors hover:border-secondary/45 hover:bg-muted/20')}
      >
        {content}
        <span className="mt-2 inline-flex items-center gap-1 text-2xs font-medium text-secondary opacity-0 transition-opacity group-hover:opacity-100">
          Open <ArrowRight className="size-3" aria-hidden />
        </span>
      </Link>
    );
  }

  return <div className={cn(base, className)}>{content}</div>;
}

export function StatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}>
      {children}
    </div>
  );
}
