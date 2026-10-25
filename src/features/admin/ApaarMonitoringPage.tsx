import * as React from 'react';
import { Link } from 'react-router-dom';
import { Download, WalletCards } from 'lucide-react';
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
import { CHART_COLORS, StatusDonut } from '@/components/shared/Charts';
import { SimulationNotice } from '@/components/shared/DemoNotice';
import { useAdminData } from '@/hooks/useScopeData';
import { apaarStatusCounts } from '@/lib/demo/analytics';
import { downloadCsv, formatNumber, percent } from '@/lib/format';
import { ACADEMIC_YEARS, APAAR_STATUSES, type ApaarStatus } from '@/types';

const ALL = 'all';

const STATUS_COLORS: Record<ApaarStatus, string> = {
  'Verified by Authorized Source': CHART_COLORS.success,
  Pending: CHART_COLORS.warning,
  'Submitted for Verification': CHART_COLORS.steel,
  'Not Provided': CHART_COLORS.muted,
  'Verification Failed': CHART_COLORS.critical,
  'Verification Unavailable': '#C9A227',
  'Correction Required': '#9D2C29',
};

export function ApaarMonitoringPage() {
  const { data } = useAdminData();
  const [year, setYear] = React.useState<string>(ACADEMIC_YEARS[ACADEMIC_YEARS.length - 1]);
  const [state, setState] = React.useState(ALL);

  const institutions = data.institutions.filter((institution) => state === ALL || institution.state === state);
  const institutionIds = new Set(institutions.map((institution) => institution.id));
  const students = data.students.filter(
    (student) =>
      institutionIds.has(student.institutionId) &&
      (year === ALL || student.academicYear === year),
  );
  const totals = apaarStatusCounts(students);
  const idsRecorded = students.filter((student) => Boolean(student.apaarId)).length;

  const donut = APAAR_STATUSES.map((status) => ({
    name: status,
    value: totals[status],
    color: STATUS_COLORS[status],
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="APAAR monitoring"
        description="National identifier coverage and simulated verification status. No authorized APAAR/ABC integration is configured in this build."
        meta={
          <>
            <Badge variant="outline">{formatNumber(students.length)} records in scope</Badge>
            <Badge variant="warning">Simulation only</Badge>
          </>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={students.length === 0}
            onClick={() =>
              downloadCsv(`apaar_monitoring_${year}.csv`, [
                ['Institution', 'State', 'Academic year', 'Total', ...APAAR_STATUSES],
                ...institutions.map((institution) => [
                  institution.name,
                  institution.state,
                  year === ALL ? 'All years' : year,
                  String(
                    data.students.filter(
                      (student) =>
                        student.institutionId === institution.id &&
                        (year === ALL || student.academicYear === year),
                    ).length,
                  ),
                  ...APAAR_STATUSES.map((status) =>
                    String(
                      data.students.filter(
                        (student) =>
                          student.institutionId === institution.id &&
                          (year === ALL || student.academicYear === year) &&
                          student.apaarStatus === status,
                      ).length,
                    ),
                  ),
                ]),
              ])
            }
          >
            <Download className="size-4" aria-hidden /> Export CSV
          </Button>
        }
      />

      <SimulationNotice>
        Simulation only — this dashboard does not represent live government verification. Every
        “verified” status shown here comes from a simulated adapter response against synthetic
        identifiers. No APAAR/ABC request has been made.
      </SimulationNotice>

      <Panel bodyClassName="p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="w-full sm:w-[10rem]">
            <label htmlFor="apaar-year" className="mb-1 block text-2xs font-medium text-muted-foreground">Academic year</label>
            <SelectRoot value={year} onValueChange={setYear}>
              <SelectTrigger id="apaar-year" className="h-8 text-xs">
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
          <div className="w-full sm:w-[12rem]">
            <label htmlFor="apaar-state" className="mb-1 block text-2xs font-medium text-muted-foreground">State</label>
            <SelectRoot value={state} onValueChange={setState}>
              <SelectTrigger id="apaar-state" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All states</SelectItem>
                {Array.from(new Set(data.institutions.map((institution) => institution.state))).sort().map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
          </div>
          <p className="text-2xs text-muted-foreground sm:ml-auto">
            {formatNumber(idsRecorded)} of {formatNumber(students.length)} records have an identifier (
            {percent(idsRecorded, students.length).toFixed(0)}% coverage).
          </p>
        </div>
      </Panel>

      <StatGrid className="xl:grid-cols-4">
        <StatCard label="IDs recorded" value={formatNumber(idsRecorded)} icon={WalletCards} tone="info" hint="Any non-empty identifier value" />
        <StatCard label="Verified (simulated)" value={formatNumber(totals['Verified by Authorized Source'])} icon={WalletCards} tone="success" />
        <StatCard label="Pending verification" value={formatNumber(totals.Pending)} icon={WalletCards} tone="warning" />
        <StatCard label="Submitted for verification" value={formatNumber(totals['Submitted for Verification'])} icon={WalletCards} tone="info" />
        <StatCard label="Verification failed" value={formatNumber(totals['Verification Failed'])} icon={WalletCards} tone="critical" />
        <StatCard label="Missing identifiers" value={formatNumber(totals['Not Provided'])} icon={WalletCards} tone="warning" />
        <StatCard label="Verification unavailable" value={formatNumber(totals['Verification Unavailable'])} icon={WalletCards} tone="warning" />
        <StatCard label="Correction required" value={formatNumber(totals['Correction Required'])} icon={WalletCards} tone="critical" />
      </StatGrid>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Status distribution" description="Records in the selected scope.">
          <StatusDonut data={donut} totalLabel="records" />
          <p className="mt-2 text-2xs leading-relaxed text-muted-foreground">
            A valid 12-digit format is never counted as verified. Only a simulated authorized-source
            response sets the verified status.
          </p>
        </Panel>

        <Panel className="xl:col-span-2" title="Institution coverage" description="Identifier status by institution." bodyClassName="p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-muted/60">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Institution</th>
                  <th scope="col" className="px-3 py-2 text-right text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Records</th>
                  <th scope="col" className="px-3 py-2 text-right text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Recorded</th>
                  <th scope="col" className="px-3 py-2 text-right text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Verified</th>
                  <th scope="col" className="px-3 py-2 text-right text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Pending</th>
                  <th scope="col" className="px-3 py-2 text-right text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Missing</th>
                  <th scope="col" className="px-3 py-2 text-right text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Failed</th>
                </tr>
              </thead>
              <tbody>
                {institutions.map((institution) => {
                  const cohort = students.filter((student) => student.institutionId === institution.id);
                  const counts = apaarStatusCounts(cohort);
                  return (
                    <tr key={institution.id} className="border-t border-border">
                      <td className="px-3 py-1.5">
                        <Link to={`/admin/institutions/${institution.id}`} className="text-xs font-medium text-secondary hover:underline">
                          {institution.shortCode}
                        </Link>
                        <span className="ml-1.5 text-2xs text-muted-foreground">{institution.state}</span>
                      </td>
                      <td className="px-3 py-1.5 text-right">{formatNumber(cohort.length)}</td>
                      <td className="px-3 py-1.5 text-right">{formatNumber(cohort.filter((student) => student.apaarId).length)}</td>
                      <td className="px-3 py-1.5 text-right text-success">{formatNumber(counts['Verified by Authorized Source'])}</td>
                      <td className="px-3 py-1.5 text-right">{formatNumber(counts.Pending + counts['Submitted for Verification'])}</td>
                      <td className="px-3 py-1.5 text-right text-[#96660d]">{formatNumber(counts['Not Provided'])}</td>
                      <td className="px-3 py-1.5 text-right text-critical">{formatNumber(counts['Verification Failed'])}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel title="Adapter and data provenance" description="Why this view must not be read as government verification.">
        <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">
          <li>Identifiers use synthetic values and are not real APAAR/ABC identifiers.</li>
          <li>Verification statuses are populated from seeded demonstration data and the simulated adapter.</li>
          <li>No authorized endpoint, credential or government service is configured or called.</li>
          <li>Production integration requires written authorization and secure credential handling.</li>
        </ul>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/duplicate-review">Review duplicate candidates</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/integrations">Integration status</Link>
          </Button>
        </div>
      </Panel>
    </div>
  );
}
