import * as React from 'react';
import { Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { Panel } from '@/components/shared/Panel';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { SearchAndFilters } from '@/components/shared/SearchAndFilters';
import { Pagination } from '@/components/shared/Pagination';
import { useAdminData, usePagination } from '@/hooks/useScopeData';
import { downloadCsv, formatDateTime, formatNumber } from '@/lib/format';
import { ROLE_LABELS, type AuditEvent } from '@/types';

const ALL = 'all';

export function AdminAuditLogsPage() {
  const { data, institutionsById } = useAdminData();
  const [search, setSearch] = React.useState('');
  const [institutionId, setInstitutionId] = React.useState(ALL);
  const [role, setRole] = React.useState(ALL);
  const [action, setAction] = React.useState(ALL);

  const sorted = React.useMemo(
    () => [...data.audit].sort((a, b) => b.at.localeCompare(a.at)),
    [data.audit],
  );

  const filtered = sorted.filter((event) => {
    if (institutionId !== ALL && event.institutionId !== institutionId) return false;
    if (role !== ALL && event.actorRole !== role) return false;
    if (action !== ALL && event.action !== action) return false;
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      const haystack = `${event.actor} ${event.action} ${event.recordRef} ${event.reason ?? ''} ${event.changeSummary}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const pagination = usePagination(filtered, 15);

  const columns: Column<AuditEvent>[] = [
    {
      key: 'at',
      header: 'Timestamp',
      sortValue: (row) => row.at,
      cell: (row) => <span className="whitespace-nowrap text-2xs">{formatDateTime(row.at)}</span>,
    },
    {
      key: 'actor',
      header: 'Actor',
      sortValue: (row) => row.actor,
      cell: (row) => (
        <div>
          <p className="text-xs font-medium text-foreground">{row.actor}</p>
          <p className="text-2xs text-muted-foreground">
            {row.actorRole === 'system' ? 'System' : ROLE_LABELS[row.actorRole]}
          </p>
        </div>
      ),
    },
    {
      key: 'institution',
      header: 'Institution',
      hideBelow: 'md',
      sortValue: (row) => (row.institutionId ? institutionsById.get(row.institutionId)?.shortCode ?? '' : ''),
      cell: (row) => (
        <span className="text-xs">
          {row.institutionId ? institutionsById.get(row.institutionId)?.shortCode ?? row.institutionId : 'AICTE'}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      sortValue: (row) => row.action,
      cell: (row) => <span className="text-xs">{row.action}</span>,
    },
    {
      key: 'record',
      header: 'Record',
      hideBelow: 'sm',
      cell: (row) => <span className="font-mono text-2xs">{row.recordRef}</span>,
    },
    {
      key: 'reason',
      header: 'Reason',
      hideBelow: 'xl',
      cell: (row) => (
        <span className="line-clamp-2 max-w-[16rem] text-2xs text-muted-foreground">{row.reason ?? '—'}</span>
      ),
    },
    {
      key: 'summary',
      header: 'Change summary',
      hideBelow: 'lg',
      cell: (row) => (
        <span className="line-clamp-2 max-w-[22rem] text-2xs text-muted-foreground">{row.changeSummary}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit logs"
        description="Append-only record of institutional and administrative actions. Logs are read-only in the interface and must be retained server-side in production."
        meta={
          <>
            <Badge variant="outline">{formatNumber(data.audit.length)} event(s)</Badge>
            <Badge variant="muted">Read-only</Badge>
          </>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={filtered.length === 0}
            onClick={() =>
              downloadCsv('aicte_audit_logs.csv', [
                ['Timestamp', 'Actor', 'Role', 'Institution', 'Action', 'Record', 'Reason', 'Change summary'],
                ...filtered.map((event) => [
                  event.at,
                  event.actor,
                  event.actorRole,
                  event.institutionId ? institutionsById.get(event.institutionId)?.name ?? '' : 'AICTE',
                  event.action,
                  event.recordRef,
                  event.reason ?? '',
                  event.changeSummary,
                ]),
              ])
            }
          >
            <Download className="size-4" aria-hidden /> Export logs
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
            searchPlaceholder="Search actor, action, record or summary…"
            filters={[
              {
                key: 'institution',
                label: 'Institution',
                value: institutionId,
                onChange: (value) => {
                  setInstitutionId(value);
                  pagination.setPage(1);
                },
                className: 'min-w-[11rem]',
                options: [
                  { value: ALL, label: 'All institutions' },
                  ...data.institutions.map((institution) => ({
                    value: institution.id,
                    label: institution.shortCode,
                  })),
                ],
              },
              {
                key: 'role',
                label: 'Actor role',
                value: role,
                onChange: (value) => {
                  setRole(value);
                  pagination.setPage(1);
                },
                options: [
                  { value: ALL, label: 'All roles' },
                  { value: 'system', label: 'System' },
                  ...Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label })),
                ],
              },
              {
                key: 'action',
                label: 'Action',
                value: action,
                onChange: (value) => {
                  setAction(value);
                  pagination.setPage(1);
                },
                className: 'min-w-[12rem]',
                options: [
                  { value: ALL, label: 'All actions' },
                  ...Array.from(new Set(data.audit.map((event) => event.action)))
                    .sort()
                    .map((option) => ({ value: option, label: option })),
                ],
              },
            ]}
            onReset={() => {
              setSearch('');
              setInstitutionId(ALL);
              setRole(ALL);
              setAction(ALL);
              pagination.setPage(1);
            }}
            resultLabel={`${formatNumber(filtered.length)} event(s) match the current filters.`}
          />
        </div>
        <DataTable
          rows={pagination.pageItems}
          columns={columns}
          rowKey={(row) => row.id}
          caption="Administrative audit logs"
          emptyTitle="No audit events match"
          emptyDescription="Adjust the filters. Decisions recorded in this session appear at the top."
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
    </div>
  );
}
