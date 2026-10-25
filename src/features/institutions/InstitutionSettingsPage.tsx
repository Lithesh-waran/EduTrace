import * as React from 'react';
import { Link } from 'react-router-dom';
import { Database, Download, RefreshCw, ShieldCheck, Workflow } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { Panel } from '@/components/shared/Panel';
import { DefinitionList } from '@/components/shared/DefinitionList';
import { ConfirmDialog } from '@/components/shared/Dialogs';
import { DemoNotice } from '@/components/shared/DemoNotice';
import { useInstitutionData } from '@/hooks/useScopeData';
import { useAuth } from '@/lib/auth/AuthProvider';
import { API_BASE_URL, apiMode } from '@/lib/api';
import { downloadCsv, downloadText, formatDateTime } from '@/lib/format';
import { ROLE_LABELS } from '@/types';

export function InstitutionSettingsPage() {
  const { institution, students, submissions, audit, actions } = useInstitutionData();
  const { user, signOut } = useAuth();
  const [resetOpen, setResetOpen] = React.useState(false);

  const downloadSnapshot = () => {
    downloadText(
      `edutrace_institution_snapshot_${institution?.shortCode ?? 'demo'}.json`,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          mode: 'demonstration',
          institution,
          students,
          submissions,
        },
        null,
        2,
      ),
      'application/json;charset=utf-8',
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        description="Session, data-source and integration configuration for this demonstration build."
        meta={<Badge variant="warning">Demonstration configuration</Badge>}
      />

      <DemoNotice title="No production services are connected">
        This build has no backend, no Keycloak realm and no live APAAR/ABC integration. Values shown
        here are configuration placeholders for the Antigravity integration phase.
      </DemoNotice>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Signed-in session">
          <DefinitionList
            columns={1}
            items={[
              { label: 'User', value: user?.name ?? '—' },
              { label: 'Email', value: user?.email ?? '—' },
              { label: 'Role', value: user ? ROLE_LABELS[user.role] : '—' },
              { label: 'Portal', value: 'Institution portal' },
              { label: 'Authentication', value: 'Demonstration provider (MockAuthService) — Keycloak OIDC not connected' },
              { label: 'Token storage', value: 'No token is issued or stored. Demo account id only.' },
            ]}
          />
          <Button variant="outline" size="sm" className="mt-3" onClick={() => signOut()}>
            Sign out of this session
          </Button>
        </Panel>

        <Panel title="Data source and API configuration">
          <DefinitionList
            columns={1}
            items={[
              { label: 'Frontend data source', value: 'Local demonstration data layer (browser storage)' },
              { label: 'API mode', value: apiMode === 'http' ? 'HTTP (Django REST Framework)' : 'Mock / local demonstration' },
              { label: 'API base URL', value: API_BASE_URL || 'Not configured (VITE_API_BASE_URL unset)' },
              { label: 'Service contracts', value: 'src/lib/api/services.ts', mono: true },
              { label: 'HTTP client', value: 'src/lib/api/httpClient.ts', mono: true },
              { label: 'Validation rules', value: 'src/lib/validation/rules.ts', mono: true },
            ]}
          />
          <p className="mt-2 rounded border border-border bg-muted/40 px-2.5 py-2 text-2xs leading-relaxed text-muted-foreground">
            Set <code className="rounded bg-card px-1 font-mono">VITE_API_MODE=http</code> and{' '}
            <code className="rounded bg-card px-1 font-mono">VITE_API_BASE_URL</code> to point the
            application at the Django backend. The API contract will be finalised with the backend
            team; no endpoints are claimed to exist.
          </p>
        </Panel>
      </div>

      <Panel title="Demonstration data controls" description="The local dataset persists in this browser. Resetting restores the seeded dataset and removes local changes.">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadSnapshot}>
            <Download className="size-4" aria-hidden /> Download institution snapshot (JSON)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv('institution_activity.csv', [
                ['Timestamp', 'Actor', 'Action', 'Record', 'Reason', 'Change summary'],
                ...audit.map((event) => [
                  event.at,
                  event.actor,
                  event.action,
                  event.recordRef,
                  event.reason ?? '',
                  event.changeSummary,
                ]),
              ])
            }
          >
            <Download className="size-4" aria-hidden /> Export audit activity (CSV)
          </Button>
          <Button variant="outline" size="sm" onClick={() => setResetOpen(true)}>
            <RefreshCw className="size-4" aria-hidden /> Reset demonstration data
          </Button>
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-2xs leading-relaxed text-muted-foreground">
          <Database className="mt-0.5 size-3 shrink-0" aria-hidden />
          Storage key: <code className="mx-1 rounded bg-muted px-1 font-mono">edutrace.demo.db.v1</code>
          · Seeded 20 Oct 2026 · {formatDateTime('2026-10-20T09:30:00.000Z')}. No student data is
          transmitted anywhere.
        </p>
      </Panel>

      <Panel title="Integration readiness" description="Current status of the intended production integrations.">
        <ul className="divide-y divide-border">
          {[
            { name: 'Authentication provider (Keycloak + OIDC)', status: 'Not Configured', detail: 'MockAuthService is active. Replace with Keycloak OIDC PKCE.' },
            { name: 'Django REST Framework API', status: 'Not Configured', detail: 'Typed service contracts and HttpApiClient are ready; no backend deployed.' },
            { name: 'PostgreSQL database', status: 'Not Configured', detail: 'Demonstration data lives in browser storage only.' },
            { name: 'APAAR / ABC adapter', status: 'Simulated', detail: 'Simulated adapter only; no authorized endpoint or credentials.' },
            { name: 'AICTE reference integration', status: 'Not Configured', detail: 'Approved intake references are synthetic.' },
            { name: 'Private object storage (S3 / MinIO)', status: 'Not Configured', detail: 'CSV files are parsed locally and never uploaded.' },
            { name: 'Celery + Redis background jobs', status: 'Not Configured', detail: 'Validation runs synchronously in the browser for the demo.' },
          ].map((item) => (
            <li key={item.name} className="flex flex-wrap items-center gap-2 py-2">
              <span className="text-xs font-medium text-foreground">{item.name}</span>
              <Badge variant={item.status === 'Simulated' ? 'warning' : 'muted'}>{item.status}</Badge>
              <span className="ml-auto max-w-md text-2xs text-muted-foreground">{item.detail}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <ShieldCheck className="size-3.5 text-secondary" aria-hidden /> Accessibility
          </p>
          <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">
            Keyboard navigation, visible focus indicators, semantic headings and labelled controls are
            provided throughout. Status is always conveyed in text, not colour alone. Dialogs trap
            focus and close with Escape.
          </p>
        </div>
        <div className="rounded-md border border-border bg-card p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Workflow className="size-3.5 text-secondary" aria-hidden /> Role enforcement
          </p>
          <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">
            Frontend permissions hide actions a role cannot perform. They are not a security boundary:
            every production endpoint must re-check the Keycloak identity and Django permissions.
          </p>
          <Button asChild variant="link" size="xs" className="mt-1 px-0">
            <Link to="/institution/users">Manage portal users</Link>
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset all demonstration data?"
        description="All local changes — uploaded batches, corrections, review decisions and notifications — are discarded and the seeded dataset is restored."
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
