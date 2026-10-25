import * as React from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import {
  apaarStatusCounts,
  computeIntakeCompliance,
  findDuplicateCandidates,
  getStudentValidationStatus,
  isOpenIssue,
  type DuplicateCandidate,
  type IntakeComplianceRow,
} from '@/lib/demo/analytics';
import { useEduTrace } from '@/lib/demo/store';
import type {
  AppNotification,
  AuditEvent,
  Course,
  Institution,
  Student,
  ValidationIssue,
  ValidationStatus,
} from '@/types';

export interface InstitutionScope {
  institution: Institution | undefined;
  institutionId: string;
  courses: Course[];
  students: Student[];
  issues: ValidationIssue[];
  submissions: ReturnType<typeof useEduTrace>['data']['submissions'];
  notifications: AppNotification[];
  audit: AuditEvent[];
  users: ReturnType<typeof useEduTrace>['data']['users'];
  compliance: IntakeComplianceRow[];
  duplicates: DuplicateCandidate[];
  apaar: ReturnType<typeof apaarStatusCounts>;
  validationStatus: Map<string, ValidationStatus>;
  openIssueCount: number;
  actions: ReturnType<typeof useEduTrace>['actions'];
  data: ReturnType<typeof useEduTrace>['data'];
}

/**
 * Data scoped to one institution. Pass an explicit id when an administrator is
 * inspecting a specific institution; otherwise the signed-in user's
 * institution is used.
 */
export function useInstitutionData(explicitInstitutionId?: string): InstitutionScope {
  const { data, actions } = useEduTrace();
  const { user } = useAuth();
  const institutionId = explicitInstitutionId ?? user?.institutionId ?? data.institutions[0]?.id ?? '';

  return React.useMemo(() => {
    const institution = data.institutions.find((item) => item.id === institutionId);
    const courses = data.courses.filter((course) => course.institutionId === institutionId);
    const students = data.students.filter((student) => student.institutionId === institutionId);
    const issues = data.issues.filter((issue) => issue.institutionId === institutionId);
    const submissions = data.submissions.filter((batch) => batch.institutionId === institutionId);
    const notifications = data.notifications
      .filter(
        (notification) =>
          notification.institutionId === institutionId ||
          (notification.institutionId === null && notification.type === 'system'),
      )
      .sort((a, b) => b.at.localeCompare(a.at));
    const audit = data.audit
      .filter((event) => event.institutionId === institutionId)
      .sort((a, b) => b.at.localeCompare(a.at));
    const users = data.users.filter((account) => account.institutionId === institutionId);
    const compliance = data.institutions.length
      ? computeIntakeCompliance(
          institution ? [institution] : [],
          courses,
          students,
          data.alertReviews,
        )
      : [];
    const duplicates = findDuplicateCandidates(
      data.students,
      data.institutions,
      data.courses,
      data.duplicateReviews,
    ).filter((candidate) => candidate.institutionIds.includes(institutionId));

    const validationStatus = new Map<string, ValidationStatus>();
    for (const student of students) {
      validationStatus.set(student.id, getStudentValidationStatus(student, data.issues));
    }

    return {
      institution,
      institutionId,
      courses,
      students,
      issues,
      submissions,
      notifications,
      audit,
      users,
      compliance,
      duplicates,
      apaar: apaarStatusCounts(students),
      validationStatus,
      openIssueCount: issues.filter(isOpenIssue).length,
      actions,
      data,
    };
  }, [data, actions, institutionId]);
}

export interface AdminScope {
  data: ReturnType<typeof useEduTrace>['data'];
  actions: ReturnType<typeof useEduTrace>['actions'];
  compliance: IntakeComplianceRow[];
  duplicates: DuplicateCandidate[];
  institutionsById: Map<string, Institution>;
  coursesById: Map<string, Course>;
  openIssues: ValidationIssue[];
  pendingSubmissions: ReturnType<typeof useEduTrace>['data']['submissions'];
  apaar: ReturnType<typeof apaarStatusCounts>;
  notifications: AppNotification[];
}

export function useAdminData(): AdminScope {
  const { data, actions } = useEduTrace();

  return React.useMemo(() => {
    const compliance = computeIntakeCompliance(
      data.institutions,
      data.courses,
      data.students,
      data.alertReviews,
    );
    const duplicates = findDuplicateCandidates(
      data.students,
      data.institutions,
      data.courses,
      data.duplicateReviews,
    );
    const openIssues = data.issues.filter(isOpenIssue);
    const pendingSubmissions = data.submissions.filter((submission) =>
      ['Submitted', 'Resubmitted', 'Under Review', 'Validation in Progress'].includes(
        submission.status,
      ),
    );
    const notifications = [...data.notifications]
      .filter((notification) => notification.institutionId === null)
      .sort((a, b) => b.at.localeCompare(a.at));

    return {
      data,
      actions,
      compliance,
      duplicates,
      institutionsById: new Map(data.institutions.map((institution) => [institution.id, institution])),
      coursesById: new Map(data.courses.map((course) => [course.id, course])),
      openIssues,
      pendingSubmissions,
      apaar: apaarStatusCounts(data.students),
      notifications,
    };
  }, [data, actions]);
}

export function useLookups() {
  const { data } = useEduTrace();
  return React.useMemo(
    () => ({
      institutionName: (id: string) =>
        data.institutions.find((institution) => institution.id === id)?.name ?? 'Unknown institution',
      institutionCode: (id: string) =>
        data.institutions.find((institution) => institution.id === id)?.shortCode ?? '—',
      courseName: (id: string) =>
        data.courses.find((course) => course.id === id)?.name ?? 'Unknown course',
      courseCode: (id: string) =>
        data.courses.find((course) => course.id === id)?.code ?? '—',
      course: (id: string) => data.courses.find((course) => course.id === id),
      institution: (id: string) => data.institutions.find((institution) => institution.id === id),
      student: (id: string) => data.students.find((student) => student.id === id),
      submission: (id: string) => data.submissions.find((batch) => batch.id === id),
    }),
    [data],
  );
}

export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = React.useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    pageSize,
    pageCount,
    setPage,
    pageItems: items.slice(start, start + pageSize),
    total: items.length,
    rangeStart: items.length === 0 ? 0 : start + 1,
    rangeEnd: Math.min(start + pageSize, items.length),
    reset: () => setPage(1),
  };
}
