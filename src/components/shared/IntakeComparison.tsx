import { cn } from '@/lib/utils';
import { formatNumber, formatPercent, percent } from '@/lib/format';
import { ComplianceStatusBadge } from './StatusBadge';

export interface IntakeComparisonRow {
  key: string;
  courseName: string;
  courseCode: string;
  academicYear: string;
  approvedIntake: number;
  activeEnrolment: number;
  excess: number;
  status: 'Within configured limit' | 'Potential excess' | 'Reference data unverified' | 'No approved reference';
}

export function IntakeComparison({
  rows,
  onSelect,
  showYear = true,
}: {
  rows: IntakeComparisonRow[];
  onSelect?: (key: string) => void;
  showYear?: boolean;
}) {
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const utilisation = percent(row.activeEnrolment, row.approvedIntake);
        const barWidth = Math.min(100, utilisation);
        const over = row.excess > 0;
        return (
          <div key={row.key} className="rounded-md border border-border px-3 py-2.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={onSelect ? () => onSelect(row.key) : undefined}
                  className={cn(
                    'text-left text-sm font-medium text-foreground',
                    onSelect && 'hover:text-secondary hover:underline',
                  )}
                  disabled={!onSelect}
                >
                  {row.courseName}
                  <span className="ml-1.5 font-mono text-2xs text-muted-foreground">{row.courseCode}</span>
                </button>
                <p className="text-2xs text-muted-foreground">
                  {showYear ? `Academic year ${row.academicYear} · ` : ''}Approved intake{' '}
                  {formatNumber(row.approvedIntake)} · Active enrolment {formatNumber(row.activeEnrolment)}
                </p>
              </div>
              <ComplianceStatusBadge status={row.status} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full', over ? 'bg-critical' : 'bg-success')}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right text-2xs font-medium text-foreground">
                {formatPercent(utilisation)}
              </span>
            </div>
            <p className="mt-1 text-2xs text-muted-foreground">
              {over
                ? `Potential excess of ${formatNumber(row.excess)} record(s) — ${formatNumber(row.activeEnrolment)} active − ${formatNumber(row.approvedIntake)} approved. Review required; this is not a determination of a violation.`
                : row.status === 'Reference data unverified'
                  ? 'The approved intake reference is unverified, so compliance is not concluded.'
                  : `Within the configured limit (${formatNumber(Math.max(0, row.approvedIntake - row.activeEnrolment))} seat(s) headroom).`}
            </p>
          </div>
        );
      })}
    </div>
  );
}
