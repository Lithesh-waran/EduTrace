import * as React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Sigma } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageHeader } from '@/components/shared/PageHeader';
import { Panel } from '@/components/shared/Panel';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { SearchAndFilters } from '@/components/shared/SearchAndFilters';
import { DecisionDialog } from '@/components/shared/Dialogs';
import { ReferenceStatusBadge } from '@/components/shared/StatusBadge';
import { useAdminData } from '@/hooks/useScopeData';
import { useAuth } from '@/lib/auth/AuthProvider';
import { alertKey, type IntakeComplianceRow } from '@/lib/demo/analytics';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';
import { ACADEMIC_YEARS, type AlertReviewStatus } from '@/types';

const ALL = 'all';

const DECISION_OPTIONS = [
  {
    value: 'Reference Verification Required',
    label: 'Reference data needs verification',
    description: 'The approved intake reference must be confirmed before the discrepancy can be assessed.',
    tone: 'warning' as const,
  },
  {
    value: 'Correction Required',
    label: 'Correction required',
    description: 'The institution must correct enrolment records that explain the excess.',
    tone: 'warning' as const,
  },
  {
    value: 'Authorized Revision Identified',
    label: 'Authorized revision identified',
    description: 'An approved intake revision explains the comparison. Record it in the reference registry.',
    tone: 'success' as const,
  },
  {
    value: 'Resolved',
    label: 'Discrepancy resolved',
    description: 'Review is complete and no further action is required for this cohort.',
    tone: 'success' as const,
  },
  {
    value: 'Escalated',
    label: 'Escalate for further review',
    description: 'Refer the case for a formal institutional review.',
    tone: 'critical' as const,
  },
];

export function IntakeAlertsPage() {
  const { data, compliance, actions } = useAdminData();
  const { can } = useAuth();
  const [year, setYear] = React.useState(ALL);
  const [institutionId, setInstitutionId] = React.useState(ALL);
  const [reviewState, setReviewState] = React.useState('action');
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState<IntakeComplianceRow | null>(null);
  const [decisionCase, setDecisionCase] = React.useState<IntakeComplianceRow | null>(null);

  const rows = compliance.filter((row) => {
    if (year !== ALL && row.academicYear !== year) return false;
    if (institutionId !== ALL && row.institutionId !== institutionId) return false;
    const needle = query.trim().toLowerCase();
    if (
      needle &&
      !`${row.institutionName} ${row.institutionCode} ${row.courseName} ${row.courseCode}`
        .toLowerCase()
        .includes(needle)
    ) {
      return false;
    }
    const hasAlert =
      row.status === 'Potential excess' ||
      row.referenceStatus === 'Unverified' ||
      Boolean(row.reviewStatus);
    if (reviewState === 'action') {
      return (
        (row.status === 'Potential excess' || row.status === 'Reference data unverified') &&
        row.reviewStatus !== 'Resolved'
      );
    }
    if (reviewState === 'open') return hasAlert && !row.reviewStatus;
    if (reviewState === 'resolved') return row.reviewStatus === 'Resolved';
    if (reviewState === 'all') return hasAlert;
    return true;
  });

  const excessRows = rows.filter((row) => row.status === 'Potential excess');
  const review = selected ? data.alertReviews[alertKey(selected.institutionId, selected.courseId, selected.academicYear)] : undefined;

  const columns: Column<IntakeComplianceRow>[] = [
    {
      key: 'institution',
      header: 'Institution',
      sortValue: (row) => row.institutionCode,
      cell: (row) => (
        <div className="min-w-[10rem]">
          <p className="text-xs font-medium text-foreground">{row.institutionCode}</p>
          <p className="max-w-[15rem] truncate text-2xs text-muted-foreground">{row.institutionName}</p>
        </div>
      ),
    },
    {
      key: 'course',
      header: 'Course',
      sortValue: (row) => row.courseCode,
      cell: (row) => (
        <div>
          <p className="text-xs text-foreground">{row.courseName}</p>
          <p className="font-mono text-2xs text-muted-foreground">
            {row.courseCode} · {row.academicYear}
          </p>
        </div>
      ),
    },
    { key: 'approved', header: 'Approved', align: 'right', sortValue: (row) => row.approvedIntake, cell: (row) => formatNumber(row.approvedIntake) },
    { key: 'active', header: 'Active', align: 'right', sortValue: (row) => row.activeEnrolment, cell: (row) => formatNumber(row.activeEnrolment) },
    {
      key: 'excess',
      header: 'Potential excess',
      align: 'right',
      sortValue: (row) => row.excess,
      cell: (row) => (
        <span className={row.excess > 0 ? 'font-semibold text-critical' : 'text-muted-foreground'}>
          {row.excess > 0 ? `+${formatNumber(row.excess)}` : '0'}
        </span>
      ),
    },
    {
      key: 'reference',
      header: 'Reference',
      sortValue: (row) => row.referenceStatus,
      cell: (row) => <ReferenceStatusBadge status={row.referenceStatus} />,
    },
    {
      key: 'review',
      header: 'Review status',
      sortValue: (row) => row.reviewStatus ?? '',
      cell: (row) => (
        <Badge
          variant={
            !row.reviewStatus
              ? 'muted'
              : row.reviewStatus === 'Resolved'
                ? 'success'
                : row.reviewStatus === 'Escalated'
                  ? 'critical'
                  : 'warning'
          }
        >
          {row.reviewStatus ?? 'Open'}
        </Badge>
      ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      cell: (row) => (
        <Button size="xs" variant="outline" onClick={() => setSelected(row)}>
          Review
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Intake alert review"
        description="Record an administrative decision for cohorts whose active enrolment exceeds verified intake, or whose reference data is unverified. Every decision requires a reason."
        meta={
          <>
            <Badge variant="critical">{excessRows.length} potential excess</Badge>
            <Badge variant="outline">{rows.length} cohort(s) in view</Badge>
          </>
        }
      />

      <Alert tone="warning">
        <AlertTitle className="flex items-center gap-1.5">
          <AlertTriangle className="size-3.5" aria-hidden /> Review signal, not a legal finding
        </AlertTitle>
        <AlertDescription>
          Exceeding a configured intake reference is a potential discrepancy. It does not by itself
          establish a violation, and student records must never be deleted automatically. Confirm the
          reference data and the underlying records before recording a decision.
        </AlertDescription>
      </Alert>

      <Panel bodyClassName="p-0">
        <div className="border-b border-border p-3">
          <SearchAndFilters
            search={query}
            onSearchChange={setQuery}
            searchLabel="Search alerts"
            searchPlaceholder="Search institution or course"
            filters={[
              {
                key: 'state',
                label: 'Alerts shown',
                value: reviewState,
                onChange: setReviewState,
                className: 'min-w-[13rem]',
                options: [
                  { value: 'action', label: 'Action required' },
                  { value: 'open', label: 'Unreviewed' },
                  { value: 'resolved', label: 'Resolved' },
                  { value: 'all', label: 'All alerts' },
                  { value: 'everything', label: 'All cohorts' },
                ],
              },
              {
                key: 'year',
                label: 'Academic year',
                value: year,
                onChange: setYear,
                options: [
                  { value: ALL, label: 'All years' },
                  ...ACADEMIC_YEARS.map((option) => ({ value: option, label: option })),
                ],
              },
              {
                key: 'institution',
                label: 'Institution',
                value: institutionId,
                onChange: setInstitutionId,
                className: 'min-w-[12rem]',
                options: [
                  { value: ALL, label: 'All institutions' },
                  ...data.institutions.map((institution) => ({
                    value: institution.id,
                    label: institution.shortCode,
                  })),
                ],
              },
            ]}
            onReset={() => {
              setReviewState('action');
              setYear(ALL);
              setInstitutionId(ALL);
              setQuery('');
            }}
            resultLabel={`${rows.length} cohort(s) in view. Decisions are written to the audit log with the reviewer identity and reason.`}
          />
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.key}
          onRowClick={(row) => setSelected(row)}
          caption="Intake alerts"
          emptyTitle="No alerts in this view"
          emptyDescription="Change the filters to review other cohorts. Alerts are recalculated whenever reference or enrolment data changes."
        />
      </Panel>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selected.institutionName} · {selected.courseName}
                </DialogTitle>
                <DialogDescription>
                  {selected.courseCode} · {selected.academicYear}. Reference status:{' '}
                  {selected.referenceStatus}.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded border border-border">
                <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
                  <Sigma className="size-3.5 text-secondary" aria-hidden />
                  <p className="text-xs font-semibold text-foreground">Calculation</p>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 p-3 text-xs">
                  <dt className="text-muted-foreground">Approved intake</dt>
                  <dd className="text-right font-medium">{formatNumber(selected.approvedIntake)}</dd>
                  <dt className="text-muted-foreground">Active enrolment</dt>
                  <dd className="text-right font-medium">{formatNumber(selected.activeEnrolment)}</dd>
                  <dt className="text-muted-foreground">Pending verification records</dt>
                  <dd className="text-right">{formatNumber(selected.pendingRecords)}</dd>
                  <dt className="text-muted-foreground">Withdrawn / transferred</dt>
                  <dd className="text-right">{formatNumber(selected.withdrawnRecords)}</dd>
                  <dt className="border-t border-border pt-1.5 font-medium">Potential excess</dt>
                  <dd className="border-t border-border pt-1.5 text-right font-semibold text-critical">
                    {formatNumber(selected.excess)}
                  </dd>
                </dl>
                <p className="border-t border-border px-3 py-2 text-2xs text-muted-foreground">
                  Approval reference {selected.approvalRef} · last verified{' '}
                  {selected.lastVerifiedDate ? formatDate(selected.lastVerifiedDate) : 'never'} ·{' '}
                  {selected.totalRecords} record(s) in the cohort.
                </p>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">Review history</p>
                  <Badge variant={selected.reviewStatus === 'Resolved' ? 'success' : 'warning'}>
                    {selected.reviewStatus ?? 'Open'}
                  </Badge>
                </div>
                {!review || review.actions.length === 0 ? (
                  <p className="rounded border border-border bg-muted/40 px-2.5 py-2 text-2xs text-muted-foreground">
                    No decision has been recorded for this cohort.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {review.actions.map((action, index) => (
                      <li key={`${action.at}-${index}`} className="rounded border border-border px-2.5 py-1.5">
                        <p className="text-2xs font-medium text-foreground">
                          {action.action} · {formatDateTime(action.at)} · {action.actor}
                        </p>
                        <p className="text-2xs text-muted-foreground">{action.reason}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <DialogFooter className="sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/admin/institutions/${selected.institutionId}`}>Open institution</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/admin/approved-intake">Reference registry</Link>
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                    Close
                  </Button>
                  <Button
                    size="sm"
                    disabled={!can('admin.review')}
                    onClick={() => {
                      setDecisionCase(selected);
                      setSelected(null);
                    }}
                  >
                    Record decision
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <DecisionDialog
        open={Boolean(decisionCase)}
        onOpenChange={(open) => !open && setDecisionCase(null)}
        title={`Record decision · ${decisionCase?.institutionCode ?? ''} ${decisionCase?.courseCode ?? ''}`}
        description={
          decisionCase
            ? `${decisionCase.activeEnrolment} active records against ${decisionCase.approvedIntake} approved intake (${decisionCase.academicYear}). ${
                decisionCase.referenceStatus === 'Unverified'
                  ? 'Reference data is unverified, so compliance is not concluded.'
                  : 'Provide the basis for your decision.'
              }`
            : undefined
        }
        options={DECISION_OPTIONS}
        onSubmit={(value, reason) => {
          if (!decisionCase) return;
          actions.reviewIntakeAlert(
            alertKey(decisionCase.institutionId, decisionCase.courseId, decisionCase.academicYear),
            value as AlertReviewStatus,
            reason,
          );
          setDecisionCase(null);
        }}
      />

      <p className="text-2xs leading-relaxed text-muted-foreground">
        Alerts are generated deterministically from approved intake references and active enrolment.
        Resolving an alert records a review outcome; it does not alter any student record or approve an
        intake revision. Intake revisions are recorded separately in the approved intake registry.
      </p>
    </div>
  );
}
