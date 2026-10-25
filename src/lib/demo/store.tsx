import * as React from 'react';
import { createDemoDatabase, type DemoDatabase } from './seed';
import type {
  AlertReviewStatus,
  AppNotification,
  DuplicateReviewStatus,
  Institution,
  IssueStatus,
  NotificationType,
  PortalUser,
  SessionUser,
  Student,
  Submission,
  SubmissionStatus,
  UserAccountStatus,
  ValidationIssue,
} from '@/types';
import { useAuth } from '@/lib/auth/AuthProvider';

const STORAGE_KEY = 'edutrace.demo.db.v1';

interface StoreState extends DemoDatabase {
  version: 1;
}

function initialState(): StoreState {
  return { version: 1, ...createDemoDatabase() };
}

function loadState(): StoreState {
  if (typeof window === 'undefined') return initialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as StoreState;
    if (parsed.version !== 1 || !Array.isArray(parsed.students)) return initialState();
    return parsed;
  } catch {
    return initialState();
  }
}

function now(): string {
  return new Date().toISOString();
}

function nextId(prefix: string, existing: { id: string }[], start: number): string {
  let max = start;
  for (const item of existing) {
    const match = item.id.match(/(\d+)$/);
    if (match) max = Math.max(max, Number.parseInt(match[1], 10));
  }
  return `${prefix}${max + 1}`;
}

function nextRecordId(students: Student[]): string {
  let max = 10000;
  for (const student of students) {
    const match = student.recordId.match(/(\d+)$/);
    if (match) max = Math.max(max, Number.parseInt(match[1], 10));
  }
  return `ETR-${max + 1}`;
}

type Action =
  | { type: 'replace'; state: StoreState }
  | { type: 'setStudents'; students: Student[] }
  | { type: 'addStudent'; student: Student }
  | {
      type: 'commitUpload';
      students: Student[];
      submission: Submission;
      issues: ValidationIssue[];
      notifications: AppNotification[];
    }
  | { type: 'updateIssue'; issue: ValidationIssue }
  | { type: 'updateSubmission'; submission: Submission }
  | { type: 'updateInstitution'; institution: Institution }
  | { type: 'updateCourse'; courseId: string; patch: Partial<DemoDatabase['courses'][number]> }
  | { type: 'updateNotification'; ids: string[]; read: boolean }
  | { type: 'pushNotification'; notifications: AppNotification[] }
  | { type: 'setAlertReview'; review: NonNullable<DemoDatabase['alertReviews'][string]> }
  | { type: 'setDuplicateReview'; review: NonNullable<DemoDatabase['duplicateReviews'][string]> }
  | { type: 'addAudit'; entries: DemoDatabase['audit'] }
  | { type: 'addUser'; user: PortalUser }
  | { type: 'updateUser'; user: PortalUser };

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case 'replace':
      return action.state;
    case 'setStudents':
      return { ...state, students: action.students };
    case 'addStudent':
      return { ...state, students: [action.student, ...state.students] };
    case 'commitUpload':
      return {
        ...state,
        students: [...action.students, ...state.students],
        submissions: [action.submission, ...state.submissions],
        issues: [...action.issues, ...state.issues],
        notifications: [...action.notifications, ...state.notifications],
      };
    case 'updateIssue':
      return {
        ...state,
        issues: state.issues.map((issue) => (issue.id === action.issue.id ? action.issue : issue)),
      };
    case 'updateSubmission':
      return {
        ...state,
        submissions: state.submissions.map((submission) =>
          submission.id === action.submission.id ? action.submission : submission,
        ),
      };
    case 'updateInstitution':
      return {
        ...state,
        institutions: state.institutions.map((institution) =>
          institution.id === action.institution.id ? action.institution : institution,
        ),
      };
    case 'updateCourse':
      return {
        ...state,
        courses: state.courses.map((course) =>
          course.id === action.courseId ? { ...course, ...action.patch } : course,
        ),
      };
    case 'updateNotification':
      return {
        ...state,
        notifications: state.notifications.map((notification) =>
          action.ids.includes(notification.id) ? { ...notification, read: action.read } : notification,
        ),
      };
    case 'pushNotification':
      return { ...state, notifications: [...action.notifications, ...state.notifications] };
    case 'setAlertReview':
      return {
        ...state,
        alertReviews: { ...state.alertReviews, [action.review.key]: action.review },
      };
    case 'setDuplicateReview':
      return {
        ...state,
        duplicateReviews: { ...state.duplicateReviews, [action.review.key]: action.review },
      };
    case 'addAudit':
      return { ...state, audit: [...action.entries, ...state.audit] };
    case 'addUser':
      return { ...state, users: [action.user, ...state.users] };
    case 'updateUser':
      return {
        ...state,
        users: state.users.map((user) => (user.id === action.user.id ? action.user : user)),
      };
    default:
      return state;
  }
}

export interface UploadCommitRow {
  regNumber: string;
  name: string;
  courseId: string;
  academicYear: string;
  admissionDate: string;
  enrolmentStatus: Student['enrolmentStatus'];
  apaarId: string | null;
  apaarStatus: Student['apaarStatus'];
}

export interface UploadCommitIssue {
  ruleId: string;
  ruleName: string;
  severity: ValidationIssue['severity'];
  recordRef: string;
  studentId?: string;
  reason: string;
  evidence: string;
  suggestedAction: string;
}

export interface UploadCommitInput {
  institutionId: string;
  academicYear: string;
  file: { name: string; sizeBytes: number; rows: number };
  rows: UploadCommitRow[];
  skipped: { rowNumber: number; recordRef: string; findings: UploadCommitIssue[] }[];
  summary: { recordCount: number; duplicateCandidates: number };
}

export interface DataActions {
  updateStudent: (id: string, patch: Partial<Student>, reason: string) => void;
  addStudent: (input: UploadCommitRow & { institutionId: string }) => Student;
  commitUpload: (input: UploadCommitInput) => Submission;
  simulateApaarVerification: (studentIds: string[]) => void;
  addIssueComment: (issueId: string, message: string) => void;
  setIssueStatus: (issueId: string, status: IssueStatus, assignedTo?: string | null) => void;
  reviewSubmission: (
    id: string,
    decision: 'accept' | 'reject' | 'request_correction',
    reason: string,
  ) => void;
  resubmitSubmission: (id: string, note: string) => void;
  reviewInstitution: (
    id: string,
    decision: 'verify' | 'request_correction' | 'reject' | 'under_review',
    reason: string,
  ) => void;
  reviewIntakeAlert: (key: string, status: AlertReviewStatus, reason: string) => void;
  reviewDuplicate: (key: string, status: DuplicateReviewStatus, reason: string) => void;
  updateCourseIntake: (
    courseId: string,
    patch: {
      approvedIntake: number;
      approvalRef: string;
      effectiveDate: string;
      academicYear: string;
      verificationStatus: DemoDatabase['courses'][number]['verificationStatus'];
    },
    reason: string,
  ) => void;
  updateInstitution: (id: string, patch: Partial<Institution>, reason: string) => void;
  markNotificationsRead: (ids: string[]) => void;
  markAllNotificationsRead: (scopeInstitutionId?: string | null) => void;
  addUser: (input: { name: string; email: string; role: PortalUser['role']; scope: PortalUser['scope']; institutionId: string | null }) => PortalUser;
  setUserStatus: (id: string, status: UserAccountStatus) => void;
  resetDemoData: () => void;
}

interface DataContextValue {
  data: StoreState;
  actions: DataActions;
}

const DataContext = React.createContext<DataContextValue | null>(null);

function actorName(user: SessionUser | null): { name: string; role: SessionUser['role'] | 'system' } {
  if (!user) return { name: 'Demonstration System', role: 'system' };
  return { name: user.name, role: user.role };
}

let notificationCounter = 0;
function notificationId(): string {
  notificationCounter += 1;
  return `ntf-live-${Date.now()}-${notificationCounter}`;
}

let eventCounter = 0;
function auditId(): string {
  eventCounter += 1;
  return `aud-live-${Date.now()}-${eventCounter}`;
}

export function DemoDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = React.useReducer(reducer, undefined, loadState);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* Storage may be unavailable; the session still works in memory. */
    }
  }, [state]);

  const actions = React.useMemo<DataActions>(() => {
    const actor = actorName(user);

    const auditEntry = (
      action: string,
      recordRef: string,
      reason: string | null,
      changeSummary: string,
      institutionId: string | null = user?.institutionId ?? null,
    ) => ({
      id: auditId(),
      at: now(),
      actor: actor.name,
      actorRole: actor.role,
      institutionId,
      action,
      recordRef,
      reason,
      changeSummary,
    });

    const makeNotification = (
      type: NotificationType,
      title: string,
      body: string,
      link: string,
      institutionId: string | null,
    ): AppNotification => ({
      id: notificationId(),
      type,
      title,
      body,
      at: now(),
      read: false,
      link,
      institutionId,
    });

    return {
      updateStudent: (id, patch, reason) => {
        const student = state.students.find((s) => s.id === id);
        if (!student) return;
        const updated: Student = { ...student, ...patch, lastUpdated: now() };
        const changed = Object.keys(patch)
          .map((key) => {
            const k = key as keyof Student;
            if (String(student[k] ?? '—') === String(updated[k] ?? '—')) return null;
            return `${key}: ${String(student[k] ?? '—')} → ${String(updated[k] ?? '—')}`;
          })
          .filter(Boolean)
          .join('; ');
        dispatch({ type: 'setStudents', students: state.students.map((s) => (s.id === id ? updated : s)) });
        dispatch({
          type: 'addAudit',
          entries: [
            auditEntry(
              'Student record updated',
              student.recordId,
              reason,
              changed || 'No field values changed.',
              student.institutionId,
            ),
          ],
        });
      },

      addStudent: (input) => {
        const student: Student = {
          id: nextId('stu-live-', state.students, 0),
          recordId: nextRecordId(state.students),
          regNumber: input.regNumber,
          name: input.name,
          institutionId: input.institutionId,
          courseId: input.courseId,
          academicYear: input.academicYear,
          admissionDate: input.admissionDate,
          enrolmentStatus: input.enrolmentStatus,
          apaarId: input.apaarId,
          apaarStatus: input.apaarStatus,
          lastUpdated: now(),
        };
        dispatch({ type: 'addStudent', student });
        dispatch({
          type: 'addAudit',
          entries: [
            auditEntry(
              'Student record created',
              student.recordId,
              'Added manually from the institution registry.',
              `${student.name} added to ${student.academicYear}.`,
              student.institutionId,
            ),
          ],
        });
        return student;
      },

      commitUpload: (input) => {
        const timestamp = now();
        const students: Student[] = input.rows.map((row, index) => ({
          id: nextId('stu-live-', state.students, index),
          recordId: `ETR-${20000 + state.students.length + index + 1}`,
          regNumber: row.regNumber,
          name: row.name,
          institutionId: input.institutionId,
          courseId: row.courseId,
          academicYear: row.academicYear,
          admissionDate: row.admissionDate,
          enrolmentStatus: row.enrolmentStatus,
          apaarId: row.apaarId,
          apaarStatus: row.apaarStatus,
          lastUpdated: timestamp,
          sourceBatchId: 'pending',
        }));

        const submissionNumber = 151 + state.submissions.length;
        const submissionId = `SUB-2026-${String(submissionNumber).padStart(4, '0')}`;
        students.forEach((student) => {
          student.sourceBatchId = submissionId;
        });

        const correctionRecords = input.skipped.length;
        const submission: Submission = {
          id: submissionId,
          institutionId: input.institutionId,
          academicYear: input.academicYear,
          file: input.file,
          recordCount: input.summary.recordCount,
          validRecords: students.length,
          correctionRecords,
          duplicateCandidates: input.summary.duplicateCandidates,
          submittedAt: timestamp,
          status: correctionRecords > 0 ? 'Validation in Progress' : 'Submitted',
          reviewer: null,
          lastUpdated: timestamp,
          comments: [],
          timeline: [
            {
              at: timestamp,
              actor: actor.name,
              status: correctionRecords > 0 ? 'Validation in Progress' : 'Submitted',
              note:
                correctionRecords > 0
                  ? `${students.length} valid rows submitted; ${correctionRecords} row(s) require correction.`
                  : `${students.length} rows submitted for validation.`,
            },
          ],
        };

        const issues: ValidationIssue[] = [];
        let issueIndex = state.issues.length;
        for (const skipped of input.skipped) {
          for (const finding of skipped.findings) {
            issueIndex += 1;
            issues.push({
              id: `VI-2026-${2000 + issueIndex}`,
              ruleId: finding.ruleId,
              ruleName: finding.ruleName,
              severity: finding.severity,
              institutionId: input.institutionId,
              batchId: submissionId,
              recordRef: skipped.recordRef,
              reason: finding.reason,
              evidence: `Row ${skipped.rowNumber} in ${input.file.name}: ${finding.evidence}`,
              suggestedAction: finding.suggestedAction,
              detectedAt: timestamp,
              status: 'Open',
              assignedTo: null,
              lastUpdated: timestamp,
              comments: [],
            });
          }
        }

        const institutionName =
          state.institutions.find((institution) => institution.id === input.institutionId)?.name ??
          'Institution';

        const notifications: AppNotification[] = [
          makeNotification(
            'submission',
            `Batch ${submissionId} submitted`,
            `${students.length} valid record(s) accepted into the registry; ${correctionRecords} row(s) require correction.`,
            `/institution/submissions/${submissionId}`,
            input.institutionId,
          ),
          makeNotification(
            'submission',
            'New institutional submission received',
            `${institutionName} submitted batch ${submissionId} for ${input.academicYear}.`,
            `/admin/submissions/${submissionId}`,
            null,
          ),
        ];

        dispatch({
          type: 'commitUpload',
          students,
          submission,
          issues,
          notifications,
        });
        dispatch({
          type: 'addAudit',
          entries: [
            auditEntry(
              'Batch submitted',
              submissionId,
              null,
              `${input.file.name} processed: ${input.summary.recordCount} rows, ${students.length} valid, ${correctionRecords} requiring correction.`,
              input.institutionId,
            ),
            auditEntry(
              'Deterministic validation completed',
              submissionId,
              correctionRecords > 0 ? `${correctionRecords} row(s) failed validation.` : null,
              `${issues.length} validation issue(s) recorded for the submitted batch.`,
              input.institutionId,
            ),
          ],
        });
        return submission;
      },

      simulateApaarVerification: (studentIds) => {
        const targets = state.students.filter((student) => studentIds.includes(student.id));
        if (targets.length === 0) return;
        const updated = state.students.map((student) =>
          studentIds.includes(student.id)
            ? {
                ...student,
                apaarStatus: 'Submitted for Verification' as const,
                lastUpdated: now(),
              }
            : student,
        );
        dispatch({ type: 'setStudents', students: updated });
        dispatch({
          type: 'addAudit',
          entries: [
            auditEntry(
              'APAAR verification requested (simulated)',
              `${targets.length} identifier(s)`,
              'Demonstration adapter only. No authorized government request was made.',
              `${targets.length} identifier(s) marked Submitted for Verification.`,
              user?.institutionId ?? null,
            ),
          ],
        });
        dispatch({
          type: 'pushNotification',
          notifications: [
            makeNotification(
              'apaar',
              'Simulated verification submitted',
              `${targets.length} identifier(s) were marked as submitted in the demonstration adapter. No live government verification occurred.`,
              '/institution/apaar-status',
              user?.institutionId ?? null,
            ),
          ],
        });
      },

      addIssueComment: (issueId, message) => {
        const issue = state.issues.find((i) => i.id === issueId);
        if (!issue) return;
        const updated: ValidationIssue = {
          ...issue,
          comments: [
            ...issue.comments,
            { id: `cmt-live-${Date.now()}`, author: actor.name, role: actor.role as never, at: now(), message },
          ],
          lastUpdated: now(),
        };
        dispatch({ type: 'updateIssue', issue: updated });
        dispatch({
          type: 'addAudit',
          entries: [
            auditEntry(
              'Validation issue comment added',
              issue.id,
              null,
              message,
              issue.institutionId,
            ),
          ],
        });
      },

      setIssueStatus: (issueId, status, assignedTo) => {
        const issue = state.issues.find((i) => i.id === issueId);
        if (!issue) return;
        const updated: ValidationIssue = {
          ...issue,
          status,
          assignedTo: assignedTo === undefined ? issue.assignedTo : assignedTo,
          lastUpdated: now(),
        };
        dispatch({ type: 'updateIssue', issue: updated });
        dispatch({
          type: 'addAudit',
          entries: [
            auditEntry(
              'Validation issue status changed',
              issue.id,
              `Status updated to ${status}.`,
              `Previous status: ${issue.status}; new status: ${status}.`,
              issue.institutionId,
            ),
          ],
        });
      },

      reviewSubmission: (id, decision, reason) => {
        const submission = state.submissions.find((s) => s.id === id);
        if (!submission) return;
        const statusMap: Record<typeof decision, SubmissionStatus> = {
          accept: 'Accepted',
          reject: 'Rejected',
          request_correction: 'Correction Required',
        };
        const status = statusMap[decision];
        const timestamp = now();
        const updated: Submission = {
          ...submission,
          status,
          reviewer: actor.name,
          lastUpdated: timestamp,
          comments: [
            ...submission.comments,
            { id: `sub-cmt-live-${Date.now()}`, author: actor.name, role: actor.role as never, at: timestamp, message: reason },
          ],
          timeline: [
            ...submission.timeline,
            { at: timestamp, actor: actor.name, status, note: reason },
          ],
        };
        dispatch({ type: 'updateSubmission', submission: updated });
        dispatch({
          type: 'addAudit',
          entries: [
            auditEntry(
              decision === 'accept'
                ? 'Submission accepted (demonstration)'
                : decision === 'reject'
                  ? 'Submission rejected'
                  : 'Correction requested for submission',
              submission.id,
              reason,
              `Submission status changed from ${submission.status} to ${status}.`,
              submission.institutionId,
            ),
          ],
        });
        dispatch({
          type: 'pushNotification',
          notifications: [
            makeNotification(
              'submission',
              `Submission ${submission.id}: ${status}`,
              reason,
              `/institution/submissions/${submission.id}`,
              submission.institutionId,
            ),
          ],
        });
      },

      resubmitSubmission: (id, note) => {
        const submission = state.submissions.find((s) => s.id === id);
        if (!submission) return;
        const timestamp = now();
        const updated: Submission = {
          ...submission,
          status: 'Resubmitted',
          lastUpdated: timestamp,
          comments: [
            ...submission.comments,
            { id: `sub-cmt-live-${Date.now()}`, author: actor.name, role: actor.role as never, at: timestamp, message: note },
          ],
          timeline: [
            ...submission.timeline,
            { at: timestamp, actor: actor.name, status: 'Resubmitted', note },
          ],
        };
        dispatch({ type: 'updateSubmission', submission: updated });
        dispatch({
          type: 'addAudit',
          entries: [
            auditEntry(
              'Batch resubmitted',
              submission.id,
              note,
              `Submission status changed from ${submission.status} to Resubmitted.`,
              submission.institutionId,
            ),
          ],
        });
        dispatch({
          type: 'pushNotification',
          notifications: [
            makeNotification(
              'submission',
              `Batch ${submission.id} resubmitted`,
              `${actor.name} resubmitted the batch for review.`,
              `/admin/submissions/${submission.id}`,
              null,
            ),
          ],
        });
      },

      reviewInstitution: (id, decision, reason) => {
        const institution = state.institutions.find((i) => i.id === id);
        if (!institution) return;
        const statusMap: Record<typeof decision, Institution['verificationStatus']> = {
          verify: 'Verified',
          request_correction: 'Correction Required',
          reject: 'Rejected',
          under_review: 'Under Verification',
        };
        const status = statusMap[decision];
        const timestamp = now();
        const updated: Institution = {
          ...institution,
          verificationStatus: status,
          lastVerifiedOn: decision === 'verify' ? timestamp.slice(0, 10) : institution.lastVerifiedOn,
          lastUpdated: timestamp,
          reviewerComments: [
            ...institution.reviewerComments,
            { at: timestamp, actor: actor.name, decision: status, reason },
          ],
        };
        dispatch({ type: 'updateInstitution', institution: updated });
        dispatch({
          type: 'addAudit',
          entries: [
            auditEntry(
              `Institution verification: ${status}`,
              institution.aicteId,
              reason,
              `Verification status changed from ${institution.verificationStatus} to ${status}.`,
              institution.id,
            ),
          ],
        });
        dispatch({
          type: 'pushNotification',
          notifications: [
            makeNotification(
              'review',
              `Institution verification: ${status}`,
              reason,
              '/institution/profile',
              institution.id,
            ),
          ],
        });
      },

      reviewIntakeAlert: (key, status, reason) => {
        const [institutionId, courseId, academicYear] = key.split(':');
        const timestamp = now();
        const existing = state.alertReviews[key];
        const review = {
          key,
          status,
          actions: [
            ...(existing?.actions ?? []),
            { at: timestamp, actor: actor.name, action: status, reason },
          ],
          lastUpdated: timestamp,
        };
        dispatch({ type: 'setAlertReview', review });
        const course = state.courses.find((c) => c.id === courseId);
        dispatch({
          type: 'addAudit',
          entries: [
            auditEntry(
              'Intake alert decision recorded',
              `${institutionId}/${course?.code ?? courseId}/${academicYear}`,
              reason,
              `Alert review status set to ${status}.`,
              institutionId,
            ),
          ],
        });
        dispatch({
          type: 'pushNotification',
          notifications: [
            makeNotification(
              'intake',
              `Intake alert update: ${status}`,
              reason,
              '/institution/intake-compliance',
              institutionId,
            ),
          ],
        });
      },

      reviewDuplicate: (key, status, reason) => {
        const timestamp = now();
        dispatch({
          type: 'setDuplicateReview',
          review: { key, status, reason, actor: actor.name, updatedAt: timestamp },
        });
        dispatch({
          type: 'addAudit',
          entries: [
            auditEntry(
              'Duplicate candidate reviewed',
              key,
              reason,
              `Duplicate review status set to ${status}.`,
              null,
            ),
          ],
        });
        if (status === 'Clarification requested' || status === 'Correction requested') {
          const institutionId = key.startsWith('apaar:')
            ? null
            : key.split(':')[1] ?? null;
          dispatch({
            type: 'pushNotification',
            notifications: [
              makeNotification(
                'duplicate',
                `Duplicate review: ${status}`,
                reason,
                '/institution/apaar-status',
                institutionId,
              ),
            ],
          });
        }
      },

      updateCourseIntake: (courseId, patch, reason) => {
        const course = state.courses.find((c) => c.id === courseId);
        if (!course) return;
        const timestamp = now();
        const revision = {
          effectiveDate: patch.effectiveDate,
          academicYear: patch.academicYear,
          approvedIntake: patch.approvedIntake,
          approvalRef: patch.approvalRef,
          note: reason,
        };
        dispatch({
          type: 'updateCourse',
          courseId,
          patch: {
            approvedIntake: patch.approvedIntake,
            approvalRef: patch.approvalRef,
            effectiveDate: patch.effectiveDate,
            verificationStatus: patch.verificationStatus,
            lastVerifiedDate:
              patch.verificationStatus === 'Verified' ? timestamp.slice(0, 10) : course.lastVerifiedDate,
            revisions: [...course.revisions, revision],
          },
        });
        dispatch({
          type: 'addAudit',
          entries: [
            auditEntry(
              'Authoritative intake reference updated',
              `${course.institutionId}/${course.code}`,
              reason,
              `Approved intake changed from ${course.approvedIntake} to ${patch.approvedIntake} for ${patch.academicYear}.`,
              course.institutionId,
            ),
          ],
        });
        dispatch({
          type: 'pushNotification',
          notifications: [
            makeNotification(
              'intake',
              'Approved intake reference updated',
              `${course.name}: approved intake is now ${patch.approvedIntake} for ${patch.academicYear}. ${reason}`,
              '/institution/courses',
              course.institutionId,
            ),
          ],
        });
      },

      updateInstitution: (id, patch, reason) => {
        const institution = state.institutions.find((i) => i.id === id);
        if (!institution) return;
        const updated: Institution = { ...institution, ...patch, lastUpdated: now() };
        dispatch({ type: 'updateInstitution', institution: updated });
        const changed = Object.keys(patch)
          .map((key) => {
            const k = key as keyof Institution;
            if (String(institution[k] ?? '—') === String(updated[k] ?? '—')) return null;
            return `${key}`;
          })
          .filter(Boolean)
          .join(', ');
        dispatch({
          type: 'addAudit',
          entries: [
            auditEntry(
              'Institution profile updated',
              institution.aicteId,
              reason,
              changed ? `Updated fields: ${changed}.` : 'No field values changed.',
              institution.id,
            ),
          ],
        });
      },

      markNotificationsRead: (ids) => dispatch({ type: 'updateNotification', ids, read: true }),

      markAllNotificationsRead: (scopeInstitutionId) => {
        const ids = state.notifications
          .filter((notification) =>
            scopeInstitutionId === undefined
              ? true
              : notification.institutionId === scopeInstitutionId || notification.institutionId === null,
          )
          .map((notification) => notification.id);
        dispatch({ type: 'updateNotification', ids, read: true });
      },

      addUser: (input) => {
        const userRecord: PortalUser = {
          id: nextId('usr-live-', state.users, 0),
          name: input.name,
          email: input.email,
          role: input.role,
          scope: input.scope,
          institutionId: input.institutionId,
          status: 'Invited',
          lastActive: now(),
        };
        dispatch({ type: 'addUser', user: userRecord });
        dispatch({
          type: 'addAudit',
          entries: [
            auditEntry(
              'Portal user invited',
              userRecord.email,
              'Invitation created in demonstration mode.',
              `Role: ${input.role}; scope: ${input.scope}.`,
              input.institutionId,
            ),
          ],
        });
        return userRecord;
      },

      setUserStatus: (id, status) => {
        const userRecord = state.users.find((u) => u.id === id);
        if (!userRecord) return;
        const updated: PortalUser = { ...userRecord, status };
        dispatch({ type: 'updateUser', user: updated });
        dispatch({
          type: 'addAudit',
          entries: [
            auditEntry(
              'Portal user status changed',
              userRecord.email,
              `Account status set to ${status}.`,
              `Previous status: ${userRecord.status}.`,
              userRecord.institutionId,
            ),
          ],
        });
      },

      resetDemoData: () => {
        const fresh: StoreState = { version: 1, ...createDemoDatabase() };
        dispatch({ type: 'replace', state: fresh });
      },
    };
  }, [state, user]);

  const value = React.useMemo(() => ({ data: state, actions }), [state, actions]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useEduTrace(): DataContextValue {
  const context = React.useContext(DataContext);
  if (!context) throw new Error('useEduTrace must be used inside DemoDataProvider');
  return context;
}
