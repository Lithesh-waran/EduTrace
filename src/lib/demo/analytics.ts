import type {
  ApaarStatus,
  Course,
  DuplicateReview,
  EnrolmentStatus,
  Institution,
  IntakeAlertReview,
  Student,
  ValidationIssue,
  ValidationStatus,
} from '@/types';

export function alertKey(institutionId: string, courseId: string, academicYear: string): string {
  return `${institutionId}:${courseId}:${academicYear}`;
}

export function isOpenIssue(issue: ValidationIssue): boolean {
  return issue.status !== 'Resolved' && issue.status !== 'Closed';
}

export function issuesForStudent(issues: ValidationIssue[], studentId: string): ValidationIssue[] {
  return issues.filter((issue) => issue.studentId === studentId);
}

export function getStudentValidationStatus(
  student: Student,
  issues: ValidationIssue[],
): ValidationStatus {
  const open = issuesForStudent(issues, student.id).filter(isOpenIssue);
  if (open.some((i) => i.severity === 'Critical' || i.severity === 'High')) return 'Invalid';
  if (open.length > 0) return 'Warning';
  return 'Valid';
}

export interface IntakeComplianceRow {
  key: string;
  institutionId: string;
  institutionName: string;
  institutionCode: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  academicYear: string;
  approvedIntake: number;
  additionalSeatCategories: string[];
  activeEnrolment: number;
  pendingRecords: number;
  withdrawnRecords: number;
  totalRecords: number;
  excess: number;
  status:
    | 'Within configured limit'
    | 'Potential excess'
    | 'Reference data unverified'
    | 'No approved reference';
  referenceStatus: Course['verificationStatus'];
  reviewStatus: IntakeAlertReview['status'] | null;
  lastVerifiedDate: string | null;
  approvalRef: string;
}

const ACTIVE_FOR_COMPLIANCE: EnrolmentStatus[] = ['Active'];

export function computeIntakeCompliance(
  institutions: Institution[],
  courses: Course[],
  students: Student[],
  reviews: Record<string, IntakeAlertReview>,
): IntakeComplianceRow[] {
  const institutionsById = new Map(institutions.map((i) => [i.id, i]));
  const rows: IntakeComplianceRow[] = [];

  for (const course of courses) {
    const institution = institutionsById.get(course.institutionId);
    if (!institution) continue;

    const years = Array.from(
      new Set([
        course.academicYear,
        ...students
          .filter((s) => s.courseId === course.id)
          .map((s) => s.academicYear),
      ]),
    ).sort();

    for (const year of years) {
      const cohort = students.filter(
        (s) =>
          s.courseId === course.id &&
          s.institutionId === course.institutionId &&
          s.academicYear === year,
      );
      const activeEnrolment = cohort.filter((s) =>
        ACTIVE_FOR_COMPLIANCE.includes(s.enrolmentStatus),
      ).length;
      const pendingRecords = cohort.filter(
        (s) => s.enrolmentStatus === 'Pending Verification',
      ).length;
      const withdrawnRecords = cohort.filter(
        (s) => s.enrolmentStatus === 'Withdrawn' || s.enrolmentStatus === 'Transferred',
      ).length;

      const referenceApproved = course.verificationStatus !== 'Unverified';
      const excess = referenceApproved ? Math.max(0, activeEnrolment - course.approvedIntake) : 0;

      let status: IntakeComplianceRow['status'] = 'Within configured limit';
      if (!referenceApproved) status = 'Reference data unverified';
      else if (excess > 0) status = 'Potential excess';

      const key = alertKey(course.institutionId, course.id, year);
      rows.push({
        key,
        institutionId: course.institutionId,
        institutionName: institution.name,
        institutionCode: institution.shortCode,
        courseId: course.id,
        courseName: course.name,
        courseCode: course.code,
        academicYear: year,
        approvedIntake: course.approvedIntake,
        additionalSeatCategories: course.additionalSeatCategories,
        activeEnrolment,
        pendingRecords,
        withdrawnRecords,
        totalRecords: cohort.length,
        excess,
        status,
        referenceStatus: course.verificationStatus,
        reviewStatus: reviews[key]?.status ?? null,
        lastVerifiedDate: course.lastVerifiedDate,
        approvalRef: course.approvalRef,
      });
    }
  }

  return rows;
}

export interface DuplicateCandidate {
  key: string;
  kind: 'apaar' | 'regNumber';
  label: string;
  evidence: string;
  students: Student[];
  institutionIds: string[];
  institutionNames: string[];
  courseNames: string[];
  academicYears: string[];
  crossInstitution: boolean;
  review: DuplicateReview | null;
}

export function findDuplicateCandidates(
  students: Student[],
  institutions: Institution[],
  courses: Course[],
  reviews: Record<string, DuplicateReview>,
): DuplicateCandidate[] {
  const institutionsById = new Map(institutions.map((i) => [i.id, i]));
  const coursesById = new Map(courses.map((c) => [c.id, c]));
  const candidates: DuplicateCandidate[] = [];

  const build = (
    kind: DuplicateCandidate['kind'],
    key: string,
    label: string,
    group: Student[],
    evidence: string,
  ) => {
    if (group.length < 2) return;
    const institutionIds = Array.from(new Set(group.map((s) => s.institutionId)));
    const institutionNames = institutionIds.map(
      (id) => institutionsById.get(id)?.name ?? 'Unknown institution',
    );
    const courseNames = Array.from(
      new Set(group.map((s) => coursesById.get(s.courseId)?.name ?? 'Unknown course')),
    );
    candidates.push({
      key,
      kind,
      label,
      evidence,
      students: group,
      institutionIds,
      institutionNames,
      courseNames,
      academicYears: Array.from(new Set(group.map((s) => s.academicYear))).sort(),
      crossInstitution: institutionIds.length > 1,
      review: reviews[key] ?? null,
    });
  };

  const apaarGroups = new Map<string, Student[]>();
  for (const student of students) {
    if (!student.apaarId) continue;
    const normalized = student.apaarId.replace(/\s+/g, '');
    const list = apaarGroups.get(normalized) ?? [];
    list.push(student);
    apaarGroups.set(normalized, list);
  }
  for (const [apaarId, group] of apaarGroups) {
    build(
      'apaar',
      `apaar:${apaarId}`,
      `APAAR identifier ending ${apaarId.slice(-4)}`,
      group,
      `The same synthetic APAAR identifier is recorded on ${group.length} student records.`,
    );
  }

  const regGroups = new Map<string, Student[]>();
  for (const student of students) {
    const key = `${student.institutionId}:${student.regNumber.trim().toLowerCase()}`;
    const list = regGroups.get(key) ?? [];
    list.push(student);
    regGroups.set(key, list);
  }
  for (const [key, group] of regGroups) {
    const reg = group[0]?.regNumber ?? '';
    build(
      'regNumber',
      `reg:${key}`,
      `Registration number ${reg}`,
      group,
      `The same registration number is recorded on ${group.length} records within one institution.`,
    );
  }

  return candidates.sort((a, b) => {
    if (a.review?.status !== b.review?.status) return a.review ? 1 : -1;
    return b.students.length - a.students.length;
  });
}

export function countBy<T extends string>(values: T[]): Record<T, number> {
  return values.reduce(
    (acc, value) => {
      acc[value] = (acc[value] ?? 0) + 1;
      return acc;
    },
    {} as Record<T, number>,
  );
}

export function apaarStatusCounts(students: Student[]): Record<ApaarStatus, number> {
  const base: Record<ApaarStatus, number> = {
    'Not Provided': 0,
    Pending: 0,
    'Submitted for Verification': 0,
    'Verified by Authorized Source': 0,
    'Verification Failed': 0,
    'Verification Unavailable': 0,
    'Correction Required': 0,
  };
  for (const student of students) base[student.apaarStatus] += 1;
  return base;
}

export function isVerifiedApaar(student: Student): boolean {
  return student.apaarStatus === 'Verified by Authorized Source';
}

export function activeStudents(students: Student[]): Student[] {
  return students.filter((s) => s.enrolmentStatus === 'Active');
}

export function withinDays(iso: string, days: number, now = Date.now()): boolean {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return false;
  return now - time <= days * 24 * 60 * 60 * 1000;
}
