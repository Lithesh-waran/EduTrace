import * as React from 'react';
import { Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { Panel } from '@/components/shared/Panel';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { SearchAndFilters } from '@/components/shared/SearchAndFilters';
import { Pagination } from '@/components/shared/Pagination';
import { useInstitutionData, usePagination } from '@/hooks/useScopeData';
import { downloadCsv, formatDateTime, formatNumber } from '@/lib/format';
import { ROLE_LABELS, type AuditEvent } from '@/types';

const ALL = 'all';

export function AuditHistoryPage() {
  const { audit } = useInstitutionData();
  const [search, setSearch] = React.useState('');
  const [actorRole, setActorRole] = React.useState(ALL);
  const [action, setAction] = React.useState(ALL);

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return audit.filter((event) => {
      if (query) {
        const haystack = `${event.actor} ${event.action} ${event.recordRef} ${event.changeSummary} ${event.reason ?? ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (actorRole !== ALL && event.actorRole !== actorRole) return false;
      if (action !== ALL && event.action !== action) return false;
      return true;
    });
  }, [audit, search, actorRole, action]);

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
      hideBelow: 'lg',
      cell: (row) => (
        <span className="line-clamp-2 max-w-[16rem] text-2xs text-muted-foreground">
          {row.reason ?? '—'}
        </span>
      ),
    },
    {
      key: 'summary',
      header: 'Change summary',
      hideBelow: 'md',
      cell: (row) => (
        <span className="line-clamp-2 max-w-[20rem] text-2xs text-muted-foreground">
          {row.changeSummary}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit history"
        description="Read-only record of institutional actions, validation runs and review decisions. Entries cannot be edited or deleted from the interface."
        meta={
          <>
            <Badge variant="outline">{formatNumber(audit.length)} event(s)</Badge>
            <Badge variant="muted">Read-only</Badge>
          </>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv('institution_audit_history.csv', [
                ['Timestamp', 'Actor', 'Role', 'Action', 'Record', 'Reason', 'Change summary'],
                ...filtered.map((event) => [
                  event.at,
                  event.actor,
                  event.actorRole,
                  event.action,
                  event.recordRef,
                  event.reason ?? '',
                  event.changeSummary,
                ]),
              ])
            }
            disabled={filtered.length === 0}
          >
            <Download className="size-4" aria-hidden /> Export CSV
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
                key: 'role',
                label: 'Actor role',
                value: actorRole,
                onChange: (value) => {
                  setActorRole(value);
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
                  ...Array.from(new Set(audit.map((event) => event.action)))
                    .sort()
                    .map((option) => ({ value: option, label: option })),
                ],
              },
            ]}
            onReset={() => {
              setSearch('');
              setActorRole(ALL);
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
          caption="Audit history"
          emptyTitle="No audit events match"
          emptyDescription="Adjust the filters. Actions performed in this session will appear here."
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
        Audit entries are append-only in this demonstration and are retained in browser storage.
        Production audit logs must be append-only server-side records with restricted access.
      </p>
    </div>
  );
}
