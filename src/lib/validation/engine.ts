import {
  ACADEMIC_YEARS,
  ENROLMENT_STATUSES,
  type Course,
  type Institution,
  type Severity,
  type Student,
} from '@/types';
import { VALIDATION_RULES } from './rules';

export interface ValidationFinding {
  ruleId: string;
  ruleName: string;
  severity: Severity;
  field: string | null;
  evidence: string;
  reason: string;
  suggestedAction: string;
}

export const CSV_COLUMNS = [
  {
    key: 'registration_number',
    label: 'Registration number',
    required: true,
    hint: 'Institution registration number, unique per institution. Example: SGIET/2026/CSE/091',
  },
  {
    key: 'student_name',
    label: 'Student name',
    required: true,
    hint: 'Full name as recorded by the institution.',
  },
  {
    key: 'course_code',
    label: 'Course code',
    required: true,
    hint: 'Must match an approved course code for your institution.',
  },
  {
    key: 'academic_year',
    label: 'Academic year',
    required: true,
    hint: 'One of 2023-24, 2024-25, 2025-26, 2026-27.',
  },
  {
    key: 'admission_date',
    label: 'Admission date',
    required: true,
    hint: 'ISO date (YYYY-MM-DD), not in the future.',
  },
  {
    key: 'enrolment_status',
    label: 'Enrolment status',
    required: true,
    hint: 'Admitted, Active, Withdrawn, Transferred, Completed or Pending Verification.',
  },
  {
    key: 'apaar_id',
    label: 'APAAR ID',
    required: false,
    hint: 'Optional 12-digit identifier. Leave blank if unavailable — never invent one.',
  },
] as const;

export type CsvColumnKey = (typeof CSV_COLUMNS)[number]['key'];
export type CsvValues = Record<CsvColumnKey, string>;

export interface RawCsvRow {
  rowNumber: number;
  values: CsvValues;
}

export interface ValidationContext {
  institution: Institution;
  courses: Course[];
  /** Existing registry records for the same institution. */
  students: Student[];
  /** All registry records (for cross-institution duplicate checks). */
  allStudents?: Student[];
}

export interface ParsedCsvRow {
  rowNumber: number;
  values: CsvValues;
  courseId: string | null;
  findings: ValidationFinding[];
  blocking: boolean;
}

export interface CsvValidationSummary {
  totalRows: number;
  validRecords: number;
  invalidRecords: number;
  duplicateCandidates: number;
  missingFields: number;
  warnings: number;
  fatalErrors: number;
}

export interface CsvValidationResult {
  rows: ParsedCsvRow[];
  summary: CsvValidationSummary;
}

export interface IntakeCalculation {
  approvedIntake: number;
  activeEnrolment: number;
  excess: number;
  referenceStatus: Course['verificationStatus'];
  finding: ValidationFinding | null;
}

function finding(
  ruleId: keyof typeof VALIDATION_RULES | string,
  field: string | null,
  evidence: string,
  reason?: string,
  suggestedAction?: string,
): ValidationFinding {
  const rule = VALIDATION_RULES[ruleId];
  return {
    ruleId,
    ruleName: rule?.name ?? ruleId,
    severity: rule?.severity ?? 'Medium',
    field,
    evidence,
    reason: reason ?? rule?.description ?? '',
    suggestedAction:
      suggestedAction ??
      'Correct the value in the file and re-run validation before submitting the batch.',
  };
}

export const BLOCKING_SEVERITIES: Severity[] = ['Critical', 'High'];

export function isBlocking(findings: ValidationFinding[]): boolean {
  return findings.some((item) => BLOCKING_SEVERITIES.includes(item.severity));
}

export function emptyCsvValues(): CsvValues {
  return {
    registration_number: '',
    student_name: '',
    course_code: '',
    academic_year: '2026-27',
    admission_date: '',
    enrolment_status: 'Active',
    apaar_id: '',
  };
}

export function normaliseCsvValues(raw: Record<string, string | undefined>): CsvValues {
  return {
    registration_number: (raw.registration_number ?? '').trim(),
    student_name: (raw.student_name ?? '').trim(),
    course_code: (raw.course_code ?? '').trim().toUpperCase(),
    academic_year: (raw.academic_year ?? '').trim(),
    admission_date: (raw.admission_date ?? '').trim(),
    enrolment_status: (raw.enrolment_status ?? '').trim(),
    apaar_id: (raw.apaar_id ?? '').replace(/\s+/g, ''),
  };
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString().slice(0, 10) === value;
}

/**
 * Deterministic CSV validation.
 *
 * Rules are evaluated in a fixed order so results are reproducible for the same
 * input and reference data. This module is the frontend counterpart of the
 * rules that must be implemented server-side in Django.
 */
export function validateCsvRows(
  inputRows: RawCsvRow[],
  context: ValidationContext,
): CsvValidationResult {
  const existingRegNumbers = new Set(
    context.students
      .filter((student) => student.institutionId === context.institution.id)
      .map((student) => student.regNumber.trim().toLowerCase()),
  );
  const allStudents = context.allStudents ?? context.students;
  const apaarIndex = new Map<string, Student[]>();
  for (const student of allStudents) {
    if (!student.apaarId) continue;
    const key = student.apaarId.replace(/\s+/g, '');
    apaarIndex.set(key, [...(apaarIndex.get(key) ?? []), student]);
  }

  const rows: ParsedCsvRow[] = inputRows.map((raw) => {
    const values = normaliseCsvValues(raw.values);
    const findings: ValidationFinding[] = [];

    // Required fields ------------------------------------------------------
    const required: { key: CsvColumnKey; label: string }[] = [
      { key: 'registration_number', label: 'Registration number' },
      { key: 'student_name', label: 'Student name' },
      { key: 'course_code', label: 'Course code' },
      { key: 'academic_year', label: 'Academic year' },
      { key: 'admission_date', label: 'Admission date' },
      { key: 'enrolment_status', label: 'Enrolment status' },
    ];
    for (const field of required) {
      if (!values[field.key]) {
        findings.push(
          finding(
            'STU-001',
            field.key,
            `${field.label} is empty.`,
            `${field.label} is mandatory for every student row.`,
            `Enter a value for ${field.label} in row ${raw.rowNumber} and validate again.`,
          ),
        );
      }
    }

    // Name checks ----------------------------------------------------------
    if (values.student_name && (values.student_name.length < 3 || /\d/.test(values.student_name))) {
      findings.push(
        finding(
          'STU-003',
          'student_name',
          `"${values.student_name}" is unusually short or contains digits.`,
        ),
      );
    }

    // Course association ---------------------------------------------------
    const course = context.courses.find((candidate) => candidate.code === values.course_code);
    if (values.course_code && !course) {
      findings.push(
        finding(
          'CRS-001',
          'course_code',
          `Course code "${values.course_code}" is not approved for ${context.institution.name}.`,
          'Student rows must reference a course approved for this institution.',
          'Use one of the institution course codes listed in the upload preview or contact AICTE to add the course.',
        ),
      );
    }

    // Academic year --------------------------------------------------------
    if (values.academic_year && !ACADEMIC_YEARS.includes(values.academic_year as never)) {
      findings.push(
        finding(
          'AY-001',
          'academic_year',
          `"${values.academic_year}" is not a configured academic year.`,
        ),
      );
    } else if (course && values.academic_year) {
      const earliestRevision = course.revisions[0]?.effectiveDate?.slice(0, 4);
      if (earliestRevision && values.academic_year.slice(0, 4) < earliestRevision) {
        findings.push(
          finding(
            'AY-001',
            'academic_year',
            `Course ${course.code} was approved from ${course.revisions[0].academicYear}; ${values.academic_year} is earlier.`,
          ),
        );
      }
    }

    // Dates ----------------------------------------------------------------
    if (values.admission_date) {
      const valid = isValidDate(values.admission_date);
      const future = valid && new Date(`${values.admission_date}T00:00:00`) > new Date();
      if (!valid) {
        findings.push(
          finding(
            'STU-002',
            'admission_date',
            `"${values.admission_date}" is not a valid YYYY-MM-DD date.`,
          ),
        );
      } else if (future) {
        findings.push(
          finding('STU-002', 'admission_date', `"${values.admission_date}" is in the future.`),
        );
      }
    }

    // Enrolment status -----------------------------------------------------
    if (
      values.enrolment_status &&
      !ENROLMENT_STATUSES.includes(values.enrolment_status as never)
    ) {
      findings.push(
        finding(
          'ENR-002',
          'enrolment_status',
          `"${values.enrolment_status}" is not a recognised enrolment status.`,
          'Only configured enrolment statuses may be submitted.',
          `Use one of: ${ENROLMENT_STATUSES.join(', ')}.`,
        ),
      );
    }

    // APAAR format ---------------------------------------------------------
    if (values.apaar_id && !/^\d{12}$/.test(values.apaar_id)) {
      findings.push(
        finding(
          'APAAR-002',
          'apaar_id',
          `"${values.apaar_id}" is not 12 digits.`,
          'APAAR identifiers must be 12 numeric digits. A valid format does not mean the identifier is verified.',
          'Enter the 12-digit identifier exactly as issued, or leave the field blank.',
        ),
      );
    }
    if (!values.apaar_id) {
      findings.push(
        finding(
          'APAAR-001',
          'apaar_id',
          'No APAAR identifier was supplied for this student.',
          'The row may be submitted, but the record will be tracked as missing an identifier.',
          'Collect the identifier if available. Do not invent an identifier.',
        ),
      );
    }

    // Duplicates against the registry -------------------------------------
    if (values.registration_number && existingRegNumbers.has(values.registration_number.toLowerCase())) {
      findings.push(
        finding(
          'DUP-002',
          'registration_number',
          `Registration number "${values.registration_number}" already exists in the institution registry.`,
          'Registration numbers must be unique within an institution.',
          'Use the existing record instead of creating a duplicate, or correct the registration number.',
        ),
      );
    }
    if (values.apaar_id) {
      const matches = apaarIndex.get(values.apaar_id) ?? [];
      if (matches.length > 0) {
        const names = Array.from(new Set(matches.map((match) => match.name))).join(', ');
        findings.push(
          finding(
            'DUP-001',
            'apaar_id',
            `Identifier already recorded on ${matches.length} existing record(s): ${names}.`,
            'The same APAAR identifier must not be recorded on multiple student records.',
            'Compare source documents. If this is the same student, amend the existing record rather than adding a new one.',
          ),
        );
        if (
          values.student_name &&
          matches.some((match) => match.name.toLowerCase() !== values.student_name.toLowerCase())
        ) {
          findings.push(
            finding(
              'STU-004',
              'apaar_id',
              `Identifier is recorded against a different name (${names}) in the registry.`,
            ),
          );
        }
      }
    }

    return {
      rowNumber: raw.rowNumber,
      values,
      courseId: course?.id ?? null,
      findings,
      blocking: isBlocking(findings),
    };
  });

  // Duplicate rows inside the uploaded file --------------------------------
  const regCounts = new Map<string, number>();
  for (const row of rows) {
    if (!row.values.registration_number) continue;
    const key = row.values.registration_number.toLowerCase();
    regCounts.set(key, (regCounts.get(key) ?? 0) + 1);
  }
  for (const row of rows) {
    const key = row.values.registration_number.toLowerCase();
    if (key && (regCounts.get(key) ?? 0) > 1) {
      row.findings.push(
        finding(
          'DUP-003',
          'registration_number',
          `Registration number appears ${regCounts.get(key)} times in this file.`,
          'Duplicate rows in a single upload are rejected to avoid double counting.',
          'Remove or merge the duplicate rows and validate the file again.',
        ),
      );
      row.blocking = row.blocking || isBlocking(row.findings);
    }
  }

  const apaarCounts = new Map<string, number>();
  for (const row of rows) {
    if (!row.values.apaar_id) continue;
    apaarCounts.set(row.values.apaar_id, (apaarCounts.get(row.values.apaar_id) ?? 0) + 1);
  }
  for (const row of rows) {
    const count = row.values.apaar_id ? (apaarCounts.get(row.values.apaar_id) ?? 0) : 0;
    if (count > 1) {
      row.findings.push(
        finding(
          'DUP-001',
          'apaar_id',
          `Identifier appears ${count} times in this file.`,
          'Repeated identifiers in one batch signal duplicate records.',
          'Confirm each student is distinct and has a unique identifier.',
        ),
      );
      row.blocking = row.blocking || isBlocking(row.findings);
    }
  }

  const summary: CsvValidationSummary = {
    totalRows: rows.length,
    validRecords: rows.filter((row) => !row.blocking).length,
    invalidRecords: rows.filter((row) => row.blocking).length,
    duplicateCandidates: rows.filter((row) =>
      row.findings.some((item) => item.ruleId.startsWith('DUP-')),
    ).length,
    missingFields: rows.reduce(
      (total, row) => total + row.findings.filter((item) => item.ruleId === 'STU-001').length,
      0,
    ),
    warnings: rows.reduce(
      (total, row) =>
        total +
        row.findings.filter(
          (item) => item.severity === 'Medium' || item.severity === 'Low',
        ).length,
      0,
    ),
    fatalErrors: rows.reduce(
      (total, row) =>
        total +
        row.findings.filter(
          (item) => item.severity === 'Critical' || item.severity === 'High',
        ).length,
      0,
    ),
  };

  return { rows, summary };
}

/** Intake compliance calculation for one course-year cohort. */
export function calculateIntakeCompliance(
  course: Course,
  activeEnrolment: number,
): IntakeCalculation {
  const excess = Math.max(0, activeEnrolment - course.approvedIntake);
  const unverified = course.verificationStatus === 'Unverified';

  if (unverified) {
    return {
      approvedIntake: course.approvedIntake,
      activeEnrolment,
      // Excess is suppressed while the reference is unverified: a comparison
      // against unverified data must not be presented as a compliance finding.
      excess: 0,
      referenceStatus: course.verificationStatus,
      finding: finding(
        'REF-001',
        null,
        `Approved intake reference for ${course.code} is ${course.verificationStatus}.`,
        'Compliance cannot be concluded while the reference dataset is unverified.',
        'Verify the approved intake reference before acting on this comparison.',
      ),
    };
  }

  if (excess > 0) {
    return {
      approvedIntake: course.approvedIntake,
      activeEnrolment,
      excess,
      referenceStatus: course.verificationStatus,
      finding: finding(
        'ENR-001',
        null,
        `${activeEnrolment} active records compared with an approved intake of ${course.approvedIntake} (${excess} above).`,
        'Active enrolment exceeds the configured approved intake for this course and academic year.',
        'Review the underlying records. This is a potential discrepancy, not a finding of a legal violation.',
      ),
    };
  }

  return {
    approvedIntake: course.approvedIntake,
    activeEnrolment,
    excess: 0,
    referenceStatus: course.verificationStatus,
    finding: null,
  };
}

/** Re-validate one student row against the registry (student detail actions). */
export function validateStudentRecord(
  student: Student,
  context: ValidationContext,
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  if (!student.apaarId) {
    findings.push(
      finding(
        'APAAR-001',
        'apaarId',
        'No APAAR identifier is recorded for this student.',
        undefined,
        'Record the identifier obtained from the student. Do not invent one.',
      ),
    );
  } else if (!/^\d{12}$/.test(student.apaarId)) {
    findings.push(
      finding('APAAR-002', 'apaarId', `"${student.apaarId}" is not 12 digits.`),
    );
  }
  const others = (context.allStudents ?? context.students).filter(
    (candidate) =>
      candidate.id !== student.id &&
      student.apaarId &&
      candidate.apaarId === student.apaarId,
  );
  if (others.length > 0) {
    findings.push(
      finding(
        'DUP-001',
        'apaarId',
        `The identifier is also recorded on ${others.map((other) => other.recordId).join(', ')}.`,
      ),
    );
  }
  const course = context.courses.find((candidate) => candidate.id === student.courseId);
  if (!course) {
    findings.push(
      finding('CRS-001', 'courseId', 'The student is not linked to an approved course.'),
    );
  }
  return findings;
}
