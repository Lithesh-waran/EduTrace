import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ClipboardCheck,
  GitCompareArrows,
  ListChecks,
  ShieldCheck,
  Users,
  WalletCards,
} from 'lucide-react';
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
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { CHART_COLORS, ChartLegend, SimpleBarChart, StatusDonut } from '@/components/shared/Charts';
import { DemoNotice } from '@/components/shared/DemoNotice';
import { AuditTimeline } from '@/components/shared/AuditTimeline';
import { SubmissionStatusBadge, VerificationStatusBadge } from '@/components/shared/StatusBadge';
import { useAdminData } from '@/hooks/useScopeData';
import { formatDate, formatNumber, percent } from '@/lib/format';
import {
  ACADEMIC_YEARS,
  APAAR_STATUSES,
  ENROLMENT_STATUSES,
  SUBMISSION_STATUSES,
} from '@/types';

const ALL = 'all';

const APAAR_COLORS: Record<string, string> = {
  'Verified by Authorized Source': CHART_COLORS.success,
  Pending: CHART_COLORS.warning,
  'Submitted for Verification': CHART_COLORS.steel,
  'Not Provided': CHART_COLORS.muted,
  'Verification Failed': CHART_COLORS.critical,
  'Verification Unavailable': '#C9A227',
  'Correction Required': '#9D2C29',
};

export function AdminDashboard() {
  const { data, compliance, duplicates, openIssues, institutionsById } = useAdminData();

  const [year, setYear] = React.useState<string>(ALL);
  const [state, setState] = React.useState<string>(ALL);
  const [institutionId, setInstitutionId] = React.useState<string>(ALL);
  const [courseId, setCourseId] = React.useState<string>(ALL);
  const [apaarStatus, setApaarStatus] = React.useState<string>(ALL);
  const [enrolmentStatus, setEnrolmentStatus] = React.useState<string>(ALL);
  const [submissionStatus, setSubmissionStatus] = React.useState<string>(ALL);

  const states = Array.from(new Set(data.institutions.map((institution) => institution.state))).sort();

  const institutions = data.institutions.filter((institution) => {
    if (state !== ALL && institution.state !== state) return false;
    if (institutionId !== ALL && institution.id !== institutionId) return false;
    return true;
  });
  const institutionIds = new Set(institutions.map((institution) => institution.id));

  const students = data.students.filter((student) => {
    if (!institutionIds.has(student.institutionId)) return false;
    if (year !== ALL && student.academicYear !== year) return false;
    if (courseId !== ALL && student.courseId !== courseId) return false;
    if (apaarStatus !== ALL && student.apaarStatus !== apaarStatus) return false;
    if (enrolmentStatus !== ALL && student.enrolmentStatus !== enrolmentStatus) return false;
    return true;
  });

  const submissions = data.submissions.filter((submission) => {
    if (!institutionIds.has(submission.institutionId)) return false;
    if (year !== ALL && submission.academicYear !== year) return false;
    if (submissionStatus !== ALL && submission.status !== submissionStatus) return false;
    return true;
  });

  const filteredCompliance = compliance.filter((row) => {
    if (!institutionIds.has(row.institutionId)) return false;
    if (year !== ALL && row.academicYear !== year) return false;
    if (courseId !== ALL && row.courseId !== courseId) return false;
    return true;
  });

  const issues = openIssues.filter((issue) => institutionIds.has(issue.institutionId));
  const filteredDuplicates = duplicates.filter((candidate) =>
    candidate.institutionIds.some((id) => institutionIds.has(id)),
  );
  const awaiting = submissions.filter((submission) =>
    ['Submitted', 'Resubmitted', 'Under Review', 'Validation in Progress'].includes(submission.status),
  );
  const excessAlerts = filteredCompliance.filter((row) => row.status === 'Potential excess');
  const missingApaar = students.filter((student) => !student.apaarId).length;
  const verifiedApaar = students.filter(
    (student) => student.apaarStatus === 'Verified by Authorized Source',
  ).length;
  const pendingApaar = students.filter((student) =>
    ['Pending', 'Submitted for Verification'].includes(student.apaarStatus),
  ).length;

  const institutionChart = Array.from(institutionIds)
    .map((id) => {
      const rows = filteredCompliance.filter((row) => row.institutionId === id);
      return {
        institution: institutionsById.get(id)?.shortCode ?? id,
        name: institutionsById.get(id)?.name ?? id,
        Approved: rows.reduce((sum, row) => sum + row.approvedIntake, 0),
        Active: rows.reduce((sum, row) => sum + row.activeEnrolment, 0),
      };
    })
    .sort((a, b) => b.Active - a.Active)
    .slice(0, 8);

  const courseChart = Array.from(
    filteredCompliance.reduce(
      (map, row) => {
        const current = map.get(row.courseCode) ?? { course: row.courseCode, Approved: 0, Active: 0 };
        current.Approved += row.approvedIntake;
        current.Active += row.activeEnrolment;
        map.set(row.courseCode, current);
        return map;
      },
      new Map<string, { course: string; Approved: number; Active: number }>(),
    ).values(),
  )
    .sort((a, b) => b.Active - a.Active)
    .slice(0, 8);

  const apaarChart = APAAR_STATUSES.map((status) => ({
    name: status,
    value: students.filter((student) => student.apaarStatus === status).length,
    color: APAAR_COLORS[status] ?? CHART_COLORS.muted,
  }));

  const submissionChart = SUBMISSION_STATUSES.map((status) => ({
    status,
    Submissions: submissions.filter((submission) => submission.status === status).length,
  })).filter((row) => row.Submissions > 0);

  const regional = Array.from(
    institutions.reduce(
      (map, institution) => {
        const current =
          map.get(institution.state) ?? {
            state: institution.state,
            region: institution.region,
            institutions: 0,
            students: 0,
            active: 0,
            verified: 0,
          };
        const cohort = students.filter((student) => student.institutionId === institution.id);
        current.institutions += 1;
        current.students += cohort.length;
        current.active += cohort.filter((student) => student.enrolmentStatus === 'Active').length;
        current.verified += cohort.filter(
          (student) => student.apaarStatus === 'Verified by Authorized Source',
        ).length;
        map.set(institution.state, current);
        return map;
      },
      new Map<string, { state: string; region: string; institutions: number; students: number; active: number; verified: number }>(),
    ).values(),
  ).sort((a, b) => b.students - a.students);

  const priorityQueue = [
    ...excessAlerts.slice(0, 3).map((row) => ({
      key: row.key,
      title: 'Potential intake excess',
      detail: `${row.institutionCode} · ${row.courseCode} (${row.academicYear}) — ${row.activeEnrolment} active vs ${row.approvedIntake} approved`,
      to: '/admin/intake-alerts',
      tone: 'critical' as const,
    })),
    ...awaiting.slice(0, 3).map((submission) => ({
      key: submission.id,
      title: 'Submission awaiting review',
      detail: `${submission.id} · ${institutionsById.get(submission.institutionId)?.shortCode ?? ''} · ${submission.recordCount} records`,
      to: `/admin/submissions/${submission.id}`,
      tone: 'warning' as const,
    })),
    ...filteredDuplicates
      .filter((candidate) => !candidate.review)
      .slice(0, 2)
      .map((candidate) => ({
        key: candidate.key,
        title: 'Duplicate candidate',
        detail: `${candidate.label} · ${candidate.institutionNames.join(', ')}`,
        to: '/admin/duplicate-review',
        tone: 'warning' as const,
      })),
    ...institutions
      .filter((institution) => institution.verificationStatus === 'Submitted' || institution.verificationStatus === 'Under Verification')
      .slice(0, 2)
      .map((institution) => ({
        key: institution.id,
        title: 'Institution verification pending',
        detail: `${institution.shortCode} · ${institution.verificationStatus}`,
        to: '/admin/institution-verification',
        tone: 'info' as const,
      })),
  ].slice(0, 8);

  return (
    <div className="space-y-4">
      <PageHeader
        title="National overview"
        description="Institution, enrolment, identifier and submission monitoring across the demonstration dataset. Every figure responds to the filters below."
        meta={
          <>
            <Badge variant="warning">Synthetic demonstration data</Badge>
            <Badge variant="outline">AICTE administration</Badge>
          </>
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/reports">Open reports</Link>
          </Button>
        }
      />

      <Panel title="Dashboard filters" bodyClassName="p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          <div>
            <label htmlFor="dash-year" className="mb-1 block text-2xs font-medium text-muted-foreground">Academic year</label>
            <SelectRoot value={year} onValueChange={setYear}>
              <SelectTrigger id="dash-year" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All years</SelectItem>
                {ACADEMIC_YEARS.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
          </div>
          <div>
            <label htmlFor="dash-state" className="mb-1 block text-2xs font-medium text-muted-foreground">State / region</label>
            <SelectRoot value={state} onValueChange={(value) => { setState(value); setInstitutionId(ALL); }}>
              <SelectTrigger id="dash-state" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All states</SelectItem>
                {states.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
          </div>
          <div>
            <label htmlFor="dash-institution" className="mb-1 block text-2xs font-medium text-muted-foreground">Institution</label>
            <SelectRoot value={institutionId} onValueChange={setInstitutionId}>
              <SelectTrigger id="dash-institution" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All institutions</SelectItem>
                {data.institutions
                  .filter((institution) => state === ALL || institution.state === state)
                  .map((institution) => (
                    <SelectItem key={institution.id} value={institution.id}>
                      {institution.shortCode}
                    </SelectItem>
                  ))}
              </SelectContent>
            </SelectRoot>
          </div>
          <div>
            <label htmlFor="dash-course" className="mb-1 block text-2xs font-medium text-muted-foreground">Course</label>
            <SelectRoot value={courseId} onValueChange={setCourseId}>
              <SelectTrigger id="dash-course" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All courses</SelectItem>
                {data.courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
          </div>
          <div>
            <label htmlFor="dash-apaar" className="mb-1 block text-2xs font-medium text-muted-foreground">APAAR status</label>
            <SelectRoot value={apaarStatus} onValueChange={setApaarStatus}>
              <SelectTrigger id="dash-apaar" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {APAAR_STATUSES.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
          </div>
          <div>
            <label htmlFor="dash-enrolment" className="mb-1 block text-2xs font-medium text-muted-foreground">Enrolment</label>
            <SelectRoot value={enrolmentStatus} onValueChange={setEnrolmentStatus}>
              <SelectTrigger id="dash-enrolment" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {ENROLMENT_STATUSES.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
          </div>
          <div>
            <label htmlFor="dash-submission" className="mb-1 block text-2xs font-medium text-muted-foreground">Submission</label>
            <SelectRoot value={submissionStatus} onValueChange={setSubmissionStatus}>
              <SelectTrigger id="dash-submission" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {SUBMISSION_STATUSES.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-2xs text-muted-foreground">
          <span>{formatNumber(institutions.length)} institution(s) · {formatNumber(students.length)} record(s) · {formatNumber(submissions.length)} batch(es) in scope.</span>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              setYear(ALL);
              setState(ALL);
              setInstitutionId(ALL);
              setCourseId(ALL);
              setApaarStatus(ALL);
              setEnrolmentStatus(ALL);
              setSubmissionStatus(ALL);
            }}
          >
            Reset filters
          </Button>
        </div>
      </Panel>

      <DemoNotice title="Synthetic monitoring view">
        Records, identifiers and approvals are synthetic. APAAR/ABC verification is simulated and no
        live government verification or official AICTE determination is represented.
      </DemoNotice>

      <StatGrid>
        <StatCard label="Total institutions" value={formatNumber(institutions.length)} icon={Building2} to="/admin/institutions" hint={`${formatNumber(data.institutions.length)} in the full registry`} />
        <StatCard label="Verified institutions" value={formatNumber(institutions.filter((institution) => institution.verificationStatus === 'Verified').length)} icon={ShieldCheck} tone="success" to="/admin/institution-verification" />
        <StatCard label="Pending verification" value={formatNumber(institutions.filter((institution) => ['Submitted', 'Under Verification', 'Correction Required'].includes(institution.verificationStatus)).length)} icon={ShieldCheck} tone="warning" to="/admin/institution-verification" />
        <StatCard label="Total student records" value={formatNumber(students.length)} icon={Users} to="/admin/enrolment-monitoring" />
        <StatCard label="Active enrolment" value={formatNumber(students.filter((student) => student.enrolmentStatus === 'Active').length)} icon={Users} tone="success" to="/admin/enrolment-monitoring" />
        <StatCard label="APAAR verified" value={formatNumber(verifiedApaar)} icon={WalletCards} tone="success" to="/admin/apaar-monitoring" hint="Simulated authorized-source responses" />
        <StatCard label="APAAR pending" value={formatNumber(pendingApaar)} icon={WalletCards} tone="warning" to="/admin/apaar-monitoring" />
        <StatCard label="Missing identifiers" value={formatNumber(missingApaar)} icon={WalletCards} tone="warning" to="/admin/apaar-monitoring" hint="No identifier recorded — never auto-generated" />
        <StatCard label="Potential duplicate records" value={formatNumber(filteredDuplicates.length)} icon={GitCompareArrows} tone="critical" to="/admin/duplicate-review" hint="Candidate groups, not confirmed fraud" />
        <StatCard label="Intake discrepancy alerts" value={formatNumber(excessAlerts.length)} icon={AlertTriangle} tone="warning" to="/admin/intake-alerts" />
        <StatCard label="Submissions awaiting review" value={formatNumber(awaiting.length)} icon={ClipboardCheck} tone="info" to="/admin/submissions" />
        <StatCard label="Unresolved validation issues" value={formatNumber(issues.length)} icon={ListChecks} tone="critical" to="/admin/validation-issues" />
      </StatGrid>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Institution-wise enrolment" description="Approved intake compared with active enrolment across institutions in scope.">
          <ChartLegend
            series={[
              { key: 'Approved', name: 'Approved intake', color: CHART_COLORS.navy },
              { key: 'Active', name: 'Active enrolment', color: CHART_COLORS.steel },
            ]}
          />
          <SimpleBarChart
            data={institutionChart}
            xKey="institution"
            series={[
              { key: 'Approved', name: 'Approved intake', color: CHART_COLORS.navy },
              { key: 'Active', name: 'Active enrolment', color: CHART_COLORS.steel },
            ]}
            height={240}
          />
        </Panel>
        <Panel title="APAAR status distribution" description="All records in scope.">
          <StatusDonut data={apaarChart} totalLabel="records" />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Course-wise intake comparison" description="Aggregated across institutions in scope.">
          <SimpleBarChart
            data={courseChart}
            xKey="course"
            series={[
              { key: 'Approved', name: 'Approved intake', color: CHART_COLORS.navy },
              { key: 'Active', name: 'Active enrolment', color: CHART_COLORS.steel },
            ]}
            height={220}
          />
        </Panel>
        <Panel title="Submission status distribution" description="Batches in scope.">
          {submissionChart.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">No submissions in scope.</p>
          ) : (
            <SimpleBarChart
              data={submissionChart}
              xKey="status"
              layout="vertical"
              series={[{ key: 'Submissions', name: 'Submissions', color: CHART_COLORS.steel }]}
              height={220}
            />
          )}
        </Panel>
        <Panel
          title="Priority review queue"
          description="Items waiting on an administrative decision."
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/intake-alerts">Alerts</Link>
            </Button>
          }
        >
          {priorityQueue.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">No items require review in this scope.</p>
          ) : (
            <ul className="space-y-1.5">
              {priorityQueue.map((item) => (
                <li key={`${item.title}-${item.key}`}>
                  <Link to={item.to} className="block rounded border border-border px-2.5 py-1.5 transition-colors hover:bg-muted/40">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={item.tone === 'critical' ? 'critical' : item.tone === 'warning' ? 'warning' : 'info'}>
                        {item.tone === 'critical' ? 'High' : item.tone === 'warning' ? 'Review' : 'Info'}
                      </Badge>
                      <p className="text-xs font-medium text-foreground">{item.title}</p>
                      <ArrowRight className="ml-auto size-3 text-muted-foreground" aria-hidden />
                    </div>
                    <p className="mt-0.5 text-2xs text-muted-foreground">{item.detail}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Regional summary" description="State-level aggregation for institutions in scope." bodyClassName="p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-muted/60">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">State</th>
                  <th scope="col" className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Region</th>
                  <th scope="col" className="px-3 py-2 text-right text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Institutions</th>
                  <th scope="col" className="px-3 py-2 text-right text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Records</th>
                  <th scope="col" className="px-3 py-2 text-right text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Active</th>
                  <th scope="col" className="px-3 py-2 text-right text-2xs font-semibold uppercase tracking-wide text-muted-foreground">APAAR verified</th>
                  <th scope="col" className="px-3 py-2 text-right text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Verified share</th>
                </tr>
              </thead>
              <tbody>
                {regional.map((row) => (
                  <tr key={row.state} className="border-t border-border">
                    <td className="px-3 py-1.5 font-medium text-foreground">{row.state}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{row.region}</td>
                    <td className="px-3 py-1.5 text-right">{row.institutions}</td>
                    <td className="px-3 py-1.5 text-right">{formatNumber(row.students)}</td>
                    <td className="px-3 py-1.5 text-right">{formatNumber(row.active)}</td>
                    <td className="px-3 py-1.5 text-right">{formatNumber(row.verified)}</td>
                    <td className="px-3 py-1.5 text-right">{percent(row.verified, row.students).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Recent administrative activity" description="Latest audit events across all institutions.">
          <AuditTimeline
            events={[...data.audit]
              .filter((event) => !event.institutionId || institutionIds.has(event.institutionId))
              .sort((a, b) => b.at.localeCompare(a.at))
              .slice(0, 5)}
          />
        </Panel>
      </div>

      <Panel title="Institutions requiring attention" description="Verification status and latest submission for institutions in scope." bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {institutions.map((institution) => {
            const latest = data.submissions
              .filter((submission) => submission.institutionId === institution.id)
              .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
            return (
              <li key={institution.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <Link to={`/admin/institutions/${institution.id}`} className="text-xs font-medium text-secondary hover:underline">
                  {institution.shortCode}
                </Link>
                <span className="max-w-[22rem] truncate text-xs text-foreground">{institution.name}</span>
                <span className="text-2xs text-muted-foreground">{institution.state}</span>
                <VerificationStatusBadge status={institution.verificationStatus} />
                {latest ? (
                  <span className="ml-auto flex items-center gap-1.5">
                    <SubmissionStatusBadge status={latest.status} />
                    <span className="text-2xs text-muted-foreground">{formatDate(latest.submittedAt)}</span>
                  </span>
                ) : (
                  <span className="ml-auto text-2xs text-muted-foreground">No submissions</span>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>

      <p className="text-2xs leading-relaxed text-muted-foreground">
        {formatNumber(openIssues.length)} unresolved validation issue(s) across all institutions.{' '}
        {excessAlerts.length > 0 && `${formatNumber(excessAlerts.length)} cohort(s) show potential intake excess. `}
        Unresolved issues shown here are filtered by institution scope only, not by student-level filters.
      </p>
    </div>
  );
}
