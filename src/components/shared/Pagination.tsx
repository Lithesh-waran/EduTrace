import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

export function Pagination({
  page,
  pageCount,
  rangeStart,
  rangeEnd,
  total,
  onPageChange,
  className,
}: {
  page: number;
  pageCount: number;
  rangeStart: number;
  rangeEnd: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1).filter((candidate) => {
    if (pageCount <= 7) return true;
    return (
      candidate === 1 ||
      candidate === pageCount ||
      Math.abs(candidate - page) <= 1
    );
  });

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'flex flex-col items-center justify-between gap-2 border-t border-border px-3 py-2.5 sm:flex-row',
        className,
      )}
    >
      <p className="text-2xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{formatNumber(rangeStart)}</span>–
        <span className="font-medium text-foreground">{formatNumber(rangeEnd)}</span> of{' '}
        <span className="font-medium text-foreground">{formatNumber(total)}</span> records
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </Button>
        {pages.map((candidate, index) => {
          const previous = pages[index - 1];
          const gap = previous !== undefined && candidate - previous > 1;
          return (
            <span key={candidate} className="flex items-center gap-1">
              {gap && <span className="px-1 text-2xs text-muted-foreground">…</span>}
              <Button
                variant={candidate === page ? 'default' : 'ghost'}
                size="icon-sm"
                onClick={() => onPageChange(candidate)}
                aria-current={candidate === page ? 'page' : undefined}
                aria-label={`Page ${candidate}`}
                className="text-2xs"
              >
                {candidate}
              </Button>
            </span>
          );
        })}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page >= pageCount}
          aria-label="Next page"
        >
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
