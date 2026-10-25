import * as React from 'react';
import { cn } from '@/lib/utils';

export interface DefinitionItem {
  label: string;
  value: React.ReactNode;
  hint?: string;
  mono?: boolean;
  span?: 1 | 2;
}

export function DefinitionList({
  items,
  columns = 2,
  className,
}: {
  items: DefinitionItem[];
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-3.5',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className={cn('min-w-0', item.span === 2 && 'sm:col-span-2')}>
          <dt className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            {item.label}
          </dt>
          <dd
            className={cn(
              'mt-0.5 break-words text-sm text-foreground',
              item.mono && 'font-mono text-xs',
            )}
          >
            {item.value ?? '—'}
          </dd>
          {item.hint && <p className="mt-0.5 text-2xs text-muted-foreground">{item.hint}</p>}
        </div>
      ))}
    </dl>
  );
}
