import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { Panel } from '@/components/shared/Panel';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { SearchAndFilters } from '@/components/shared/SearchAndFilters';
import { Pagination } from '@/components/shared/Pagination';
import { VerificationStatusBadge } from '@/components/shared/StatusBadge';
import { useAdminData, usePagination } from '@/hooks/useScopeData';
import { downloadCsv, formatDate, formatNumber } from '@/lib/format';
import { VERIFICATION_STATUS_META, type Institution } from '@/types';

const ALL = 'all';

export function InstitutionRegistryPage() {
  const navigate = useNavigate();
  const { data, compliance } = useAdminData();
  const [search, setSearch] = React.useState('');
  const [state, setState] = React.useState(ALL);
  const [status, setStatus] = React.useState(ALL);

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.institutions.filter((institution) => {
      if (query) {
        const haystack = `${institution.name} ${institution.aicteId} ${institution.district} ${institution.state}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (state !== ALL && institution.state !== state) return false;
      if (status !== ALL && institution.verificationStatus !== status) return false;
      return true;
    });
  }, [data.institutions, search, state, status]);

  const pagination = usePagination(filtered, 12);

  const columns: Column<Institution>[] = [
    {
      key: 'aicteId',
      header: 'AICTE Permanent ID',
      sortValue: (row) => row.aicteId,
      cell: (row) => <span className="font-mono text-2xs text-foreground">{row.aicteId}</span>,
    },
    {
      key: 'name',
      header: 'Institution',
      sortValue: (row) => row.name,
      cell: (row) => (
        <div className="min-w-[14rem]">
          <p className="text-xs font-medium text-foreground">{row.name}</p>
          <p className="text-2xs text-muted-foreground">
            {row.type} · {row.managementType}
          </p>
        </div>
      ),
    },
    { key: 'state', header: 'State', hideBelow: 'md', sortValue: (row) => row.state, cell: (row) => row.state },
    { key: 'district', header: 'District', hideBelow: 'lg', cell: (row) => row.district },
    {
      key: 'verification',
      header: 'Verification',
      sortValue: (row) => row.verificationStatus,
      cell: (row) => <VerificationStatusBadge status={row.verificationStatus} />,
    },
    {
      key: 'approval',
      header: 'Approval reference',
      hideBelow: 'xl',
      cell: (row) => <span className="font-mono text-2xs">{row.approvalRef}</span>,
    },
    {
      key: 'courses',
      header: 'Courses',
      align: 'right',
      hideBelow: 'lg',
      sortValue: (row) => data.courses.filter((course) => course.institutionId === row.id).length,
      cell: (row) => formatNumber(data.courses.filter((course) => course.institutionId === row.id).length),
    },
    {
      key: 'students',
      header: 'Student records',
      align: 'right',
      sortValue: (row) => data.students.filter((student) => student.institutionId === row.id).length,
      cell: (row) => formatNumber(data.students.filter((student) => student.institutionId === row.id).length),
    },
    {
      key: 'lastSubmission',
      header: 'Last submission',
      hideBelow: 'xl',
      sortValue: (row) =>
        data.submissions
          .filter((submission) => submission.institutionId === row.id)
          .map((submission) => submission.submittedAt)
          .sort()
          .pop() ?? '',
      cell: (row) => {
        const latest = data.submissions
          .filter((submission) => submission.institutionId === row.id)
          .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
        return <span className="text-2xs">{latest ? `${latest.id} · ${formatDate(latest.submittedAt)}` : 'None'}</span>;
      },
    },
    {
      key: 'updated',
      header: 'Last updated',
      hideBelow: 'xl',
      sortValue: (row) => row.lastUpdated,
      cell: (row) => <span className="text-2xs text-muted-foreground">{formatDate(row.lastUpdated)}</span>,
    },
    {
      key: 'alerts',
      header: 'Intake alerts',
      align: 'right',
      hideBelow: 'xl',
      cell: (row) => {
        const count = compliance.filter(
          (complianceRow) =>
            complianceRow.institutionId === row.id && complianceRow.status === 'Potential excess',
        ).length;
        return count > 0 ? <Badge variant="critical">{count}</Badge> : <span className="text-2xs text-muted-foreground">0</span>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Institution registry"
        description="AICTE-approved institutions in the demonstration registry, with verification status, reference approval and submission activity."
        meta={
          <>
            <Badge variant="outline">{formatNumber(data.institutions.length)} institutions</Badge>
            <Badge variant="muted">Synthetic demonstration directory</Badge>
          </>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={filtered.length === 0}
            onClick={() =>
              downloadCsv('aicte_institution_registry.csv', [
                ['AICTE Permanent ID', 'Institution', 'Type', 'Management', 'State', 'District', 'Verification status', 'Approval reference', 'Courses', 'Student records', 'Last updated'],
                ...filtered.map((institution) => [
                  institution.aicteId,
                  institution.name,
                  institution.type,
                  institution.managementType,
                  institution.state,
                  institution.district,
                  institution.verificationStatus,
                  institution.approvalRef,
                  data.courses.filter((course) => course.institutionId === institution.id).length,
                  data.students.filter((student) => student.institutionId === institution.id).length,
                  institution.lastUpdated,
                ]),
              ])
            }
          >
            <Download className="size-4" aria-hidden /> Export registry
          </Button>
        }
      />

      <Panel bodyClassName="p-0">
        <div className="border-b border-border p-3">
          <SearchAndFilters
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              pagination.setPage(1);
            }}
            searchPlaceholder="Search institution name, AICTE ID or district…"
            filters={[
              {
                key: 'state',
                label: 'State',
                value: state,
                onChange: (value) => {
                  setState(value);
                  pagination.setPage(1);
                },
                className: 'min-w-[10rem]',
                options: [
                  { value: ALL, label: 'All states' },
                  ...Array.from(new Set(data.institutions.map((institution) => institution.state)))
                    .sort()
                    .map((option) => ({ value: option, label: option })),
                ],
              },
              {
                key: 'status',
                label: 'Verification',
                value: status,
                onChange: (value) => {
                  setStatus(value);
                  pagination.setPage(1);
                },
                className: 'min-w-[11rem]',
                options: [
                  { value: ALL, label: 'All statuses' },
                  ...Object.keys(VERIFICATION_STATUS_META).map((option) => ({ value: option, label: option })),
                ],
              },
            ]}
            onReset={() => {
              setSearch('');
              setState(ALL);
              setStatus(ALL);
              pagination.setPage(1);
            }}
            resultLabel={`${formatNumber(filtered.length)} institution(s) match the current filters.`}
          />
        </div>
        <DataTable
          rows={pagination.pageItems}
          columns={columns}
          rowKey={(row) => row.id}
          onRowClick={(row) => navigate(`/admin/institutions/${row.id}`)}
          caption="Institution registry"
          emptyTitle="No institutions match"
          emptyDescription="Adjust the filters to search the registry."
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
        Opening an institution shows its approved intake, compliance comparison, submissions, issues
        and audit history. Registry data in this build is synthetic and is not an official AICTE
        directory extract.
      </p>
    </div>
  );
}
