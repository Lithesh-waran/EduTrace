import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/format';
import { ROLE_LABELS, type AuditEvent } from '@/types';
import { EmptyState } from './States';

export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No audit events"
        description="Actions recorded against this record will appear here with the actor, reason and change summary."
      />
    );
  }

  return (
    <ol className="relative space-y-4 border-l border-border pl-4">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span
            className="absolute -left-[21px] top-1 size-2.5 rounded-full border-2 border-card bg-secondary"
            aria-hidden
          />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-medium text-foreground">{event.action}</p>
            <Badge variant="muted" className="font-normal">
              {event.recordRef}
            </Badge>
          </div>
          <p className="mt-0.5 text-2xs text-muted-foreground">
            {formatDateTime(event.at)} · {event.actor}
            {event.actorRole !== 'system' && ` · ${ROLE_LABELS[event.actorRole]}`}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-foreground/90">{event.changeSummary}</p>
          {event.reason && (
            <p className="mt-1 rounded border border-border bg-muted/40 px-2 py-1.5 text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Reason:</span> {event.reason}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
