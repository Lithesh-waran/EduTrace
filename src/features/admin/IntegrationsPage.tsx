import { AlertTriangle, CheckCircle2, CircleSlash, FlaskConical, PlugZap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { Panel } from '@/components/shared/Panel';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DemoNotice } from '@/components/shared/DemoNotice';
import { API_BASE_URL, apiMode } from '@/lib/api';
import { apaarAdapter } from '@/lib/apaar/adapter';

type IntegrationState = 'Simulated' | 'Not Configured' | 'Connected' | 'Unavailable' | 'Error';

interface IntegrationEntry {
  key: string;
  name: string;
  state: IntegrationState;
  summary: string;
  detail: string;
  configuration: string[];
  evidence: string;
}

const INTEGRATIONS: IntegrationEntry[] = [
  {
    key: 'apaar',
    name: 'APAAR / ABC verification adapter',
    state: 'Simulated',
    summary: 'Simulated responses only. No authorized endpoint is configured.',
    detail:
      'The frontend adapter marks requested identifiers as Submitted for Verification. Seeded records include simulated “verified” statuses to demonstrate the workflow.',
    configuration: ['Authorized endpoint', 'Client credentials (issued by ABC)', 'Scope approval from competent authority'],
    evidence: 'src/lib/apaar/adapter.ts · SimulatedApaarAdapter',
  },
  {
    key: 'aicte',
    name: 'AICTE reference / approval extract',
    state: 'Not Configured',
    summary: 'Approved intake data is a synthetic local reference extract.',
    detail:
      'No approved intake or approval reference data is fetched from AICTE. Reference verification status is seeded demonstration data.',
    configuration: ['Authorized API endpoint', 'Institution and course extract format', 'Credentials'],
    evidence: 'Reference data seeded in src/lib/demo/seed.ts',
  },
  {
    key: 'auth',
    name: 'Authentication provider (Keycloak + OIDC)',
    state: 'Not Configured',
    summary: 'Demonstration sign-in only; no Keycloak realm or OIDC client is connected.',
    detail:
      'MockAuthService validates seeded demo credentials in the browser. No access token is issued. Production requires Keycloak with authorization code + PKCE and Django-side token validation.',
    configuration: ['VITE_OIDC_AUTHORITY', 'VITE_OIDC_CLIENT_ID', 'Realm roles mapping', 'Django audience validation'],
    evidence: 'src/lib/auth/mockAuthService.ts',
  },
  {
    key: 'api',
    name: 'Django REST Framework API',
    state: apiMode === 'http' ? 'Unavailable' : 'Not Configured',
    summary:
      apiMode === 'http'
        ? 'HTTP mode configured, but backend availability has not been verified.'
        : 'Typed client and service contracts are ready; no backend is deployed.',
    detail:
      'The application runs on the local demonstration data layer. HttpApiClient is implemented but has not been exercised against a live backend; the OpenAPI contract is still to be agreed.',
    configuration: ['VITE_API_MODE=http', 'VITE_API_BASE_URL', 'CORS and CSRF configuration', 'OpenAPI schema'],
    evidence: API_BASE_URL || 'VITE_API_BASE_URL is not set',
  },
  {
    key: 'database',
    name: 'PostgreSQL system of record',
    state: 'Not Configured',
    summary: 'Demonstration data is stored only in this browser.',
    detail:
      'No database connection exists. Browser storage holds synthetic records and is not durable or authoritative.',
    configuration: ['DATABASE_URL (server-side only)', 'Migrations', 'Backups and retention policy'],
    evidence: 'localStorage key edutrace.demo.db.v1',
  },
  {
    key: 'storage',
    name: 'Private object storage (S3 / MinIO)',
    state: 'Not Configured',
    summary: 'Uploaded CSV files are parsed in the browser and never transmitted.',
    detail:
      'Production must store original batch files privately with server-generated object keys and short-lived signed URLs, never in a public bucket.',
    configuration: ['Bucket name', 'Server-side credentials', 'Signed URL policy', 'Object lifecycle rules'],
    evidence: 'src/lib/validation/csv.ts (browser parsing)',
  },
  {
    key: 'jobs',
    name: 'Celery + Redis background processing',
    state: 'Not Configured',
    summary: 'Validation runs synchronously in the browser for this demonstration.',
    detail:
      'Production should run bulk validation and verification retries as background tasks with idempotency and progress reporting.',
    configuration: ['Broker URL', 'Worker deployment', 'Task retry policy'],
    evidence: 'No queue configured',
  },
];

function StateBadge({ state }: { state: IntegrationState }) {
  const variant =
    state === 'Simulated'
      ? 'warning'
      : state === 'Connected'
        ? 'success'
        : state === 'Unavailable' || state === 'Error'
          ? 'critical'
          : 'muted';
  return <Badge variant={variant}>{state}</Badge>;
}

export function IntegrationsPage() {
  const connected = INTEGRATIONS.filter((entry) => entry.state === 'Connected').length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Integration status"
        description="Technical readiness of the external services EduTrace is designed to use. A service is only marked Connected when it is genuinely configured and reachable."
        meta={
          <>
            <Badge variant="warning">{INTEGRATIONS.length - connected} not connected</Badge>
            <Badge variant="outline">{connected} connected</Badge>
          </>
        }
      />

      <Alert tone="critical">
        <AlertTitle className="flex items-center gap-1.5">
          <AlertTriangle className="size-3.5" aria-hidden /> Mock data is not a connection
        </AlertTitle>
        <AlertDescription>
          Seeded data and simulated responses do not mean an integration is working. No authorized
          APAAR/ABC or AICTE endpoint is configured, and no production credentials are present in this
          build.
        </AlertDescription>
      </Alert>

      <DemoNotice title="Configuration source">
        API mode: <span className="font-mono">{apiMode}</span> · Base URL:{' '}
        <span className="font-mono">{API_BASE_URL || 'not configured'}</span> · Adapter:{' '}
        <span className="font-mono">{apaarAdapter.label}</span>
      </DemoNotice>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {INTEGRATIONS.map((entry) => (
          <Panel
            key={entry.key}
            title={entry.name}
            description={entry.summary}
            actions={<StateBadge state={entry.state} />}
          >
            <p className="text-xs leading-relaxed text-muted-foreground">{entry.detail}</p>
            <div className="mt-2.5 rounded border border-border bg-muted/40 px-2.5 py-2">
              <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                Required to connect
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-2xs text-muted-foreground">
                {entry.configuration.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <p className="mt-2 font-mono text-2xs text-muted-foreground">{entry.evidence}</p>
          </Panel>
        ))}
      </div>

      <Panel title="Expected production topology" description="The target architecture agreed for the Django integration phase.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              icon: PlugZap,
              title: 'Presentation',
              body: 'React + TypeScript + Vite frontend served as static assets. All authorization decisions are re-validated by the API.',
            },
            {
              icon: CheckCircle2,
              title: 'Application',
              body: 'Django REST Framework with OpenAPI schema generation, Celery workers for bulk validation and verification retries.',
            },
            {
              icon: CircleSlash,
              title: 'Platform',
              body: 'PostgreSQL as the system of record, Redis as broker/cache, Keycloak for OIDC identity, private S3/MinIO for batch files.',
            },
            {
              icon: FlaskConical,
              title: 'External',
              body: 'Authorized APAAR/ABC and AICTE reference adapters only. No endpoint may be called without written authorization and credentials.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded border border-border px-3 py-2.5">
              <item.icon className="size-4 text-secondary" aria-hidden />
              <p className="mt-1.5 text-xs font-semibold text-foreground">{item.title}</p>
              <p className="mt-0.5 text-2xs leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-2xs leading-relaxed text-muted-foreground">
          Deployment target: Docker images orchestrated per environment, with GitHub Actions for
          linting, type checks, migrations and tests. These pipelines are not part of this frontend
          demonstration.
        </p>
      </Panel>
    </div>
  );
}
