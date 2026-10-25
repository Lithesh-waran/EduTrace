import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileWarning, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageHeader } from '@/components/shared/PageHeader';
import { Panel } from '@/components/shared/Panel';
import { DefinitionList } from '@/components/shared/DefinitionList';
import {
  ApaarStatusBadge,
  EnrolmentStatusBadge,
  IssueStatusBadge,
  SeverityBadge,
  SubmissionStatusBadge,
  ValidationStatusBadge,
} from '@/components/shared/StatusBadge';
import { ValidationIssuePanel } from '@/components/shared/ValidationIssuePanel';
import { AuditTimeline } from '@/components/shared/AuditTimeline';
import { EmptyState } from '@/components/shared/States';
import { useInstitutionData, useLookups } from '@/hooks/useScopeData';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useEduTrace } from '@/lib/demo/store';
import { issuesForStudent, isOpenIssue } from '@/lib/demo/analytics';
import { formatDate, formatDateTime, maskIdentifier } from '@/lib/format';
import { APAAR_STATUS_META } from '@/types';
import { validateStudentRecord } from '@/lib/validation/engine';
import { EditStudentDialog } from './StudentFormDialog';

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useEduTrace();
  const { can } = useAuth();
  const { institution, institutionId, courses, students, duplicates, validationStatus } =
    useInstitutionData();
  const lookups = useLookups();
  const [editOpen, setEditOpen] = React.useState(false);

  const student = data.students.find((candidate) => candidate.id === id);

  if (!student || !institution || student.institutionId !== institutionId) {
    return (
      <div className="space-y-4">
        <PageHeader title="Student record" description="The requested record is not available in this institution." />
        <EmptyState
          title="Record not found"
          description="The record may have been removed or belongs to another institution."
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/institution/students">
                <ArrowLeft className="size-4" aria-hidden /> Back to student records
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const course = lookups.course(student.courseId);
  const studentIssues = issuesForStudent(data.issues, student.id).sort((a, b) =>
    b.lastUpdated.localeCompare(a.lastUpdated),
  );
  const openIssues = studentIssues.filter(isOpenIssue);
  const validation = validationStatus.get(student.id) ?? 'Not Validated';
  const duplicate = duplicates.find((candidate) =>
    candidate.students.some((candidateStudent) => candidateStudent.id === student.id),
  );
  const findings = validateStudentRecord(student, {
    institution,
    courses,
    students,
    allStudents: data.students,
  });
  const submission = student.sourceBatchId
    ? data.submissions.find((batch) => batch.id === student.sourceBatchId)
    : undefined;
  const relatedSubmissions = data.submissions.filter(
    (batch) =>
      batch.institutionId === student.institutionId &&
      batch.academicYear === student.academicYear,
  );
  const studentAudit = data.audit
    .filter(
      (event) =>
        event.recordRef === student.recordId ||
        studentIssues.some((issue) => event.recordRef === issue.id) ||
        (submission && event.recordRef === submission.id),
    )
    .sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="space-y-4">
      <PageHeader
        title={student.name}
        description={`${course?.name ?? 'Unknown course'} · ${student.academicYear} · Registration ${student.regNumber}`}
        meta={
          <>
            <Badge variant="outline" className="font-mono">
              {student.recordId}
            </Badge>
            <EnrolmentStatusBadge status={student.enrolmentStatus} />
            <ApaarStatusBadge status={student.apaarStatus} />
            <ValidationStatusBadge status={validation} />
          </>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/institution/students">
                <ArrowLeft className="size-4" aria-hidden /> Back
              </Link>
            </Button>
            {can('students.write') && (
              <Button size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" aria-hidden /> Edit record
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <Tabs defaultValue="overview">
            <TabsList className="flex w-full flex-wrap sm:w-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="issues">
                Validation issues ({studentIssues.length})
              </TabsTrigger>
              <TabsTrigger value="submissions">
                Submission history ({relatedSubmissions.length})
              </TabsTrigger>
              <TabsTrigger value="audit">Audit history ({studentAudit.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="space-y-4">
                <Panel title="Enrolment information">
                  <DefinitionList
                    columns={3}
                    items={[
                      { label: 'Registration number', value: student.regNumber, mono: true },
                      { label: 'Student name', value: student.name },
                      { label: 'Record ID', value: student.recordId, mono: true },
                      { label: 'Course', value: `${lookups.courseName(student.courseId)} (${lookups.courseCode(student.courseId)})` },
                      { label: 'Academic year', value: student.academicYear },
                      { label: 'Admission date', value: formatDate(student.admissionDate) },
                      { label: 'Enrolment status', value: <EnrolmentStatusBadge status={student.enrolmentStatus} /> },
                      { label: 'Validation status', value: <ValidationStatusBadge status={validation} /> },
                      { label: 'Last updated', value: formatDateTime(student.lastUpdated) },
                    ]}
                  />
                </Panel>

                <Panel title="APAAR identifier">
                  <DefinitionList
                    columns={2}
                    items={[
                      { label: 'Identifier (masked)', value: maskIdentifier(student.apaarId), mono: true },
                      { label: 'Status', value: <ApaarStatusBadge status={student.apaarStatus} /> },
                      {
                        label: 'Status meaning',
                        value: APAAR_STATUS_META[student.apaarStatus].description,
                        span: 2,
                      },
                    ]}
                  />
                  <p className="mt-3 rounded border border-border bg-muted/40 px-2.5 py-2 text-2xs leading-relaxed text-muted-foreground">
                    Identification is synthetic in this build and verification is simulated. A
                    correctly formatted identifier is never displayed as verified without an
                    authorized-source response.
                  </p>
                </Panel>

                {findings.length > 0 && (
                  <Panel title="Current rule findings" description="Recomputed from the live record and reference data.">
                    <ul className="space-y-2">
                      {findings.map((finding, index) => (
                        <li key={`${finding.ruleId}-${index}`} className="rounded border border-border px-2.5 py-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <SeverityBadge severity={finding.severity} />
                            <span className="font-mono text-2xs text-muted-foreground">{finding.ruleId}</span>
                            <span className="text-xs font-medium text-foreground">{finding.ruleName}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{finding.evidence}</p>
                          <p className="text-2xs text-foreground/80">Next: {finding.suggestedAction}</p>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                )}

                {duplicate && (
                  <Alert tone="critical">
                    <AlertTitle className="flex items-center gap-1.5">
                      <FileWarning className="size-3.5" aria-hidden /> Duplicate candidate
                    </AlertTitle>
                    <AlertDescription>
                      {duplicate.evidence} Status:{' '}
                      {duplicate.review?.status ?? 'Open — awaiting review'}.{' '}
                      <Link to="/institution/validation-issues" className="font-medium underline">
                        Review the related validation issues
                      </Link>
                      .
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

            <TabsContent value="issues">
              {studentIssues.length === 0 ? (
                <EmptyState
                  title="No validation issues"
                  description="No deterministic rule findings are recorded against this student."
                />
              ) : (
                <div className="space-y-3">
                  {openIssues.length > 0 && (
                    <Alert tone="warning">
                      <AlertTitle>{openIssues.length} open issue(s)</AlertTitle>
                      <AlertDescription>
                        Open issues keep this record labelled {validation}. Corrections are made in the
                        institution registry; reviewers can resolve issues from the validation queue.
                      </AlertDescription>
                    </Alert>
                  )}
                  {studentIssues.map((issue) => (
                    <ValidationIssuePanel key={issue.id} issue={issue} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="submissions">
              <Panel title="Submission history" description="Batches from this institution for the student's academic year, plus the source batch where known.">
                {relatedSubmissions.length === 0 ? (
                  <EmptyState title="No submission history" description="This record is not linked to a submitted batch." />
                ) : (
                  <ul className="divide-y divide-border">
                    {relatedSubmissions.map((batch) => (
                      <li key={batch.id} className="flex flex-wrap items-center gap-2 py-2 first:pt-0 last:pb-0">
                        <Link
                          to={`/institution/submissions/${batch.id}`}
                          className="font-mono text-xs font-medium text-secondary hover:underline"
                        >
                          {batch.id}
                        </Link>
                        <SubmissionStatusBadge status={batch.status} />
                        {student.sourceBatchId === batch.id && <Badge variant="info">Source batch</Badge>}
                        <span className="ml-auto text-2xs text-muted-foreground">
                          {formatDate(batch.submittedAt)} · {batch.validRecords} valid / {batch.recordCount} rows
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </TabsContent>

            <TabsContent value="audit">
              <Panel title="Audit history" description="Read-only record of changes and review actions.">
                <AuditTimeline events={studentAudit} />
              </Panel>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-4">
          <Panel title="Validation summary">
            <dl className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Validation status</dt>
                <dd><ValidationStatusBadge status={validation} /></dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Open issues</dt>
                <dd className="font-medium text-foreground">{openIssues.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Total issues</dt>
                <dd className="font-medium text-foreground">{studentIssues.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Duplicate candidate</dt>
                <dd className="font-medium text-foreground">{duplicate ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
            <Button asChild variant="outline" size="sm" className="mt-3 w-full">
              <Link to="/institution/validation-issues">Open issue queue</Link>
            </Button>
          </Panel>

          <Panel title="Linked batch">
            {submission ? (
              <>
                <p className="font-mono text-xs font-medium text-foreground">{submission.id}</p>
                <div className="mt-1"><SubmissionStatusBadge status={submission.status} /></div>
                <p className="mt-1.5 text-2xs text-muted-foreground">
                  {submission.file.name} · {submission.academicYear}
                </p>
                <Button asChild variant="outline" size="sm" className="mt-2 w-full">
                  <Link to={`/institution/submissions/${submission.id}`}>Open submission</Link>
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                No batch is linked to this record. Records added manually are not part of a submitted
                batch until the next upload.
              </p>
            )}
          </Panel>

          {studentIssues.length > 0 && (
            <Panel title="Issue status mix" bodyClassName="p-3">
              <ul className="space-y-1.5">
                {studentIssues.slice(0, 4).map((issue) => (
                  <li key={issue.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-mono text-2xs text-muted-foreground">
                      {issue.ruleId}
                    </span>
                    <IssueStatusBadge status={issue.status} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </aside>
      </div>

      <EditStudentDialog
        student={student}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}
