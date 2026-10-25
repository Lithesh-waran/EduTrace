import * as React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageHeader } from '@/components/shared/PageHeader';
import { Panel } from '@/components/shared/Panel';
import { DefinitionList } from '@/components/shared/DefinitionList';
import { DecisionDialog } from '@/components/shared/Dialogs';
import { EmptyState } from '@/components/shared/States';
import {
  SubmissionStatusBadge,
  VerificationStatusBadge,
  ReferenceStatusBadge,
} from '@/components/shared/StatusBadge';
import { useAdminData } from '@/hooks/useScopeData';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { VerificationStatus } from '@/types';

export function InstitutionVerificationPage() {
  const { data, actions } = useAdminData();
  const { can, user } = useAuth();
  const pending = [...data.institutions].sort((a, b) => {
    const priority = (status: VerificationStatus) =>
      status === 'Submitted' ? 0 : status === 'Under Verification' ? 1 : status === 'Correction Required' ? 2 : 3;
    const diff = priority(a.verificationStatus) - priority(b.verificationStatus);
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });

  const [selectedId, setSelectedId] = React.useState<string>(
    pending.find((institution) => institution.verificationStatus !== 'Verified')?.id ?? pending[0]?.id ?? '',
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const selected = data.institutions.find((institution) => institution.id === selectedId);
  const canDecide = can('admin.verify');

  const reviewable = selected
    ? selected.verificationStatus !== 'Verified' || canDecide
    : false;

  const submissions = selected
    ? data.submissions.filter((submission) => submission.institutionId === selected.id)
    : [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Institution verification"
        description="Review institutional details, approval references, supporting records and submission history. Each decision requires a written reason and is recorded in the audit history."
        meta={
          <>
            <Badge variant="warning">
              {formatNumber(data.institutions.filter((institution) => institution.verificationStatus !== 'Verified').length)} pending or in review
            </Badge>
            <Badge variant="outline">{formatNumber(data.institutions.length)} institutions</Badge>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
        <Panel title="Verification queue" bodyClassName="p-0" description="Sorted by workflow state.">
          <ul className="max-h-[34rem] divide-y divide-border overflow-y-auto scrollbar-thin">
            {pending.map((institution) => (
              <li key={institution.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(institution.id)}
                  className={cn(
                    'w-full px-3 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted focus-visible:outline-none',
                    institution.id === selectedId && 'bg-secondary/5',
                  )}
                  aria-pressed={institution.id === selectedId}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-2xs text-muted-foreground">{institution.shortCode}</span>
                    <VerificationStatusBadge status={institution.verificationStatus} />
                  </div>
                  <p className="mt-0.5 text-xs font-medium leading-snug text-foreground">{institution.name}</p>
                  <p className="text-2xs text-muted-foreground">{institution.state} · {institution.aicteId}</p>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        {!selected ? (
          <Panel title="No institution selected">
            <EmptyState title="Select an institution" description="Choose an institution from the verification queue." />
          </Panel>
        ) : (
          <div className="space-y-4">
            <Panel
              title={selected.name}
              description={`${selected.aicteId} · ${selected.type} · ${selected.managementType}`}
              actions={
                canDecide ? (
                  <Button size="sm" onClick={() => setDialogOpen(true)}>
                    <ShieldCheck className="size-4" aria-hidden /> Record decision
                  </Button>
                ) : (
                  <Badge variant="muted">Read-only for your role</Badge>
                )
              }
            >
              <div className="flex flex-wrap items-center gap-2">
                <VerificationStatusBadge status={selected.verificationStatus} />
                <Badge variant="outline">Last verified {selected.lastVerifiedOn ? formatDate(selected.lastVerifiedOn) : 'never'}</Badge>
                <Button asChild variant="link" size="xs" className="ml-auto px-0">
                  <Link to={`/admin/institutions/${selected.id}`}>Open full institution record</Link>
                </Button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DefinitionList
                  columns={1}
                  items={[
                    { label: 'Approval reference', value: selected.approvalRef, mono: true },
                    { label: 'Approval period', value: `${formatDate(selected.approvalFrom)} → ${formatDate(selected.approvalTo)}` },
                    { label: 'Approval source', value: selected.approvalSource },
                    { label: 'Head of institution', value: selected.headOfInstitution },
                    { label: 'Portal administrator', value: selected.portalAdministrator },
                  ]}
                />
                <DefinitionList
                  columns={1}
                  items={[
                    { label: 'State / district', value: `${selected.state} · ${selected.district}` },
                    { label: 'Official contact', value: `${selected.email} · ${selected.phone}` },
                    { label: 'Registered courses', value: formatNumber(data.courses.filter((course) => course.institutionId === selected.id).length) },
                    { label: 'Student records', value: formatNumber(data.students.filter((student) => student.institutionId === selected.id).length) },
                    { label: 'Last updated', value: formatDateTime(selected.lastUpdated) },
                  ]}
                />
              </div>
            </Panel>

            <Panel title="Course references" description="Approval references and verification status for registered courses." bodyClassName="p-0">
              <ul className="divide-y divide-border">
                {data.courses
                  .filter((course) => course.institutionId === selected.id)
                  .map((course) => (
                    <li key={course.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs">
                      <span className="font-mono text-2xs text-muted-foreground">{course.code}</span>
                      <span className="font-medium text-foreground">{course.name}</span>
                      <span className="text-2xs text-muted-foreground">
                        Approved intake {formatNumber(course.approvedIntake)} · {course.approvalRef}
                      </span>
                      <span className="ml-auto"><ReferenceStatusBadge status={course.verificationStatus} /></span>
                    </li>
                  ))}
              </ul>
            </Panel>

            <Panel title="Submission history" description="Batches submitted by this institution." bodyClassName="p-0">
              {submissions.length === 0 ? (
                <p className="px-3 py-3 text-xs text-muted-foreground">No submissions recorded.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {submissions.map((submission) => (
                    <li key={submission.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs">
                      <Link to={`/admin/submissions/${submission.id}`} className="font-mono text-2xs text-secondary hover:underline">
                        {submission.id}
                      </Link>
                      <SubmissionStatusBadge status={submission.status} />
                      <span className="text-2xs text-muted-foreground">{submission.academicYear}</span>
                      <span className="ml-auto text-2xs text-muted-foreground">
                        {formatDate(submission.submittedAt)} · {submission.validRecords}/{submission.recordCount} valid
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Decision history" description="Reviewer comments recorded against this institution.">
              {selected.reviewerComments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No decisions recorded yet.</p>
              ) : (
                <ul className="space-y-2">
                  {[...selected.reviewerComments].reverse().map((comment, index) => (
                    <li key={`${comment.at}-${index}`} className="rounded border border-border px-2.5 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{comment.decision}</Badge>
                        <span className="text-2xs text-muted-foreground">{formatDateTime(comment.at)}</span>
                        <span className="ml-auto text-2xs text-muted-foreground">{comment.actor}</span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-foreground/90">{comment.reason}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Alert tone="info">
              <AlertTitle className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5" aria-hidden /> Demonstration decision
              </AlertTitle>
              <AlertDescription>
                Verification decisions recorded here are local to the demonstration dataset and are
                not official AICTE approvals. The signed-in role is {user ? user.role : 'unknown'}.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>

      <DecisionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={`Verification decision · ${selected?.name ?? ''}`}
        description="Select the verification outcome and record the basis for the decision. The institution is notified and the decision is audited."
        options={[
          { value: 'verify', label: 'Verify institution', description: 'Approval reference and institutional details are consistent with the reference extract.', tone: 'success' },
          { value: 'under_review', label: 'Keep under verification', description: 'Additional evidence is required before a final decision.', tone: 'warning' },
          { value: 'request_correction', label: 'Request correction', description: 'The institution must correct profile or reference data and resubmit.', tone: 'warning' },
          { value: 'reject', label: 'Reject with reason', description: 'Verification is refused. The reason is required and recorded.', tone: 'critical' },
        ]}
        onSubmit={(value, reason) => {
          if (!selected) return;
          actions.reviewInstitution(
            selected.id,
            value as 'verify' | 'under_review' | 'request_correction' | 'reject',
            reason,
          );
          setDialogOpen(false);
        }}
      />

      {!reviewable && !canDecide && (
        <p className="text-2xs text-muted-foreground">
          Your role can review the queue but cannot record verification decisions.
        </p>
      )}
    </div>
  );
}
