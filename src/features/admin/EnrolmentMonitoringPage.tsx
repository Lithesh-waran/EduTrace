import * as React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { Panel } from '@/components/shared/Panel';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { SearchAndFilters } from '@/components/shared/SearchAndFilters';
import { IntakeComparison } from '@/components/shared/IntakeComparison';
import { VerificationStatusBadge, ReferenceStatusBadge } from '@/components/shared/StatusBadge';
import { useAdminData } from '@/hooks/useScopeData';
import { isOpenIssue } from '@/lib/demo/analytics';
import { downloadCsv, formatNumber } from '@/lib/format';
import { ACADEMIC_YEARS } from '@/types';

const ALL = 'all';

interface MonitoringRow {
  institutionId: string;
  shortCode: string;
  name: string;
  state: string;
  verificationStatus: ReturnType<typeof useAdminData>['data']['institutions'][number]['verificationStatus'];
  approvedIntake: number;
  activeEnrolment: number;
  pending: number;
  excess: number;
  apaarVerified: number;
  missingApaar: number;
  duplicates: number;
  openIssues: number;
  awaitingSubmissions: number;
  unverifiedReferences: number;
}

export function EnrolmentMonitoringPage() {
  const { data, compliance, duplicates, institutionsById } = useAdminData();
  const [year, setYear] = React.useState<string>(ACADEMIC_YEARS[ACADEMIC_YEARS.length - 1]);
  const [state, setState] = React.useState(ALL);
  const [institutionId, setInstitutionId] = React.useState(ALL);
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState<MonitoringRow | null>(null);

  const filteredCompliance = compliance.filter((row) => {
    if (year !== ALL && row.academicYear !== year) return false;
    if (state !== ALL && institutionsById.get(row.institutionId)?.state !== state) return false;
    if (institutionId !== ALL && row.institutionId !== institutionId) return false;
    return true;
  });

  const rows: MonitoringRow[] = Array.from(new Set(filteredCompliance.map((row) => row.institutionId)))
    .map((id) => {
      const institution = institutionsById.get(id);
      const institutionRows = filteredCompliance.filter((row) => row.institutionId === id);
      const cohort = data.students.filter(
        (student) =>
          student.institutionId === id &&
          (year === ALL || student.academicYear === year),
      );
      return {
        institutionId: id,
        shortCode: institution?.shortCode ?? id,
        name: institution?.name ?? 'Unknown',
        state: institution?.state ?? '—',
        verificationStatus: institution?.verificationStatus ?? 'Submitted',
        approvedIntake: institutionRows.reduce((sum, row) => sum + row.approvedIntake, 0),
        activeEnrolment: institutionRows.reduce((sum, row) => sum + row.activeEnrolment, 0),
        pending: institutionRows.reduce((sum, row) => sum + row.pendingRecords, 0),
        excess: institutionRows.reduce((sum, row) => sum + row.excess, 0),
        apaarVerified: cohort.filter((student) => student.apaarStatus === 'Verified by Authorized Source').length,
        missingApaar: cohort.filter((student) => !student.apaarId).length,
        duplicates: duplicates.filter((candidate) => candidate.institutionIds.includes(id)).length,
        openIssues: data.issues.filter(
          (issue) => issue.institutionId === id && isOpenIssue(issue),
        ).length,
        awaitingSubmissions: data.submissions.filter(
          (submission) =>
            submission.institutionId === id &&
            ['Submitted', 'Resubmitted', 'Under Review', 'Validation in Progress'].includes(submission.status),
        ).length,
        unverifiedReferences: institutionRows.filter((row) => row.status === 'Reference data unverified').length,
      };
    })
    .filter((row) => (search.trim() ? `${row.name} ${row.shortCode} ${row.state}`.toLowerCase().includes(search.trim().toLowerCase()) : true))
    .sort((a, b) => b.activeEnrolment - a.activeEnrolment);

  const columns: Column<MonitoringRow>[] = [
    {
      key: 'institution',
      header: 'Institution',
      sortValue: (row) => row.shortCode,
      cell: (row) => (
        <div className="min-w-[12rem]">
          <p className="text-xs font-medium text-foreground">{row.shortCode}</p>
          <p className="max-w-[16rem] truncate text-2xs text-muted-foreground">{row.name}</p>
        </div>
      ),
    },
    { key: 'state', header: 'State', hideBelow: 'lg', sortValue: (row) => row.state, cell: (row) => row.state },
    {
      key: 'verification',
      header: 'Verification',
      hideBelow: 'xl',
      sortValue: (row) => row.verificationStatus,
      cell: (row) => <VerificationStatusBadge status={row.verificationStatus} />,
    },
    { key: 'approved', header: 'Approved intake', align: 'right', sortValue: (row) => row.approvedIntake, cell: (row) => formatNumber(row.approvedIntake) },
    { key: 'active', header: 'Active enrolment', align: 'right', sortValue: (row) => row.activeEnrolment, cell: (row) => formatNumber(row.activeEnrolment) },
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
    { key: 'verified', header: 'APAAR verified', align: 'right', hideBelow: 'lg', sortValue: (row) => row.apaarVerified, cell: (row) => formatNumber(row.apaarVerified) },
    { key: 'missing', header: 'Missing IDs', align: 'right', hideBelow: 'xl', sortValue: (row) => row.missingApaar, cell: (row) => formatNumber(row.missingApaar) },
    { key: 'duplicates', header: 'Duplicate candidates', align: 'right', hideBelow: 'xl', sortValue: (row) => row.duplicates, cell: (row) => formatNumber(row.duplicates) },
    { key: 'issues', header: 'Open issues', align: 'right', hideBelow: 'xl', sortValue: (row) => row.openIssues, cell: (row) => formatNumber(row.openIssues) },
    {
      key: 'submissions',
      header: 'Awaiting review',
      align: 'right',
      sortValue: (row) => row.awaitingSubmissions,
      cell: (row) => formatNumber(row.awaitingSubmissions),
    },
    {
      key: 'view',
      header: '',
      align: 'right',
      cell: (row) => (
        <Button size="xs" variant="outline" onClick={() => setSelected(row)}>
          Drill down
        </Button>
      ),
    },
  ];

  const selectedCompliance = selected
    ? filteredCompliance.filter((row) => row.institutionId === selected.institutionId)
    : [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Enrolment monitoring"
        description="Institution and course comparisons of approved intake against active enrolment, identifier coverage and open review items."
        meta={
          <>
            <Badge variant="outline">{formatNumber(rows.length)} institutions</Badge>
            <Badge variant="warning">Reference data may be unverified</Badge>
          </>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={rows.length === 0}
            onClick={() =>
              downloadCsv(`enrolment_monitoring_${year}.csv`, [
                ['Institution', 'State', 'Verification', 'Approved intake', 'Active enrolment', 'Potential excess', 'APAAR verified', 'Missing identifiers', 'Duplicate candidates', 'Open issues', 'Awaiting review'],
                ...rows.map((row) => [
                  row.name,
                  row.state,
                  row.verificationStatus,
                  row.approvedIntake,
                  row.activeEnrolment,
                  row.excess,
                  row.apaarVerified,
                  row.missingApaar,
                  row.duplicates,
                  row.openIssues,
                  row.awaitingSubmissions,
                ]),
              ])
            }
          >
            <Download className="size-4" aria-hidden /> Export CSV
          </Button>
        }
      />

      <StatGrid>
        <StatCard label="Active enrolment in scope" value={formatNumber(rows.reduce((sum, row) => sum + row.activeEnrolment, 0))} icon={Activity} tone="success" />
        <StatCard label="Approved intake in scope" value={formatNumber(rows.reduce((sum, row) => sum + row.approvedIntake, 0))} icon={Activity} />
        <StatCard label="Potential excess" value={formatNumber(rows.reduce((sum, row) => sum + row.excess, 0))} icon={Activity} tone="critical" hint="Across course-year cohorts in scope" />
        <StatCard label="Institutions with excess" value={formatNumber(rows.filter((row) => row.excess > 0).length)} icon={Activity} tone="warning" />
      </StatGrid>

      <Panel bodyClassName="p-0">
        <div className="border-b border-border p-3">
          <SearchAndFilters
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search institution or state…"
            filters={[
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
                key: 'state',
                label: 'State',
                value: state,
                onChange: (value) => {
                  setState(value);
                  setInstitutionId(ALL);
                },
                options: [
                  { value: ALL, label: 'All states' },
                  ...Array.from(new Set(data.institutions.map((institution) => institution.state)))
                    .sort()
                    .map((option) => ({ value: option, label: option })),
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
                  ...data.institutions
                    .filter((institution) => state === ALL || institution.state === state)
                    .map((institution) => ({ value: institution.id, label: institution.shortCode })),
                ],
              },
            ]}
            onReset={() => {
              setSearch('');
              setYear(ACADEMIC_YEARS[ACADEMIC_YEARS.length - 1]);
              setState(ALL);
              setInstitutionId(ALL);
            }}
            resultLabel={`${formatNumber(rows.length)} institution(s) in scope for ${year === ALL ? 'all years' : year}.`}
          />
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.institutionId}
          onRowClick={(row) => setSelected(row)}
          caption="Enrolment monitoring by institution"
          emptyTitle="No institutions in scope"
          emptyDescription="Adjust the filters to review enrolment data."
        />
      </Panel>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selected.name} <span className="font-mono text-xs">({selected.shortCode})</span>
                </DialogTitle>
                <DialogDescription>
                  Course-level comparison for {year === ALL ? 'all academic years' : year}.{' '}
                  {selected.unverifiedReferences > 0
                    ? `${selected.unverifiedReferences} cohort(s) use unverified reference data.`
                    : 'All references in scope are verified.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: 'Approved', value: selected.approvedIntake },
                  { label: 'Active', value: selected.activeEnrolment },
                  { label: 'Potential excess', value: selected.excess },
                  { label: 'Open issues', value: selected.openIssues },
                ].map((item) => (
                  <div key={item.label} className="rounded border border-border px-2.5 py-2">
                    <p className="data-label">{item.label}</p>
                    <p className="mt-0.5 text-base font-semibold">{formatNumber(item.value)}</p>
                  </div>
                ))}
              </div>
              <div className="max-h-[22rem] overflow-y-auto scrollbar-thin">
                {selectedCompliance.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No compliance rows in scope.</p>
                ) : (
                  <IntakeComparison
                    rows={selectedCompliance.map((row) => ({
                      key: row.key,
                      courseName: row.courseName,
                      courseCode: row.courseCode,
                      academicYear: row.academicYear,
                      approvedIntake: row.approvedIntake,
                      activeEnrolment: row.activeEnrolment,
                      excess: row.excess,
                      status: row.status,
                    }))}
                    showYear
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to={`/admin/institutions/${selected.institutionId}`}>Open institution record</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/intake-alerts">Open intake alerts</Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="ml-auto">
                  <Link to="/admin/apaar-monitoring">APAAR monitoring</Link>
                </Button>
              </div>
              <p className="text-2xs text-muted-foreground">
                Reference status:{' '}
                {Array.from(new Set(selectedCompliance.map((row) => row.referenceStatus))).join(', ') || '—'}.
                Course reference badges appear in the approved intake registry.
                {selectedCompliance.some((row) => row.referenceStatus === 'Verified') && (
                  <span className="ml-1 inline-flex items-center gap-1">
                    <ReferenceStatusBadge status="Verified" />
                  </span>
                )}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
