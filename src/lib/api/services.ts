import type {
  AlertReviewStatus,
  ApaarStatus,
  AppNotification,
  AuditEvent,
  Course,
  DuplicateReviewStatus,
  Institution,
  IntakeAlertReview,
  IssueStatus,
  PortalUser,
  Student,
  Submission,
  ValidationIssue,
  VerificationStatus,
} from '@/types';
import type { ListQuery, Paginated } from './types';

/**
 * Service contracts for the future Django REST Framework backend.
 *
 * Field names mirror the frontend domain model. The definitive OpenAPI
 * contract will be produced with the backend team; these interfaces describe
 * the client-side expectations and are intentionally narrow.
 */

export interface CourseIntakePatch {
  approvedIntake: number;
  approvalRef: string;
  effectiveDate: string;
  academicYear: string;
  verificationStatus: Course['verificationStatus'];
  reason: string;
}

export interface InstitutionService {
  list(query?: ListQuery): Promise<Paginated<Institution>>;
  get(id: string): Promise<Institution>;
  update(id: string, patch: Partial<Institution>): Promise<Institution>;
  review(
    id: string,
    payload: {
      decision: Extract<VerificationStatus, 'Verified' | 'Correction Required' | 'Rejected' | 'Under Verification'>;
      reason: string;
    },
  ): Promise<Institution>;
}

export interface CourseService {
  list(query?: ListQuery): Promise<Paginated<Course>>;
  get(id: string): Promise<Course>;
  updateIntake(id: string, patch: CourseIntakePatch): Promise<Course>;
}

export interface StudentService {
  list(query?: ListQuery): Promise<Paginated<Student>>;
  get(id: string): Promise<Student>;
  create(
    payload: Pick<
      Student,
      | 'regNumber'
      | 'name'
      | 'institutionId'
      | 'courseId'
      | 'academicYear'
      | 'admissionDate'
      | 'enrolmentStatus'
      | 'apaarId'
    >,
  ): Promise<Student>;
  update(id: string, patch: Partial<Student>, reason: string): Promise<Student>;
}

export interface UploadBatchPayload {
  institutionId: string;
  academicYear: string;
  file: File;
}

export interface UploadValidationResponse {
  batchId: string;
  summary: {
    totalRows: number;
    validRecords: number;
    invalidRecords: number;
    duplicateCandidates: number;
    missingFields: number;
    warnings: number;
    fatalErrors: number;
  };
  rows: {
    rowNumber: number;
    values: Record<string, string>;
    findings: {
      ruleId: string;
      ruleName: string;
      severity: string;
      field: string | null;
      evidence: string;
      suggestedAction: string;
    }[];
  }[];
}

export interface UploadService {
  /** Uploads the file and asks the backend to run the deterministic rule set. */
  validateBatch(payload: UploadBatchPayload): Promise<UploadValidationResponse>;
  commitBatch(batchId: string): Promise<Submission>;
  listBatches(query?: ListQuery): Promise<Paginated<Submission>>;
}

export interface ApaarSummary {
  totalRecords: number;
  idsRecorded: number;
  pending: number;
  verified: number;
  failed: number;
  missing: number;
  unavailable: number;
  correctionRequired: number;
  adapter: {
    status: 'Simulated' | 'Connected' | 'Unavailable' | 'Error' | 'Not Configured';
    message: string;
    lastCheckedAt: string | null;
  };
}

export interface ApaarService {
  summary(query?: ListQuery): Promise<ApaarSummary>;
  requestVerification(
    studentIds: string[],
  ): Promise<{ accepted: number; status: ApaarStatus; message: string }>;
}

export interface ValidationService {
  listIssues(query?: ListQuery): Promise<Paginated<ValidationIssue>>;
  getIssue(id: string): Promise<ValidationIssue>;
  updateIssue(
    id: string,
    payload: { status?: IssueStatus; assignedTo?: string | null; comment?: string },
  ): Promise<ValidationIssue>;
}

export interface IntakeComplianceRowDto {
  key: string;
  institutionId: string;
  courseId: string;
  academicYear: string;
  approvedIntake: number;
  activeEnrolment: number;
  pendingRecords: number;
  withdrawnRecords: number;
  excess: number;
  referenceStatus: Course['verificationStatus'];
  reviewStatus: AlertReviewReviewDto | null;
}

type AlertReviewReviewDto = IntakeAlertReview['status'];

export interface IntakeComplianceService {
  list(query?: ListQuery): Promise<Paginated<IntakeComplianceRowDto>>;
  reviewAlert(key: string, status: AlertReviewStatus, reason: string): Promise<IntakeAlertReview>;
}

export interface SubmissionService {
  list(query?: ListQuery): Promise<Paginated<Submission>>;
  get(id: string): Promise<Submission>;
  review(
    id: string,
    payload: { decision: 'accept' | 'reject' | 'request_correction'; reason: string },
  ): Promise<Submission>;
  resubmit(id: string, note: string): Promise<Submission>;
}

export interface NotificationService {
  list(query?: ListQuery): Promise<Paginated<AppNotification>>;
  markRead(ids: string[]): Promise<void>;
  markAllRead(): Promise<void>;
}

export interface ReportDefinition {
  id: string;
  title: string;
  description: string;
  formats: ('csv' | 'xlsx' | 'pdf')[];
  scope: 'institution' | 'admin';
}

export interface ReportService {
  listDefinitions(): Promise<ReportDefinition[]>;
  /** Returns a Blob from the backend so exports use server-authoritative data. */
  export(reportId: string, query: ListQuery, format: 'csv'): Promise<Blob>;
}

export interface AuditService {
  list(query?: ListQuery): Promise<Paginated<AuditEvent>>;
}

export interface UserService {
  list(query?: ListQuery): Promise<Paginated<PortalUser>>;
  invite(payload: Omit<PortalUser, 'id' | 'status' | 'lastActive'>): Promise<PortalUser>;
  setStatus(id: string, status: PortalUser['status']): Promise<PortalUser>;
}

export interface DuplicateCandidateDto {
  key: string;
  kind: 'apaar' | 'regNumber';
  label: string;
  evidence: string;
  studentRecordIds: string[];
  institutionIds: string[];
  academicYears: string[];
  review: {
    status: DuplicateReviewStatus;
    reason: string;
    actor: string;
    updatedAt: string;
  } | null;
}

export interface DuplicateReviewService {
  list(query?: ListQuery): Promise<Paginated<DuplicateCandidateDto>>;
  review(
    key: string,
    status: DuplicateReviewStatus,
    reason: string,
  ): Promise<{ key: string; status: DuplicateReviewStatus }>;
}

export interface IntegrationStatus {
  key: string;
  name: string;
  status: 'Simulated' | 'Not Configured' | 'Connected' | 'Unavailable' | 'Error';
  detail: string;
  lastCheckedAt: string | null;
  notes: string;
}

export interface IntegrationService {
  list(): Promise<IntegrationStatus[]>;
}

export interface EduTraceApi {
  institution: InstitutionService;
  course: CourseService;
  student: StudentService;
  upload: UploadService;
  apaar: ApaarService;
  validation: ValidationService;
  intake: IntakeComplianceService;
  submission: SubmissionService;
  notification: NotificationService;
  report: ReportService;
  audit: AuditService;
  user: UserService;
  duplicate: DuplicateReviewService;
  integration: IntegrationService;
}
