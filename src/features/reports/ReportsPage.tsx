import * as React from 'react';
import { Download, FileBarChart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { Panel } from '@/components/shared/Panel';
import { useAdminData, useInstitutionData } from '@/hooks/useScopeData';
import { apaarStatusCounts, findDuplicateCandidates, isOpenIssue } from '@/lib/demo/analytics';
import { downloadCsv, formatNumber } from '@/lib/format';
import { ACADEMIC_YEARS, APAAR_STATUSES, type AuditEvent, type Course, type DuplicateReview, type Institution, type IntakeAlertReview, type Student, type Submission, type ValidationIssue } from '@/types';
import type { IntakeComplianceRow } from '@/lib/demo/analytics';

interface ReportContext {
  institutions: Institution[];
  courses: Course[];
  students: Student[];
  issues: ValidationIssue[];
  submissions: Submission[];
  compliance: IntakeComplianceRow[];
  duplicates: ReturnType<typeof findDuplicateCandidates>;
  audit: AuditEvent[];
  reviews: Record<string, IntakeAlertReview>;
  duplicateReviews: Record<string, DuplicateReview>;
  institutionId?: string;
}

interface ReportDefinition {
  id: string;
  title: string;
  description: string;
  build: (context: ReportContext, year: string) => string[][];
}

const ALL = 'all';

function filterByYear<T extends { academicYear: string }>(rows: T[], year: string): T[] {
  return year === ALL ? rows : rows.filter((row) => row.academicYear === year);
}

const INSTITUTION_REPORTS: ReportDefinition[] = [
  {
    id: 'course-enrolment',
    title: 'Course-wise enrolment',
    description: 'Enrolment counts by course, academic year and enrolment status.',
    build: (context, year) => {
      const rows: string[][] = [
        ['Course code', 'Course', 'Academic year', 'Total records', 'Active', 'Admitted', 'Withdrawn', 'Transferred', 'Completed', 'Pending verification'],
      ];
      for (const course of context.courses) {
        for (const academicYear of Array.from(new Set(context.students.filter((student) => student.courseId === course.id).map((student) => student.academicYear))).sort()) {
          if (year !== ALL && academicYear !== year) continue;
          const cohort = context.students.filter(
            (student) => student.courseId === course.id && student.academicYear === academicYear,
          );
          const count = (status: Student['enrolmentStatus']) =>
            String(cohort.filter((student) => student.enrolmentStatus === status).length);
          rows.push([
            course.code,
            course.name,
            academicYear,
            String(cohort.length),
            count('Active'),
            count('Admitted'),
            count('Withdrawn'),
            count('Transferred'),
            count('Completed'),
            count('Pending Verification'),
          ]);
        }
      }
      return rows;
    },
  },
  {
    id: 'intake-comparison',
    title: 'Approved intake comparison',
    description: 'Approved intake, active enrolment and potential excess per course-year.',
    build: (context, year) => {
      const rows: string[][] = [
        ['Course code', 'Course', 'Academic year', 'Approved intake', 'Active enrolment', 'Pending', 'Withdrawn/transferred', 'Potential excess', 'Reference status', 'Review status'],
      ];
      for (const row of filterByYear(context.compliance, year)) {
        rows.push([
          row.courseCode,
          row.courseName,
          row.academicYear,
          String(row.approvedIntake),
          String(row.activeEnrolment),
          String(row.pendingRecords),
          String(row.withdrawnRecords),
          String(row.excess),
          row.referenceStatus,
          row.reviewStatus ?? 'Not raised',
        ]);
      }
      return rows;
    },
  },
  {
    id: 'apaar-status',
    title: 'APAAR status',
    description: 'Identifier coverage and simulated verification status by course.',
    build: (context, year) => {
      const rows: string[][] = [
        ['Course code', 'Course', 'Academic year', 'Total records', ...APAAR_STATUSES],
      ];
      for (const course of context.courses) {
        for (const academicYear of Array.from(new Set(context.students.filter((student) => student.courseId === course.id).map((student) => student.academicYear))).sort()) {
          if (year !== ALL && academicYear !== year) continue;
          const cohort = context.students.filter(
            (student) => student.courseId === course.id && student.academicYear === academicYear,
          );
          const counts = apaarStatusCounts(cohort);
          rows.push([
            course.code,
            course.name,
            academicYear,
            String(cohort.length),
            ...APAAR_STATUSES.map((status) => String(counts[status])),
          ]);
        }
      }
      return rows;
    },
  },
  {
    id: 'missing-identifiers',
    title: 'Missing identifiers',
    description: 'Records without a recorded APAAR identifier.',
    build: (context, year) => {
      const rows: string[][] = [
        ['Record ID', 'Registration number', 'Student name', 'Course code', 'Academic year', 'Enrolment status', 'APAAR status'],
      ];
      for (const student of filterByYear(context.students, year)) {
        if (student.apaarId) continue;
        rows.push([
          student.recordId,
          student.regNumber,
          student.name,
          context.courses.find((course) => course.id === student.courseId)?.code ?? '',
          student.academicYear,
          student.enrolmentStatus,
          student.apaarStatus,
        ]);
      }
      return rows;
    },
  },
  {
    id: 'duplicate-candidates',
    title: 'Duplicate candidates',
    description: 'Potential duplicate groups with evidence and review status.',
    build: (context) => {
      const rows: string[][] = [
        ['Candidate', 'Type', 'Evidence', 'Records', 'Cross-institution', 'Review status', 'Review reason'],
      ];
      for (const candidate of context.duplicates) {
        rows.push([
          candidate.label,
          candidate.kind,
          candidate.evidence,
          candidate.students.map((student) => student.recordId).join(' | '),
          candidate.crossInstitution ? 'Yes' : 'No',
          candidate.review?.status ?? 'Open',
          candidate.review?.reason ?? '',
        ]);
      }
      return rows;
    },
  },
  {
    id: 'validation-issues',
    title: 'Validation issues',
    description: 'All deterministic rule findings and their current status.',
    build: (context) => {
      const rows: string[][] = [
        ['Issue ID', 'Rule ID', 'Rule', 'Severity', 'Record / batch', 'Reason', 'Status', 'Assigned to', 'Detected', 'Last updated'],
      ];
      for (const issue of context.issues) {
        rows.push([
          issue.id,
          issue.ruleId,
          issue.ruleName,
          issue.severity,
          issue.recordRef,
          issue.reason,
          issue.status,
          issue.assignedTo ?? '',
          issue.detectedAt,
          issue.lastUpdated,
        ]);
      }
      return rows;
    },
  },
  {
    id: 'submission-status',
    title: 'Submission status',
    description: 'Batch progress, record counts and reviewer assignment.',
    build: (context) => {
      const rows: string[][] = [
        ['Submission ID', 'Academic year', 'File', 'Rows', 'Valid', 'Corrections', 'Status', 'Reviewer', 'Submitted', 'Last updated'],
      ];
      for (const submission of context.submissions) {
        rows.push([
          submission.id,
          submission.academicYear,
          submission.file.name,
          String(submission.recordCount),
          String(submission.validRecords),
          String(submission.correctionRecords),
          submission.status,
          submission.reviewer ?? '',
          submission.submittedAt,
          submission.lastUpdated,
        ]);
      }
      return rows;
    },
  },
  {
    id: 'institution-activity',
    title: 'Institution activity',
    description: 'Audit events recorded against the institution.',
    build: (context) => {
      const rows: string[][] = [
        ['Timestamp', 'Actor', 'Role', 'Action', 'Record', 'Reason', 'Change summary'],
      ];
      for (const event of context.audit) {
        rows.push([
          event.at,
          event.actor,
          event.actorRole,
          event.action,
          event.recordRef,
          event.reason ?? '',
          event.changeSummary,
        ]);
      }
      return rows;
    },
  },
];

const ADMIN_REPORTS: ReportDefinition[] = [
  {
    id: 'institution-enrolment',
    title: 'Institution-wise enrolment',
    description: 'Records, active enrolment, identifier coverage and unresolved issues by institution.',
    build: (context, year) => {
      const rows: string[][] = [
        ['AICTE ID', 'Institution', 'State', 'Total records', 'Active', 'APAAR verified', 'Missing identifiers', 'Open issues', 'Submissions'],
      ];
      for (const institution of context.institutions) {
        const cohort = filterByYear(
          context.students.filter((student) => student.institutionId === institution.id),
          year,
        );
        const institutionIssues = context.issues.filter(
          (issue) => issue.institutionId === institution.id && isOpenIssue(issue),
        );
        rows.push([
          institution.aicteId,
          institution.name,
          institution.state,
          String(cohort.length),
          String(cohort.filter((student) => student.enrolmentStatus === 'Active').length),
          String(cohort.filter((student) => student.apaarStatus === 'Verified by Authorized Source').length),
          String(cohort.filter((student) => !student.apaarId).length),
          String(institutionIssues.length),
          String(context.submissions.filter((submission) => submission.institutionId === institution.id).length),
        ]);
      }
      return rows;
    },
  },
  {
    id: 'region-enrolment',
    title: 'Region-wise enrolment',
    description: 'Aggregated enrolment and identifier coverage by state and region.',
    build: (context, year) => {
      const rows: string[][] = [
        ['Region', 'State', 'Institutions', 'Total records', 'Active', 'APAAR verified', 'Missing identifiers'],
      ];
      const groups = new Map<string, Institution[]>();
      for (const institution of context.institutions) {
        const key = `${institution.region}||${institution.state}`;
        groups.set(key, [...(groups.get(key) ?? []), institution]);
      }
      for (const [key, institutions] of groups) {
        const [region, state] = key.split('||');
        const ids = new Set(institutions.map((institution) => institution.id));
        const cohort = filterByYear(
          context.students.filter((student) => ids.has(student.institutionId)),
          year,
        );
        rows.push([
          region,
          state,
          String(institutions.length),
          String(cohort.length),
          String(cohort.filter((student) => student.enrolmentStatus === 'Active').length),
          String(cohort.filter((student) => student.apaarStatus === 'Verified by Authorized Source').length),
          String(cohort.filter((student) => !student.apaarId).length),
        ]);
      }
      return rows;
    },
  },
  {
    id: 'course-intake',
    title: 'Course-wise intake comparison',
    description: 'National comparison of approved intake and active enrolment.',
    build: (context, year) => {
      const rows: string[][] = [
        ['Institution', 'Course code', 'Course', 'Academic year', 'Approved intake', 'Active', 'Potential excess', 'Reference', 'Review status'],
      ];
      for (const row of filterByYear(context.compliance, year)) {
        rows.push([
          row.institutionName,
          row.courseCode,
          row.courseName,
          row.academicYear,
          String(row.approvedIntake),
          String(row.activeEnrolment),
          String(row.excess),
          row.referenceStatus,
          row.reviewStatus ?? 'Not raised',
        ]);
      }
      return rows;
    },
  },
  {
    id: 'apaar-monitoring',
    title: 'APAAR status',
    description: 'Identifier status distribution per institution (simulated verification).',
    build: (context, year) => {
      const rows: string[][] = [
        ['Institution', 'Academic year', 'Total', ...APAAR_STATUSES],
      ];
      for (const institution of context.institutions) {
        for (const academicYear of Array.from(
          new Set(
            context.students
              .filter((student) => student.institutionId === institution.id)
              .map((student) => student.academicYear),
          ),
        ).sort()) {
          if (year !== ALL && academicYear !== year) continue;
          const cohort = context.students.filter(
            (student) =>
              student.institutionId === institution.id && student.academicYear === academicYear,
          );
          const counts = apaarStatusCounts(cohort);
          rows.push([
            institution.name,
            academicYear,
            String(cohort.length),
            ...APAAR_STATUSES.map((status) => String(counts[status])),
          ]);
        }
      }
      return rows;
    },
  },
  {
    id: 'duplicate-candidates',
    title: 'Duplicate candidates',
    description: 'Cross-institution and within-institution duplicate candidates under review.',
    build: (context) => {
      const rows: string[][] = [
        ['Candidate', 'Type', 'Institutions', 'Records', 'Evidence', 'Review status', 'Review reason'],
      ];
      for (const candidate of context.duplicates) {
        rows.push([
          candidate.label,
          candidate.kind,
          candidate.institutionNames.join(' | '),
          candidate.students.map((student) => student.recordId).join(' | '),
          candidate.evidence,
          candidate.review?.status ?? 'Open',
          candidate.review?.reason ?? '',
        ]);
      }
      return rows;
    },
  },
  {
    id: 'intake-alerts',
    title: 'Intake discrepancy cases',
    description: 'Course-year cohorts above verified intake, with recorded review decisions.',
    build: (context, year) => {
      const rows: string[][] = [
        ['Institution', 'Course', 'Academic year', 'Approved intake', 'Active', 'Excess', 'Reference', 'Review status', 'Last decision', 'Reason'],
      ];
      for (const row of filterByYear(context.compliance, year)) {
        if (row.status === 'Within configured limit') continue;
        const review = context.reviews[row.key];
        const last = review?.actions[review.actions.length - 1];
        rows.push([
          row.institutionName,
          row.courseCode,
          row.academicYear,
          String(row.approvedIntake),
          String(row.activeEnrolment),
          String(row.excess),
          row.referenceStatus,
          review?.status ?? 'Open',
          last ? `${last.action} · ${last.at}` : '',
          last?.reason ?? '',
        ]);
      }
      return rows;
    },
  },
  {
    id: 'submission-processing',
    title: 'Submission processing',
    description: 'Batch throughput, corrections and review status nationally.',
    build: (context) => {
      const rows: string[][] = [
        ['Submission ID', 'Institution', 'Academic year', 'Rows', 'Valid', 'Corrections', 'Status', 'Reviewer', 'Submitted', 'Last updated'],
      ];
      for (const submission of context.submissions) {
        rows.push([
          submission.id,
          context.institutions.find((institution) => institution.id === submission.institutionId)?.name ?? '',
          submission.academicYear,
          String(submission.recordCount),
          String(submission.validRecords),
          String(submission.correctionRecords),
          submission.status,
          submission.reviewer ?? '',
          submission.submittedAt,
          submission.lastUpdated,
        ]);
      }
      return rows;
    },
  },
  {
    id: 'outstanding-corrections',
    title: 'Outstanding corrections',
    description: 'Open and escalated issues requiring institutional or administrative action.',
    build: (context) => {
      const rows: string[][] = [
        ['Issue ID', 'Institution', 'Rule', 'Severity', 'Status', 'Record', 'Reason', 'Last updated'],
      ];
      for (const issue of context.issues.filter(isOpenIssue)) {
        rows.push([
          issue.id,
          context.institutions.find((institution) => institution.id === issue.institutionId)?.name ?? '',
          `${issue.ruleId} · ${issue.ruleName}`,
          issue.severity,
          issue.status,
          issue.recordRef,
          issue.reason,
          issue.lastUpdated,
        ]);
      }
      return rows;
    },
  },
  {
    id: 'audit-activity',
    title: 'Audit activity',
    description: 'All administrative and institutional actions recorded in the audit trail.',
    build: (context) => {
      const rows: string[][] = [
        ['Timestamp', 'Actor', 'Role', 'Institution', 'Action', 'Record', 'Reason', 'Change summary'],
      ];
      for (const event of context.audit) {
        rows.push([
          event.at,
          event.actor,
          event.actorRole,
          context.institutions.find((institution) => institution.id === event.institutionId)?.name ?? '',
          event.action,
          event.recordRef,
          event.reason ?? '',
          event.changeSummary,
        ]);
      }
      return rows;
    },
  },
];

function ReportsView({
  definitions,
  context,
  title,
  description,
  scopeLabel,
}: {
  definitions: ReportDefinition[];
  context: ReportContext;
  title: string;
  description: string;
  scopeLabel: string;
}) {
  const [year, setYear] = React.useState<string>(ACADEMIC_YEARS[ACADEMIC_YEARS.length - 1]);
  const [selectedId, setSelectedId] = React.useState(definitions[0]?.id ?? '');
  const selected = definitions.find((definition) => definition.id === selectedId) ?? definitions[0];
  const preview = selected ? selected.build(context, year) : [];
  const duplicateCandidates = context.duplicates;

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        description={description}
        meta={
          <>
            <Badge variant="outline">{definitions.length} report(s)</Badge>
            <Badge variant="muted">CSV export in demonstration mode</Badge>
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <label htmlFor="report-year" className="text-2xs font-medium text-muted-foreground">
              Academic year
            </label>
            <SelectRoot value={year} onValueChange={setYear}>
              <SelectTrigger id="report-year" className="w-[9rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All years</SelectItem>
                {ACADEMIC_YEARS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <Panel title="Available reports" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {definitions.map((definition) => {
              const rows = definition.build(context, year);
              return (
                <li key={definition.id}>
                  <div
                    className={
                      definition.id === selected?.id
                        ? 'bg-secondary/5 px-3 py-2.5'
                        : 'px-3 py-2.5 hover:bg-muted/40'
                    }
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(definition.id)}
                      className="w-full text-left focus-visible:outline-none"
                      aria-current={definition.id === selected?.id ? 'true' : undefined}
                    >
                      <p className="text-xs font-medium text-foreground">{definition.title}</p>
                      <p className="mt-0.5 text-2xs leading-snug text-muted-foreground">
                        {definition.description}
                      </p>
                      <p className="mt-1 text-2xs text-muted-foreground">
                        {rows.length > 1 ? `${formatNumber(rows.length - 1)} data row(s)` : 'No rows for this filter'}
                      </p>
                    </button>
                    <Button
                      size="xs"
                      variant="outline"
                      className="mt-1.5"
                      disabled={rows.length <= 1}
                      onClick={() => {
                        const safeYear = year === ALL ? 'all' : year;
                        downloadCsv(`${definition.id}_${scopeLabel}_${safeYear}.csv`, rows);
                      }}
                    >
                      <Download className="size-3" aria-hidden /> Export CSV
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel
          title={selected?.title ?? 'Report preview'}
          description={selected?.description}
          actions={
            selected && (
              <Button
                size="sm"
                onClick={() => downloadCsv(`${selected.id}_${scopeLabel}_${year}.csv`, preview)}
                disabled={preview.length <= 1}
              >
                <Download className="size-3.5" aria-hidden /> Download CSV
              </Button>
            )
          }
          bodyClassName="p-0"
        >
          {!selected || preview.length <= 1 ? (
            <div className="p-4">
              <p className="text-xs text-muted-foreground">
                No data rows for this report with the selected academic year.
              </p>
            </div>
          ) : (
            <div className="max-h-[32rem] overflow-auto scrollbar-thin">
              <table className="w-full border-collapse text-2xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    {preview[0].map((header) => (
                      <th
                        key={header}
                        scope="col"
                        className="whitespace-nowrap px-2.5 py-2 text-left font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(1, 60).map((row, index) => (
                    <tr key={index} className="border-t border-border">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="max-w-[18rem] truncate px-2.5 py-1.5">
                          {cell || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2 text-2xs text-muted-foreground">
            <FileBarChart className="size-3" aria-hidden />
            Showing {formatNumber(Math.max(0, Math.min(preview.length - 1, 60)))} of{' '}
            {formatNumber(Math.max(0, preview.length - 1))} row(s). Exports contain the full result.
            Duplicate candidate rows available: {formatNumber(duplicateCandidates.length)}.
          </div>
        </Panel>
      </div>

      <p className="text-2xs leading-relaxed text-muted-foreground">
        Exports in this demonstration are generated in the browser from synthetic data. Identifiers
        are omitted or masked where present. In production, reports must be generated server-side with
        authorization, and exports logged. Report names mirror the intended Django endpoints in
        <code className="mx-1 rounded bg-muted px-1 font-mono">src/lib/api/services.ts</code>.
      </p>
    </div>
  );
}

export function InstitutionReportsPage() {
  const { institution, courses, students, issues, submissions, compliance, duplicates, audit, data } =
    useInstitutionData();
  const context: ReportContext = {
    institutions: institution ? [institution] : [],
    courses,
    students,
    issues,
    submissions,
    compliance,
    duplicates,
    audit,
    reviews: data.alertReviews,
    duplicateReviews: data.duplicateReviews,
    institutionId: institution?.id,
  };
  return (
    <ReportsView
      definitions={INSTITUTION_REPORTS}
      context={context}
      title="Reports"
      description="Downloadable operational reports for your institution. Filters and exports use the same data source as the dashboards."
      scopeLabel={institution?.shortCode ?? 'institution'}
    />
  );
}

export function AdminReportsPage() {
  const { data, compliance, duplicates } = useAdminData();
  const context: ReportContext = {
    institutions: data.institutions,
    courses: data.courses,
    students: data.students,
    issues: data.issues,
    submissions: data.submissions,
    compliance,
    duplicates,
    audit: data.audit,
    reviews: data.alertReviews,
    duplicateReviews: data.duplicateReviews,
  };
  return (
    <ReportsView
      definitions={ADMIN_REPORTS}
      context={context}
      title="Reports & analytics"
      description="Cross-institution regulatory reporting derived from the active demonstration dataset."
      scopeLabel="aicte"
    />
  );
}
