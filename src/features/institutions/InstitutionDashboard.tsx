import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  ClipboardList,
  FileWarning,
  GitCompareArrows,
  ShieldCheck,
  Upload,
  UserPlus,
  Users,
  WalletCards,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { Panel } from '@/components/shared/Panel';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import {
  IssueStatusBadge,
  SubmissionStatusBadge,
  SeverityBadge,
  VerificationStatusBadge,
} from '@/components/shared/StatusBadge';
import { CHART_COLORS, ChartLegend, SimpleBarChart, SimpleLineChart, StatusDonut } from '@/components/shared/Charts';
import { DemoNotice } from '@/components/shared/DemoNotice';
import { AuditTimeline } from '@/components/shared/AuditTimeline';
import { EmptyState } from '@/components/shared/States';
import { useInstitutionData } from '@/hooks/useScopeData';
import { isOpenIssue } from '@/lib/demo/analytics';
import { formatDate, formatNumber, relativeTime } from '@/lib/format';
import { ACADEMIC_YEARS, VERIFICATION_STATUS_META } from '@/types';

const APAAR_COLORS: Record<string, string> = {
  'Verified by Authorized Source': CHART_COLORS.success,
  Pending: CHART_COLORS.warning,
  'Submitted for Verification': CHART_COLORS.steel,
  'Not Provided': CHART_COLORS.muted,
  'Verification Failed': CHART_COLORS.critical,
  'Verification Unavailable': '#C9A227',
  'Correction Required': '#9D2C29',
};

export function InstitutionDashboard() {
  const {
    institution,
    courses,
    students,
    issues,
    submissions,
    compliance,
    duplicates,
    apaar,
    validationStatus,
    openIssueCount,
    audit,
  } = useInstitutionData();

  const currentYear = ACADEMIC_YEARS[ACADEMIC_YEARS.length - 1];
  const currentCompliance = compliance.filter((row) => row.academicYear === currentYear);
  const approvedIntake = currentCompliance.reduce((sum, row) => sum + row.approvedIntake, 0);
  const active = students.filter((student) => student.enrolmentStatus === 'Active');
  const awaitingReview = submissions.filter((submission) =>
    ['Submitted', 'Resubmitted', 'Under Review', 'Validation in Progress'].includes(submission.status),
  );
  const pendingApaar = apaar.Pending + apaar['Submitted for Verification'];
  const requiringCorrection = students.filter((student) => {
    const status = validationStatus.get(student.id);
    return (
      status === 'Invalid' ||
      student.apaarStatus === 'Correction Required' ||
      student.apaarStatus === 'Verification Failed'
    );
  });
  const openAlerts = compliance.filter((row) => row.status === 'Potential excess');
  const unresolvedDuplicates = duplicates.filter(
    (candidate) => !candidate.review || !candidate.review.status.startsWith('Resolved'),
  );
  const openIssues = issues.filter(isOpenIssue);

  const intakeChart = currentCompliance.map((row) => ({
    course: row.courseCode,
    Approved: row.approvedIntake,
    Active: row.activeEnrolment,
  }));

  const apaarChart = Object.entries(apaar).map(([name, value]) => ({
    name,
    value,
    color: APAAR_COLORS[name] ?? CHART_COLORS.muted,
  }));

  const trend = React.useMemo(() => {
    return [...ACADEMIC_YEARS].map((year) => {
      const cohort = students.filter((student) => student.academicYear === year);
      return {
        year,
        'Active enrolment': cohort.filter((student) => student.enrolmentStatus === 'Active').length,
        'Total records': cohort.length,
      };
    });
  }, [students]);

  const recentIssues = [...issues]
    .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
    .slice(0, 5);
  const recentSubmissions = submissions.slice(0, 4);

  if (!institution) {
    return (
      <EmptyState
        title="Institution profile not available"
        description="No institution is linked to this demonstration account. Sign in as an institution role."
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Institution dashboard"
        description={`${institution.name} · ${institution.aicteId}. All figures below are computed from the current demonstration dataset and update as records change.`}
        meta={
          <>
            <VerificationStatusBadge status={institution.verificationStatus} />
            <Badge variant="outline">Academic year {currentYear}</Badge>
            <Badge variant="muted">
              Last verified {institution.lastVerifiedOn ? formatDate(institution.lastVerifiedOn) : 'not verified'}
            </Badge>
          </>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/institution/students">
                <UserPlus className="size-4" aria-hidden /> Manage students
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/institution/upload">
                <Upload className="size-4" aria-hidden /> Upload CSV batch
              </Link>
            </Button>
          </>
        }
      />

      <DemoNotice title="Demonstration dataset">
        Synthetic student records, simulated APAAR/ABC verification and non-authoritative intake
        reference data. Nothing on this page represents an official AICTE determination.
      </DemoNotice>

      <StatGrid>
        <StatCard
          label="Institution verification"
          value={institution.verificationStatus}
          icon={ShieldCheck}
          tone={VERIFICATION_STATUS_META[institution.verificationStatus] === 'success' ? 'success' : 'warning'}
          hint={
            institution.verificationStatus === 'Verified'
              ? `Last verified ${formatDate(institution.lastVerifiedOn)}`
              : 'Verification is not complete; check the reviewer comments in the profile.'
          }
          to="/institution/profile"
        />
        <StatCard
          label="Registered courses"
          value={formatNumber(courses.length)}
          icon={BookOpen}
          hint="Approved courses linked to this institution"
          to="/institution/courses"
        />
        <StatCard
          label="Approved intake"
          value={formatNumber(approvedIntake)}
          icon={Activity}
          hint={`Sanctioned seats across ${currentCompliance.length} course(s) for ${currentYear}`}
          to="/institution/intake-compliance"
        />
        <StatCard
          label="Total student records"
          value={formatNumber(students.length)}
          icon={Users}
          hint="All academic years in the demonstration registry"
          to="/institution/students"
        />
        <StatCard
          label="Active enrolment"
          value={formatNumber(active.length)}
          icon={Users}
          tone="success"
          hint="Records with enrolment status Active"
          to="/institution/students"
        />
        <StatCard
          label="APAAR verified"
          value={formatNumber(apaar['Verified by Authorized Source'])}
          icon={WalletCards}
          tone="success"
          hint="Simulated verification by an authorized source"
          to="/institution/apaar-status"
        />
        <StatCard
          label="APAAR pending"
          value={formatNumber(pendingApaar)}
          icon={WalletCards}
          tone="warning"
          hint="Pending or submitted for (simulated) verification"
          to="/institution/apaar-status"
        />
        <StatCard
          label="Records requiring correction"
          value={formatNumber(requiringCorrection.length)}
          icon={FileWarning}
          tone="critical"
          hint="Open critical issues or failed/corrected identifiers"
          to="/institution/validation-issues"
        />
        <StatCard
          label="Potential duplicate records"
          value={formatNumber(unresolvedDuplicates.length)}
          icon={GitCompareArrows}
          tone="critical"
          hint="Candidate groups open for review, not confirmed duplicates"
          to="/institution/apaar-status"
        />
        <StatCard
          label="Intake discrepancy alerts"
          value={formatNumber(openAlerts.length)}
          icon={AlertTriangle}
          tone="warning"
          hint="Course-years with active enrolment above verified intake"
          to="/institution/intake-compliance"
        />
        <StatCard
          label="Submitted batches"
          value={formatNumber(submissions.filter((submission) => submission.status !== 'Draft').length)}
          icon={ClipboardList}
          hint={`${formatNumber(submissions.length)} batch record(s) in total`}
          to="/institution/submissions"
        />
        <StatCard
          label="Batches awaiting review"
          value={formatNumber(awaitingReview.length)}
          icon={ClipboardList}
          tone="info"
          hint="Submitted, resubmitted, under review or validating"
          to="/institution/submissions"
        />
      </StatGrid>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title={`Course-wise intake comparison · ${currentYear}`}
          description="Active enrolment is compared with the approved intake reference for the same institution, course and academic year."
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link to="/institution/intake-compliance">
                Open compliance <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </Button>
          }
        >
          {intakeChart.length === 0 ? (
            <EmptyState title="No approved intake recorded" description="Approved intake references have not been loaded for this year." />
          ) : (
            <>
              <ChartLegend
                series={[
                  { key: 'Approved', name: 'Approved intake', color: CHART_COLORS.navy },
                  { key: 'Active', name: 'Active enrolment', color: CHART_COLORS.steel },
                ]}
              />
              <SimpleBarChart
                data={intakeChart}
                xKey="course"
                series={[
                  { key: 'Approved', name: 'Approved intake', color: CHART_COLORS.navy },
                  { key: 'Active', name: 'Active enrolment', color: CHART_COLORS.steel },
                ]}
              />
            </>
          )}
        </Panel>

        <Panel
          title="APAAR status distribution"
          description="Identifier status for all records in this institution."
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link to="/institution/apaar-status">View</Link>
            </Button>
          }
        >
          <StatusDonut data={apaarChart} totalLabel="records" />
          <p className="mt-2 text-2xs leading-relaxed text-muted-foreground">
            Verified status reflects simulated adapter responses only. A valid identifier format is
            never treated as verified.
          </p>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Student enrolment trend" description="Records by academic year in the demonstration registry.">
          <ChartLegend
            series={[
              { key: 'Active enrolment', name: 'Active enrolment', color: CHART_COLORS.success },
              { key: 'Total records', name: 'Total records', color: CHART_COLORS.steel },
            ]}
          />
          <SimpleLineChart data={trend} xKey="year" series={[
            { key: 'Active enrolment', name: 'Active enrolment', color: CHART_COLORS.success },
            { key: 'Total records', name: 'Total records', color: CHART_COLORS.steel },
          ]} />
        </Panel>

        <Panel title="Quick actions" description="Common institutional tasks.">
          <div className="grid grid-cols-1 gap-2">
            <Button asChild variant="outline" className="justify-start">
              <Link to="/institution/upload">
                <Upload className="size-4" aria-hidden /> Upload a student CSV batch
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/institution/students">
                <Users className="size-4" aria-hidden /> Search student records
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/institution/validation-issues">
                <AlertTriangle className="size-4" aria-hidden /> Review {formatNumber(openIssues.length)} open validation issue(s)
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/institution/intake-compliance">
                <Activity className="size-4" aria-hidden /> Check intake compliance
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/institution/submissions">
                <ClipboardList className="size-4" aria-hidden /> Track submission responses
              </Link>
            </Button>
          </div>
          <div className="mt-3 rounded border border-border bg-muted/40 px-2.5 py-2 text-2xs leading-relaxed text-muted-foreground">
            {openIssueCount} issue(s) remain open. Deterministic validation only — no AI or machine
            learning is used.
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel
          title="Recent validation issues"
          description="Most recently updated deterministic rule findings."
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link to="/institution/validation-issues">All issues</Link>
            </Button>
          }
          bodyClassName="p-0"
        >
          {recentIssues.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No validation issues" description="No rule findings are recorded for this institution." />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentIssues.map((issue) => (
                <li key={issue.id} className="px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SeverityBadge severity={issue.severity} />
                    <IssueStatusBadge status={issue.status} />
                    <span className="font-mono text-2xs text-muted-foreground">{issue.ruleId}</span>
                    <span className="ml-auto text-2xs text-muted-foreground">{relativeTime(issue.lastUpdated)}</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-foreground">{issue.ruleName}</p>
                  <p className="line-clamp-1 text-2xs text-muted-foreground">
                    {issue.recordRef} · {issue.reason}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Recent submissions"
          description="Latest institutional batches and their review status."
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link to="/institution/submissions">All submissions</Link>
            </Button>
          }
          bodyClassName="p-0"
        >
          {recentSubmissions.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No submissions yet" description="Upload a CSV batch to create the first submission." />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentSubmissions.map((submission) => (
                <li key={submission.id}>
                  <Link
                    to={`/institution/submissions/${submission.id}`}
                    className="block px-4 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-2xs font-medium text-foreground">{submission.id}</span>
                      <SubmissionStatusBadge status={submission.status} />
                      <span className="ml-auto text-2xs text-muted-foreground">
                        {formatDate(submission.submittedAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-2xs text-muted-foreground">
                      {formatNumber(submission.validRecords)} valid ·{' '}
                      {formatNumber(submission.correctionRecords)} correction ·{' '}
                      {submission.academicYear}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="Recent activity"
        description="Audit events recorded against this institution."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/institution/audit-history">Audit history</Link>
          </Button>
        }
      >
        <AuditTimeline events={audit.slice(0, 5)} />
      </Panel>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: 'APAAR identifiers',
            body: `${formatNumber(apaar['Not Provided'])} record(s) have no identifier recorded.`,
            action: 'Open APAAR status',
            to: '/institution/apaar-status',
          },
          {
            title: 'Intake review',
            body: `${formatNumber(openAlerts.length)} course-year cohort(s) exceed verified intake.`,
            action: 'Review calculations',
            to: '/institution/intake-compliance',
          },
          {
            title: 'Duplicate candidates',
            body: `${formatNumber(duplicates.length)} group(s) share an identifier or registration number.`,
            action: 'Inspect candidates',
            to: '/institution/apaar-status',
          },
          {
            title: 'Pending batches',
            body: `${formatNumber(awaitingReview.length)} batch(es) awaiting an AICTE review outcome.`,
            action: 'Open submissions',
            to: '/institution/submissions',
          },
        ].map((item) => (
          <div key={item.title} className="rounded-md border border-border bg-card p-3">
            <p className="text-xs font-semibold text-foreground">{item.title}</p>
            <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">{item.body}</p>
            <Link to={item.to} className="mt-2 inline-flex items-center gap-1 text-2xs font-medium text-secondary hover:underline">
              {item.action} <ArrowRight className="size-3" aria-hidden />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
