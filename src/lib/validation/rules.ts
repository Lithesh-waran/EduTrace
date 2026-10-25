import type { Severity } from '@/types';

export type RuleCategory =
  | 'Required fields'
  | 'Data format'
  | 'Reference data'
  | 'Duplicate detection'
  | 'Intake compliance'
  | 'APAAR status'
  | 'Consistency';

export interface RuleDefinition {
  id: string;
  name: string;
  severity: Severity;
  category: RuleCategory;
  description: string;
  /** What the future Django implementation must reproduce. */
  backendNote: string;
}

/**
 * Deterministic rule catalogue. No probabilistic or machine-learning logic is
 * used anywhere in this module or its consumers.
 */
export const VALIDATION_RULES: Record<string, RuleDefinition> = {
  'STU-001': {
    id: 'STU-001',
    name: 'Mandatory field missing',
    severity: 'High',
    category: 'Required fields',
    description:
      'Registration number, student name, course, academic year, admission date and enrolment status are required.',
    backendNote:
      'Validate in the DRF serializer for StudentRecord before persistence; reject the row with a field-level error map.',
  },
  'STU-002': {
    id: 'STU-002',
    name: 'Invalid admission date',
    severity: 'High',
    category: 'Data format',
    description: 'Admission date must be a real ISO date that is not in the future.',
    backendNote: 'Use a Django DateField with a validator that rejects future dates.',
  },
  'STU-003': {
    id: 'STU-003',
    name: 'Student name looks invalid',
    severity: 'Low',
    category: 'Data format',
    description: 'Names must contain at least three alphabetic characters and no digits.',
    backendNote: 'Apply a RegexValidator on the name field; keep it advisory in the UI.',
  },
  'STU-004': {
    id: 'STU-004',
    name: 'Conflicting student information',
    severity: 'High',
    category: 'Consistency',
    description:
      'The same APAAR identifier is recorded against a different student name, course or institution.',
    backendNote:
      'Detect in a Celery task over the submitted batch and the national reference tables; raise a review case.',
  },
  'CRS-001': {
    id: 'CRS-001',
    name: 'Unknown course for institution',
    severity: 'Critical',
    category: 'Reference data',
    description: 'The course code is not approved for this institution in the selected academic year.',
    backendNote:
      'Resolve the course by (institution, code, academic year) against the approved intake registry before accepting the row.',
  },
  'AY-001': {
    id: 'AY-001',
    name: 'Invalid academic year',
    severity: 'High',
    category: 'Reference data',
    description: 'The academic year must be a configured year and cannot precede the course approval.',
    backendNote: 'Constrain to an AcademicYear reference table managed by AICTE administrators.',
  },
  'ENR-002': {
    id: 'ENR-002',
    name: 'Unrecognised enrolment status',
    severity: 'High',
    category: 'Data format',
    description:
      'Enrolment status must be one of Admitted, Active, Withdrawn, Transferred, Completed or Pending Verification.',
    backendNote: 'Model as a TextChoices enumeration in Django and reject unknown values.',
  },
  'ENR-001': {
    id: 'ENR-001',
    name: 'Active enrolment exceeds approved intake',
    severity: 'High',
    category: 'Intake compliance',
    description:
      'Active enrolment for the institution, course and academic year exceeds the verified approved intake.',
    backendNote:
      'Recompute server-side after every batch import; never block or delete records automatically — raise a review alert.',
  },
  'DUP-001': {
    id: 'DUP-001',
    name: 'Repeated APAAR identifier',
    severity: 'Critical',
    category: 'Duplicate detection',
    description: 'The same APAAR identifier appears on more than one student record.',
    backendNote:
      'Database uniqueness cannot be global (identifiers may be reused only after correction); use a review queue with evidence.',
  },
  'DUP-002': {
    id: 'DUP-002',
    name: 'Duplicate registration number',
    severity: 'Critical',
    category: 'Duplicate detection',
    description: 'The registration number already exists for the institution.',
    backendNote: 'Enforce a unique constraint on (institution, registration_number).',
  },
  'DUP-003': {
    id: 'DUP-003',
    name: 'Duplicate row in uploaded file',
    severity: 'Critical',
    category: 'Duplicate detection',
    description: 'The same registration number appears more than once in the uploaded file.',
    backendNote: 'Check within the parsed batch before inserting any row.',
  },
  'APAAR-001': {
    id: 'APAAR-001',
    name: 'Missing APAAR identifier',
    severity: 'Medium',
    category: 'APAAR status',
    description: 'No APAAR identifier is recorded for the student.',
    backendNote:
      'Allow the record but mark the identifier as missing for follow-up; do not fabricate an identifier.',
  },
  'APAAR-002': {
    id: 'APAAR-002',
    name: 'APAAR identifier format invalid',
    severity: 'High',
    category: 'APAAR status',
    description: 'Recorded APAAR identifiers must be 12 digits.',
    backendNote:
      'Validate format only. A valid format does not imply the identifier was verified by an authorized source.',
  },
  'APAAR-003': {
    id: 'APAAR-003',
    name: 'Verification source unavailable',
    severity: 'Low',
    category: 'APAAR status',
    description: 'The verification adapter could not be reached during the last attempt.',
    backendNote: 'Record adapter availability; retry through Celery with backoff.',
  },
  'APAAR-004': {
    id: 'APAAR-004',
    name: 'APAAR verification failed',
    severity: 'High',
    category: 'APAAR status',
    description: 'The authorized source reported a mismatch for the recorded identifier.',
    backendNote: 'Store the adapter response and require institutional correction/resubmission.',
  },
  'APAAR-005': {
    id: 'APAAR-005',
    name: 'APAAR identifier requires correction',
    severity: 'High',
    category: 'APAAR status',
    description: 'The identifier conflicts with other records and requires institutional correction.',
    backendNote: 'Open a correction case linked to both records; do not modify either identifier automatically.',
  },
  'REF-001': {
    id: 'REF-001',
    name: 'Approved intake reference unverified',
    severity: 'Medium',
    category: 'Reference data',
    description: 'The approved intake reference for the course has not been verified by AICTE.',
    backendNote:
      'Compliance conclusions must be suppressed or labelled while reference data is unverified.',
  },
  'UNV-001': {
    id: 'UNV-001',
    name: 'Unverified reference data used in calculation',
    severity: 'Low',
    category: 'Intake compliance',
    description: 'A calculation used intake data whose verification status is not Verified.',
    backendNote: 'Include reference status with every compliance response so the UI can label it.',
  },
};

export function getRule(ruleId: string): RuleDefinition | undefined {
  return VALIDATION_RULES[ruleId];
}
