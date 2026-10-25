import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, Eye, Pencil, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { Panel } from '@/components/shared/Panel';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { SearchAndFilters } from '@/components/shared/SearchAndFilters';
import { Pagination } from '@/components/shared/Pagination';
import {
  ApaarStatusBadge,
  EnrolmentStatusBadge,
  ValidationStatusBadge,
} from '@/components/shared/StatusBadge';
import { useInstitutionData, useLookups, usePagination } from '@/hooks/useScopeData';
import { useAuth } from '@/lib/auth/AuthProvider';
import { downloadCsv, formatDate, formatNumber, maskIdentifier } from '@/lib/format';
import { APAAR_STATUSES, ENROLMENT_STATUSES, type Student } from '@/types';
import { EditStudentDialog, AddStudentDialog } from './StudentFormDialog';

const ALL = 'all';

export function StudentListPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { institution, institutionId, courses, students, validationStatus, issues } =
    useInstitutionData();
  const lookups = useLookups();

  const [search, setSearch] = React.useState('');
  const [courseId, setCourseId] = React.useState(ALL);
  const [academicYear, setAcademicYear] = React.useState(ALL);
  const [enrolmentStatus, setEnrolmentStatus] = React.useState(ALL);
  const [apaarStatus, setApaarStatus] = React.useState(ALL);
  const [validation, setValidation] = React.useState(ALL);
  const [addOpen, setAddOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Student | null>(null);

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) => {
      if (query) {
        const haystack = `${student.name} ${student.regNumber} ${student.recordId} ${student.apaarId ?? ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (courseId !== ALL && student.courseId !== courseId) return false;
      if (academicYear !== ALL && student.academicYear !== academicYear) return false;
      if (enrolmentStatus !== ALL && student.enrolmentStatus !== enrolmentStatus) return false;
      if (apaarStatus !== ALL && student.apaarStatus !== apaarStatus) return false;
      if (validation !== ALL && validationStatus.get(student.id) !== validation) return false;
      return true;
    });
  }, [students, search, courseId, academicYear, enrolmentStatus, apaarStatus, validation, validationStatus]);

  const pagination = usePagination(filtered, 12);

  const resetFilters = () => {
    setSearch('');
    setCourseId(ALL);
    setAcademicYear(ALL);
    setEnrolmentStatus(ALL);
    setApaarStatus(ALL);
    setValidation(ALL);
    pagination.setPage(1);
  };

  const handleExport = () => {
    const rows: (string | number)[][] = [
      [
        'Record ID',
        'Registration number',
        'Student name',
        'Course code',
        'Course',
        'Academic year',
        'Admission date',
        'Enrolment status',
        'APAAR (masked)',
        'APAAR status',
        'Validation status',
        'Last updated',
      ],
      ...filtered.map((student) => [
        student.recordId,
        student.regNumber,
        student.name,
        lookups.courseCode(student.courseId),
        lookups.courseName(student.courseId),
        student.academicYear,
        student.admissionDate,
        student.enrolmentStatus,
        maskIdentifier(student.apaarId),
        student.apaarStatus,
        validationStatus.get(student.id) ?? 'Not Validated',
        student.lastUpdated,
      ]),
    ];
    downloadCsv(
      `${institution?.shortCode ?? 'institution'}_student_export_${new Date().toISOString().slice(0, 10)}.csv`,
      rows,
    );
  };

  const columns: Column<Student>[] = [
    {
      key: 'recordId',
      header: 'Record ID',
      sortValue: (row) => row.recordId,
      cell: (row) => <span className="font-mono text-2xs text-muted-foreground">{row.recordId}</span>,
    },
    {
      key: 'regNumber',
      header: 'Registration number',
      sortValue: (row) => row.regNumber,
      cell: (row) => <span className="font-mono text-xs text-foreground">{row.regNumber}</span>,
    },
    {
      key: 'name',
      header: 'Student name',
      sortValue: (row) => row.name,
      cell: (row) => (
        <div className="min-w-[9rem]">
          <p className="text-sm font-medium text-foreground">{row.name}</p>
          <p className="text-2xs text-muted-foreground">
            Admitted {formatDate(row.admissionDate)}
          </p>
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
          <p className="text-xs text-foreground">{lookups.courseName(row.courseId)}</p>
          <p className="font-mono text-2xs text-muted-foreground">{lookups.courseCode(row.courseId)}</p>
        </div>
      ),
    },
    {
      key: 'academicYear',
      header: 'Academic year',
      hideBelow: 'lg',
      sortValue: (row) => row.academicYear,
      cell: (row) => <span className="text-xs">{row.academicYear}</span>,
    },
    {
      key: 'enrolment',
      header: 'Enrolment',
      sortValue: (row) => row.enrolmentStatus,
      cell: (row) => <EnrolmentStatusBadge status={row.enrolmentStatus} />,
    },
    {
      key: 'apaar',
      header: 'APAAR ID',
      hideBelow: 'sm',
      cell: (row) => (
        <span className="font-mono text-2xs text-muted-foreground" title="Masked identifier">
          {maskIdentifier(row.apaarId)}
        </span>
      ),
    },
    {
      key: 'apaarStatus',
      header: 'APAAR status',
      sortValue: (row) => row.apaarStatus,
      cell: (row) => <ApaarStatusBadge status={row.apaarStatus} />,
    },
    {
      key: 'validation',
      header: 'Validation',
      hideBelow: 'lg',
      sortValue: (row) => validationStatus.get(row.id) ?? '',
      cell: (row) => <ValidationStatusBadge status={validationStatus.get(row.id) ?? 'Not Validated'} />,
    },
    {
      key: 'updated',
      header: 'Last updated',
      hideBelow: 'xl',
      sortValue: (row) => row.lastUpdated,
      cell: (row) => <span className="text-2xs text-muted-foreground">{formatDate(row.lastUpdated)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(event) => event.stopPropagation()}>
          <Button asChild variant="ghost" size="icon-sm" aria-label={`View ${row.name}`}>
            <Link to={`/institution/students/${row.id}`}>
              <Eye className="size-3.5" />
            </Link>
          </Button>
          {can('students.write') && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${row.name}`}
              onClick={() => setEditing(row)}
            >
              <Pencil className="size-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (!institution) {
    return (
      <Panel title="No institution linked">
        <p className="text-sm text-muted-foreground">
          This demonstration account is not linked to an institution. Sign in as an institution role
          to manage student records.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Student records"
        description={`Searchable registry for ${institution.name}. APAAR identifiers are masked in list views; validation status is derived from open deterministic rule findings.`}
        meta={
          <>
            <Badge variant="outline">{formatNumber(students.length)} records</Badge>
            <Badge variant="warning">{formatNumber(issues.filter((issue) => issue.status === 'Open').length)} open issues</Badge>
            <Badge variant="muted">Synthetic demonstration data</Badge>
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
              <Download className="size-4" aria-hidden /> Export CSV
            </Button>
            {can('students.create') && (
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="size-4" aria-hidden /> Add student
              </Button>
            )}
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
            searchPlaceholder="Search name, registration number or identifier…"
            filters={[
              {
                key: 'course',
                label: 'Course',
                value: courseId,
                onChange: (value) => {
                  setCourseId(value);
                  pagination.setPage(1);
                },
                className: 'min-w-[10rem]',
                options: [
                  { value: ALL, label: 'All courses' },
                  ...courses.map((course) => ({ value: course.id, label: course.code })),
                ],
              },
              {
                key: 'year',
                label: 'Academic year',
                value: academicYear,
                onChange: (value) => {
                  setAcademicYear(value);
                  pagination.setPage(1);
                },
                options: [
                  { value: ALL, label: 'All years' },
                  ...Array.from(new Set(students.map((student) => student.academicYear)))
                    .sort()
                    .map((year) => ({ value: year, label: year })),
                ],
              },
              {
                key: 'enrolment',
                label: 'Enrolment',
                value: enrolmentStatus,
                onChange: (value) => {
                  setEnrolmentStatus(value);
                  pagination.setPage(1);
                },
                options: [
                  { value: ALL, label: 'All statuses' },
                  ...ENROLMENT_STATUSES.map((status) => ({ value: status, label: status })),
                ],
              },
              {
                key: 'apaar',
                label: 'APAAR status',
                value: apaarStatus,
                onChange: (value) => {
                  setApaarStatus(value);
                  pagination.setPage(1);
                },
                className: 'min-w-[11rem]',
                options: [
                  { value: ALL, label: 'All APAAR statuses' },
                  ...APAAR_STATUSES.map((status) => ({ value: status, label: status })),
                ],
              },
              {
                key: 'validation',
                label: 'Validation',
                value: validation,
                onChange: (value) => {
                  setValidation(value);
                  pagination.setPage(1);
                },
                options: [
                  { value: ALL, label: 'All validation states' },
                  { value: 'Valid', label: 'Valid' },
                  { value: 'Warning', label: 'Warning' },
                  { value: 'Invalid', label: 'Invalid' },
                ],
              },
            ]}
            onReset={resetFilters}
            resultLabel={`${formatNumber(filtered.length)} of ${formatNumber(students.length)} record(s) match the current filters.`}
          />
        </div>

        <DataTable
          rows={pagination.pageItems}
          columns={columns}
          rowKey={(row) => row.id}
          onRowClick={(row) => navigate(`/institution/students/${row.id}`)}
          caption="Student registry"
          emptyTitle="No student records match"
          emptyDescription="Adjust the filters or add a record. Imported CSV rows appear here after submission."
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
        Exports contain masked identifiers only. APAAR identifiers in this build are synthetic and no
        government verification has been performed. Bulk changes should be made through the CSV
        upload workflow.
      </p>

      <AddStudentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        institutionId={institutionId}
        courses={courses}
        onCreated={(student) => navigate(`/institution/students/${student.id}`)}
      />
      {editing && (
        <EditStudentDialog
          student={editing}
          open={Boolean(editing)}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      )}
      {can('students.write') === false && (
        <p className="text-2xs text-muted-foreground">
          Your role has read-only access to student records; edits are disabled.
        </p>
      )}
    </div>
  );
}
