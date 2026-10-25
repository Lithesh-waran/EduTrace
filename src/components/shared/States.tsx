import type { LucideIcon } from 'lucide-react';
import { AlertCircle, Inbox, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/20 px-6 py-10 text-center',
        className,
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{description}</p>}
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Loading records…', rows = 4 }: { label?: string; rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-9 w-full animate-pulse rounded bg-muted"
          style={{ opacity: 1 - index * 0.12 }}
        />
      ))}
      <p className="flex items-center justify-center gap-1.5 pt-1 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" aria-hidden /> {label}
      </p>
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-2 rounded-md border border-critical/30 bg-critical/5 px-6 py-8 text-center"
    >
      <AlertCircle className="size-5 text-critical" aria-hidden />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-md text-xs text-muted-foreground">{description}</p>}
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="mt-1">
          Try again
        </Button>
      )}
    </div>
  );
}
