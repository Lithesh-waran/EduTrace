import { FlaskConical, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export function DemoNotice({
  title = 'Demonstration mode',
  children,
  className,
  tone = 'info',
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  tone?: 'info' | 'warning';
}) {
  return (
    <Alert tone={tone} className={cn('items-start', className)}>
      <AlertTitle className="flex items-center gap-1.5">
        <FlaskConical className="size-3.5" aria-hidden /> {title}
      </AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

export function SimulationNotice({ children }: { children: React.ReactNode }) {
  return (
    <Alert tone="warning">
      <AlertTitle className="flex items-center gap-1.5">
        <Info className="size-3.5" aria-hidden /> Simulation only
      </AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
