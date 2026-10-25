import * as React from 'react';
import { cn } from '@/lib/utils';

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  footer,
  id,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  footer?: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn('rounded-lg border border-border bg-card shadow-card', className)}
      aria-label={title}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold leading-tight text-foreground">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn('p-4', bodyClassName)}>{children}</div>
      {footer && <div className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">{footer}</div>}
    </section>
  );
}
