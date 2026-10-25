import * as React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { Panel } from '@/components/shared/Panel';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { SearchAndFilters } from '@/components/shared/SearchAndFilters';
import { Pagination } from '@/components/shared/Pagination';
import {
  IssueStatusBadge,
  SeverityBadge,
} from '@/components/shared/StatusBadge';
import { useAdminData, useInstitutionData, useLookups, usePagination } from '@/hooks/useScopeData';
import { useAuth } from '@/lib/auth/AuthProvider';
import { isOpenIssue } from '@/lib/demo/analytics';
import { formatDate, formatNumber } from '@/lib/format';
import { ISSUE_STATUSES, SEVERITIES, type IssueStatus, type ValidationIssue } from '@/types';
import { IssueDetailDialog } from './IssueDetailDialog';

const ALL = 'all';

interface IssuesViewProps {
  issues: ValidationIssue[];
  showInstitution: boolean;
  canManage: boolean;
  studentPathFor: (studentId: string) => string;
  onStatusChange: (id: string, status: IssueStatus, comment: string) => void;
  onComment: (id: string, message: string) => void;
  title: string;
  description: string;
}

function IssuesView({
  issues,
  showInstitution,
  canManage,
  studentPathFor,
  onStatusChange,
  onComment,
  title,
  description,
}: IssuesViewProps) {
  const lookups = useLookups();
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState(ALL);
  const [severity, setSeverity] = React.useState(ALL);
  const [rule, setRule] = React.useState(ALL);
  const [selected, setSelected] = React.useState<ValidationIssue | null>(null);

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return issues
      .filter((issue) => {
        if (query) {
          const haystack = `${issue.id} ${issue.ruleName} ${issue.ruleId} ${issue.recordRef} ${issue.reason} ${
            showInstitution ? lookups.institutionName(issue.institutionId) : ''
          }`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        if (status !== ALL && issue.status !== status) return false;
        if (severity !== ALL && issue.severity !== severity) return false;
        if (rule !== ALL && issue.ruleId !== rule) return false;
        return true;
      })
      .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));
  }, [issues, search, status, severity, rule, lookups, showInstitution]);

  const pagination = usePagination(filtered, 12);
  const openCount = filtered.filter(isOpenIssue).length;

  const columns: Column<ValidationIssue>[] = [
    {
      key: 'id',
      header: 'Issue ID',
      sortValue: (row) => row.id,
      cell: (row) => (
        <button
          type="button"
          onClick={() => setSelected(row)}
          className="font-mono text-2xs font-medium text-secondary hover:underline"
        >
          {row.id}
        </button>
      ),
    },
    {
      key: 'rule',
      header: 'Rule',
      sortValue: (row) => row.ruleId,
      cell: (row) => (
        <div className="min-w-[11rem]">
          <p className="text-xs font-medium text-foreground">{row.ruleName}</p>
          <p className="font-mono text-2xs text-muted-foreground">{row.ruleId}</p>
        </div>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      sortValue: (row) => row.severity,
      cell: (row) => <SeverityBadge severity={row.severity} />,
    },
    ...(showInstitution
      ? [
          {
            key: 'institution',
            header: 'Institution',
            hideBelow: 'md' as const,
            sortValue: (row: ValidationIssue) => lookups.institutionName(row.institutionId),
            cell: (row: ValidationIssue) => (
              <span className="text-xs">{lookups.institutionName(row.institutionId)}</span>
            ),
          },
        ]
      : []),
    {
      key: 'record',
      header: 'Record / batch',
      hideBelow: 'sm',
      sortValue: (row) => row.recordRef,
      cell: (row) => (
        <div>
          <p className="font-mono text-2xs text-foreground">{row.recordRef}</p>
          {row.batchId && <p className="text-2xs text-muted-foreground">{row.batchId}</p>}
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      hideBelow: 'xl',
      cell: (row) => (
        <p className="max-w-[18rem] text-2xs leading-snug text-muted-foreground line-clamp-2">
          {row.reason}
        </p>
      ),
    },
    {
      key: 'detected',
      header: 'Detected',
      hideBelow: 'lg',
      sortValue: (row) => row.detectedAt,
      cell: (row) => <span className="text-2xs text-muted-foreground">{formatDate(row.detectedAt)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      cell: (row) => <IssueStatusBadge status={row.status} />,
    },
    {
      key: 'reviewer',
      header: 'Assigned',
      hideBelow: 'xl',
      cell: (row) => (
        <span className="text-2xs text-muted-foreground">{row.assignedTo ?? 'Unassigned'}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button size="xs" variant="outline" onClick={() => setSelected(row)}>
            Open
          </Button>
          {row.studentId && (
            <Button asChild size="xs" variant="ghost" aria-label="Open student record">
              <Link to={studentPathFor(row.studentId)}>
                <ExternalLink className="size-3" aria-hidden />
              </Link>
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        description={description}
        meta={
          <>
            <Badge variant="outline">{formatNumber(issues.length)} issue(s)</Badge>
            <Badge variant="critical">{formatNumber(openCount)} open</Badge>
            <Badge variant="muted">Deterministic rules</Badge>
          </>
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
            searchPlaceholder="Search issue id, rule, record or reason…"
            filters={[
              {
                key: 'status',
                label: 'Status',
                value: status,
                onChange: (value) => {
                  setStatus(value);
                  pagination.setPage(1);
                },
                className: 'min-w-[11rem]',
                options: [
                  { value: ALL, label: 'All statuses' },
                  ...ISSUE_STATUSES.map((option) => ({ value: option, label: option })),
                ],
              },
              {
                key: 'severity',
                label: 'Severity',
                value: severity,
                onChange: (value) => {
                  setSeverity(value);
                  pagination.setPage(1);
                },
                options: [
                  { value: ALL, label: 'All severities' },
                  ...SEVERITIES.map((option) => ({ value: option, label: option })),
                ],
              },
              {
                key: 'rule',
                label: 'Rule',
                value: rule,
                onChange: (value) => {
                  setRule(value);
                  pagination.setPage(1);
                },
                className: 'min-w-[10rem]',
                options: [
                  { value: ALL, label: 'All rules' },
                  ...Array.from(new Map(issues.map((issue) => [issue.ruleId, issue.ruleName])).entries()).map(
                    ([id, name]) => ({ value: id, label: `${id} · ${name}` }),
                  ),
                ],
              },
            ]}
            onReset={() => {
              setSearch('');
              setStatus(ALL);
              setSeverity(ALL);
              setRule(ALL);
              pagination.setPage(1);
            }}
            resultLabel={`${formatNumber(filtered.length)} issue(s) match the current filters.`}
          />
        </div>
        <DataTable
          rows={pagination.pageItems}
          columns={columns}
          rowKey={(row) => row.id}
          onRowClick={(row) => setSelected(row)}
          caption="Validation issues"
          emptyTitle="No validation issues match"
          emptyDescription="Adjust the filters. New findings appear after a batch is validated."
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
        Findings explain exactly which deterministic rule was triggered, the evidence recorded and
        the suggested next action. {canManage ? 'Status changes require a comment and are audited.' : 'Your role can view and comment but not change issue status.'}
      </p>

      <IssueDetailDialog
        issue={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        canManage={canManage}
        onStatusChange={onStatusChange}
        onComment={onComment}
        studentPath={selected?.studentId ? studentPathFor(selected.studentId) : undefined}
      />
    </div>
  );
}

export function InstitutionValidationIssuesPage() {
  const { issues, actions } = useInstitutionData();
  const { can } = useAuth();

  return (
    <IssuesView
      issues={issues}
      showInstitution={false}
      canManage={can('issues.manage')}
      title="Validation issues"
      description="Deterministic rule findings for your institution. Acknowledge, correct, escalate or resolve each issue; every action is captured in the audit history."
      studentPathFor={(studentId) => `/institution/students/${studentId}`}
      onStatusChange={(id, status, comment) => {
        actions.setIssueStatus(id, status);
        actions.addIssueComment(id, comment);
      }}
      onComment={(id, message) => actions.addIssueComment(id, message)}
    />
  );
}

export function AdminValidationIssuesPage() {
  const { data, actions } = useAdminData();
  const { can } = useAuth();

  return (
    <IssuesView
      issues={data.issues}
      showInstitution
      canManage={can('admin.review')}
      title="Validation issues"
      description="Cross-institution validation queue. Review rule evidence and record status decisions with reasons."
      studentPathFor={(studentId) => {
        const student = data.students.find((candidate) => candidate.id === studentId);
        return student ? `/admin/institutions/${student.institutionId}` : '/admin/institutions';
      }}
      onStatusChange={(id, status, comment) => {
        actions.setIssueStatus(id, status);
        actions.addIssueComment(id, comment);
      }}
      onComment={(id, message) => actions.addIssueComment(id, message)}
    />
  );
}
