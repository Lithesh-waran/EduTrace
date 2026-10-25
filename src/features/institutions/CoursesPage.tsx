import * as React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Lock } from 'lucide-react';
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
import { DataTable, type Column } from '@/components/shared/DataTable';
import { DefinitionList } from '@/components/shared/DefinitionList';
import { ReferenceStatusBadge } from '@/components/shared/StatusBadge';
import { useInstitutionData } from '@/hooks/useScopeData';
import { formatDate, formatNumber } from '@/lib/format';
import type { Course } from '@/types';

export function CoursesPage() {
  const { institution, courses } = useInstitutionData();
  const [selected, setSelected] = React.useState<Course | null>(null);

  const columns: Column<Course>[] = [
    {
      key: 'name',
      header: 'Course',
      sortValue: (row) => row.name,
      cell: (row) => (
        <div className="min-w-[12rem]">
          <p className="text-xs font-medium text-foreground">{row.name}</p>
          <p className="font-mono text-2xs text-muted-foreground">{row.code}</p>
        </div>
      ),
    },
    { key: 'year', header: 'Academic year', sortValue: (row) => row.academicYear, cell: (row) => row.academicYear },
    {
      key: 'intake',
      header: 'Approved intake',
      align: 'right',
      sortValue: (row) => row.approvedIntake,
      cell: (row) => <span className="font-medium">{formatNumber(row.approvedIntake)}</span>,
    },
    {
      key: 'categories',
      header: 'Additional seat categories',
      hideBelow: 'lg',
      cell: (row) =>
        row.additionalSeatCategories.length > 0 ? (
          <span className="text-xs">{row.additionalSeatCategories.join(', ')}</span>
        ) : (
          <span className="text-2xs text-muted-foreground">None configured</span>
        ),
    },
    {
      key: 'approval',
      header: 'Approval reference',
      hideBelow: 'md',
      cell: (row) => <span className="font-mono text-2xs">{row.approvalRef}</span>,
    },
    {
      key: 'effective',
      header: 'Effective date',
      hideBelow: 'xl',
      cell: (row) => <span className="text-2xs">{formatDate(row.effectiveDate)}</span>,
    },
    {
      key: 'verified',
      header: 'Last verified',
      hideBelow: 'xl',
      cell: (row) => (
        <span className="text-2xs">{row.lastVerifiedDate ? formatDate(row.lastVerifiedDate) : 'Never'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Reference status',
      sortValue: (row) => row.verificationStatus,
      cell: (row) => <ReferenceStatusBadge status={row.verificationStatus} />,
    },
    {
      key: 'revisions',
      header: 'Revisions',
      align: 'right',
      cell: (row) => (
        <Button size="xs" variant="outline" onClick={() => setSelected(row)}>
          {row.revisions.length} revision(s)
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Approved courses & intake"
        description={`Authoritative intake reference for ${institution?.name ?? 'your institution'}. Institution users can view this data; only authorized AICTE administrators can modify it.`}
        meta={
          <>
            <Badge variant="outline">{formatNumber(courses.length)} course(s)</Badge>
            <Badge variant="warning">Reference data — read only for institutions</Badge>
          </>
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/institution/intake-compliance">Open intake compliance</Link>
          </Button>
        }
      />

      <Alert tone="neutral">
        <AlertTitle className="flex items-center gap-1.5">
          <Lock className="size-3.5" aria-hidden /> Authoritative reference data
        </AlertTitle>
        <AlertDescription>
          Approved intake values come from the reference dataset and cannot be edited from the
          institution portal. Where the reference is Unverified or Provisional, compliance
          conclusions are suppressed. Historical revisions are retained and shown below.
        </AlertDescription>
      </Alert>

      <Panel bodyClassName="p-0">
        <DataTable
          rows={[...courses].sort((a, b) => a.code.localeCompare(b.code))}
          columns={columns}
          rowKey={(row) => row.id}
          caption="Approved courses"
          onRowClick={(row) => setSelected(row)}
          emptyTitle="No approved courses"
          emptyDescription="No course reference data is linked to this institution."
        />
      </Panel>

      <Panel title="Reference verification summary">
        <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
          <div className="rounded border border-border px-3 py-2">
            <dt className="data-label">Verified references</dt>
            <dd className="mt-1 text-lg font-semibold text-success">
              {courses.filter((course) => course.verificationStatus === 'Verified').length}
            </dd>
          </div>
          <div className="rounded border border-border px-3 py-2">
            <dt className="data-label">Provisional references</dt>
            <dd className="mt-1 text-lg font-semibold text-[#96660d]">
              {courses.filter((course) => course.verificationStatus === 'Provisional').length}
            </dd>
          </div>
          <div className="rounded border border-border px-3 py-2">
            <dt className="data-label">Unverified references</dt>
            <dd className="mt-1 text-lg font-semibold text-critical">
              {courses.filter((course) => course.verificationStatus === 'Unverified').length}
            </dd>
          </div>
        </dl>
        <p className="mt-2 flex items-start gap-1.5 text-2xs leading-relaxed text-muted-foreground">
          <BookOpen className="mt-0.5 size-3 shrink-0" aria-hidden />
          Intake figures in this demonstration are synthetic and are not official AICTE approvals.
        </p>
      </Panel>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selected.name} <span className="font-mono text-xs">({selected.code})</span>
                </DialogTitle>
                <DialogDescription>
                  Approved intake reference and revision history. Records are read-only in the
                  institution portal.
                </DialogDescription>
              </DialogHeader>
              <DefinitionList
                columns={2}
                items={[
                  { label: 'Academic year', value: selected.academicYear },
                  { label: 'Approved intake', value: formatNumber(selected.approvedIntake) },
                  { label: 'Additional seat categories', value: selected.additionalSeatCategories.join(', ') || 'None configured' },
                  { label: 'Approval reference', value: selected.approvalRef, mono: true },
                  { label: 'Effective date', value: formatDate(selected.effectiveDate) },
                  { label: 'Last verified', value: selected.lastVerifiedDate ? formatDate(selected.lastVerifiedDate) : 'Never' },
                  { label: 'Reference status', value: <ReferenceStatusBadge status={selected.verificationStatus} /> },
                ]}
              />
              <div>
                <p className="mb-1.5 text-xs font-semibold text-foreground">Revision history</p>
                {selected.revisions.length === 0 ? (
                  <p className="rounded border border-border bg-muted/40 px-2.5 py-2 text-2xs text-muted-foreground">
                    No historical revisions are recorded for this course.
                  </p>
                ) : (
                  <ol className="space-y-2 border-l border-border pl-3">
                    {selected.revisions.map((revision) => (
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
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
