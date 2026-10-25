import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FileQuestion className="size-5" aria-hidden />
      </span>
      <h1 className="mt-3 text-lg font-semibold text-foreground">Page not found</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The page you requested does not exist in this demonstration build. Check the address or
        return to your dashboard.
      </p>
      <Button asChild className="mt-4">
        <Link to="/">Go to dashboard</Link>
      </Button>
    </div>
  );
}
