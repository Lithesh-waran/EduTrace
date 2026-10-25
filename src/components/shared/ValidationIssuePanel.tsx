import { CheckCircle2, Info, Lightbulb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/format';
import { VALIDATION_RULES } from '@/lib/validation/rules';
import type { ValidationIssue } from '@/types';
import { IssueStatusBadge, SeverityBadge } from './StatusBadge';

export function ValidationIssuePanel({
  issue,
  footer,
}: {
  issue: ValidationIssue;
  footer?: React.ReactNode;
}) {
  const rule = VALIDATION_RULES[issue.ruleId];
  return (
    <div className="rounded-md border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <Badge variant="outline" className="font-mono">
          {issue.id}
        </Badge>
        <SeverityBadge severity={issue.severity} />
        <IssueStatusBadge status={issue.status} />
        <span className="ml-auto text-2xs text-muted-foreground">{issue.ruleId}</span>
      </div>
      <div className="space-y-2.5 px-3 py-2.5">
        <div>
          <p className="text-sm font-medium text-foreground">{issue.ruleName}</p>
          <p className="text-2xs text-muted-foreground">
            Detected {formatDateTime(issue.detectedAt)} · Record {issue.recordRef}
          </p>
        </div>
        <div className="space-y-1">
          <p className="data-label">Reason</p>
          <p className="text-xs leading-relaxed text-foreground/90">{issue.reason}</p>
        </div>
        <div className="space-y-1">
          <p className="data-label">Evidence</p>
          <p className="rounded bg-muted/60 px-2 py-1.5 font-mono text-2xs leading-relaxed text-foreground/90">
            {issue.evidence}
          </p>
        </div>
        <div className="flex gap-1.5 rounded border border-secondary/20 bg-secondary/5 px-2 py-1.5">
          <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-secondary" aria-hidden />
          <div>
            <p className="text-2xs font-semibold text-secondary">Suggested next action</p>
            <p className="text-xs leading-relaxed text-foreground/90">{issue.suggestedAction}</p>
          </div>
        </div>
        {rule && (
          <p className="flex items-start gap-1 text-2xs text-muted-foreground">
            <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
            Deterministic rule · {rule.category}. {rule.description}
          </p>
        )}
        {issue.comments.length > 0 && (
          <div className="space-y-1.5 border-t border-border pt-2">
            <p className="data-label">Comments</p>
            {issue.comments.map((comment) => (
              <div key={comment.id} className="rounded bg-muted/40 px-2 py-1.5">
                <p className="text-2xs font-medium text-foreground">
                  {comment.author} · {formatDateTime(comment.at)}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">{comment.message}</p>
              </div>
            ))}
          </div>
        )}
        {issue.status === 'Resolved' && (
          <p className="flex items-center gap-1.5 text-xs text-success">
            <CheckCircle2 className="size-3.5" aria-hidden /> Resolved and retained in the audit history.
          </p>
        )}
      </div>
      {footer && <div className="border-t border-border px-3 py-2">{footer}</div>}
    </div>
  );
}
