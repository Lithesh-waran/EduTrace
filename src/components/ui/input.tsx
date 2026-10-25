import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-card px-3 py-1.5 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/80 hover:border-secondary/50 focus-visible:border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70',
        'aria-[invalid=true]:border-critical aria-[invalid=true]:ring-critical/20',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
