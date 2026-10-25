import * as React from 'react';
import { Download, Lock, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageHeader } from '@/components/shared/PageHeader';
import { Panel } from '@/components/shared/Panel';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { SearchAndFilters } from '@/components/shared/SearchAndFilters';
import { Pagination } from '@/components/shared/Pagination';
import { ReferenceStatusBadge } from '@/components/shared/StatusBadge';
import { useAdminData, usePagination } from '@/hooks/useScopeData';
import { useAuth } from '@/lib/auth/AuthProvider';
import { downloadCsv, formatDate, formatNumber } from '@/lib/format';
import { ACADEMIC_YEARS, type Course } from '@/types';

const ALL = 'all';

interface IntakeRow {
  course: Course;
  institutionName: string;
  institutionCode: string;
}

export function ApprovedIntakePage() {
  const { data, actions } = useAdminData();
  const { can } = useAuth();
  const [search, setSearch] = React.useState('');
  const [institutionId, setInstitutionId] = React.useState(ALL);
  const [year, setYear] = React.useState(ALL);
  const [reference, setReference] = React.useState(ALL);
  const [editing, setEditing] = React.useState<IntakeRow | null>(null);
  const [revisions, setRevisions] = React.useState<IntakeRow | null>(null);

  const rows: IntakeRow[] = React.useMemo(
    () =>
      data.courses
        .map((course) => ({
          course,
          institutionName:
            data.institutions.find((institution) => institution.id === course.institutionId)?.name ?? 'Unknown',
          institutionCode:
            data.institutions.find((institution) => institution.id === course.institutionId)?.shortCode ?? '—',
        }))
        .filter((row) => {
          if (institutionId !== ALL && row.course.institutionId !== institutionId) return false;
          if (year !== ALL && row.course.academicYear !== year) return false;
          if (reference !== ALL && row.course.verificationStatus !== reference) return false;
          if (search.trim()) {
            const query = search.trim().toLowerCase();
            const haystack = `${row.course.name} ${row.course.code} ${row.course.approvalRef} ${row.institutionName}`.toLowerCase();
            if (!haystack.includes(query)) return false;
          }
          return true;
        })
        .sort((a, b) => `${a.institutionCode}${a.course.code}`.localeCompare(`${b.institutionCode}${b.course.code}`)),
    [data.courses, data.institutions, institutionId, year, reference, search],
  );

  const pagination = usePagination(rows, 12);

  const columns: Column<IntakeRow>[] = [
    {
      key: 'institution',
      header: 'Institution',
      sortValue: (row) => row.institutionCode,
      cell: (row) => (
        <div className="min-w-[11rem]">
          <p className="text-xs font-medium text-foreground">{row.institutionCode}</p>
          <p className="max-w-[14rem] truncate text-2xs text-muted-foreground">{row.institutionName}</p>
        </div>
      ),
    },
    {
      key: 'course',
      header: 'Course',
      sortValue: (row) => row.course.code,
      cell: (row) => (
        <div>
          <p className="text-xs text-foreground">{row.course.name}</p>
          <p className="font-mono text-2xs text-muted-foreground">{row.course.code}</p>
        </div>
      ),
    },
    { key: 'year', header: 'Academic year', sortValue: (row) => row.course.academicYear, cell: (row) => row.course.academicYear },
    {
      key: 'intake',
      header: 'Approved intake',
      align: 'right',
      sortValue: (row) => row.course.approvedIntake,
      cell: (row) => <span className="font-medium">{formatNumber(row.course.approvedIntake)}</span>,
    },
    {
      key: 'approval',
      header: 'Approval reference',
      hideBelow: 'lg',
      cell: (row) => <span className="font-mono text-2xs">{row.course.approvalRef}</span>,
    },
    {
      key: 'effective',
      header: 'Effective date',
      hideBelow: 'xl',
      cell: (row) => <span className="text-2xs">{formatDate(row.course.effectiveDate)}</span>,
    },
    {
      key: 'reference',
      header: 'Verification',
      sortValue: (row) => row.course.verificationStatus,
      cell: (row) => <ReferenceStatusBadge status={row.course.verificationStatus} />,
    },
    {
      key: 'verified',
      header: 'Last verified',
      hideBelow: 'xl',
      cell: (row) => (
        <span className="text-2xs">
          {row.course.lastVerifiedDate ? formatDate(row.course.lastVerifiedDate) : 'Never'}
        </span>
      ),
    },
    {
      key: 'revisions',
      header: 'Revisions',
      align: 'right',
      cell: (row) => (
        <Button size="xs" variant="ghost" onClick={() => setRevisions(row)}>
          {row.course.revisions.length}
        </Button>
      ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      cell: (row) =>
        can('admin.intake.edit') ? (
          <Button size="xs" variant="outline" onClick={() => setEditing(row)}>
            <Pencil className="size-3" aria-hidden /> Update
          </Button>
        ) : (
          <span className="text-2xs text-muted-foreground">Read-only</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Approved intake registry"
        description="Authoritative course-level intake reference. Only authorized administrative roles may change these values; every revision is recorded with a reason."
        meta={
          <>
            <Badge variant="outline">{formatNumber(rows.length)} reference(s)</Badge>
            <Badge variant="warning">Authoritative reference data</Badge>
          </>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={rows.length === 0}
            onClick={() =>
              downloadCsv('approved_intake_registry.csv', [
                ['Institution', 'Course', 'Code', 'Academic year', 'Approved intake', 'Approval reference', 'Effective date', 'Verification', 'Last verified'],
                ...rows.map((row) => [
                  row.institutionName,
                  row.course.name,
                  row.course.code,
                  row.course.academicYear,
                  row.course.approvedIntake,
                  row.course.approvalRef,
                  row.course.effectiveDate,
                  row.course.verificationStatus,
                  row.course.lastVerifiedDate ?? '',
                ]),
              ])
            }
          >
            <Download className="size-4" aria-hidden /> Export reference
          </Button>
        }
      />

      <Alert tone="neutral">
        <AlertTitle className="flex items-center gap-1.5">
          <Lock className="size-3.5" aria-hidden /> Reference data carries legal weight
        </AlertTitle>
        <AlertDescription>
          Approved intake values drive compliance comparisons. Updating a reference does not verify
          any student record and does not resolve an intake alert automatically. Where the reference
          is Unverified, compliance is suppressed.
        </AlertDescription>
      </Alert>

      <Panel bodyClassName="p-0">
        <div className="border-b border-border p-3">
          <SearchAndFilters
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              pagination.setPage(1);
            }}
            searchPlaceholder="Search course, reference or institution…"
            filters={[
              {
                key: 'institution',
                label: 'Institution',
                value: institutionId,
                onChange: (value) => {
                  setInstitutionId(value);
                  pagination.setPage(1);
                },
                className: 'min-w-[12rem]',
                options: [
                  { value: ALL, label: 'All institutions' },
                  ...data.institutions.map((institution) => ({
                    value: institution.id,
                    label: institution.shortCode,
                  })),
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
                  ...ACADEMIC_YEARS.map((option) => ({ value: option, label: option })),
                ],
              },
              {
                key: 'reference',
                label: 'Verification',
                value: reference,
                onChange: (value) => {
                  setReference(value);
                  pagination.setPage(1);
                },
                options: [
                  { value: ALL, label: 'All references' },
                  { value: 'Verified', label: 'Verified' },
                  { value: 'Provisional', label: 'Provisional' },
                  { value: 'Unverified', label: 'Unverified' },
                ],
              },
            ]}
            onReset={() => {
              setSearch('');
              setInstitutionId(ALL);
              setYear(ALL);
              setReference(ALL);
              pagination.setPage(1);
            }}
            resultLabel={`${formatNumber(rows.length)} reference row(s) match the current filters.`}
          />
        </div>
        <DataTable
          rows={pagination.pageItems}
          columns={columns}
          rowKey={(row) => row.course.id}
          caption="Approved intake registry"
          emptyTitle="No reference rows match"
          emptyDescription="Adjust the filters to review approved intake data."
          footer={
            rows.length > 0 ? (
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

      {editing && (
        <UpdateIntakeDialog
          row={editing}
          open={Boolean(editing)}
          onClose={() => setEditing(null)}
          onSubmit={(patch, reason) => {
            actions.updateCourseIntake(editing.course.id, patch, reason);
            setEditing(null);
          }}
        />
      )}

      <Dialog open={Boolean(revisions)} onOpenChange={(open) => !open && setRevisions(null)}>
        <DialogContent className="max-w-lg">
          {revisions && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Revision history · {revisions.course.code}
                </DialogTitle>
                <DialogDescription>
                  {revisions.institutionName}. Approved intake changes are retained with their
                  approval reference and effective date.
                </DialogDescription>
              </DialogHeader>
              {revisions.course.revisions.length === 0 ? (
                <p className="rounded border border-border bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground">
                  No revisions recorded. The current approved intake is{' '}
                  {formatNumber(revisions.course.approvedIntake)} ({revisions.course.approvalRef}).
                </p>
              ) : (
                <ol className="space-y-2 border-l border-border pl-3">
                  {revisions.course.revisions.map((revision) => (
                    <li key={`${revision.effectiveDate}-${revision.approvedIntake}`} className="relative">
                      <span className="absolute -left-[17px] top-1 size-2 rounded-full bg-secondary" aria-hidden />
                      <p className="text-xs font-medium text-foreground">
                        {formatNumber(revision.approvedIntake)} seats · {revision.academicYear}
                      </p>
                      <p className="text-2xs text-muted-foreground">
                        Effective {formatDate(revision.effectiveDate)} · {revision.approvalRef}
                      </p>
                      <p className="text-2xs text-muted-foreground">{revision.note}</p>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UpdateIntakeDialog({
  row,
  open,
  onClose,
  onSubmit,
}: {
  row: IntakeRow;
  open: boolean;
  onClose: () => void;
  onSubmit: (
    patch: {
      approvedIntake: number;
      approvalRef: string;
      effectiveDate: string;
      academicYear: string;
      verificationStatus: Course['verificationStatus'];
    },
    reason: string,
  ) => void;
}) {
  const [intake, setIntake] = React.useState(String(row.course.approvedIntake));
  const [approvalRef, setApprovalRef] = React.useState(row.course.approvalRef);
  const [effectiveDate, setEffectiveDate] = React.useState(row.course.effectiveDate);
  const [academicYear, setAcademicYear] = React.useState(row.course.academicYear);
  const [verificationStatus, setVerificationStatus] = React.useState<Course['verificationStatus']>(
    row.course.verificationStatus,
  );
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const submit = () => {
    const parsed = Number.parseInt(intake, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('Approved intake must be a non-negative whole number.');
      return;
    }
    if (!approvalRef.trim()) {
      setError('An approval reference is required for every revision.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) {
      setError('Effective date must be in YYYY-MM-DD format.');
      return;
    }
    if (reason.trim().length < 10) {
      setError('Provide a reason of at least 10 characters. Reference revisions are audited.');
      return;
    }
    onSubmit(
      {
        approvedIntake: parsed,
        approvalRef: approvalRef.trim(),
        effectiveDate,
        academicYear,
        verificationStatus,
      },
      reason.trim(),
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Update approved intake</DialogTitle>
          <DialogDescription>
            {row.institutionName} · {row.course.name} ({row.course.code}). This writes an authoritative
            revision and notifies the institution.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="intake-value" className="mb-1 block">Approved intake</Label>
            <Input
              id="intake-value"
              type="number"
              min={0}
              value={intake}
              onChange={(event) => setIntake(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="intake-year" className="mb-1 block">Academic year</Label>
            <SelectRoot value={academicYear} onValueChange={setAcademicYear}>
              <SelectTrigger id="intake-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACADEMIC_YEARS.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="intake-ref" className="mb-1 block">Approval reference</Label>
            <Input id="intake-ref" value={approvalRef} onChange={(event) => setApprovalRef(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="intake-effective" className="mb-1 block">Effective date</Label>
            <Input
              id="intake-effective"
              type="date"
              value={effectiveDate}
              onChange={(event) => setEffectiveDate(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="intake-status" className="mb-1 block">Reference verification</Label>
            <SelectRoot
              value={verificationStatus}
              onValueChange={(value) => setVerificationStatus(value as Course['verificationStatus'])}
            >
              <SelectTrigger id="intake-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Verified">Verified</SelectItem>
                <SelectItem value="Provisional">Provisional</SelectItem>
                <SelectItem value="Unverified">Unverified</SelectItem>
              </SelectContent>
            </SelectRoot>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="intake-reason" className="mb-1 block">
              Reason for revision <span className="text-critical">*</span>
            </Label>
            <Textarea
              id="intake-reason"
              rows={2}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setError(null);
              }}
              placeholder="e.g. Revised approval letter received from the regional committee on 12 October 2026."
            />
          </div>
        </div>
        {error && (
          <p role="alert" className="text-2xs text-critical">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit}>
            Record revision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
