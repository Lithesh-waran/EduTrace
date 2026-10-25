import * as React from 'react';
import { Link } from 'react-router-dom';
import { Database, Download, ListChecks, RefreshCw, Workflow } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { Panel } from '@/components/shared/Panel';
import { DefinitionList } from '@/components/shared/DefinitionList';
import { ConfirmDialog } from '@/components/shared/Dialogs';
import { DemoNotice } from '@/components/shared/DemoNotice';
import { SeverityBadge } from '@/components/shared/StatusBadge';
import { useAdminData } from '@/hooks/useScopeData';
import { useAuth } from '@/lib/auth/AuthProvider';
import { API_BASE_URL, apiMode } from '@/lib/api';
import { downloadCsv, downloadText, formatDate, formatNumber } from '@/lib/format';
import { VALIDATION_RULES } from '@/lib/validation/rules';
import { ROLE_LABELS } from '@/types';

export function AdminSettingsPage() {
  const { data, actions } = useAdminData();
  const { user } = useAuth();
  const [resetOpen, setResetOpen] = React.useState(false);
  const rules = Object.values(VALIDATION_RULES);

  return (
    <div className="space-y-4">
      <PageHeader
        title="System settings"
        description="Demonstration configuration, deterministic rule catalogue and data controls. Production settings live in the Django backend."
        meta={<Badge variant="warning">Demonstration configuration</Badge>}
      />

      <DemoNotice title="No production services configured">
        This build has no backend, identity provider, database or object storage. All data is
        synthetic and stored in this browser. Configuration values shown are placeholders for the
        Antigravity integration phase.
      </DemoNotice>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Environment">
          <DefinitionList
            columns={1}
            items={[
              { label: 'Signed-in operator', value: user ? `${user.name} · ${ROLE_LABELS[user.role]}` : '—' },
              { label: 'API mode', value: apiMode === 'http' ? 'HTTP (Django REST Framework)' : 'Mock / local demonstration' },
              { label: 'API base URL', value: API_BASE_URL || 'Not configured (VITE_API_BASE_URL unset)' },
              { label: 'Authentication service', value: 'MockAuthService (Keycloak OIDC not connected)' },
              { label: 'APAAR adapter', value: 'Simulated (no authorized endpoint)' },
              { label: 'Persistence', value: 'Browser local storage: edutrace.demo.db.v1' },
              { label: 'Dataset seeded', value: formatDate('2026-10-20T09:30:00.000Z') },
            ]}
          />
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link to="/admin/integrations">
              <Workflow className="size-4" aria-hidden /> Integration status
            </Link>
          </Button>
        </Panel>

        <Panel title="Demo data controls" description="Resetting restores the seeded dataset and discards all local decisions.">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadText(
                  'edutrace_demo_dataset.json',
                  JSON.stringify(
                    {
                      generatedAt: new Date().toISOString(),
                      mode: 'demonstration',
                      note: 'Synthetic dataset. APAAR identifiers are not real and verification is simulated.',
                      counts: {
                        institutions: data.institutions.length,
                        courses: data.courses.length,
                        students: data.students.length,
                        issues: data.issues.length,
                        submissions: data.submissions.length,
                        auditEvents: data.audit.length,
                      },
                      institutions: data.institutions,
                      courses: data.courses,
                      students: data.students,
                    },
                    null,
                    2,
                  ),
                  'application/json;charset=utf-8',
                )
              }
            >
              <Download className="size-4" aria-hidden /> Download dataset (JSON)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCsv('aicte_audit_export.csv', [
                  ['Timestamp', 'Actor', 'Role', 'Institution', 'Action', 'Record', 'Reason', 'Change summary'],
                  ...data.audit.map((event) => [
                    event.at,
                    event.actor,
                    event.actorRole,
                    event.institutionId ?? '',
                    event.action,
                    event.recordRef,
                    event.reason ?? '',
                    event.changeSummary,
                  ]),
                ])
              }
            >
              <Download className="size-4" aria-hidden /> Export audit trail
            </Button>
            <Button variant="outline" size="sm" onClick={() => setResetOpen(true)}>
              <RefreshCw className="size-4" aria-hidden /> Reset demonstration data
            </Button>
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-2xs leading-relaxed text-muted-foreground">
            <Database className="mt-0.5 size-3 shrink-0" aria-hidden />
            {formatNumber(data.students.length)} student records, {formatNumber(data.issues.length)} issues and{' '}
            {formatNumber(data.audit.length)} audit events are currently stored locally. This storage is
            not a production system of record.
          </p>
        </Panel>
      </div>

      <Panel
        title="Deterministic rule catalogue"
        description="Rules shared by the CSV validator, record checks and compliance calculations. No AI or machine learning is used."
        actions={
          <Badge variant="outline" className="gap-1">
            <ListChecks className="size-3" aria-hidden /> {rules.length} rules
          </Badge>
        }
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-muted/60">
              <tr>
                <th scope="col" className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Rule</th>
                <th scope="col" className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
                <th scope="col" className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Category</th>
                <th scope="col" className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Severity</th>
                <th scope="col" className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Backend implementation note</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-t border-border">
                  <td className="whitespace-nowrap px-3 py-1.5 font-mono text-2xs">{rule.id}</td>
                  <td className="px-3 py-1.5">{rule.name}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-2xs text-muted-foreground">{rule.category}</td>
                  <td className="px-3 py-1.5"><SeverityBadge severity={rule.severity} /></td>
                  <td className="px-3 py-1.5 text-2xs leading-relaxed text-muted-foreground">{rule.backendNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-3">
          <p className="text-xs font-semibold text-foreground">Retention and audit</p>
          <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">
            Audit entries are append-only in this demonstration and retained in browser storage.
            Production requires immutable server-side logs with defined retention periods and
            restricted access. No retention schedule is enforced here.
          </p>
        </div>
        <div className="rounded-md border border-border bg-card p-3">
          <p className="text-xs font-semibold text-foreground">Permissions</p>
          <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">
            Frontend role checks hide actions but are not a security boundary. Django must authorize
            every request using the Keycloak identity, and administrative decisions must require an
            explicit reason.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset all demonstration data?"
        description="All local changes — uploads, corrections, alert decisions, submission reviews and audit events — are discarded and the seeded dataset is restored."
        confirmLabel="Reset demonstration data"
        tone="critical"
        onConfirm={() => {
          actions.resetDemoData();
          setResetOpen(false);
        }}
      />
    </div>
  );
}
