import { describe, expect, it } from 'vitest';
import type { Course, Institution, Student } from '@/types';
import { calculateIntakeCompliance, validateCsvRows, type RawCsvRow } from './engine';

const institution: Institution = {
  id: 'inst-test',
  aicteId: 'AICTE-PERM-TEST',
  name: 'Test Institute of Technology',
  shortCode: 'TIT',
  type: 'Engineering & Technology',
  managementType: 'Private Unaided',
  address: 'Test Road',
  state: 'Maharashtra',
  region: 'West',
  district: 'Pune',
  email: 'office@test.edu.in',
  phone: '+91 20 0000 0000',
  headOfInstitution: 'Dr Test Head',
  portalAdministrator: 'Test Admin',
  approvalRef: 'AICTE/TEST/2026',
  approvalFrom: '2026-06-01',
  approvalTo: '2028-05-31',
  verificationStatus: 'Verified',
  approvalSource: 'Test extract',
  lastVerifiedOn: '2026-07-01',
  lastUpdated: '2026-10-01T00:00:00.000Z',
  reviewerComments: [],
};

const course: Course = {
  id: 'crs-test',
  institutionId: institution.id,
  name: 'Computer Science & Engineering',
  code: 'CSE',
  academicYear: '2026-27',
  approvedIntake: 30,
  additionalSeatCategories: [],
  approvalRef: 'AICTE/TEST/CSE',
  effectiveDate: '2026-06-01',
  lastVerifiedDate: '2026-07-01',
  verificationStatus: 'Verified',
  revisions: [],
};

function student(overrides: Partial<Student>): Student {
  return {
    id: 'stu-existing',
    recordId: 'ETR-10001',
    regNumber: 'TIT/2026/CSE/001',
    name: 'Existing Student',
    institutionId: institution.id,
    courseId: course.id,
    academicYear: '2026-27',
    admissionDate: '2026-07-20',
    enrolmentStatus: 'Active',
    apaarId: '999000000001',
    apaarStatus: 'Verified by Authorized Source',
    lastUpdated: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function row(rowNumber: number, values: Record<string, string>): RawCsvRow {
  return {
    rowNumber,
    values: {
      registration_number: '',
      student_name: '',
      course_code: '',
      academic_year: '2026-27',
      admission_date: '2026-07-20',
      enrolment_status: 'Active',
      apaar_id: '',
      ...values,
    } as RawCsvRow['values'],
  };
}

const context = {
  institution,
  courses: [course],
  students: [student({})],
  allStudents: [student({})],
};

describe('validateCsvRows', () => {
  it('accepts a valid row and treats a missing identifier as non-blocking', () => {
    const result = validateCsvRows(
      [row(2, {
        registration_number: 'TIT/2026/CSE/002',
        student_name: 'Asha Verma',
        course_code: 'CSE',
        apaar_id: '',
      })],
      context,
    );
    expect(result.summary.validRecords).toBe(1);
    expect(result.summary.invalidRecords).toBe(0);
    expect(result.rows[0].blocking).toBe(false);
    expect(result.rows[0].findings.map((finding) => finding.ruleId)).toContain('APAAR-001');
    expect(result.rows[0].courseId).toBe(course.id);
  });

  it('blocks a row whose course is not approved for the institution', () => {
    const result = validateCsvRows(
      [row(3, {
        registration_number: 'TIT/2026/XYZ/003',
        student_name: 'Ravi Nair',
        course_code: 'XYZ',
      })],
      context,
    );
    expect(result.summary.invalidRecords).toBe(1);
    expect(result.rows[0].findings.some((finding) => finding.ruleId === 'CRS-001')).toBe(true);
    expect(result.rows[0].courseId).toBeNull();
  });

  it('detects duplicate registration numbers inside the uploaded file', () => {
    const result = validateCsvRows(
      [
        row(2, { registration_number: 'TIT/2026/CSE/010', student_name: 'A One', course_code: 'CSE' }),
        row(3, { registration_number: 'TIT/2026/CSE/010', student_name: 'A Two', course_code: 'CSE' }),
      ],
      context,
    );
    expect(result.summary.duplicateCandidates).toBeGreaterThanOrEqual(2);
    for (const parsed of result.rows) {
      expect(parsed.blocking).toBe(true);
      expect(parsed.findings.some((finding) => finding.ruleId === 'DUP-003')).toBe(true);
    }
  });

  it('flags an identifier already recorded against another student', () => {
    const result = validateCsvRows(
      [row(2, {
        registration_number: 'TIT/2026/CSE/011',
        student_name: 'Different Person',
        course_code: 'CSE',
        apaar_id: '999000000001',
      })],
      context,
    );
    const ruleIds = result.rows[0].findings.map((finding) => finding.ruleId);
    expect(ruleIds).toContain('DUP-001');
    expect(ruleIds).toContain('STU-004');
    expect(result.rows[0].blocking).toBe(true);
  });

  it('rejects invalid academic years and malformed identifiers', () => {
    const result = validateCsvRows(
      [row(2, {
        registration_number: 'TIT/2026/CSE/012',
        student_name: 'Meera Iyer',
        course_code: 'CSE',
        academic_year: '2019-20',
        apaar_id: '12345',
      })],
      context,
    );
    const ruleIds = result.rows[0].findings.map((finding) => finding.ruleId);
    expect(ruleIds).toContain('AY-001');
    expect(ruleIds).toContain('APAAR-002');
    expect(result.summary.fatalErrors).toBeGreaterThan(0);
  });
});

describe('calculateIntakeCompliance', () => {
  it('reports a potential excess without claiming a violation', () => {
    const result = calculateIntakeCompliance(course, 36);
    expect(result.excess).toBe(6);
    expect(result.finding?.ruleId).toBe('ENR-001');
    expect(result.finding?.suggestedAction).toContain('potential discrepancy');
  });

  it('suppresses compliance for an unverified reference', () => {
    const result = calculateIntakeCompliance({ ...course, verificationStatus: 'Unverified' }, 90);
    expect(result.excess).toBe(0);
    expect(result.finding?.ruleId).toBe('REF-001');
  });

  it('reports no finding within the configured limit', () => {
    const result = calculateIntakeCompliance(course, 30);
    expect(result.excess).toBe(0);
    expect(result.finding).toBeNull();
  });
});
