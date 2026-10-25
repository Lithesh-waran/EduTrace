/**
 * EduTrace domain model.
 *
 * These types describe the entities exchanged with the future Django REST
 * Framework backend. They are intentionally independent of any UI concern so
 * the same contracts can be served by `MockApiClient` (demo) and
 * `HttpApiClient` (Django + PostgreSQL).
 */

export type Role =
  | 'institution_admin'
  | 'institution_operator'
  | 'institution_verifier'
  | 'aicte_admin'
  | 'aicte_reviewer'
  | 'auditor';

export type PortalScope = 'institution' | 'admin';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  scope: PortalScope;
  /** Present for institution-scoped roles. */
  institutionId?: string;
  /** Demo flag — production identities come from Keycloak (OIDC). */
  demo?: boolean;
}

export type InstitutionType =
  | 'Engineering & Technology'
  | 'Management'
  | 'Pharmacy'
  | 'Applied Sciences'
  | 'Polytechnic';

export type ManagementType =
  | 'Government'
  | 'Government Aided'
  | 'Private Unaided'
  | 'Deemed University';

export type VerificationStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Verification'
  | 'Correction Required'
  | 'Verified'
  | 'Rejected';

export interface Institution {
  id: string;
  aicteId: string;
  name: string;
  shortCode: string;
  type: InstitutionType;
  managementType: ManagementType;
  address: string;
  state: string;
  region: string;
  district: string;
  email: string;
  phone: string;
  headOfInstitution: string;
  portalAdministrator: string;
  approvalRef: string;
  approvalFrom: string;
  approvalTo: string;
  verificationStatus: VerificationStatus;
  approvalSource: string;
  lastVerifiedOn: string | null;
  lastUpdated: string;
  reviewerComments: { at: string; actor: string; decision: string; reason: string }[];
}

export type ReferenceVerification = 'Verified' | 'Unverified' | 'Provisional';

export interface IntakeRevision {
  effectiveDate: string;
  academicYear: string;
  approvedIntake: number;
  approvalRef: string;
  note: string;
}

export interface Course {
  id: string;
  institutionId: string;
  name: string;
  code: string;
  academicYear: string;
  approvedIntake: number;
  additionalSeatCategories: string[];
  approvalRef: string;
  effectiveDate: string;
  lastVerifiedDate: string | null;
  verificationStatus: ReferenceVerification;
  revisions: IntakeRevision[];
}

export type EnrolmentStatus =
  | 'Admitted'
  | 'Active'
  | 'Withdrawn'
  | 'Transferred'
  | 'Completed'
  | 'Pending Verification';

export const ENROLMENT_STATUSES: EnrolmentStatus[] = [
  'Admitted',
  'Active',
  'Withdrawn',
  'Transferred',
  'Completed',
  'Pending Verification',
];

export type ApaarStatus =
  | 'Not Provided'
  | 'Pending'
  | 'Submitted for Verification'
  | 'Verified by Authorized Source'
  | 'Verification Failed'
  | 'Verification Unavailable'
  | 'Correction Required';

export const APAAR_STATUSES: ApaarStatus[] = [
  'Not Provided',
  'Pending',
  'Submitted for Verification',
  'Verified by Authorized Source',
  'Verification Failed',
  'Verification Unavailable',
  'Correction Required',
];

export type ValidationStatus = 'Valid' | 'Warning' | 'Invalid' | 'Not Validated';

export interface Student {
  id: string;
  recordId: string;
  regNumber: string;
  name: string;
  institutionId: string;
  courseId: string;
  academicYear: string;
  admissionDate: string;
  enrolmentStatus: EnrolmentStatus;
  /** Synthetic demonstration identifier. Never a real APAAR/ABC value. */
  apaarId: string | null;
  apaarStatus: ApaarStatus;
  lastUpdated: string;
  sourceBatchId?: string;
  notes?: string;
}

export type IssueStatus =
  | 'Open'
  | 'Acknowledged'
  | 'Under Review'
  | 'Correction Required'
  | 'Resolved'
  | 'Escalated'
  | 'Closed';

export const ISSUE_STATUSES: IssueStatus[] = [
  'Open',
  'Acknowledged',
  'Under Review',
  'Correction Required',
  'Resolved',
  'Escalated',
  'Closed',
];

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

export const SEVERITIES: Severity[] = ['Critical', 'High', 'Medium', 'Low'];

export interface IssueComment {
  id: string;
  author: string;
  role: Role | 'system';
  at: string;
  message: string;
}

export interface ValidationIssue {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: Severity;
  institutionId: string;
  studentId?: string;
  batchId?: string;
  recordRef: string;
  reason: string;
  evidence: string;
  suggestedAction: string;
  detectedAt: string;
  status: IssueStatus;
  assignedTo: string | null;
  lastUpdated: string;
  comments: IssueComment[];
}

export type SubmissionStatus =
  | 'Draft'
  | 'Submitted'
  | 'Validation in Progress'
  | 'Correction Required'
  | 'Under Review'
  | 'Accepted'
  | 'Rejected'
  | 'Resubmitted';

export const SUBMISSION_STATUSES: SubmissionStatus[] = [
  'Draft',
  'Submitted',
  'Validation in Progress',
  'Correction Required',
  'Under Review',
  'Accepted',
  'Rejected',
  'Resubmitted',
];

export interface SubmissionFile {
  name: string;
  sizeBytes: number;
  rows: number;
}

export interface SubmissionTimelineEntry {
  at: string;
  actor: string;
  status: SubmissionStatus;
  note: string;
}

export interface SubmissionComment {
  id: string;
  author: string;
  role: Role | 'system';
  at: string;
  message: string;
}

export interface Submission {
  id: string;
  institutionId: string;
  academicYear: string;
  file: SubmissionFile;
  recordCount: number;
  validRecords: number;
  correctionRecords: number;
  duplicateCandidates: number;
  submittedAt: string;
  status: SubmissionStatus;
  reviewer: string | null;
  lastUpdated: string;
  comments: SubmissionComment[];
  timeline: SubmissionTimelineEntry[];
}

export type AlertReviewStatus =
  | 'Open'
  | 'Acknowledged'
  | 'Reference Verification Required'
  | 'Correction Required'
  | 'Authorized Revision Identified'
  | 'Resolved'
  | 'Escalated';

export interface AlertAction {
  at: string;
  actor: string;
  action: string;
  reason: string;
}

export interface IntakeAlertReview {
  /** `${institutionId}:${courseId}:${academicYear}` */
  key: string;
  status: AlertReviewStatus;
  actions: AlertAction[];
  lastUpdated: string;
}

export type DuplicateAction =
  | 'Legitimate separate records'
  | 'Clarification requested'
  | 'Data correction requested'
  | 'Escalated'
  | 'Resolved';

export type DuplicateReviewStatus =
  | 'Open'
  | 'Clarification requested'
  | 'Correction requested'
  | 'Escalated'
  | 'Resolved — separate records'
  | 'Resolved — corrected';

export interface DuplicateReview {
  key: string;
  status: DuplicateReviewStatus;
  reason: string;
  actor: string;
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  actorRole: Role | 'system';
  institutionId: string | null;
  action: string;
  recordRef: string;
  reason: string | null;
  changeSummary: string;
}

export type NotificationType =
  | 'apaar'
  | 'validation'
  | 'duplicate'
  | 'intake'
  | 'submission'
  | 'review'
  | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  at: string;
  read: boolean;
  link: string;
  institutionId: string | null;
}

export type UserAccountStatus = 'Active' | 'Invited' | 'Suspended';

export interface PortalUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  scope: PortalScope;
  institutionId: string | null;
  status: UserAccountStatus;
  lastActive: string;
}

export interface DemoAccount {
  id: string;
  name: string;
  email: string;
  /** Demo-only password. Never a production credential. */
  password: string;
  role: Role;
  scope: PortalScope;
  institutionId?: string;
  label: string;
  description: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  institution_admin: 'Institution Administrator',
  institution_operator: 'Institution Data Operator',
  institution_verifier: 'Institution Verifier',
  aicte_admin: 'AICTE Administrator',
  aicte_reviewer: 'AICTE Reviewer',
  auditor: 'Read-only Auditor',
};

export const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'] as const;

export type AcademicYear = (typeof ACADEMIC_YEARS)[number];

export const APAAR_STATUS_META: Record<
  ApaarStatus,
  { tone: 'success' | 'warning' | 'critical' | 'info' | 'muted'; description: string }
> = {
  'Not Provided': {
    tone: 'muted',
    description: 'No identifier has been recorded for this student.',
  },
  Pending: {
    tone: 'warning',
    description: 'Identifier recorded; awaiting submission to the authorized source.',
  },
  'Submitted for Verification': {
    tone: 'info',
    description: 'Submitted through the (simulated) verification adapter.',
  },
  'Verified by Authorized Source': {
    tone: 'success',
    description: 'Confirmed by an authorized source in demo data. Not a live check.',
  },
  'Verification Failed': {
    tone: 'critical',
    description: 'The simulated verification attempt did not match.',
  },
  'Verification Unavailable': {
    tone: 'warning',
    description: 'The verification adapter was unavailable when last attempted.',
  },
  'Correction Required': {
    tone: 'critical',
    description: 'Recorded data conflicts and must be corrected by the institution.',
  },
};

export const ISSUE_STATUS_META: Record<IssueStatus, 'info' | 'success' | 'warning' | 'critical' | 'muted'> = {
  Open: 'critical',
  Acknowledged: 'info',
  'Under Review': 'warning',
  'Correction Required': 'critical',
  Resolved: 'success',
  Escalated: 'warning',
  Closed: 'muted',
};

export const SUBMISSION_STATUS_META: Record<
  SubmissionStatus,
  'info' | 'success' | 'warning' | 'critical' | 'muted'
> = {
  Draft: 'muted',
  Submitted: 'info',
  'Validation in Progress': 'warning',
  'Correction Required': 'critical',
  'Under Review': 'warning',
  Accepted: 'success',
  Rejected: 'critical',
  Resubmitted: 'info',
};

export const VERIFICATION_STATUS_META: Record<
  VerificationStatus,
  'info' | 'success' | 'warning' | 'critical' | 'muted'
> = {
  Draft: 'muted',
  Submitted: 'info',
  'Under Verification': 'warning',
  'Correction Required': 'critical',
  Verified: 'success',
  Rejected: 'critical',
};
