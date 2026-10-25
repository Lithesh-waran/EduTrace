import { describe, expect, it } from 'vitest';
import type { Course, Institution, Student, ValidationIssue } from '@/types';
import {
  alertKey,
  computeIntakeCompliance,
  findDuplicateCandidates,
  getStudentValidationStatus,
} from './analytics';

const institutions: Institution[] = [
  {
    id: 'i1',
    aicteId: 'A1',
    name: 'Alpha Institute',
    shortCode: 'ALPHA',
    type: 'Engineering & Technology',
    managementType: 'Private Unaided',
    address: 'Road 1',
    state: 'Maharashtra',
    region: 'West',
    district: 'Pune',
    email: 'a@example.in',
    phone: '000',
    headOfInstitution: 'Head',
    portalAdministrator: 'Admin',
    approvalRef: 'REF-1',
    approvalFrom: '2026-06-01',
    approvalTo: '2028-05-31',
    verificationStatus: 'Verified',
    approvalSource: 'Extract',
    lastVerifiedOn: '2026-07-01',
    lastUpdated: '2026-10-01T00:00:00.000Z',
    reviewerComments: [],
  },
  {
    id: 'i2',
    aicteId: 'A2',
    name: 'Beta Institute',
    shortCode: 'BETA',
    type: 'Management',
    managementType: 'Government',
    address: 'Road 2',
    state: 'Tamil Nadu',
    region: 'South',
    district: 'Coimbatore',
    email: 'b@example.in',
    phone: '000',
    headOfInstitution: 'Head',
    portalAdministrator: 'Admin',
    approvalRef: 'REF-2',
    approvalFrom: '2026-06-01',
    approvalTo: '2028-05-31',
    verificationStatus: 'Verified',
    approvalSource: 'Extract',
    lastVerifiedOn: '2026-07-01',
    lastUpdated: '2026-10-01T00:00:00.000Z',
    reviewerComments: [],
  },
];

const courses: Course[] = [
  {
    id: 'c1',
    institutionId: 'i1',
    name: 'Computer Science',
    code: 'CSE',
    academicYear: '2026-27',
    approvedIntake: 30,
    additionalSeatCategories: [],
    approvalRef: 'REF-C1',
    effectiveDate: '2026-06-01',
    lastVerifiedDate: '2026-07-01',
    verificationStatus: 'Verified',
    revisions: [],
  },
  {
    id: 'c2',
    institutionId: 'i2',
    name: 'Business Administration',
    code: 'BBA',
    academicYear: '2026-27',
    approvedIntake: 20,
    additionalSeatCategories: [],
    approvalRef: 'REF-C2',
    effectiveDate: '2026-06-01',
    lastVerifiedDate: null,
    verificationStatus: 'Unverified',
    revisions: [],
  },
];

function makeStudent(index: number, overrides: Partial<Student> = {}): Student {
  return {
    id: `s${index}`,
    recordId: `ETR-${10000 + index}`,
    regNumber: `REG/${index}`,
    name: `Student ${index}`,
    institutionId: 'i1',
    courseId: 'c1',
    academicYear: '2026-27',
    admissionDate: '2026-07-20',
    enrolmentStatus: 'Active',
    apaarId: `99900000${String(index).padStart(4, '0')}`,
    apaarStatus: 'Verified by Authorized Source',
    lastUpdated: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('computeIntakeCompliance', () => {
  it('counts active enrolment and reports excess with review state', () => {
    const students = Array.from({ length: 33 }, (_, index) => makeStudent(index + 1));
    students.push(makeStudent(90, { enrolmentStatus: 'Withdrawn' }));
    students.push(makeStudent(91, { enrolmentStatus: 'Pending Verification' }));
    const key = alertKey('i1', 'c1', '2026-27');
    const rows = computeIntakeCompliance(institutions, courses, students, {
      [key]: {
        key,
        status: 'Acknowledged',
        actions: [],
        lastUpdated: '2026-10-02T00:00:00.000Z',
      },
    });
    const row = rows.find((candidate) => candidate.key === key);
    expect(row).toBeDefined();
    expect(row?.activeEnrolment).toBe(33);
    expect(row?.withdrawnRecords).toBe(1);
    expect(row?.pendingRecords).toBe(1);
    expect(row?.excess).toBe(3);
    expect(row?.status).toBe('Potential excess');
    expect(row?.reviewStatus).toBe('Acknowledged');
  });

  it('refuses to compute excess when the reference is unverified', () => {
    const students = Array.from({ length: 40 }, (_, index) =>
      makeStudent(index + 1, { institutionId: 'i2', courseId: 'c2' }),
    );
    const rows = computeIntakeCompliance(institutions, courses, students, {});
    const row = rows.find((candidate) => candidate.courseId === 'c2');
    expect(row?.status).toBe('Reference data unverified');
    expect(row?.excess).toBe(0);
  });
});

describe('findDuplicateCandidates', () => {
  it('detects repeated identifiers across institutions and keeps evidence', () => {
    const students = [
      makeStudent(1, { name: 'Same Name' }),
      makeStudent(2, { institutionId: 'i2', courseId: 'c2', name: 'Same Name' }),
      makeStudent(3),
    ];
    students[1].apaarId = students[0].apaarId;
    const candidates = findDuplicateCandidates(students, institutions, courses, {});
    const candidate = candidates.find((item) => item.kind === 'apaar');
    expect(candidate).toBeDefined();
    expect(candidate?.students).toHaveLength(2);
    expect(candidate?.crossInstitution).toBe(true);
    expect(candidate?.institutionNames).toContain('Beta Institute');
    expect(candidate?.evidence).toContain('same synthetic APAAR');
  });

  it('detects duplicated registration numbers within an institution', () => {
    const students = [makeStudent(1), makeStudent(2, { regNumber: 'REG/1' })];
    const candidates = findDuplicateCandidates(students, institutions, courses, {});
    const candidate = candidates.find((item) => item.kind === 'regNumber');
    expect(candidate?.students).toHaveLength(2);
    expect(candidate?.crossInstitution).toBe(false);
  });
});

describe('getStudentValidationStatus', () => {
  const baseIssue: ValidationIssue = {
    id: 'VI-1',
    ruleId: 'DUP-001',
    ruleName: 'Repeated APAAR identifier',
    severity: 'Critical',
    institutionId: 'i1',
    studentId: 's1',
    recordRef: 'ETR-10001',
    reason: 'Repeated identifier',
    evidence: 'Evidence',
    suggestedAction: 'Correct',
    detectedAt: '2026-10-01T00:00:00.000Z',
    status: 'Open',
    assignedTo: null,
    lastUpdated: '2026-10-01T00:00:00.000Z',
    comments: [],
  };

  it('is invalid when an open critical issue exists', () => {
    expect(getStudentValidationStatus(makeStudent(1), [baseIssue])).toBe('Invalid');
  });

  it('ignores resolved issues', () => {
    expect(
      getStudentValidationStatus(makeStudent(1), [{ ...baseIssue, status: 'Resolved' }]),
    ).toBe('Valid');
  });

  it('is a warning for lower-severity open findings', () => {
    expect(
      getStudentValidationStatus(makeStudent(1), [{ ...baseIssue, severity: 'Medium' }]),
    ).toBe('Warning');
  });
});
