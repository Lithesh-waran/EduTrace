import * as React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Sigma } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageHeader } from '@/components/shared/PageHeader';
import { Panel } from '@/components/shared/Panel';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { SearchAndFilters } from '@/components/shared/SearchAndFilters';
import {
  ComplianceStatusBadge,
  EnrolmentStatusBadge,
  ReferenceStatusBadge,
} from '@/components/shared/StatusBadge';
import { useInstitutionData, useLookups } from '@/hooks/useScopeData';
import { alertKey, type IntakeComplianceRow } from '@/lib/demo/analytics';
import { formatDate, formatNumber } from '@/lib/format';
import type { Student } from '@/types';

const ALL = 'all';

export function IntakeCompliancePage() {
  const { institution, courses, students, compliance, data } = useInstitutionData();
  const lookups = useLookups();

  const [year, setYear] = React.useState(ALL);
  const [courseId, setCourseId] = React.useState(ALL);
  const [status, setStatus] = React.useState(ALL);
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState<IntakeComplianceRow | null>(null);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return compliance
      .filter((row) => (year === ALL ? true : row.academicYear === year))
      .filter((row) => (courseId === ALL ? true : row.courseId === courseId))
      .filter((row) => (status === ALL ? true : row.status === status))
      .filter((row) =>
        needle ? `${row.courseName} ${row.courseCode}`.toLowerCase().includes(needle) : true,
      )
      .sort((a, b) => {
        if (a.status === 'Potential excess' && b.status !== 'Potential excess') return -1;
        if (b.status === 'Potential excess' && a.status !== 'Potential excess') return 1;
        return `${a.courseCode}${a.academicYear}`.localeCompare(`${b.courseCode}${b.academicYear}`);
      });
  }, [compliance, year, courseId, status, query]);

  const excessRows = compliance.filter((row) => row.status === 'Potential excess');
  const unverifiedRows = compliance.filter((row) => row.status === 'Reference data unverified');

  const review = selected
    ? data.alertReviews[alertKey(selected.institutionId, selected.courseId, selected.academicYear)]
    : undefined;

  const cohortStudents = selected
    ? students.filter(
        (student) =>
          student.courseId === selected.courseId && student.academicYear === selected.academicYear,
      )
    : [];

  const columns: Column<IntakeComplianceRow>[] = [
    {
      key: 'course',
      header: 'Course',
      sortValue: (row) => row.courseCode,
      cell: (row) => (
        <div className="min-w-[11rem]">
          <p className="text-xs font-medium text-foreground">{row.courseName}</p>
          <p className="font-mono text-2xs text-muted-foreground">
            {row.courseCode} · {row.academicYear}
          </p>
        </div>
      ),
    },
    { key: 'approved', header: 'Approved', align: 'right', sortValue: (row) => row.approvedIntake, cell: (row) => formatNumber(row.approvedIntake) },
    { key: 'active', header: 'Active', align: 'right', sortValue: (row) => row.activeEnrolment, cell: (row) => formatNumber(row.activeEnrolment) },
    { key: 'pending', header: 'Pending', align: 'right', hideBelow: 'md', cell: (row) => formatNumber(row.pendingRecords) },
    { key: 'withdrawn', header: 'Withdrawn', align: 'right', hideBelow: 'lg', cell: (row) => formatNumber(row.withdrawnRecords) },
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
      hideBelow: 'sm',
      sortValue: (row) => row.referenceStatus,
      cell: (row) => <ReferenceStatusBadge status={row.referenceStatus} />,
    },
    {
      key: 'status',
      header: 'Compliance',
      cell: (row) => <ComplianceStatusBadge status={row.status} />,
    },
    {
      key: 'review',
      header: 'Review status',
      hideBelow: 'xl',
      cell: (row) => (
        <span className="text-2xs text-muted-foreground">{row.reviewStatus ?? 'Not raised'}</span>
      ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      cell: (row) => (
        <Button size="xs" variant="outline" onClick={() => setSelected(row)}>
          Records
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Intake compliance"
        description="Compares verified active enrolment with the approved intake reference for the same institution, course and academic year. A potential excess is a review signal, not a legal finding."
        meta={
          <>
            <Badge variant="outline">{institution?.shortCode}</Badge>
            <Badge variant="warning">Reference data may be unverified</Badge>
          </>
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/institution/courses">View approved intake sources</Link>
          </Button>
        }
      />

      <StatGrid>
        <StatCard label="Cohorts assessed" value={formatNumber(compliance.length)} icon={Activity} hint="Course and academic-year combinations" />
        <StatCard
          label="Within configured limit"
          value={formatNumber(compliance.filter((row) => row.status === 'Within configured limit').length)}
          icon={Activity}
          tone="success"
          hint="Active enrolment at or below verified intake"
        />
        <StatCard
          label="Potential excess"
          value={formatNumber(excessRows.length)}
          icon={Activity}
          tone="critical"
          hint="Requires review of the underlying records"
        />
        <StatCard
          label="Reference unverified"
          value={formatNumber(unverifiedRows.length)}
          icon={Activity}
          tone="warning"
          hint="Compliance is not concluded for these cohorts"
        />
      </StatGrid>

      {excessRows.length > 0 && (
        <Alert tone="critical">
          <AlertTitle>Review required — potential intake excess</AlertTitle>
          <AlertDescription>
            {excessRows.length} cohort(s) show active enrolment above the approved intake reference.
            {excessRows.map((row) => (
              <span key={row.key} className="mt-1 block">
                {row.courseName} ({row.academicYear}): {formatNumber(row.activeEnrolment)} active vs{' '}
                {formatNumber(row.approvedIntake)} approved → potential excess of{' '}
                {formatNumber(row.excess)}.
              </span>
            ))}
            Records are not rejected or deleted automatically. Confirm whether the intake reference or
            the enrolment data is incorrect before any action.
          </AlertDescription>
        </Alert>
      )}

      {unverifiedRows.length > 0 && (
        <Alert tone="warning">
          <AlertTitle>Approved intake reference unverified</AlertTitle>
          <AlertDescription>
            {unverifiedRows.length} cohort(s) use reference data that AICTE has not verified.
            Compliance conclusions are suppressed for these rows until the reference is confirmed.
          </AlertDescription>
        </Alert>
      )}

      <Panel bodyClassName="p-0">
        <div className="border-b border-border p-3">
          <SearchAndFilters
            search={query}
            onSearchChange={setQuery}
            searchLabel="Search cohorts"
            searchPlaceholder="Search course name or code"
            filters={[
              {
                key: 'year',
                label: 'Academic year',
                value: year,
                onChange: setYear,
                options: [
                  { value: ALL, label: 'All years' },
                  ...Array.from(new Set(compliance.map((row) => row.academicYear)))
                    .sort()
                    .map((option) => ({ value: option, label: option })),
                ],
              },
              {
                key: 'course',
                label: 'Course',
                value: courseId,
                onChange: setCourseId,
                options: [
                  { value: ALL, label: 'All courses' },
                  ...courses.map((course) => ({ value: course.id, label: course.code })),
                ],
              },
              {
                key: 'status',
                label: 'Compliance status',
                value: status,
                onChange: setStatus,
                className: 'min-w-[12rem]',
                options: [
                  { value: ALL, label: 'All statuses' },
                  { value: 'Within configured limit', label: 'Within configured limit' },
                  { value: 'Potential excess', label: 'Potential excess' },
                  { value: 'Reference data unverified', label: 'Reference data unverified' },
                ],
              },
            ]}
            onReset={() => {
              setYear(ALL);
              setCourseId(ALL);
              setStatus(ALL);
              setQuery('');
            }}
            resultLabel={`${filtered.length} cohort(s) match the current filters.`}
          />
        </div>
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(row) => row.key}
          onRowClick={(row) => setSelected(row)}
          caption="Intake compliance by course and academic year"
          emptyTitle="No cohorts match"
          emptyDescription="Adjust the filters to review compliance for other courses or years."
        />
      </Panel>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selected.courseName} · {selected.academicYear}
                </DialogTitle>
                <DialogDescription>
                  {institution?.name} · {lookups.courseCode(selected.courseId)}. Calculation uses
                  active enrolment only; pending and withdrawn records are shown separately.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
                <div className="space-y-3">
                  <div className="rounded border border-border">
                    <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
                      <Sigma className="size-3.5 text-secondary" aria-hidden />
                      <p className="text-xs font-semibold text-foreground">Calculation</p>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 text-xs">
                      <dt className="text-muted-foreground">Approved intake</dt>
                      <dd className="text-right font-medium">{formatNumber(selected.approvedIntake)}</dd>
                      <dt className="text-muted-foreground">Verified active enrolment</dt>
                      <dd className="text-right font-medium">{formatNumber(selected.activeEnrolment)}</dd>
                      <dt className="text-muted-foreground">Pending verification records</dt>
                      <dd className="text-right">{formatNumber(selected.pendingRecords)}</dd>
                      <dt className="text-muted-foreground">Withdrawn / transferred</dt>
                      <dd className="text-right">{formatNumber(selected.withdrawnRecords)}</dd>
                      <dt className="border-t border-border pt-2 font-medium text-foreground">Potential excess</dt>
                      <dd className="border-t border-border pt-2 text-right font-semibold text-critical">
                        {formatNumber(selected.excess)}
                      </dd>
                    </dl>
                    <p className="border-t border-border px-3 py-2 text-2xs text-muted-foreground">
                      {selected.activeEnrolment} active − {selected.approvedIntake} approved ={' '}
                      {selected.excess > 0 ? `+${selected.excess}` : '0'} (not below zero).
                    </p>
                  </div>

                  <div className="rounded border border-border px-3 py-2 text-2xs">
                    <p className="text-xs font-semibold text-foreground">Underlying records</p>
                    <p className="mb-1 text-muted-foreground">
                      {cohortStudents.length} record(s) in this cohort. Status determines whether a
                      record counts toward active enrolment.
                    </p>
                    <div className="max-h-52 overflow-y-auto scrollbar-thin">
                      <table className="w-full text-2xs">
                        <thead className="bg-muted/60">
                          <tr>
                            <th scope="col" className="px-2 py-1 text-left font-semibold uppercase tracking-wide text-muted-foreground">Registration</th>
                            <th scope="col" className="px-2 py-1 text-left font-semibold uppercase tracking-wide text-muted-foreground">Student</th>
                            <th scope="col" className="px-2 py-1 text-left font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cohortStudents.map((student: Student) => (
                            <tr key={student.id} className="border-t border-border">
                              <td className="px-2 py-1 font-mono">{student.regNumber}</td>
                              <td className="px-2 py-1">{student.name}</td>
                              <td className="px-2 py-1"><EnrolmentStatusBadge status={student.enrolmentStatus} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded border border-border px-3 py-2 text-2xs">
                    <p className="data-label">Reference verification</p>
                    <div className="mt-1"><ReferenceStatusBadge status={selected.referenceStatus} /></div>
                    <p className="mt-2 text-muted-foreground">
                      Approval reference: <span className="font-mono text-foreground">{selected.approvalRef}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Last verified: {selected.lastVerifiedDate ? formatDate(selected.lastVerifiedDate) : 'never'}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Additional seat categories:{' '}
                      {selected.additionalSeatCategories.length > 0
                        ? selected.additionalSeatCategories.join(', ')
                        : 'none configured'}
                    </p>
                  </div>
                  <div className="rounded border border-border px-3 py-2 text-2xs">
                    <p className="data-label">Compliance status</p>
                    <div className="mt-1"><ComplianceStatusBadge status={selected.status} /></div>
                    <p className="mt-2 text-muted-foreground">
                      Review status: <span className="font-medium text-foreground">{selected.reviewStatus ?? 'Not raised for review'}</span>
                    </p>
                    {review?.actions.map((action, index) => (
                      <p key={`${action.at}-${index}`} className="mt-1 border-t border-border pt-1 text-muted-foreground">
                        <span className="font-medium text-foreground">{action.action}</span> · {formatDate(action.at)}
                        <br />
                        {action.reason}
                      </p>
                    ))}
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link to={`/institution/students?course=${selected.courseId}&year=${selected.academicYear}`}>
                      Open cohort in registry
                    </Link>
                  </Button>
                </div>
              </div>

              <p className="rounded border border-border bg-muted/40 px-3 py-2 text-2xs leading-relaxed text-muted-foreground">
                This comparison is advisory. It does not reject students, delete records or determine
                legal violations. An authorized AICTE reviewer must record a decision with reasons.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Panel title="How compliance is determined" description="Deterministic rules applied to the current data source.">
        <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">
          <li>Active enrolment counts records with enrolment status <strong>Active</strong> only.</li>
          <li>Pending-verification, withdrawn and transferred records are excluded and shown separately.</li>
          <li>Approved intake is taken from the authoritative reference for the same course and year.</li>
          <li>When the reference is unverified, excess is not calculated and compliance is not concluded.</li>
          <li>Additional seat categories are displayed but never used to silently raise the limit.</li>
        </ul>
      </Panel>
    </div>
  );
}
