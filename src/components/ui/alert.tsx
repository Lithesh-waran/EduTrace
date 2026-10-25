import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

const alertVariants = cva('relative flex w-full gap-3 rounded-md border p-3 text-sm', {
  variants: {
    tone: {
      info: 'border-secondary/25 bg-secondary/5 text-foreground',
      warning: 'border-warning/35 bg-warning/10 text-foreground',
      success: 'border-success/30 bg-success/10 text-foreground',
      critical: 'border-critical/30 bg-critical/10 text-foreground',
      neutral: 'border-border bg-muted/60 text-foreground',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

const icons = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
  critical: ShieldAlert,
  neutral: Info,
} as const;

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  hideIcon?: boolean;
}

export function Alert({ className, tone = 'neutral', hideIcon, children, ...props }: AlertProps) {
  const Icon = icons[tone ?? 'neutral'];
  const iconTone =
    tone === 'warning'
      ? 'text-warning'
      : tone === 'success'
        ? 'text-success'
        : tone === 'critical'
          ? 'text-critical'
          : tone === 'info'
            ? 'text-secondary'
            : 'text-muted-foreground';
  return (
    <div role="note" className={cn(alertVariants({ tone }), className)} {...props}>
      {!hideIcon && <Icon className={cn('mt-0.5 size-4 shrink-0', iconTone)} aria-hidden />}
      <div className="min-w-0 flex-1 space-y-1">{children}</div>
    </div>
  );
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <p className={cn('text-xs font-semibold leading-5', className)} {...props} />;
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-xs leading-relaxed text-muted-foreground', className)} {...props} />;
}
