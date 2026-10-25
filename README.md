# EduTrace

**APAAR-Based Student Data Management and Verification Platform**
SIH 2026 — Problem Statement 26263

EduTrace is a frontend-complete demonstration of a regulatory data platform for
AICTE-approved institutions. Institutions maintain course intake references and
student records, upload enrolment batches, resolve deterministic validation
findings, monitor APAAR identifier status, and submit records for review.
AICTE administrators monitor institutions nationwide, review submissions,
investigate potential intake discrepancies and duplicate identifiers, and record
decisions with reasons.

> **Demonstration software.** All institutions, people, identifiers, approvals and
> verification outcomes in this build are synthetic. APAAR/ABC verification is
> simulated. Nothing here constitutes official identity verification, statutory
> approval or a live Government of India integration.

---

## 1. Current status

| Area | Status |
| --- | --- |
| Institution portal (16 routes) | Complete |
| AICTE Admin portal (17 routes) | Complete |
| Demo authentication and role-based routing | Complete (mock, explicitly labelled) |
| Student registry, details, add/edit | Complete, persisted in the browser |
| Bulk CSV upload → preview → validate → correct → submit | Complete end to end |
| APAAR status tracking | Complete (simulated adapter) |
| Intake compliance and alert review | Complete |
| Submission review and resubmission | Complete |
| Notifications, audit history, reports, administration | Complete |
| API contracts for Django REST Framework | Defined; HTTP client implemented, not connected |
| Keycloak OIDC, Django/DRF, PostgreSQL, Celery, S3/MinIO | **Not implemented** — integration phase |
| Automated tests | 22 tests passing (`npm test`) |

The application is ready to export to GitHub and continue with Antigravity and
the Django backend.

---

## 2. Stack

- React 18 + TypeScript, Vite 5
- Tailwind CSS with a compact public-sector design system
- shadcn/ui-style primitives built on Radix UI
- React Router 6
- Recharts for charts
- Lucide icons
- Papa Parse for CSV parsing
- Vitest + Testing Library + jsdom for automated tests

No Supabase, Firebase or other BaaS is used. No alternative identity provider is
introduced.

---

## 3. Run locally

```bash
npm install
cp .env.example .env    # optional for demo mode; defaults to the mock dataset
npm run dev             # http://localhost:3000
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite development server on port 3000 |
| `npm run build` | Typecheck and production build to `dist/` |
| `npm test` | Run the Vitest suite once |
| `npm run typecheck` | TypeScript, no emit |
| `npm run preview` | Serve the production build |

### Environment variables

All frontend configuration is public and read at build time. **Never put secrets
in `VITE_*` variables** — Vite inlines them into the browser bundle.

| Variable | Default | Meaning |
| --- | --- | --- |
| `VITE_API_MODE` | `mock` | `mock` uses the persisted demonstration dataset. `http` selects the Django API client. |
| `VITE_API_BASE_URL` | empty | DRF base URL, e.g. `https://api.example.gov.in/api/v1`. Required in `http` mode. |
| `VITE_API_TIMEOUT_MS` | `20000` | HTTP client timeout. |
| `VITE_OIDC_AUTHORITY` | empty | Keycloak realm URL (integration phase). |
| `VITE_OIDC_CLIENT_ID` | empty | Keycloak public client ID (integration phase). |
| `VITE_OIDC_REDIRECT_URI` | empty | Registered callback URL (integration phase). |

`.env` is git-ignored; `.env.example` documents the names without values.

---

## 4. Demonstration accounts

Open `/login` and choose a **demo entry point** (each button fills the
credentials), or type them manually. The login screen carries a persistent
"Demonstration mode" notice. Password for every account: **`Demo@2026`**.

| Role | Email | Portal | Capabilities |
| --- | --- | --- | --- |
| Institution Administrator | `admin@sgiet-demo.edu.in` | Institution | Full institution access, submissions, users, profile |
| Institution Data Operator | `operator@sgiet-demo.edu.in` | Institution | Student records and CSV uploads; no profile changes |
| Institution Verifier | `verifier@sgiet-demo.edu.in` | Institution | Review and verify records and issues; no uploads |
| AICTE Administrator | `admin@aicte-demo.gov.in` | Admin | Full administrative access, intake reference edits |
| AICTE Reviewer | `reviewer@aicte-demo.gov.in` | Admin | Verification, duplicate and intake reviews, submission decisions |
| Read-only Auditor | `auditor@aicte-demo.gov.in` | Admin | Read-only access to administrative records and audit logs |

Institution accounts belong to the seeded institution *Sunrise Group Institute
of Engineering & Technology (demo)*. The AICTE dashboard covers all five seeded
institutions. A role that opens the other portal is routed to `/access-denied`;
this is **interface-level** enforcement only.

Authentication behaviour:

- `AuthProvider` exposes `user`, `signIn`, `signOut`, `can()` and the active scope.
- `AuthService` is an interface; `MockAuthService` is the demo implementation.
- The demo session stores only an account identifier in `sessionStorage`, or in
  `localStorage` when "Remember me" is selected. **No token is issued or stored.**
- Replacing the mock with Keycloak OIDC + PKCE should only require a new
  `AuthService` implementation and a route-level guard review.
- Production authorization **must** be enforced again by Django; hiding a
  navigation link is not a security boundary.

---

## 5. Seeded data

The dataset is generated deterministically from a fixed seed and persisted in
`localStorage` under `edutrace.demo.db.v1`.

- 5 institutions across 4 states, each with 3 courses (15 course references)
- 385 base student records across academic years 2023-24 → 2026-27, plus
  deliberate anomaly records
- Every enrolment and APAAR status is represented
- Repeated APAAR identifiers (including a cross-institution conflict)
- Potential intake excess cases, e.g. **approved 30 / active 36 → +6**, and
  **approved 120 / active 135 → +15**
- One cohort whose approved-intake reference is deliberately unverified
- Validation issues in open, correction-required and resolved states
- Submission batches in draft, submitted, correction-required, under-review,
  accepted, rejected and resubmitted states
- Pre-existing AICTE intake-alert and duplicate-review decisions

Everything is deterministic: resetting demo data in **Settings → Reset demo
data** rebuilds exactly the same dataset. No AI or machine learning is used
anywhere in the product.

---

## 6. End-to-end demonstration script

1. Sign in as **Institution Administrator**.
2. Open **Institution dashboard**; note intake and APAAR KPIs.
3. Go to **Student records** and inspect a record with APAAR "Correction Required".
4. Open **Bulk upload**, download the template, and upload a CSV with:
   - one valid row,
   - one row missing the student name,
   - one row referencing an unknown course (`XYZ`),
   - one row with a missing APAAR identifier.
5. Preview, run validation, and review row-level findings and suggested actions.
6. Download the error report, then submit the batch from **Confirm submission**.
7. The submission appears in **Submissions**; invalid rows become validation
   issues rather than being silently discarded.
8. Review **APAAR status** and **Intake compliance**; open a cohort to see the
   underlying records and the active/approved calculation.
9. Sign out and sign in as **AICTE Reviewer**.
10. Open **Intake alerts**, select the seeded excess cohort, and record a decision
    with a mandatory reason.
11. Review the corresponding **Submission**; accept, reject or request correction.
12. Sign back in as the institution: the status change, notification and audit
    event are visible.
13. **Reports** exports the current filtered data as CSV.
14. **Audit history** (institution) and **Audit logs** (admin) show both sides.

To exercise duplicate review, use **Admin → Duplicate review**; evidence is shown
without exposing unnecessary personal data.

---

## 7. Routes

Public: `/login`, `/forgot-password`, `/access-denied`, plus `/` which routes by role.

**Institution portal**

| Route | Page |
| --- | --- |
| `/institution/dashboard` | KPI dashboard, charts, recent issues/submissions/activity |
| `/institution/profile` | Institutional profile and onboarding state |
| `/institution/courses` | Approved courses, intake, revisions, reference status |
| `/institution/students` | Searchable, filterable, sortable registry |
| `/institution/students/:id` | Overview, validation issues, submissions, audit tabs |
| `/institution/upload` | Seven-step CSV workflow |
| `/institution/apaar-status` | Simulated APAAR/ABC status and filters |
| `/institution/validation-issues` | Issue management and resolution workflow |
| `/institution/intake-compliance` | Approved vs active enrolment, calculation detail |
| `/institution/submissions` | Batch list |
| `/institution/submissions/:id` | Batch detail, errors, resubmission |
| `/institution/reports` | Filterable reports and CSV export |
| `/institution/notifications` | In-app notification centre |
| `/institution/audit-history` | Read-only institutional audit trail |
| `/institution/users` | Simulated portal user administration |
| `/institution/settings` | Preferences, demo notices, reset |

**AICTE Admin portal**

| Route | Page |
| --- | --- |
| `/admin/dashboard` | National overview, filters, regional summaries, priority queue |
| `/admin/institutions` | Institution registry |
| `/admin/institutions/:id` | Institution detail, courses, students, submissions |
| `/admin/institution-verification` | Verify / request correction / reject with reason |
| `/admin/approved-intake` | Reference intake registry with revisions |
| `/admin/enrolment-monitoring` | Institution and course comparisons |
| `/admin/apaar-monitoring` | Simulated national APAAR status |
| `/admin/duplicate-review` | Duplicate candidates and reviewer decisions |
| `/admin/intake-alerts` | Alert review with reasoned decisions |
| `/admin/validation-issues` | Cross-institution issue queue |
| `/admin/submissions` | All submissions |
| `/admin/submissions/:id` | Review, decision, timestamps, resubmission history |
| `/admin/reports` | Administrative reports and CSV export |
| `/admin/audit-logs` | Read-only audit log |
| `/admin/users` | Simulated administrative user administration |
| `/admin/integrations` | Honest adapter/configuration status |
| `/admin/settings` | Administrative settings and demo reset |

---

## 8. Architecture

```
src/
  app/            App shell, route table, guards (RequireAuth, RequireScope)
  components/
    layout/       AppSidebar, AppHeader, Breadcrumbs, NotificationCenter
    shared/       StatCard, DataTable, Filters, timelines, upload and validation UI
    ui/           Radix-based primitives (button, dialog, select, tabs, …)
  features/
    auth/         Login, forgot password, denied, not found
    institutions/ Dashboard, profile, courses, users, settings
    students/     Registry, detail, add/edit, CSV upload
    validation/   Issue pages and detail dialog
    apaar/        APAAR status page
    intake/       Intake compliance
    submissions/  Institution and admin submission workflows
    reports/      Report builder and CSV export
    notifications/
    audit/
    admin/        National dashboard, registry, verification, monitoring,
                  duplicates, alerts, audit, users, integrations, settings
  hooks/          Scoped data selectors
  lib/
    api/          Service contracts, HttpClient, HttpApiClient, MockApiClient
    auth/         AuthService, mock implementation, permissions, AuthProvider
    demo/         Deterministic seed, analytics, persisted provider
    validation/   Rule catalogue, engine, CSV parsing
  types/          Domain model
```

### Data flow

`DemoDataProvider` (`src/lib/demo/store.tsx`) holds the authoritative demo state,
derives analytics with pure functions, and exposes typed mutations. Every page
subscribes to the same provider, so an upload, decision or correction is
immediately reflected in dashboards, charts, notifications and audit history, and
survives navigation and reload.

Analytics are pure functions in `src/lib/demo/analytics.ts`:

- `computeIntakeCompliance` — cohorts from approved references and students;
  counts **Active** enrolment only; suppresses excess when reference is unverified
- `findDuplicateCandidates` — repeated APAAR IDs and repeated registration numbers
  with cross-institution, cross-course and name-conflict evidence
- APAAR summaries and dashboard aggregates

### API boundary

Service contracts live in `src/lib/api/services.ts`:

`InstitutionService`, `CourseService`, `StudentService`, `UploadService`,
`ApaarService`, `ValidationService`, `IntakeComplianceService`,
`SubmissionService`, `NotificationService`, `ReportService`, `AuditService`,
`UserService`, `DuplicateReviewService`, `IntegrationService`.

`MockApiClient` implements the read contracts over the seeded dataset.
`HttpApiClient` implements the same contracts against the proposed DRF routes and
is selected by `VITE_API_MODE=http`. `getApi()` fails loudly if HTTP mode is
selected without a base URL, rather than pretending writes succeeded.

In this demonstration build, pages read and mutate the persisted demo provider
synchronously so that cross-page state propagation is immediate. When the backend
is connected, replace the provider's selectors/mutations with the service calls;
the contracts already describe the payloads and pagination. The definitive
OpenAPI contract is still to be agreed with the Django team — see
[docs/API_CONTRACT.md](docs/API_CONTRACT.md).

Authentication integration points: `HttpClient` accepts a token getter and an
`onUnauthorized` callback. Do **not** store access or refresh tokens in
`localStorage`/`sessionStorage`; use the Keycloak Authorization Code + PKCE flow
with a maintained adapter and keep tokens in memory.

### Validation engine

`src/lib/validation/` is independent of React and can be ported to Python.

- `rules.ts` — rule catalogue with ID, name, severity, description and guidance
- `engine.ts` — pure validation for single records, batches and CSV rows
- `csv.ts` — Papa Parse wrapper and canonical column mapping

Every finding carries the rule ID, rule name, severity, affected record, field,
evidence, reason and suggested next action. The CSV workflow never discards an
invalid row: it is reported, downloadable as an error report, and creates
validation issues on submission.

Rule families:

| ID | Rule | Severity |
| --- | --- | --- |
| STU-001 | Mandatory field missing | High |
| STU-002 | Invalid admission date | High |
| STU-003 | Student name looks invalid | Low |
| STU-004 | Conflicting student information | High |
| CRS-001 | Unknown course for institution | Critical |
| AY-001 | Invalid academic year | High |
| ENR-001 | Active enrolment exceeds approved intake | High |
| ENR-002 | Unrecognised enrolment status | High |
| DUP-001 | Repeated APAAR identifier | Critical |
| DUP-002 | Duplicate registration number | Critical |
| DUP-003 | Duplicate row in uploaded file | Critical |
| APAAR-001 | Missing APAAR identifier | Medium |
| APAAR-002 | APAAR identifier format invalid | High |
| APAAR-003 | Verification source unavailable | Low |
| APAAR-004 | APAAR verification failed | High |
| APAAR-005 | APAAR identifier requires correction | High |
| REF-001 | Approved intake reference unverified | Medium |
| UNV-001 | Unverified reference data used in calculation | Low |

A valid 12-digit format is **never** presented as verified. Only an explicit
verification outcome from an authorized source is shown as verified.

---

## 9. Integration phase (not built here)

Target backend, as specified:

- Python + Django REST Framework; PostgreSQL
- Keycloak + OpenID Connect for authentication; Django enforces authorization
- Celery + Redis for CSV processing, verification polling and notifications
- Private S3-compatible object storage or MinIO for uploaded files and exports
- OpenAPI schema generated from DRF and used to validate these contracts
- Docker images and GitHub Actions CI/CD for the backend and frontend

Recommended sequence:

1. Agree the OpenAPI contract and pagination/error envelope (docs/API_CONTRACT.md).
2. Implement Django models, permissions and deterministic validation in a shared
   Python module that mirrors `src/lib/validation/rules.ts`.
3. Configure Keycloak realm, roles and PKCE client; implement `AuthService` with
   an OIDC adapter; remove demo credentials from any non-demo build.
4. Implement upload endpoints with Celery jobs and private object storage;
   return row-level findings with stable signatures.
5. Wire `HttpApiClient`, add OpenAPI-generated types, and replace provider
   selectors/mutations service by service.
6. Add server-side audit logging for every decision; the UI only displays it.
7. Only then connect APAAR/ABC through an authorized adapter — never invent
   endpoints or credentials.

The Integrations page deliberately reports `Simulated`, `Not Configured` or
`Unavailable`; it never claims a live connection because demo data exists.

---

## 10. Tests and verification

```bash
npm test
```

22 tests across 4 files:

- `src/lib/validation/engine.test.ts` — rule findings, duplicate detection,
  APAAR handling, intake calculations, batch validation
- `src/lib/demo/analytics.test.ts` — intake compliance, reference suppression,
  duplicate evidence, APAAR summaries
- `src/app/App.test.tsx` — login validation, institution and admin sign-in,
  registry filtering and navigation, scope denial
- `src/features/students/UploadPage.test.tsx` — full CSV upload → validation →
  correction review → submission → submissions list → validation issues, plus
  persistence after unmount and reload

Also verified:

- `npx tsc --noEmit` passes
- `npm run build` succeeds
- Vite dev server serves the app through the preview host

**Limitation:** this environment has no usable browser runtime (missing shared
libraries and no installer privileges), so verification used jsdom integration
tests and HTTP checks rather than a real Chromium session. Visual responsiveness
and screen-reader behaviour were implemented but could not be exercised in a
browser here; run a browser pass before claiming accessibility conformance.

---

## 11. Disclaimers and known limitations

- Demonstration authentication only. No production credentials, tokens or
  secrets are included.
- Demo data lives in browser storage. It is isolated from HTTP mode and can be
  reset from Settings; it is not shared between browsers or users.
- APAAR/ABC and AICTE verification are simulated. No APAAR ID is generated by the
  frontend, and no official endpoint is called.
- Validation here is advisory and deterministic, not official identity or
  regulatory verification. The backend must be authoritative in production.
- "Accept" in demo submission review is a workflow demonstration, not official
  AICTE acceptance.
- Reports are generated client-side from demo data; production exports should be
  produced by the backend from authoritative data.
- Charts and KPIs derive from the active dataset, but they are demonstration
  analytics, not statutory statistics.
- Institution users cannot edit authoritative approved intake; only authorized
  administrative roles can, with a recorded reason.

---

## 12. Problem statement mapping

| SIH 26263 requirement | Where |
| --- | --- |
| Institution and AICTE role-based portals | Route table, guards, sidebar |
| Student data management | Registry, detail, add/edit, audit |
| APAAR status tracking | Institution and admin APAAR pages, simulated adapter |
| Enrolment validation | Validation engine, issues workflow, CSV upload |
| Duplicate identification | Duplicate candidates, admin review decisions |
| Approved intake monitoring | Course references, compliance, alerts |
| Deterministic (non-AI) rules | `src/lib/validation/` |
| Submission and correction lifecycle | Submission pages, timelines, notifications |
| Reporting and auditability | Reports, audit pages, reason-required decisions |
| Future Django/Keycloak integration | `src/lib/api/`, `src/lib/auth/`, docs |
