import * as React from 'react';
import { Link } from 'react-router-dom';
import { Download, GitCompareArrows, WalletCards } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { Panel } from '@/components/shared/Panel';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { SearchAndFilters } from '@/components/shared/SearchAndFilters';
import { Pagination } from '@/components/shared/Pagination';
import { SimulationNotice } from '@/components/shared/DemoNotice';
import { ConfirmDialog } from '@/components/shared/Dialogs';
import { ApaarStatusBadge, EnrolmentStatusBadge, ReferenceStatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/States';
import { useInstitutionData, useLookups, usePagination } from '@/hooks/useScopeData';
import { useAuth } from '@/lib/auth/AuthProvider';
import { downloadCsv, formatDate, formatNumber, maskIdentifier } from '@/lib/format';
import { APAAR_STATUSES, APAAR_STATUS_META, type Student } from '@/types';

const ALL = 'all';

export function ApaarStatusPage() {
  const { institution, courses, students, apaar, duplicates, actions } = useInstitutionData();
  const { can } = useAuth();
  const lookups = useLookups();

  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState(ALL);
  const [courseId, setCourseId] = React.useState(ALL);
  const [year, setYear] = React.useState(ALL);
  const [busy, setBusy] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const idsRecorded = students.filter((student) => Boolean(student.apaarId)).length;
  const pendingForSubmission = students.filter((student) => student.apaarStatus === 'Pending');

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) => {
      if (query) {
        const haystack = `${student.name} ${student.regNumber} ${student.recordId} ${student.apaarId ?? ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (status !== ALL && student.apaarStatus !== status) return false;
      if (courseId !== ALL && student.courseId !== courseId) return false;
      if (year !== ALL && student.academicYear !== year) return false;
      return true;
    });
  }, [students, search, status, courseId, year]);

  const pagination = usePagination(filtered, 12);

  const handleExport = () => {
    downloadCsv(
      `${institution?.shortCode ?? 'institution'}_apaar_status.csv`,
      [
        ['Record ID', 'Registration number', 'Student name', 'Course', 'Academic year', 'APAAR (masked)', 'APAAR status', 'Verification meaning'],
        ...filtered.map((student) => [
          student.recordId,
          student.regNumber,
          student.name,
          lookups.courseCode(student.courseId),
          student.academicYear,
          maskIdentifier(student.apaarId),
          student.apaarStatus,
          APAAR_STATUS_META[student.apaarStatus].description,
        ]),
      ],
    );
  };

  const columns: Column<Student>[] = [
    {
      key: 'record',
      header: 'Record',
      sortValue: (row) => row.recordId,
      cell: (row) => (
        <Link
          to={`/institution/students/${row.id}`}
          className="font-mono text-2xs font-medium text-secondary hover:underline"
        >
          {row.recordId}
        </Link>
      ),
    },
    {
      key: 'name',
      header: 'Student',
      sortValue: (row) => row.name,
      cell: (row) => (
        <div>
          <p className="text-xs font-medium text-foreground">{row.name}</p>
          <p className="font-mono text-2xs text-muted-foreground">{row.regNumber}</p>
        </div>
      ),
    },
    {
      key: 'course',
      header: 'Course',
      hideBelow: 'md',
      sortValue: (row) => lookups.courseCode(row.courseId),
      cell: (row) => (
        <div>
          <p className="text-xs">{lookups.courseName(row.courseId)}</p>
          <p className="text-2xs text-muted-foreground">{row.academicYear}</p>
        </div>
      ),
    },
    {
      key: 'enrolment',
      header: 'Enrolment',
      hideBelow: 'lg',
      cell: (row) => <EnrolmentStatusBadge status={row.enrolmentStatus} />,
    },
    {
      key: 'apaar',
      header: 'APAAR ID (masked)',
      cell: (row) => (
        <span className="font-mono text-2xs text-muted-foreground">{maskIdentifier(row.apaarId)}</span>
      ),
    },
    {
      key: 'status',
      header: 'APAAR status',
      sortValue: (row) => row.apaarStatus,
      cell: (row) => (
        <div>
          <ApaarStatusBadge status={row.apaarStatus} />
          <p className="mt-0.5 max-w-[16rem] text-2xs leading-snug text-muted-foreground">
            {APAAR_STATUS_META[row.apaarStatus].description}
          </p>
        </div>
      ),
    },
    {
      key: 'updated',
      header: 'Last updated',
      hideBelow: 'xl',
      sortValue: (row) => row.lastUpdated,
      cell: (row) => <span className="text-2xs text-muted-foreground">{formatDate(row.lastUpdated)}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="APAAR status"
        description="Identifier coverage and simulated verification status for your institution. Counts are derived from student records; verification is never inferred from identifier format."
        meta={
          <>
            <Badge variant="outline">{formatNumber(students.length)} records</Badge>
            <Badge variant="warning">Simulated verification</Badge>
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
              <Download className="size-4" aria-hidden /> Export CSV
            </Button>
            {can('students.write') && (
              <Button
                size="sm"
                onClick={() => setConfirmOpen(true)}
                disabled={pendingForSubmission.length === 0}
              >
                <WalletCards className="size-4" aria-hidden /> Simulate verification request
              </Button>
            )}
          </>
        }
      />

      <SimulationNotice>
        Demo mode: APAAR/ABC verification is simulated. No live government verification has been
        performed, and identifiers in this dataset are synthetic. A valid-looking identifier is never
        displayed as verified without an authorized-source response.
      </SimulationNotice>

      <StatGrid className="xl:grid-cols-4">
        <StatCard label="Total records" value={formatNumber(students.length)} icon={WalletCards} hint="All records for this institution" />
        <StatCard label="IDs recorded" value={formatNumber(idsRecorded)} icon={WalletCards} tone="info" hint="Any identifier value present, regardless of status" />
        <StatCard label="Verification pending" value={formatNumber(apaar.Pending + apaar['Submitted for Verification'])} icon={WalletCards} tone="warning" hint="Pending or submitted to the simulated adapter" />
        <StatCard label="Verified by authorized source" value={formatNumber(apaar['Verified by Authorized Source'])} icon={WalletCards} tone="success" hint="Simulated adapter response only" />
        <StatCard label="Verification failed" value={formatNumber(apaar['Verification Failed'])} icon={WalletCards} tone="critical" hint="Mismatch reported by the simulated adapter" />
        <StatCard label="IDs missing" value={formatNumber(apaar['Not Provided'])} icon={WalletCards} tone="warning" hint="No identifier recorded — never auto-generated" />
        <StatCard label="Verification unavailable" value={formatNumber(apaar['Verification Unavailable'])} icon={WalletCards} tone="warning" hint="Adapter could not be reached on the last attempt" />
        <StatCard label="Correction required" value={formatNumber(apaar['Correction Required'])} icon={WalletCards} tone="critical" hint="Conflicting data requires institutional correction" />
      </StatGrid>

      <Panel
        title="Records and identifier status"
        description="Filter by status, course or academic year. Identifiers are masked; full values are not displayed in list views."
        bodyClassName="p-0"
      >
        <div className="border-b border-border p-3">
          <SearchAndFilters
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              pagination.setPage(1);
            }}
            searchPlaceholder="Search name, registration number or identifier…"
            filters={[
              {
                key: 'status',
                label: 'APAAR status',
                value: status,
                onChange: (value) => {
                  setStatus(value);
                  pagination.setPage(1);
                },
                className: 'min-w-[12rem]',
                options: [
                  { value: ALL, label: 'All APAAR statuses' },
                  ...APAAR_STATUSES.map((option) => ({ value: option, label: option })),
                ],
              },
              {
                key: 'course',
                label: 'Course',
                value: courseId,
                onChange: (value) => {
                  setCourseId(value);
                  pagination.setPage(1);
                },
                options: [
                  { value: ALL, label: 'All courses' },
                  ...courses.map((course) => ({ value: course.id, label: course.code })),
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
                  ...Array.from(new Set(students.map((student) => student.academicYear)))
                    .sort()
                    .map((option) => ({ value: option, label: option })),
                ],
              },
            ]}
            onReset={() => {
              setSearch('');
              setStatus(ALL);
              setCourseId(ALL);
              setYear(ALL);
              pagination.setPage(1);
            }}
            resultLabel={`${formatNumber(filtered.length)} record(s) match the current filters.`}
          />
        </div>
        <DataTable
          rows={pagination.pageItems}
          columns={columns}
          rowKey={(row) => row.id}
          caption="APAAR identifier status"
          emptyTitle="No records match"
          emptyDescription="Adjust the filters to review identifier status."
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

      <Panel
        title="Duplicate identifier candidates"
        description="Derived from repeated identifiers or registration numbers. Candidates are not proof of fraud and require review."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/institution/validation-issues">Open validation issues</Link>
          </Button>
        }
      >
        {duplicates.length === 0 ? (
          <EmptyState title="No duplicate candidates" description="No repeated identifier or registration number was detected." />
        ) : (
          <ul className="space-y-2">
            {duplicates.map((candidate) => (
              <li key={candidate.key} className="rounded border border-border px-3 py-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <GitCompareArrows className="size-3.5 text-critical" aria-hidden />
                  <p className="text-xs font-medium text-foreground">{candidate.label}</p>
                  <Badge variant={candidate.review?.status.startsWith('Resolved') ? 'success' : 'warning'}>
                    {candidate.review?.status ?? 'Open'}
                  </Badge>
                  <span className="ml-auto text-2xs text-muted-foreground">
                    {candidate.students.length} record(s)
                  </span>
                </div>
                <p className="mt-1 text-2xs text-muted-foreground">{candidate.evidence}</p>
                <ul className="mt-1.5 space-y-0.5">
                  {candidate.students.map((student) => (
                    <li key={student.id} className="flex flex-wrap items-center gap-1.5 text-2xs">
                      <Link
                        to={`/institution/students/${student.id}`}
                        className="font-mono text-secondary hover:underline"
                      >
                        {student.recordId}
                      </Link>
                      <span className="text-foreground">
                        {student.institutionId === institution?.id
                          ? student.name
                          : `Record held by ${lookups.institutionName(student.institutionId)}`}
                      </span>
                      <span className="text-muted-foreground">
                        {lookups.courseCode(student.courseId)} · {student.academicYear}
                      </span>
                    </li>
                  ))}
                </ul>
                {candidate.review?.reason && (
                  <p className="mt-1 text-2xs text-muted-foreground">
                    Review note: {candidate.review.reason}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Verification adapter" description="The frontend never generates identifiers or contacts an unauthorized endpoint.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded border border-border px-2.5 py-2">
            <p className="data-label">Adapter state</p>
            <div className="mt-1"><Badge variant="warning">Simulated</Badge></div>
          </div>
          <div className="rounded border border-border px-2.5 py-2">
            <p className="data-label">Boundary</p>
            <p className="mt-1 font-mono text-2xs text-foreground">src/lib/apaar/adapter.ts</p>
          </div>
          <div className="rounded border border-border px-2.5 py-2">
            <p className="data-label">Verification source</p>
            <p className="mt-1 text-2xs text-foreground">No authorized endpoint configured</p>
          </div>
        </div>
        <p className="mt-2 text-2xs leading-relaxed text-muted-foreground">
          Production integration requires an authorized APAAR/ABC endpoint and credentials.
          Institutions may record identifiers, but only an authorized adapter response may set an
          identifier to “Verified by Authorized Source”.
        </p>
      </Panel>

      <Panel title="Course reference status" description="Reference verification status affects identifier and intake conclusions." bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {courses.map((course) => (
            <li key={course.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <span className="font-mono text-2xs text-muted-foreground">{course.code}</span>
              <span className="text-xs text-foreground">{course.name}</span>
              <span className="ml-auto"><ReferenceStatusBadge status={course.verificationStatus} /></span>
              <span className="text-2xs text-muted-foreground">
                Last verified {course.lastVerifiedDate ? formatDate(course.lastVerifiedDate) : 'never'}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Simulate verification for ${pendingForSubmission.length} identifier(s)?`}
        description="This demonstration action marks pending identifiers as Submitted for Verification. No government service is contacted and no identifier becomes verified."
        confirmLabel={busy ? 'Submitting…' : 'Submit simulated request'}
        busy={busy}
        onConfirm={() => {
          setBusy(true);
          actions.simulateApaarVerification(pendingForSubmission.map((student) => student.id));
          setBusy(false);
          setConfirmOpen(false);
        }}
      />
    </div>
  );
}
