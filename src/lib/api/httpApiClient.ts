import type {
  AppNotification,
  AuditEvent,
  Course,
  Institution,
  IntakeAlertReview,
  PortalUser,
  Student,
  Submission,
  ValidationIssue,
} from '@/types';
import { HttpClient } from './httpClient';
import type {
  ApaarService,
  ApaarSummary,
  CourseIntakePatch,
  CourseService,
  DuplicateCandidateDto,
  DuplicateReviewService,
  EduTraceApi,
  InstitutionService,
  IntegrationService,
  IntegrationStatus,
  IntakeComplianceRowDto,
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
import type { ListQuery, Paginated } from './types';

/**
 * Django REST Framework implementation of `EduTraceApi`.
 *
 * Route names are a proposed contract, not an existing backend. The final
 * OpenAPI schema will be generated with the Django team and these paths
 * adjusted in one place.
 */
export class HttpApiClient implements EduTraceApi {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  institution: InstitutionService = {
    list: (query) => this.http.get<Paginated<Institution>>('/institutions/', { query }),
    get: (id) => this.http.get<Institution>(`/institutions/${id}/`),
    update: (id, patch) => this.http.patch<Institution>(`/institutions/${id}/`, patch),
    review: (id, payload) =>
      this.http.post<Institution>(`/institutions/${id}/verification/`, payload),
  };

  course: CourseService = {
    list: (query) => this.http.get<Paginated<Course>>('/courses/', { query }),
    get: (id) => this.http.get<Course>(`/courses/${id}/`),
    updateIntake: (id, patch: CourseIntakePatch) =>
      this.http.post<Course>(`/courses/${id}/intake-revisions/`, patch),
  };

  student: StudentService = {
    list: (query) => this.http.get<Paginated<Student>>('/students/', { query }),
    get: (id) => this.http.get<Student>(`/students/${id}/`),
    create: (payload) => this.http.post<Student>('/students/', payload),
    update: (id, patch, reason) =>
      this.http.patch<Student>(`/students/${id}/`, { ...patch, change_reason: reason }),
  };

  upload: UploadService = {
    validateBatch: ({ institutionId, academicYear, file }) => {
      const form = new FormData();
      form.append('institution', institutionId);
      form.append('academic_year', academicYear);
      form.append('file', file);
      return this.http.post('/uploads/validate/', form, { timeoutMs: 60_000 });
    },
    commitBatch: (batchId) => this.http.post<Submission>(`/uploads/${batchId}/commit/`),
    listBatches: (query) => this.http.get<Paginated<Submission>>('/uploads/', { query }),
  };

  apaar: ApaarService = {
    summary: (query) => this.http.get<ApaarSummary>('/apaar/summary/', { query }),
    requestVerification: (studentIds) =>
      this.http.post('/apaar/verifications/', { student_ids: studentIds }),
  };

  validation: ValidationService = {
    listIssues: (query) =>
      this.http.get<Paginated<ValidationIssue>>('/validation-issues/', { query }),
    getIssue: (id) => this.http.get<ValidationIssue>(`/validation-issues/${id}/`),
    updateIssue: (id, payload) =>
      this.http.patch<ValidationIssue>(`/validation-issues/${id}/`, payload),
  };

  intake: IntakeComplianceService = {
    list: (query) =>
      this.http.get<Paginated<IntakeComplianceRowDto>>('/intake-compliance/', { query }),
    reviewAlert: (key, status, reason) =>
      this.http.post<IntakeAlertReview>('/intake-alerts/review/', { key, status, reason }),
  };

  submission: SubmissionService = {
    list: (query) => this.http.get<Paginated<Submission>>('/submissions/', { query }),
    get: (id) => this.http.get<Submission>(`/submissions/${id}/`),
    review: (id, payload) => this.http.post<Submission>(`/submissions/${id}/review/`, payload),
    resubmit: (id, note) => this.http.post<Submission>(`/submissions/${id}/resubmit/`, { note }),
  };

  notification: NotificationService = {
    list: (query) =>
      this.http.get<Paginated<AppNotification>>('/notifications/', { query }),
    markRead: async (ids) => {
      await this.http.post('/notifications/mark-read/', { ids });
    },
    markAllRead: async () => {
      await this.http.post('/notifications/mark-all-read/');
    },
  };

  report: ReportService = {
    listDefinitions: () => this.http.get<ReportDefinition[]>('/reports/definitions/'),
    export: (reportId, query, format) =>
      this.http.getBlob(`/reports/${reportId}/export/`, {
        query: { ...query, format },
      }),
  };

  audit: AuditService = {
    list: (query) => this.http.get<Paginated<AuditEvent>>('/audit-events/', { query }),
  };

  user: UserService = {
    list: (query) => this.http.get<Paginated<PortalUser>>('/users/', { query }),
    invite: (payload) => this.http.post<PortalUser>('/users/', payload),
    setStatus: (id, status) => this.http.patch<PortalUser>(`/users/${id}/`, { status }),
  };

  duplicate: DuplicateReviewService = {
    list: (query) =>
      this.http.get<Paginated<DuplicateCandidateDto>>('/duplicate-candidates/', { query }),
    review: (key, status, reason) =>
      this.http.post('/duplicate-candidates/review/', { key, status, reason }),
  };

  integration: IntegrationService = {
    list: () => this.http.get<IntegrationStatus[]>('/system/integrations/'),
  };

  static previewEndpoints(query?: ListQuery): string {
    const suffix = query?.academicYear ? `?academic_year=${query.academicYear}` : '';
    return `/students/${suffix}`;
  }
}
