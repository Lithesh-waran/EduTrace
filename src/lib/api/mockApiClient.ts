import { createDemoDatabase } from '@/lib/demo/seed';
import type {
  AuditEvent,
  Course,
  Institution,
  PortalUser,
  Student,
  Submission,
  ValidationIssue,
} from '@/types';
import type {
  ApaarService,
  ApaarSummary,
  CourseService,
  DuplicateReviewService,
  EduTraceApi,
  InstitutionService,
  IntegrationService,
  IntegrationStatus,
  IntakeComplianceService,
  NotificationService,
  ReportDefinition,
  ReportService,
  AuditService,
  StudentService,
  SubmissionService,
  UploadService,
  UserService,
  ValidationService,
} from './services';
import { ApiError, type ListQuery, type Paginated } from './types';

/**
 * Read-only mock implementation of `EduTraceApi`.
 *
 * It serves typed responses from the deterministic demonstration dataset so
 * that API-shaped queries can be exercised before Django exists. Demonstration
 * mutations (uploads, reviews, corrections) run through the local data layer in
 * `src/lib/demo/store.tsx`, which the UI uses directly in demo mode; this class
 * deliberately refuses writes instead of pretending a backend accepted them.
 */
export class MockApiClient implements EduTraceApi {
  private db = createDemoDatabase();

  private paginate<T>(items: T[], query?: ListQuery): Paginated<T> {
    const page = Number(query?.page ?? 1);
    const pageSize = Number(query?.pageSize ?? 25);
    const start = (page - 1) * pageSize;
    return {
      results: items.slice(start, start + pageSize),
      count: items.length,
      page,
      pageSize,
      next: start + pageSize < items.length ? String(page + 1) : null,
      previous: page > 1 ? String(page - 1) : null,
    };
  }

  private writeError(): never {
    throw new ApiError(
      501,
      'DEMO_READ_ONLY',
      'Demonstration mode uses the local data layer for writes. Configure VITE_API_MODE=http and VITE_API_BASE_URL to use the Django backend.',
    );
  }

  institution: InstitutionService = {
    list: async (query) => this.paginate<Institution>(this.db.institutions, query),
    get: async (id) => {
      const institution = this.db.institutions.find((item) => item.id === id);
      if (!institution) throw new ApiError(404, 'NOT_FOUND', 'Institution not found.');
      return institution;
    },
    update: async () => this.writeError(),
    review: async () => this.writeError(),
  };

  course: CourseService = {
    list: async (query) =>
      this.paginate<Course>(
        query?.institutionId
          ? this.db.courses.filter((course) => course.institutionId === query.institutionId)
          : this.db.courses,
        query,
      ),
    get: async (id) => {
      const course = this.db.courses.find((item) => item.id === id);
      if (!course) throw new ApiError(404, 'NOT_FOUND', 'Course not found.');
      return course;
    },
    updateIntake: async () => this.writeError(),
  };

  student: StudentService = {
    list: async (query) => {
      let items = this.db.students;
      if (query?.institutionId) {
        items = items.filter((student) => student.institutionId === query.institutionId);
      }
      if (query?.courseId) {
        items = items.filter((student) => student.courseId === query.courseId);
      }
      if (query?.academicYear) {
        items = items.filter((student) => student.academicYear === query.academicYear);
      }
      return this.paginate<Student>(items, query);
    },
    get: async (id) => {
      const student = this.db.students.find((item) => item.id === id);
      if (!student) throw new ApiError(404, 'NOT_FOUND', 'Student record not found.');
      return student;
    },
    create: async () => this.writeError(),
    update: async () => this.writeError(),
  };

  upload: UploadService = {
    validateBatch: async () => this.writeError(),
    commitBatch: async () => this.writeError(),
    listBatches: async (query) =>
      this.paginate<Submission>(
        query?.institutionId
          ? this.db.submissions.filter((batch) => batch.institutionId === query.institutionId)
          : this.db.submissions,
        query,
      ),
  };

  apaar: ApaarService = {
    summary: async (query): Promise<ApaarSummary> => {
      const students = query?.institutionId
        ? this.db.students.filter((student) => student.institutionId === query.institutionId)
        : this.db.students;
      const count = (status: Student['apaarStatus']) =>
        students.filter((student) => student.apaarStatus === status).length;
      return {
        totalRecords: students.length,
        idsRecorded: students.filter((student) => Boolean(student.apaarId)).length,
        pending: count('Pending'),
        verified: count('Verified by Authorized Source'),
        failed: count('Verification Failed'),
        missing: count('Not Provided'),
        unavailable: count('Verification Unavailable'),
        correctionRequired: count('Correction Required'),
        adapter: {
          status: 'Simulated',
          message:
            'APAAR/ABC verification is simulated in this build. No live government verification is performed.',
          lastCheckedAt: null,
        },
      };
    },
    requestVerification: async () => this.writeError(),
  };

  validation: ValidationService = {
    listIssues: async (query) =>
      this.paginate<ValidationIssue>(
        query?.institutionId
          ? this.db.issues.filter((issue) => issue.institutionId === query.institutionId)
          : this.db.issues,
        query,
      ),
    getIssue: async (id) => {
      const issue = this.db.issues.find((item) => item.id === id);
      if (!issue) throw new ApiError(404, 'NOT_FOUND', 'Validation issue not found.');
      return issue;
    },
    updateIssue: async () => this.writeError(),
  };

  intake: IntakeComplianceService = {
    list: async () => this.writeError(),
    reviewAlert: async () => this.writeError(),
  };

  submission: SubmissionService = {
    list: async (query) =>
      this.paginate<Submission>(
        query?.institutionId
          ? this.db.submissions.filter((batch) => batch.institutionId === query.institutionId)
          : this.db.submissions,
        query,
      ),
    get: async (id) => {
      const submission = this.db.submissions.find((item) => item.id === id);
      if (!submission) throw new ApiError(404, 'NOT_FOUND', 'Submission not found.');
      return submission;
    },
    review: async () => this.writeError(),
    resubmit: async () => this.writeError(),
  };

  notification: NotificationService = {
    list: async (query) =>
      this.paginate(this.db.notifications, query),
    markRead: async () => this.writeError(),
    markAllRead: async () => this.writeError(),
  };

  report: ReportService = {
    listDefinitions: async (): Promise<ReportDefinition[]> => [
      {
        id: 'course-enrolment',
        title: 'Course-wise enrolment',
        description: 'Enrolment counts by course and academic year.',
        formats: ['csv'],
        scope: 'institution',
      },
      {
        id: 'apaar-status',
        title: 'APAAR status',
        description: 'Identifier status distribution including missing identifiers.',
        formats: ['csv'],
        scope: 'institution',
      },
    ],
    export: async () => this.writeError(),
  };

  audit: AuditService = {
    list: async (query) => this.paginate<AuditEvent>(this.db.audit, query),
  };

  user: UserService = {
    list: async (query) => this.paginate<PortalUser>(this.db.users, query),
    invite: async () => this.writeError(),
    setStatus: async () => this.writeError(),
  };

  duplicate: DuplicateReviewService = {
    list: async () => this.writeError(),
    review: async () => this.writeError(),
  };

  integration: IntegrationService = {
    list: async (): Promise<IntegrationStatus[]> => [
      {
        key: 'apaar',
        name: 'APAAR / ABC adapter',
        status: 'Simulated',
        detail: 'Deterministic synthetic identifiers. No authorized endpoint configured.',
        lastCheckedAt: null,
        notes: 'Connect only after AICTE/ABC authorizes the integration and credentials are issued.',
      },
      {
        key: 'aicte',
        name: 'AICTE reference integration',
        status: 'Not Configured',
        detail: 'Approved intake data is a local synthetic reference extract.',
        lastCheckedAt: null,
        notes: 'Awaiting authorized API credentials from AICTE.',
      },
      {
        key: 'identity',
        name: 'Authentication provider (Keycloak)',
        status: 'Not Configured',
        detail: 'Demonstration sign-in only. Keycloak OIDC realm is not connected.',
        lastCheckedAt: null,
        notes: 'Replace MockAuthService with the Keycloak OIDC adapter during integration.',
      },
      {
        key: 'database',
        name: 'Database (PostgreSQL)',
        status: 'Not Configured',
        detail: 'Demonstration data is stored in the browser only.',
        lastCheckedAt: null,
        notes: 'Django + PostgreSQL is the intended system of record.',
      },
      {
        key: 'storage',
        name: 'Private file storage (S3 / MinIO)',
        status: 'Not Configured',
        detail: 'Uploaded CSV files are parsed in the browser and never transmitted.',
        lastCheckedAt: null,
        notes: 'Original batch files must be stored privately server-side with signed access.',
      },
    ],
  };
}
