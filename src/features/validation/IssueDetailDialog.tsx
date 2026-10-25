import * as React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ValidationIssuePanel } from '@/components/shared/ValidationIssuePanel';
import { useLookups } from '@/hooks/useScopeData';
import type { IssueStatus, ValidationIssue } from '@/types';

const STATUS_ACTIONS: { status: IssueStatus; label: string; variant: 'outline' | 'default' | 'success' }[] = [
  { status: 'Acknowledged', label: 'Acknowledge', variant: 'outline' },
  { status: 'Under Review', label: 'Under review', variant: 'outline' },
  { status: 'Correction Required', label: 'Correction required', variant: 'outline' },
  { status: 'Resolved', label: 'Mark resolved', variant: 'success' },
  { status: 'Escalated', label: 'Escalate', variant: 'outline' },
  { status: 'Closed', label: 'Close', variant: 'outline' },
];

export function IssueDetailDialog({
  issue,
  open,
  onClose,
  canManage,
  onStatusChange,
  onComment,
  studentPath,
}: {
  issue: ValidationIssue | null;
  open: boolean;
  onClose: () => void;
  canManage: boolean;
  onStatusChange: (issueId: string, status: IssueStatus, comment: string) => void;
  onComment: (issueId: string, message: string) => void;
  studentPath?: string;
}) {
  const lookups = useLookups();
  const [comment, setComment] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setComment('');
      setError(null);
    }
  }, [open, issue?.id]);

  if (!issue) return null;

  const handleStatus = (status: IssueStatus) => {
    if (comment.trim().length < 5) {
      setError('Add a comment of at least 5 characters describing the action taken.');
      return;
    }
    onStatusChange(issue.id, status, comment.trim());
    setComment('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Validation issue {issue.id}</DialogTitle>
          <DialogDescription>
            {lookups.institutionName(issue.institutionId)} · {issue.ruleId} · deterministic rule
            finding. Status changes are recorded in the audit history.
          </DialogDescription>
        </DialogHeader>

        <ValidationIssuePanel issue={issue} />

        {studentPath && issue.studentId && (
          <Button asChild variant="outline" size="sm" className="w-fit">
            <Link to={studentPath}>
              <ExternalLink className="size-3.5" aria-hidden /> Open student record
            </Link>
          </Button>
        )}

        <div>
          <Label htmlFor="issue-comment" className="mb-1 block">
            {canManage ? 'Comment and action note' : 'Add a comment'}
          </Label>
          <Textarea
            id="issue-comment"
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
              setError(null);
            }}
            rows={2}
            placeholder="Describe the correction, evidence reviewed or reason for escalation."
          />
          {error && (
            <p role="alert" className="mt-1 text-2xs text-critical">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={comment.trim().length === 0}
            onClick={() => {
              onComment(issue.id, comment.trim());
              setComment('');
            }}
          >
            Add comment only
          </Button>
          <div className="flex flex-wrap justify-end gap-1.5">
            {canManage ? (
              STATUS_ACTIONS.filter((action) => action.status !== issue.status).map((action) => (
                <Button
                  key={action.status}
                  size="sm"
                  variant={action.variant}
                  onClick={() => handleStatus(action.status)}
                >
                  {action.label}
                </Button>
              ))
            ) : (
              <Button size="sm" variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
