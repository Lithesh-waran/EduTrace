import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { Panel } from '@/components/shared/Panel';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { DefinitionList } from '@/components/shared/DefinitionList';
import { IntakeComparison } from '@/components/shared/IntakeComparison';
import { AuditTimeline } from '@/components/shared/AuditTimeline';
import { EmptyState } from '@/components/shared/States';
import {
  ApaarStatusBadge,
  IssueStatusBadge,
  ReferenceStatusBadge,
  SeverityBadge,
  SubmissionStatusBadge,
  VerificationStatusBadge,
} from '@/components/shared/StatusBadge';
import { useAdminData, useInstitutionData } from '@/hooks/useScopeData';
import { isOpenIssue } from '@/lib/demo/analytics';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';

export function InstitutionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useAdminData();
  const institutionId = id ?? '';
  const scope = useInstitutionData(institutionId);

  if (!scope.institution) {
    return (
      <div className="space-y-3">
        <PageHeader title="Institution" description="Institution record not found." />
        <EmptyState
          title="Institution not found"
          description="The institution identifier is not present in the demonstration registry."
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/institutions">
                <ArrowLeft className="size-4" aria-hidden /> Back to registry
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const institution = scope.institution;
  const { courses, students, issues, submissions, compliance, openIssueCount, audit } = scope;
  const excess = compliance.filter((row) => row.status === 'Potential excess');
  const unverified = courses.filter((course) => course.verificationStatus !== 'Verified');

  return (
    <div className="space-y-4">
      <PageHeader
        title={institution.name}
        description={`${institution.aicteId} · ${institution.type} · ${institution.managementType} · ${institution.district}, ${institution.state}`}
        meta={
          <>
            <VerificationStatusBadge status={institution.verificationStatus} />
            <Badge variant="outline">{formatNumber(students.length)} student records</Badge>
            <Badge variant="muted">Last updated {formatDate(institution.lastUpdated)}</Badge>
          </>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/institutions">
                <ArrowLeft className="size-4" aria-hidden /> Registry
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/admin/institution-verification">
                <ShieldCheck className="size-4" aria-hidden /> Verification queue
              </Link>
            </Button>
          </>
        }
      />

      <StatGrid>
        <StatCard label="Student records" value={formatNumber(students.length)} hint={`${formatNumber(students.filter((student) => student.enrolmentStatus === 'Active').length)} active`} />
        <StatCard label="Registered courses" value={formatNumber(courses.length)} hint={`${formatNumber(courses.filter((course) => course.verificationStatus !== 'Verified').length)} reference(s) unverified or provisional`} />
        <StatCard label="Approved intake" value={formatNumber(compliance.filter((row) => row.academicYear === '2026-27').reduce((sum, row) => sum + row.approvedIntake, 0))} hint="Total sanctioned seats for 2026-27" />
        <StatCard label="Intake alerts" value={formatNumber(excess.length)} tone={excess.length > 0 ? 'critical' : 'neutral'} hint="Cohorts above verified intake" />
        <StatCard label="Open validation issues" value={formatNumber(openIssueCount)} tone={openIssueCount > 0 ? 'warning' : 'success'} />
        <StatCard label="Submissions" value={formatNumber(submissions.length)} hint={`${formatNumber(submissions.filter((submission) => ['Submitted', 'Resubmitted', 'Under Review', 'Validation in Progress'].includes(submission.status)).length)} awaiting review`} />
      </StatGrid>

      <Tabs defaultValue="overview">
        <TabsList className="flex w-full flex-wrap sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="intake">Enrolment &amp; intake</TabsTrigger>
          <TabsTrigger value="submissions">Submissions ({submissions.length})</TabsTrigger>
          <TabsTrigger value="issues">Issues ({issues.length})</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Panel title="Institutional details">
              <DefinitionList
                columns={2}
                items={[
                  { label: 'AICTE Permanent ID', value: institution.aicteId, mono: true },
                  { label: 'Institution type', value: institution.type },
                  { label: 'Management type', value: institution.managementType },
                  { label: 'Approval reference', value: institution.approvalRef, mono: true },
                  { label: 'Approval period', value: `${formatDate(institution.approvalFrom)} → ${formatDate(institution.approvalTo)}` },
                  { label: 'Approval source', value: institution.approvalSource, span: 2 },
                  { label: 'Official email', value: institution.email },
                  { label: 'Official contact', value: institution.phone },
                  { label: 'Head of institution', value: institution.headOfInstitution },
                  { label: 'Portal administrator', value: institution.portalAdministrator },
                  { label: 'Address', value: institution.address, span: 2 },
                ]}
              />
            </Panel>

            <div className="space-y-4">
              <Panel title="Verification">
                <div className="flex flex-wrap items-center gap-2">
                  <VerificationStatusBadge status={institution.verificationStatus} />
                  <span className="text-2xs text-muted-foreground">
                    Last verified {institution.lastVerifiedOn ? formatDate(institution.lastVerifiedOn) : 'never'}
                  </span>
                </div>
                {institution.reviewerComments.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">No reviewer decisions recorded.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {institution.reviewerComments.slice(-2).reverse().map((comment, index) => (
                      <li key={`${comment.at}-${index}`} className="rounded border border-border px-2 py-1.5">
                        <p className="text-2xs font-medium text-foreground">
                          {comment.decision} · {formatDate(comment.at)}
                        </p>
                        <p className="text-2xs text-muted-foreground">{comment.reason}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
              <Panel title="Reference data" description="Courses whose intake reference is not fully verified.">
                {unverified.length === 0 ? (
                  <p className="text-xs text-muted-foreground">All course references are verified.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {unverified.map((course) => (
                      <li key={course.id} className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-mono text-2xs">{course.code}</span>
                        <span className="text-muted-foreground">{course.name}</span>
                        <span className="ml-auto"><ReferenceStatusBadge status={course.verificationStatus} /></span>
                      </li>
                    ))}
                  </ul>
                )}
                <Button asChild variant="outline" size="sm" className="mt-2 w-full">
                  <Link to="/admin/approved-intake">Open approved intake registry</Link>
                </Button>
              </Panel>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="intake">
          <div className="space-y-4">
            <Panel title="Compliance comparison" description="Active enrolment against verified approved intake per course-year.">
              {compliance.length === 0 ? (
                <EmptyState title="No intake reference" description="No approved intake data is linked to this institution." />
              ) : (
                <IntakeComparison
                  rows={compliance.map((row) => ({
                    key: row.key,
                    courseName: row.courseName,
                    courseCode: row.courseCode,
                    academicYear: row.academicYear,
                    approvedIntake: row.approvedIntake,
                    activeEnrolment: row.activeEnrolment,
                    excess: row.excess,
                    status: row.status,
                  }))}
                />
              )}
            </Panel>
            <Panel title="Students by course and year" description="Read-only summary of registry records." bodyClassName="p-0">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-muted/60">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Course</th>
                      {Array.from(new Set(students.map((student) => student.academicYear))).sort().map((year) => (
                        <th key={year} scope="col" className="px-3 py-2 text-right text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{year}</th>
                      ))}
                      <th scope="col" className="px-3 py-2 text-right text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((course) => {
                      const cohort = students.filter((student) => student.courseId === course.id);
                      return (
                        <tr key={course.id} className="border-t border-border">
                          <td className="px-3 py-1.5">
                            <span className="font-mono text-2xs">{course.code}</span> {course.name}
                          </td>
                          {Array.from(new Set(students.map((student) => student.academicYear))).sort().map((year) => (
                            <td key={year} className="px-3 py-1.5 text-right">
                              {cohort.filter((student) => student.academicYear === year).length}
                            </td>
                          ))}
                          <td className="px-3 py-1.5 text-right font-medium">{cohort.length}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="submissions">
          <Panel title="Submission history" bodyClassName="p-0">
            {submissions.length === 0 ? (
              <div className="p-4"><EmptyState title="No submissions" description="This institution has not submitted a batch." /></div>
            ) : (
              <ul className="divide-y divide-border">
                {submissions.map((submission) => (
                  <li key={submission.id} className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/admin/submissions/${submission.id}`} className="font-mono text-xs font-medium text-secondary hover:underline">
                        {submission.id}
                      </Link>
                      <SubmissionStatusBadge status={submission.status} />
                      <span className="text-2xs text-muted-foreground">{submission.academicYear}</span>
                      <span className="ml-auto text-2xs text-muted-foreground">
                        {formatDate(submission.submittedAt)} · {submission.recordCount} rows ·{' '}
                        {submission.correctionRecords} corrections
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="issues">
          <Panel title="Validation issues" bodyClassName="p-0">
            {issues.length === 0 ? (
              <div className="p-4"><EmptyState title="No validation issues" description="No rule findings recorded." /></div>
            ) : (
              <ul className="divide-y divide-border">
                {issues.map((issue) => (
                  <li key={issue.id} className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-2xs text-muted-foreground">{issue.id}</span>
                      <SeverityBadge severity={issue.severity} />
                      <IssueStatusBadge status={issue.status} />
                      <span className="ml-auto font-mono text-2xs text-muted-foreground">{issue.recordRef}</span>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-foreground">{issue.ruleName}</p>
                    <p className="text-2xs text-muted-foreground">{issue.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="audit">
          <Panel title="Audit history" description="Read-only events for this institution.">
            <AuditTimeline events={audit} />
          </Panel>
        </TabsContent>
      </Tabs>

      <Panel title="Students (sample)" description="First 10 records in the institution registry; identifiers masked." bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {students.slice(0, 10).map((student) => (
            <li key={student.id} className="flex flex-wrap items-center gap-2 px-3 py-1.5 text-xs">
              <span className="font-mono text-2xs text-muted-foreground">{student.recordId}</span>
              <span className="font-medium text-foreground">{student.name}</span>
              <span className="text-2xs text-muted-foreground">
                {data.courses.find((course) => course.id === student.courseId)?.code} · {student.academicYear}
              </span>
              <span className="ml-auto"><ApaarStatusBadge status={student.apaarStatus} /></span>
              <span className="text-2xs text-muted-foreground">{formatDateTime(student.lastUpdated)}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <p className="text-2xs leading-relaxed text-muted-foreground">
        Administrative views are read-only here. Decisions are recorded from the verification,
        intake-alert or submission queues, each requiring a written reason.
        {excess.length > 0 && ` ${excess.length} intake alert(s) relate to this institution.`}
        {issues.filter(isOpenIssue).length > 0 && ` ${issues.filter(isOpenIssue).length} issue(s) remain unresolved.`}
      </p>
    </div>
  );
}
