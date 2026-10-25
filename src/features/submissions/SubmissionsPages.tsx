import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Download, FileWarning, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageHeader } from '@/components/shared/PageHeader';
import { Panel } from '@/components/shared/Panel';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { SearchAndFilters } from '@/components/shared/SearchAndFilters';
import { Pagination } from '@/components/shared/Pagination';
import { SubmissionStatusBadge, IssueStatusBadge, SeverityBadge } from '@/components/shared/StatusBadge';
import { SubmissionStatusTimeline } from '@/components/shared/SubmissionStatusTimeline';
import { DecisionDialog } from '@/components/shared/Dialogs';
import { EmptyState } from '@/components/shared/States';
import { useAdminData, useInstitutionData, useLookups, usePagination } from '@/hooks/useScopeData';
import { useAuth } from '@/lib/auth/AuthProvider';
import { downloadCsv, formatBytes, formatDate, formatDateTime, formatNumber } from '@/lib/format';
import { SUBMISSION_STATUSES, type Submission } from '@/types';

const ALL = 'all';

function SubmissionsView({
  submissions,
  showInstitution,
  basePath,
}: {
  submissions: Submission[];
  showInstitution: boolean;
  basePath: string;
}) {
  const lookups = useLookups();
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState(ALL);
  const [year, setYear] = React.useState(ALL);

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return submissions
      .filter((submission) => {
        if (query) {
          const haystack = `${submission.id} ${submission.file.name} ${
            showInstitution ? lookups.institutionName(submission.institutionId) : ''
          }`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        if (status !== ALL && submission.status !== status) return false;
        if (year !== ALL && submission.academicYear !== year) return false;
        return true;
      })
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }, [submissions, search, status, year, lookups, showInstitution]);

  const pagination = usePagination(filtered, 12);
  const awaiting = submissions.filter((submission) =>
    ['Submitted', 'Resubmitted', 'Under Review', 'Validation in Progress'].includes(submission.status),
  ).length;
  const corrections = submissions.filter((submission) => submission.status === 'Correction Required').length;

  const columns: Column<Submission>[] = [
    {
      key: 'id',
      header: 'Submission',
      sortValue: (row) => row.id,
      cell: (row) => (
        <Link to={`${basePath}/${row.id}`} className="font-mono text-xs font-medium text-secondary hover:underline">
          {row.id}
        </Link>
      ),
    },
    ...(showInstitution
      ? [
          {
            key: 'institution',
            header: 'Institution',
            hideBelow: 'md' as const,
            sortValue: (row: Submission) => lookups.institutionName(row.institutionId),
            cell: (row: Submission) => (
              <span className="text-xs">{lookups.institutionName(row.institutionId)}</span>
            ),
          },
        ]
      : []),
    { key: 'year', header: 'Academic year', sortValue: (row) => row.academicYear, cell: (row) => row.academicYear },
    {
      key: 'records',
      header: 'Records',
      align: 'right',
      sortValue: (row) => row.recordCount,
      cell: (row) => formatNumber(row.recordCount),
    },
    { key: 'valid', header: 'Valid', align: 'right', hideBelow: 'sm', cell: (row) => formatNumber(row.validRecords) },
    {
      key: 'corrections',
      header: 'Corrections',
      align: 'right',
      hideBelow: 'sm',
      sortValue: (row) => row.correctionRecords,
      cell: (row) => (
        <span className={row.correctionRecords > 0 ? 'font-medium text-critical' : 'text-muted-foreground'}>
          {formatNumber(row.correctionRecords)}
        </span>
      ),
    },
    {
      key: 'submitted',
      header: 'Submitted',
      hideBelow: 'lg',
      sortValue: (row) => row.submittedAt,
      cell: (row) => <span className="text-2xs text-muted-foreground">{formatDate(row.submittedAt)}</span>,
    },
    { key: 'status', header: 'Status', sortValue: (row) => row.status, cell: (row) => <SubmissionStatusBadge status={row.status} /> },
    {
      key: 'reviewer',
      header: 'Reviewer',
      hideBelow: 'xl',
      cell: (row) => <span className="text-2xs text-muted-foreground">{row.reviewer ?? 'Unassigned'}</span>,
    },
    {
      key: 'updated',
      header: 'Last updated',
      hideBelow: 'xl',
      cell: (row) => <span className="text-2xs text-muted-foreground">{formatDate(row.lastUpdated)}</span>,
    },
  ];

  const handleExport = () => {
    downloadCsv('edutrace_submissions.csv', [
      ['Submission ID', 'Institution', 'Academic year', 'Records', 'Valid', 'Corrections', 'Submitted', 'Status', 'Reviewer', 'Last updated'],
      ...filtered.map((row) => [
        row.id,
        lookups.institutionName(row.institutionId),
        row.academicYear,
        row.recordCount,
        row.validRecords,
        row.correctionRecords,
        row.submittedAt,
        row.status,
        row.reviewer ?? '',
        row.lastUpdated,
      ]),
    ]);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={showInstitution ? 'Submission management' : 'Submissions'}
        description={
          showInstitution
            ? 'Institutional batches submitted for validation and review. Open a submission to inspect validation results and record a decision with reasons.'
            : 'Batches submitted by your institution. Track review status, respond to correction requests and resubmit.'
        }
        meta={
          <>
            <Badge variant="outline">{formatNumber(submissions.length)} batch(es)</Badge>
            <Badge variant="warning">{formatNumber(awaiting)} awaiting review</Badge>
            <Badge variant="critical">{formatNumber(corrections)} correction request(s)</Badge>
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
              <Download className="size-4" aria-hidden /> Export CSV
            </Button>
            {!showInstitution && (
              <Button asChild size="sm">
                <Link to="/institution/upload">
                  <Send className="size-4" aria-hidden /> New upload
                </Link>
              </Button>
            )}
          </>
        }
      />

      <StatGrid>
        <StatCard label="Total batches" value={formatNumber(submissions.length)} icon={ClipboardList} />
        <StatCard label="Awaiting review" value={formatNumber(awaiting)} icon={ClipboardList} tone="warning" hint="Submitted, resubmitted, validating or under review" />
        <StatCard label="Correction required" value={formatNumber(corrections)} icon={FileWarning} tone="critical" />
        <StatCard
          label="Accepted (demo)"
          value={formatNumber(submissions.filter((submission) => submission.status === 'Accepted').length)}
          icon={ClipboardList}
          tone="success"
          hint="Demonstration acceptance only — not official AICTE acceptance"
        />
      </StatGrid>

      <Panel bodyClassName="p-0">
        <div className="border-b border-border p-3">
          <SearchAndFilters
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              pagination.setPage(1);
            }}
            searchPlaceholder="Search submission id or file name…"
            filters={[
              {
                key: 'status',
                label: 'Status',
                value: status,
                onChange: (value) => {
                  setStatus(value);
                  pagination.setPage(1);
                },
                className: 'min-w-[12rem]',
                options: [
                  { value: ALL, label: 'All statuses' },
                  ...SUBMISSION_STATUSES.map((option) => ({ value: option, label: option })),
                ],
              },
              {
                key: 'year',
                label: 'Academic year',
                value: year,
                onChange: (value) => {
                  setYear(value);
                  pagination.setPage(1);
                },
                options: [
                  { value: ALL, label: 'All years' },
                  ...Array.from(new Set(submissions.map((submission) => submission.academicYear)))
                    .sort()
                    .map((option) => ({ value: option, label: option })),
                ],
              },
            ]}
            onReset={() => {
              setSearch('');
              setStatus(ALL);
              setYear(ALL);
              pagination.setPage(1);
            }}
            resultLabel={`${formatNumber(filtered.length)} batch(es) match the current filters.`}
          />
        </div>
        <DataTable
          rows={pagination.pageItems}
          columns={columns}
          rowKey={(row) => row.id}
          caption="Institutional submissions"
          emptyTitle="No submissions match"
          emptyDescription="Adjust the filters. New batches appear after a CSV upload is confirmed."
          footer={
            filtered.length > 0 ? (
              <Pagination
                page={pagination.page}
                pageCount={pagination.pageCount}
                rangeStart={pagination.rangeStart}
                rangeEnd={pagination.rangeEnd}
                total={pagination.total}
                onPageChange={pagination.setPage}
              />
            ) : null
          }
        />
      </Panel>

      <p className="text-2xs leading-relaxed text-muted-foreground">
        Acceptance recorded in this demonstration is not official AICTE acceptance. Production
        decisions must be made in the Django backend by an authorized reviewer.
      </p>
    </div>
  );
}

export function InstitutionSubmissionsPage() {
  const { submissions } = useInstitutionData();
  return <SubmissionsView submissions={submissions} showInstitution={false} basePath="/institution/submissions" />;
}

export function AdminSubmissionsPage() {
  const { data } = useAdminData();
  return <SubmissionsView submissions={data.submissions} showInstitution basePath="/admin/submissions" />;
}

interface DetailProps {
  submission: Submission;
  institutionName: string;
  backPath: string;
  relatedIssues: ReturnType<typeof useAdminData>['data']['issues'];
  auditSummary: string;
  admin: boolean;
  onReview?: (decision: 'accept' | 'reject' | 'request_correction', reason: string) => void;
  onResubmit?: (note: string) => void;
  canAct: boolean;
}

function SubmissionDetailView({
  submission,
  institutionName,
  backPath,
  relatedIssues,
  admin,
  onReview,
  onResubmit,
  canAct,
}: DetailProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [resubmitOpen, setResubmitOpen] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [noteError, setNoteError] = React.useState<string | null>(null);

  const canResubmit =
    !admin && ['Correction Required', 'Rejected'].includes(submission.status) && canAct;
  const canDecide =
    admin &&
    canAct &&
    ['Submitted', 'Resubmitted', 'Under Review', 'Validation in Progress'].includes(submission.status);

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Submission ${submission.id}`}
        description={`${institutionName} · ${submission.academicYear} · submitted ${formatDateTime(submission.submittedAt)}`}
        meta={
          <>
            <SubmissionStatusBadge status={submission.status} />
            <Badge variant="outline">{formatNumber(submission.recordCount)} rows</Badge>
            <Badge variant={submission.correctionRecords > 0 ? 'warning' : 'success'}>
              {formatNumber(submission.correctionRecords)} correction row(s)
            </Badge>
          </>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to={backPath}>
                <ArrowLeft className="size-4" aria-hidden /> Back
              </Link>
            </Button>
            {canResubmit && (
              <Button size="sm" onClick={() => setResubmitOpen(true)}>
                <Send className="size-4" aria-hidden /> Resubmit batch
              </Button>
            )}
            {canDecide && (
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                Record decision
              </Button>
            )}
          </>
        }
      />

      {submission.status === 'Accepted' && (
        <Alert tone="success">
          <AlertTitle>Accepted in demonstration mode</AlertTitle>
          <AlertDescription>
            This status was recorded in the demonstration environment. It does not represent official
            AICTE acceptance.
          </AlertDescription>
        </Alert>
      )}

      {submission.status === 'Correction Required' && (
        <Alert tone="critical">
          <AlertTitle>Correction requested</AlertTitle>
          <AlertDescription>
            The reviewing authority has requested corrections. Review the comments, correct the
            affected records, then resubmit the batch.
          </AlertDescription>
        </Alert>
      )}

      <StatGrid>
        <StatCard label="Rows submitted" value={formatNumber(submission.recordCount)} />
        <StatCard label="Valid records" value={formatNumber(submission.validRecords)} tone="success" />
        <StatCard label="Requiring correction" value={formatNumber(submission.correctionRecords)} tone={submission.correctionRecords > 0 ? 'critical' : 'neutral'} />
        <StatCard label="Duplicate candidates" value={formatNumber(submission.duplicateCandidates)} tone="warning" />
      </StatGrid>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <Panel title="Batch details">
            <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
              <div>
                <dt className="data-label">File</dt>
                <dd className="mt-0.5 break-all font-mono text-2xs text-foreground">{submission.file.name}</dd>
                <dd className="text-2xs text-muted-foreground">{formatBytes(submission.file.sizeBytes)}</dd>
              </div>
              <div>
                <dt className="data-label">Academic year</dt>
                <dd className="mt-0.5 text-foreground">{submission.academicYear}</dd>
              </div>
              <div>
                <dt className="data-label">Reviewer</dt>
                <dd className="mt-0.5 text-foreground">{submission.reviewer ?? 'Unassigned'}</dd>
              </div>
              <div>
                <dt className="data-label">Last updated</dt>
                <dd className="mt-0.5 text-foreground">{formatDateTime(submission.lastUpdated)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Validation results" description="Issues created from the rows in this batch." bodyClassName="p-0">
            {relatedIssues.length === 0 ? (
              <div className="p-4">
                <EmptyState title="No validation issues for this batch" description="All submitted rows passed the blocking rules." />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {relatedIssues.map((issue) => (
                  <li key={issue.id} className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-2xs text-muted-foreground">{issue.id}</span>
                      <SeverityBadge severity={issue.severity} />
                      <IssueStatusBadge status={issue.status} />
                      <span className="ml-auto font-mono text-2xs text-muted-foreground">{issue.recordRef}</span>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-foreground">{issue.ruleName}</p>
                    <p className="text-2xs text-muted-foreground">{issue.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Reviewer comments" bodyClassName="p-0">
            {submission.comments.length === 0 ? (
              <p className="px-4 py-3 text-xs text-muted-foreground">
                No comments have been recorded for this submission.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {submission.comments.map((comment) => (
                  <li key={comment.id} className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-medium text-foreground">{comment.author}</p>
                      <span className="text-2xs text-muted-foreground">{formatDateTime(comment.at)}</span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-foreground/90">{comment.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Status timeline">
            <SubmissionStatusTimeline submission={submission} />
          </Panel>
          <Panel title="Actions">
            {canDecide ? (
              <div className="space-y-2">
                <p className="text-2xs text-muted-foreground">
                  Record a decision with a reason. The institution is notified and the decision is
                  audited.
                </p>
                <Button size="sm" className="w-full" onClick={() => setDialogOpen(true)}>
                  Accept / request correction / reject
                </Button>
              </div>
            ) : canResubmit ? (
              <div className="space-y-2">
                <p className="text-2xs text-muted-foreground">
                  Correct the affected records in the registry, then resubmit this batch for review.
                </p>
                <Button size="sm" className="w-full" onClick={() => setResubmitOpen(true)}>
                  Resubmit batch
                </Button>
              </div>
            ) : (
              <p className="text-2xs leading-relaxed text-muted-foreground">
                {admin
                  ? 'No review action is available for this status, or your role cannot make decisions.'
                  : 'No action is required from your institution for this submission.'}
              </p>
            )}
            <div className="mt-2 rounded border border-border bg-muted/40 px-2 py-1.5 text-2xs text-muted-foreground">
              Demonstration actions are local. Production review decisions must be performed by an
              authorized backend process.
            </div>
          </Panel>
        </div>
      </div>

      {admin && (
        <DecisionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={`Record decision for ${submission.id}`}
          description="Select the outcome and provide a reason. The reason is stored in the audit history and shared with the institution."
          options={[
            { value: 'accept', label: 'Accept batch (demonstration)', description: 'Marks the batch Accepted in the demonstration environment.', tone: 'success' },
            { value: 'request_correction', label: 'Request correction', description: 'Returns the batch for institutional correction with your reason.', tone: 'warning' },
            { value: 'reject', label: 'Reject with reason', description: 'Rejects the batch. The reason is required and audited.', tone: 'critical' },
          ]}
          onSubmit={(value, reason) => {
            onReview?.(value as 'accept' | 'reject' | 'request_correction', reason);
            setDialogOpen(false);
          }}
        />
      )}

      <Dialog open={resubmitOpen} onOpenChange={setResubmitOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Resubmit {submission.id}</DialogTitle>
            <DialogDescription>
              Describe the corrections made. The batch returns to the review queue with your note in
              the audit history.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="resubmit-note" className="mb-1 block">
              Correction summary <span className="text-critical">*</span>
            </Label>
            <Textarea
              id="resubmit-note"
              rows={3}
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
                setNoteError(null);
              }}
              placeholder="e.g. Corrected six enrolment statuses and removed two duplicated APAAR identifiers."
            />
            {noteError && (
              <p role="alert" className="mt-1 text-2xs text-critical">
                {noteError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setResubmitOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (note.trim().length < 10) {
                  setNoteError('Provide at least 10 characters describing the corrections.');
                  return;
                }
                onResubmit?.(note.trim());
                setResubmitOpen(false);
                setNote('');
              }}
            >
              Resubmit batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function InstitutionSubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { submissions, institution, actions, data } = useInstitutionData();
  const { can } = useAuth();
  const submission = submissions.find((candidate) => candidate.id === id);

  if (!submission) {
    return (
      <div className="space-y-3">
        <PageHeader title="Submission" description="The requested batch is not available." />
        <EmptyState
          title="Submission not found"
          description="The batch may belong to another institution."
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/institution/submissions">Back to submissions</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <SubmissionDetailView
      submission={submission}
      institutionName={institution?.name ?? 'Institution'}
      backPath="/institution/submissions"
      relatedIssues={data.issues.filter((issue) => issue.batchId === submission.id)}
      admin={false}
      canAct={can('submissions.resubmit')}
      auditSummary={submission.id}
      onResubmit={(note) => actions.resubmitSubmission(submission.id, note)}
    />
  );
}

export function AdminSubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, actions, institutionsById } = useAdminData();
  const { can } = useAuth();
  const submission = data.submissions.find((candidate) => candidate.id === id);

  if (!submission) {
    return (
      <div className="space-y-3">
        <PageHeader title="Submission" description="The requested batch is not available." />
        <EmptyState
          title="Submission not found"
          description="Check the submission identifier."
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/submissions">Back to submissions</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <SubmissionDetailView
      submission={submission}
      institutionName={institutionsById.get(submission.institutionId)?.name ?? 'Institution'}
      backPath="/admin/submissions"
      relatedIssues={data.issues.filter((issue) => issue.batchId === submission.id)}
      admin
      canAct={can('admin.submissions')}
      auditSummary={submission.id}
      onReview={(decision, reason) => actions.reviewSubmission(submission.id, decision, reason)}
    />
  );
}
