import { formatDateTime } from '@/lib/format';
import type { Submission } from '@/types';
import { SubmissionStatusBadge } from './StatusBadge';

export function SubmissionStatusTimeline({ submission }: { submission: Submission }) {
  const entries = [...submission.timeline].sort((a, b) => a.at.localeCompare(b.at));
  return (
    <ol className="relative space-y-4 border-l border-border pl-4">
      {entries.map((entry, index) => (
        <li key={`${entry.at}-${index}`} className="relative">
          <span
            className={
              index === entries.length - 1
                ? 'absolute -left-[21px] top-1 size-2.5 rounded-full border-2 border-card bg-primary'
                : 'absolute -left-[21px] top-1 size-2.5 rounded-full border-2 border-card bg-secondary/60'
            }
            aria-hidden
          />
          <div className="flex flex-wrap items-center gap-2">
            <SubmissionStatusBadge status={entry.status} />
            <span className="text-2xs text-muted-foreground">{formatDateTime(entry.at)}</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-foreground/90">{entry.note}</p>
          <p className="text-2xs text-muted-foreground">by {entry.actor}</p>
        </li>
      ))}
    </ol>
  );
}
