import * as React from 'react';
import { Link } from 'react-router-dom';
import { GitCompareArrows, ShieldQuestion } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { Panel } from '@/components/shared/Panel';
import { SearchAndFilters } from '@/components/shared/SearchAndFilters';
import { DecisionDialog } from '@/components/shared/Dialogs';
import { EmptyState } from '@/components/shared/States';
import { ApaarStatusBadge, EnrolmentStatusBadge } from '@/components/shared/StatusBadge';
import { useAdminData, useLookups } from '@/hooks/useScopeData';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatDateTime, maskIdentifier } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DuplicateCandidate } from '@/lib/demo/analytics';
import type { DuplicateReviewStatus } from '@/types';

const ALL = 'all';

const DECISION_OPTIONS = [
  {
    value: 'Resolved — separate records',
    label: 'Mark as legitimate separate records',
    description: 'Confirm the records belong to different students and retain them separately.',
    tone: 'success' as const,
  },
  {
    value: 'Clarification requested',
    label: 'Request institution clarification',
    description: 'Ask the institution to confirm which record is correct. The institution is notified.',
    tone: 'warning' as const,
  },
  {
    value: 'Correction requested',
    label: 'Request data correction',
    description: 'Require the conflicting identifier or registration number to be corrected.',
    tone: 'warning' as const,
  },
  {
    value: 'Escalated',
    label: 'Escalate for further review',
    description: 'Refer the candidate to a senior reviewer or verification team.',
    tone: 'default' as const,
  },
  {
    value: 'Resolved — corrected',
    label: 'Resolve after correction',
    description: 'Use when the conflicting data has been corrected and the candidate no longer exists.',
    tone: 'success' as const,
  },
];

export function DuplicateReviewPage() {
  const { data, duplicates, actions } = useAdminData();
  const { can } = useAuth();
  const lookups = useLookups();
  const [search, setSearch] = React.useState('');
  const [kind, setKind] = React.useState(ALL);
  const [reviewStatus, setReviewStatus] = React.useState(ALL);
  const [crossOnly, setCrossOnly] = React.useState(false);
  const [selected, setSelected] = React.useState<DuplicateCandidate | null>(null);

  const filtered = duplicates.filter((candidate) => {
    if (kind !== ALL && candidate.kind !== kind) return false;
    if (crossOnly && !candidate.crossInstitution) return false;
    if (reviewStatus === 'open' && candidate.review) return false;
    if (reviewStatus === 'resolved' && !candidate.review?.status.startsWith('Resolved')) return false;
    if (reviewStatus === 'pending' && (!candidate.review || candidate.review.status.startsWith('Resolved'))) return false;
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      const haystack = `${candidate.label} ${candidate.institutionNames.join(' ')} ${candidate.students
        .map((student) => student.recordId)
        .join(' ')}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const open = duplicates.filter((candidate) => !candidate.review).length;
  const cross = duplicates.filter((candidate) => candidate.crossInstitution).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Duplicate review"
        description="Potential duplicate matches derived deterministically from repeated APAAR identifiers or registration numbers. Candidates are not findings of fraud and require human review."
        meta={
          <>
            <Badge variant="outline">{duplicates.length} candidate(s)</Badge>
            <Badge variant="critical">{open} unreviewed</Badge>
            <Badge variant="warning">{cross} cross-institution</Badge>
          </>
        }
      />

      <Panel bodyClassName="p-0">
        <div className="border-b border-border p-3">
          <SearchAndFilters
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search candidate, record or institution…"
            filters={[
              {
                key: 'kind',
                label: 'Match type',
                value: kind,
                onChange: setKind,
                options: [
                  { value: ALL, label: 'All match types' },
                  { value: 'apaar', label: 'Repeated APAAR identifier' },
                  { value: 'regNumber', label: 'Duplicate registration number' },
                ],
              },
              {
                key: 'status',
                label: 'Review status',
                value: reviewStatus,
                onChange: setReviewStatus,
                className: 'min-w-[11rem]',
                options: [
                  { value: ALL, label: 'All review states' },
                  { value: 'open', label: 'Not reviewed' },
                  { value: 'pending', label: 'In progress' },
                  { value: 'resolved', label: 'Resolved' },
                ],
              },
            ]}
            onReset={() => {
              setSearch('');
              setKind(ALL);
              setReviewStatus(ALL);
              setCrossOnly(false);
            }}
            trailing={
              <label className="flex items-center gap-1.5 text-2xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={crossOnly}
                  onChange={(event) => setCrossOnly(event.target.checked)}
                  className="size-3.5 accent-[#15365C]"
                />
                Cross-institution only
              </label>
            }
            resultLabel={`${filtered.length} candidate(s) match the current filters.`}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No duplicate candidates match"
              description="Adjust the filters. Candidates are regenerated whenever identifiers or registration numbers change."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((candidate) => (
              <li key={candidate.key} className="px-3 py-3">
                <div className="flex flex-wrap items-start gap-2">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded bg-critical/10 text-critical">
                    <GitCompareArrows className="size-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-xs font-semibold text-foreground">{candidate.label}</p>
                      <Badge variant={candidate.kind === 'apaar' ? 'critical' : 'warning'}>
                        {candidate.kind === 'apaar' ? 'APAAR identifier' : 'Registration number'}
                      </Badge>
                      {candidate.crossInstitution && <Badge variant="info">Cross-institution</Badge>}
                      <Badge
                        variant={
                          !candidate.review
                            ? 'muted'
                            : candidate.review.status.startsWith('Resolved')
                              ? 'success'
                              : 'warning'
                        }
                      >
                        {candidate.review?.status ?? 'Not reviewed'}
                      </Badge>
                      <span className="ml-auto text-2xs text-muted-foreground">
                        {candidate.students.length} record(s)
                      </span>
                    </div>
                    <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">{candidate.evidence}</p>

                    <div className="mt-2 overflow-x-auto scrollbar-thin rounded border border-border">
                      <table className="w-full border-collapse text-2xs">
                        <thead className="bg-muted/60">
                          <tr>
                            <th scope="col" className="px-2 py-1 text-left font-semibold uppercase tracking-wide text-muted-foreground">Record</th>
                            <th scope="col" className="px-2 py-1 text-left font-semibold uppercase tracking-wide text-muted-foreground">Identifier (masked)</th>
                            <th scope="col" className="px-2 py-1 text-left font-semibold uppercase tracking-wide text-muted-foreground">Institution</th>
                            <th scope="col" className="px-2 py-1 text-left font-semibold uppercase tracking-wide text-muted-foreground">Course / year</th>
                            <th scope="col" className="px-2 py-1 text-left font-semibold uppercase tracking-wide text-muted-foreground">Enrolment</th>
                            <th scope="col" className="px-2 py-1 text-left font-semibold uppercase tracking-wide text-muted-foreground">APAAR status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {candidate.students.map((student) => (
                            <tr key={student.id} className="border-t border-border">
                              <td className="px-2 py-1 font-mono text-foreground">{student.recordId}</td>
                              <td className="px-2 py-1 font-mono text-muted-foreground">
                                {maskIdentifier(student.apaarId)}
                              </td>
                              <td className="px-2 py-1">
                                {candidate.institutionIds.map((id) =>
                                  id === student.institutionId ? lookups.institutionCode(id) : null,
                                )}
                              </td>
                              <td className="px-2 py-1 text-muted-foreground">
                                {lookups.courseCode(student.courseId)} · {student.academicYear}
                              </td>
                              <td className="px-2 py-1"><EnrolmentStatusBadge status={student.enrolmentStatus} /></td>
                              <td className="px-2 py-1"><ApaarStatusBadge status={student.apaarStatus} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setSelected(candidate)}
                        disabled={!can('admin.duplicates')}
                      >
                        Record review decision
                      </Button>
                      {candidate.institutionIds.map((id) => (
                        <Button key={id} asChild size="xs" variant="ghost">
                          <Link to={`/admin/institutions/${id}`}>{lookups.institutionCode(id)} record</Link>
                        </Button>
                      ))}
                      {candidate.review && (
                        <span className={cn('text-2xs text-muted-foreground', 'ml-auto')}>
                          Reviewed by {candidate.review.actor} · {formatDateTime(candidate.review.updatedAt)}
                        </span>
                      )}
                    </div>
                    {candidate.review?.reason && (
                      <p className="mt-1.5 rounded border border-border bg-muted/40 px-2 py-1.5 text-2xs leading-relaxed text-muted-foreground">
                        <span className="font-medium text-foreground">Review note:</span> {candidate.review.reason}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <ShieldQuestion className="size-3.5 text-secondary" aria-hidden /> Privacy by default
          </p>
          <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">
            Names and contact details are intentionally not shown. Reviewers work from record
            references, masked identifiers, institution, course and enrolment evidence. Student
            personal data should be accessed only where strictly necessary and with appropriate
            authorization.
          </p>
        </div>
        <div className="rounded-md border border-border bg-card p-3">
          <p className="text-xs font-semibold text-foreground">Deterministic detection</p>
          <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">
            Candidates are produced by exact matching of normalized identifiers and registration
            numbers. No probabilistic matching, AI or machine learning is used. A candidate is a prompt
            for review, never an automatic finding against a student or institution.
          </p>
        </div>
      </div>

      <DecisionDialog
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
        title={`Review candidate · ${selected?.label ?? ''}`}
        description={selected?.evidence}
        options={DECISION_OPTIONS}
        onSubmit={(value, reason) => {
          if (!selected) return;
          actions.reviewDuplicate(selected.key, value as DuplicateReviewStatus, reason);
          setSelected(null);
        }}
      />

      <p className="text-2xs leading-relaxed text-muted-foreground">
        {duplicates.length} candidate group(s) detected from {data.students.length} synthetic records.
        Actions are audited and, where relevant, notify the institution.
      </p>
    </div>
  );
}
