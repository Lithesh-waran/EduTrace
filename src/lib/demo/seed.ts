import type {
  AppNotification,
  ApaarStatus,
  AuditEvent,
  Course,
  DemoAccount,
  DuplicateReview,
  EnrolmentStatus,
  Institution,
  IntakeAlertReview,
  IssueComment,
  PortalUser,
  Student,
  Submission,
  SubmissionStatus,
  ValidationIssue,
} from '@/types';
import { findDuplicateCandidates, computeIntakeCompliance, alertKey } from './analytics';

/**
 * Deterministic demonstration dataset.
 *
 * Every value below is synthetic. APAAR identifiers use a reserved-looking
 * `999…` prefix solely to make the demonstration nature obvious; they are not
 * real APAAR/ABC identifiers and no government service is contacted.
 */

const BASE = new Date('2026-10-20T09:30:00.000Z');

function at(daysAgo: number, hour = 10, minute = 15): string {
  return new Date(BASE.getTime() - daysAgo * 86_400_000 + hour * 3_600_000 + minute * 60_000).toISOString();
}

function randFactory(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rand = randFactory(26263);

const FIRST_NAMES = [
  'Aarav', 'Ananya', 'Aditya', 'Bhavya', 'Chirag', 'Devika', 'Dhruv', 'Eshita',
  'Farhan', 'Gauri', 'Harish', 'Ishita', 'Jatin', 'Kavya', 'Kiran', 'Lakshmi',
  'Manav', 'Meera', 'Nakul', 'Nivedita', 'Omkar', 'Pranav', 'Priya', 'Rahul',
  'Rohan', 'Sanya', 'Shreya', 'Siddharth', 'Tanvi', 'Vaishnavi', 'Vikram', 'Yash',
];

const LAST_NAMES = [
  'Agarwal', 'Banerjee', 'Chauhan', 'Deshpande', 'Fernandes', 'Ghosh', 'Iyer',
  'Joshi', 'Kulkarni', 'Menon', 'Nair', 'Patel', 'Pillai', 'Rao', 'Reddy',
  'Sharma', 'Shetty', 'Singh', 'Srinivasan', 'Tambe', 'Verma', 'Yadav',
];

const states = [
  { state: 'Maharashtra', region: 'West', district: 'Pune' },
  { state: 'Tamil Nadu', region: 'South', district: 'Coimbatore' },
  { state: 'Karnataka', region: 'South', district: 'Bengaluru Urban' },
  { state: 'Gujarat', region: 'West', district: 'Ahmedabad' },
  { state: 'Uttar Pradesh', region: 'North', district: 'Lucknow' },
];

export const DEMO_INSTITUTIONS: Institution[] = [
  {
    id: 'inst-1',
    aicteId: 'AICTE-PERM-1-2846191',
    name: 'Sanjay Gandhi Institute of Engineering & Technology',
    shortCode: 'SGIET',
    type: 'Engineering & Technology',
    managementType: 'Private Unaided',
    address: 'Survey No. 42, Kondhwa Road, Pune, Maharashtra 411048',
    ...states[0],
    email: 'registrar@sgiet-demo.edu.in',
    phone: '+91 20 4829 1100',
    headOfInstitution: 'Dr. Anil Deshpande',
    portalAdministrator: 'Prof. Sneha Kulkarni',
    approvalRef: 'AICTE/APPROVAL/2024-25/WR-11284',
    approvalFrom: '2024-06-01',
    approvalTo: '2026-05-31',
    verificationStatus: 'Verified',
    approvalSource: 'AICTE Approval Process Handbook 2024-25',
    lastVerifiedOn: '2026-07-18',
    lastUpdated: at(6),
    reviewerComments: [
      {
        at: at(99),
        actor: 'AICTE Administrator (demo)',
        decision: 'Verified',
        reason: 'Approval reference and institutional profile matched the reference extract.',
      },
    ],
  },
  {
    id: 'inst-2',
    aicteId: 'AICTE-PERM-1-3390472',
    name: 'Coimbatore Institute of Applied Sciences',
    shortCode: 'CIAS',
    type: 'Applied Sciences',
    managementType: 'Government Aided',
    address: '142 Avinashi Road, Peelamedu, Coimbatore, Tamil Nadu 641004',
    ...states[1],
    email: 'office@cias-demo.edu.in',
    phone: '+91 422 258 3310',
    headOfInstitution: 'Dr. Meenakshi Iyer',
    portalAdministrator: 'Dr. Karthik Srinivasan',
    approvalRef: 'AICTE/APPROVAL/2025-26/SR-40912',
    approvalFrom: '2025-06-01',
    approvalTo: '2027-05-31',
    verificationStatus: 'Verified',
    approvalSource: 'AICTE Approval Process Handbook 2025-26',
    lastVerifiedOn: '2026-08-04',
    lastUpdated: at(11),
    reviewerComments: [
      {
        at: at(77),
        actor: 'AICTE Administrator (demo)',
        decision: 'Verified',
        reason: 'Verified after institution uploaded the revised approval letter extract.',
      },
    ],
  },
  {
    id: 'inst-3',
    aicteId: 'AICTE-PERM-1-4102883',
    name: 'Karnataka Institute of Management Studies',
    shortCode: 'KIMS',
    type: 'Management',
    managementType: 'Private Unaided',
    address: '8th Block, Jayanagar, Bengaluru Urban, Karnataka 560082',
    ...states[2],
    email: 'admin@kims-demo.edu.in',
    phone: '+91 80 2663 4420',
    headOfInstitution: 'Dr. Ramesh Rao',
    portalAdministrator: 'Ms. Divya Menon',
    approvalRef: 'AICTE/APPROVAL/2025-26/SR-51137',
    approvalFrom: '2025-06-01',
    approvalTo: '2027-05-31',
    verificationStatus: 'Under Verification',
    approvalSource: 'AICTE Approval Process Handbook 2025-26',
    lastVerifiedOn: null,
    lastUpdated: at(3),
    reviewerComments: [
      {
        at: at(9),
        actor: 'AICTE Reviewer (demo)',
        decision: 'Under Verification',
        reason: 'Awaiting confirmation of the extended approval period for the MBA programme.',
      },
    ],
  },
  {
    id: 'inst-4',
    aicteId: 'AICTE-PERM-1-5127334',
    name: 'Sardar Vallabhbhai Polytechnic College',
    shortCode: 'SVPC',
    type: 'Polytechnic',
    managementType: 'Government',
    address: 'Nr. Sabarmati Riverfront, Ahmedabad, Gujarat 380005',
    ...states[3],
    email: 'principal@svpc-demo.edu.in',
    phone: '+91 79 2755 9081',
    headOfInstitution: 'Shri Bhavesh Patel',
    portalAdministrator: 'Shri Nilesh Chauhan',
    approvalRef: 'AICTE/APPROVAL/2023-24/WR-22871',
    approvalFrom: '2023-06-01',
    approvalTo: '2026-05-31',
    verificationStatus: 'Correction Required',
    approvalSource: 'AICTE Approval Process Handbook 2023-24',
    lastVerifiedOn: '2025-08-22',
    lastUpdated: at(2),
    reviewerComments: [
      {
        at: at(4),
        actor: 'AICTE Reviewer (demo)',
        decision: 'Correction Required',
        reason:
          'Civil Engineering intake reference expired on 31 May 2026. Upload the renewed approval extract.',
      },
    ],
  },
  {
    id: 'inst-5',
    aicteId: 'AICTE-PERM-1-6084215',
    name: 'Lucknow College of Pharmacy & Research',
    shortCode: 'LCPR',
    type: 'Pharmacy',
    managementType: 'Private Unaided',
    address: 'Sitapur Road, Lucknow, Uttar Pradesh 226021',
    ...states[4],
    email: 'dean@lcpr-demo.edu.in',
    phone: '+91 522 407 8812',
    headOfInstitution: 'Dr. Farah Banerjee',
    portalAdministrator: 'Mr. Harish Yadav',
    approvalRef: 'AICTE/APPROVAL/2026-27/NR-60418',
    approvalFrom: '2026-06-01',
    approvalTo: '2028-05-31',
    verificationStatus: 'Submitted',
    approvalSource: 'AICTE Approval Process Handbook 2026-27',
    lastVerifiedOn: null,
    lastUpdated: at(1),
    reviewerComments: [],
  },
];

interface CourseSeed {
  id: string;
  institutionId: string;
  name: string;
  code: string;
  approvedIntake: number;
  additionalSeatCategories: string[];
  verificationStatus: Course['verificationStatus'];
  cohorts: Record<string, number>;
  forceActiveYears?: string[];
  revisions?: Course['revisions'];
}

const COURSE_SEEDS: CourseSeed[] = [
  // Institution 1
  {
    id: 'crs-1-cse',
    institutionId: 'inst-1',
    name: 'Computer Science & Engineering',
    code: 'CSE',
    approvedIntake: 120,
    additionalSeatCategories: ['TFW (Tuition Fee Waiver)'],
    verificationStatus: 'Verified',
    cohorts: { '2023-24': 9, '2024-25': 11, '2025-26': 12, '2026-27': 14 },
    revisions: [
      {
        effectiveDate: '2024-06-01',
        academicYear: '2024-25',
        approvedIntake: 108,
        approvalRef: 'AICTE/APPROVAL/2024-25/WR-11284',
        note: 'Baseline approved intake for the 2024-25 cycle.',
      },
      {
        effectiveDate: '2025-06-01',
        academicYear: '2025-26',
        approvedIntake: 120,
        approvalRef: 'AICTE/APPROVAL/2025-26/WR-11284-A',
        note: 'Intake increased by 12 seats after infrastructure review.',
      },
    ],
  },
  {
    id: 'crs-1-aid',
    institutionId: 'inst-1',
    name: 'Artificial Intelligence & Data Science',
    code: 'AIDS',
    approvedIntake: 30,
    additionalSeatCategories: [],
    verificationStatus: 'Verified',
    cohorts: { '2025-26': 8, '2026-27': 36 },
    forceActiveYears: ['2026-27'],
    revisions: [
      {
        effectiveDate: '2025-06-01',
        academicYear: '2025-26',
        approvedIntake: 30,
        approvalRef: 'AICTE/APPROVAL/2025-26/WR-11284-B',
        note: 'New programme approved with a sanctioned intake of 30.',
      },
    ],
  },
  {
    id: 'crs-1-ece',
    institutionId: 'inst-1',
    name: 'Electronics & Communication Engineering',
    code: 'ECE',
    approvedIntake: 60,
    additionalSeatCategories: ['EWS', 'TFW (Tuition Fee Waiver)'],
    verificationStatus: 'Verified',
    cohorts: { '2023-24': 6, '2024-25': 7, '2025-26': 6, '2026-27': 8 },
  },
  // Institution 2
  {
    id: 'crs-2-bsc',
    institutionId: 'inst-2',
    name: 'B.Sc. Computer Science',
    code: 'BSC-CS',
    approvedIntake: 60,
    additionalSeatCategories: [],
    verificationStatus: 'Verified',
    cohorts: { '2023-24': 5, '2024-25': 6, '2025-26': 7, '2026-27': 8 },
  },
  {
    id: 'crs-2-bca',
    institutionId: 'inst-2',
    name: 'Bachelor of Computer Applications',
    code: 'BCA',
    approvedIntake: 90,
    additionalSeatCategories: ['TFW (Tuition Fee Waiver)'],
    verificationStatus: 'Verified',
    cohorts: { '2023-24': 4, '2024-25': 5, '2025-26': 6, '2026-27': 7 },
  },
  {
    id: 'crs-2-bba',
    institutionId: 'inst-2',
    name: 'Bachelor of Business Administration',
    code: 'BBA',
    approvedIntake: 60,
    additionalSeatCategories: [],
    verificationStatus: 'Provisional',
    cohorts: { '2024-25': 3, '2025-26': 4, '2026-27': 6 },
    revisions: [
      {
        effectiveDate: '2025-06-01',
        academicYear: '2025-26',
        approvedIntake: 60,
        approvalRef: 'AICTE/APPROVAL/2025-26/SR-40912-P',
        note: 'Provisional approval pending regional committee confirmation.',
      },
    ],
  },
  // Institution 3
  {
    id: 'crs-3-mba',
    institutionId: 'inst-3',
    name: 'Master of Business Administration',
    code: 'MBA',
    approvedIntake: 120,
    additionalSeatCategories: ['NRI / Sponsored'],
    verificationStatus: 'Verified',
    cohorts: { '2023-24': 6, '2024-25': 7, '2025-26': 8, '2026-27': 9 },
    forceActiveYears: [],
  },
  {
    id: 'crs-3-bba',
    institutionId: 'inst-3',
    name: 'Bachelor of Business Administration',
    code: 'BBA',
    approvedIntake: 90,
    additionalSeatCategories: [],
    verificationStatus: 'Unverified',
    cohorts: { '2024-25': 4, '2025-26': 5, '2026-27': 6 },
  },
  {
    id: 'crs-3-mca',
    institutionId: 'inst-3',
    name: 'Master of Computer Applications',
    code: 'MCA',
    approvedIntake: 60,
    additionalSeatCategories: [],
    verificationStatus: 'Verified',
    cohorts: { '2023-24': 3, '2024-25': 4, '2025-26': 4, '2026-27': 5 },
  },
  // Institution 4
  {
    id: 'crs-4-civ',
    institutionId: 'inst-4',
    name: 'Diploma in Civil Engineering',
    code: 'DCE',
    approvedIntake: 30,
    additionalSeatCategories: [],
    verificationStatus: 'Verified',
    cohorts: { '2023-24': 4, '2024-25': 9, '2025-26': 12, '2026-27': 33 },
    forceActiveYears: ['2026-27'],
  },
  {
    id: 'crs-4-mec',
    institutionId: 'inst-4',
    name: 'Diploma in Mechanical Engineering',
    code: 'DME',
    approvedIntake: 30,
    additionalSeatCategories: [],
    verificationStatus: 'Verified',
    cohorts: { '2023-24': 3, '2024-25': 4, '2025-26': 5, '2026-27': 7 },
  },
  {
    id: 'crs-4-ele',
    institutionId: 'inst-4',
    name: 'Diploma in Electrical Engineering',
    code: 'DEE',
    approvedIntake: 30,
    additionalSeatCategories: [],
    verificationStatus: 'Unverified',
    cohorts: { '2024-25': 3, '2025-26': 4, '2026-27': 5 },
  },
  // Institution 5
  {
    id: 'crs-5-bph',
    institutionId: 'inst-5',
    name: 'Bachelor of Pharmacy',
    code: 'BPH',
    approvedIntake: 100,
    additionalSeatCategories: ['TFW (Tuition Fee Waiver)'],
    verificationStatus: 'Verified',
    cohorts: { '2023-24': 5, '2024-25': 6, '2025-26': 7, '2026-27': 8 },
  },
  {
    id: 'crs-5-mph',
    institutionId: 'inst-5',
    name: 'Master of Pharmacy (Pharmaceutics)',
    code: 'MPH',
    approvedIntake: 18,
    additionalSeatCategories: [],
    verificationStatus: 'Provisional',
    cohorts: { '2024-25': 2, '2025-26': 3, '2026-27': 4 },
  },
  {
    id: 'crs-5-dph',
    institutionId: 'inst-5',
    name: 'Diploma in Pharmacy',
    code: 'DPH',
    approvedIntake: 60,
    additionalSeatCategories: [],
    verificationStatus: 'Verified',
    cohorts: { '2023-24': 4, '2024-25': 5, '2025-26': 6, '2026-27': 7 },
  },
];

function buildCourses(): Course[] {
  return COURSE_SEEDS.map((seed) => {
    const revisions = seed.revisions ?? [];
    const latest = revisions[revisions.length - 1];
    return {
      id: seed.id,
      institutionId: seed.institutionId,
      name: seed.name,
      code: seed.code,
      academicYear: '2026-27',
      approvedIntake: seed.approvedIntake,
      additionalSeatCategories: seed.additionalSeatCategories,
      approvalRef: latest?.approvalRef ?? `AICTE/INTAKE/${seed.institutionId.toUpperCase()}/${seed.code}`,
      effectiveDate: latest?.effectiveDate ?? '2025-06-01',
      lastVerifiedDate:
        seed.verificationStatus === 'Unverified'
          ? null
          : seed.verificationStatus === 'Provisional'
            ? '2026-06-20'
            : '2026-07-12',
      verificationStatus: seed.verificationStatus,
      revisions,
    };
  });
}

function weightedEnrolment(roll: number): EnrolmentStatus {
  if (roll < 0.73) return 'Active';
  if (roll < 0.79) return 'Admitted';
  if (roll < 0.87) return 'Withdrawn';
  if (roll < 0.91) return 'Transferred';
  if (roll < 0.97) return 'Completed';
  return 'Pending Verification';
}

function weightedApaar(roll: number): ApaarStatus {
  if (roll < 0.5) return 'Verified by Authorized Source';
  if (roll < 0.63) return 'Pending';
  if (roll < 0.71) return 'Submitted for Verification';
  if (roll < 0.83) return 'Not Provided';
  if (roll < 0.89) return 'Verification Failed';
  if (roll < 0.95) return 'Verification Unavailable';
  return 'Correction Required';
}

function admissionDateFor(year: string, index: number): string {
  const startYear = Number.parseInt(year.slice(0, 4), 10);
  const day = 16 + (index % 38);
  const month = day > 31 ? 7 : 6;
  const normalizedDay = day > 31 ? day - 31 : day;
  return `${startYear}-${String(month + 1).padStart(2, '0')}-${String(normalizedDay).padStart(2, '0')}`;
}

function buildStudents(): Student[] {
  const students: Student[] = [];
  let counter = 0;

  for (const seed of COURSE_SEEDS) {
    const institution = DEMO_INSTITUTIONS.find((i) => i.id === seed.institutionId);
    if (!institution) continue;

    for (const [year, count] of Object.entries(seed.cohorts)) {
      for (let i = 0; i < count; i += 1) {
        counter += 1;
        const first = FIRST_NAMES[(counter * 7 + 3) % FIRST_NAMES.length];
        const last = LAST_NAMES[(counter * 11 + 5) % LAST_NAMES.length];
        const enrolmentStatus = seed.forceActiveYears?.includes(year)
          ? 'Active'
          : weightedEnrolment(rand());
        const apaarStatus = weightedApaar(rand());
        const apaarId =
          apaarStatus === 'Not Provided'
            ? null
            : `999${String(100000000 + counter * 7919).slice(0, 9)}`;

        students.push({
          id: `stu-${counter}`,
          recordId: `ETR-${String(10000 + counter)}`,
          regNumber: `${institution.shortCode}/${year.slice(0, 4)}/${seed.code}/${String(i + 1).padStart(3, '0')}`,
          name: `${first} ${last}`,
          institutionId: seed.institutionId,
          courseId: seed.id,
          academicYear: year,
          admissionDate: admissionDateFor(year, i + (counter % 9)),
          enrolmentStatus,
          apaarId,
          apaarStatus,
          lastUpdated: at(2 + ((counter * 13) % 110)),
        });
      }
    }
  }

  // Deliberate demonstration anomalies -------------------------------------
  const withApaar = students.filter((s) => s.apaarId);
  // Repeated APAAR identifier across two institutions, with conflicting names.
  const a = withApaar.find((s) => s.institutionId === 'inst-1' && s.courseId === 'crs-1-cse');
  const b = withApaar.find((s) => s.institutionId === 'inst-2' && s.courseId === 'crs-2-bca');
  if (a && b) {
    b.apaarId = a.apaarId;
    b.apaarStatus = 'Correction Required';
    a.apaarStatus = 'Submitted for Verification';
  }
  // Repeated APAAR within one institution.
  const c = withApaar.find((s) => s.institutionId === 'inst-3' && s.courseId === 'crs-3-mba');
  const d = withApaar.find(
    (s) => s.institutionId === 'inst-3' && s.courseId === 'crs-3-mca' && s.id !== c?.id,
  );
  if (c && d) {
    d.apaarId = c.apaarId;
    d.apaarStatus = 'Verification Failed';
  }
  // Duplicate registration number inside one course.
  const e = students.find((s) => s.institutionId === 'inst-4' && s.courseId === 'crs-4-mec');
  const f = students.find(
    (s) => s.institutionId === 'inst-4' && s.courseId === 'crs-4-mec' && s.id !== e?.id,
  );
  if (e && f) f.regNumber = e.regNumber;

  return students;
}

function issueId(index: number): string {
  return `VI-2026-${String(1000 + index)}`;
}

function buildIssues(
  students: Student[],
  institutions: Institution[],
  courses: Course[],
  duplicates: ReturnType<typeof findDuplicateCandidates>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const push = (issue: Omit<ValidationIssue, 'id' | 'detectedAt' | 'lastUpdated' | 'comments'>) => {
    const index = issues.length + 1;
    issues.push({
      ...issue,
      id: issueId(index),
      detectedAt: at(20 + ((index * 7) % 60), 9, (index * 11) % 60),
      lastUpdated: at(1 + ((index * 3) % 20)),
      comments: [],
    });
  };

  for (const student of students) {
    if (student.apaarStatus === 'Not Provided') {
      if (rand() < 0.55) {
        push({
          ruleId: 'APAAR-001',
          ruleName: 'Missing APAAR identifier',
          severity: 'Medium',
          institutionId: student.institutionId,
          studentId: student.id,
          recordRef: student.recordId,
          reason: 'No APAAR identifier is recorded for this student.',
          evidence: `Registration number ${student.regNumber} has no value in the APAAR column.`,
          suggestedAction:
            'Obtain the identifier from the student, record it, and submit for verification.',
          status: 'Open',
          assignedTo: null,
        });
      }
    } else if (student.apaarStatus === 'Verification Failed') {
      push({
        ruleId: 'APAAR-004',
        ruleName: 'APAAR verification failed',
        severity: 'High',
        institutionId: student.institutionId,
        studentId: student.id,
        recordRef: student.recordId,
        reason: 'The simulated verification adapter reported a mismatch for this identifier.',
        evidence: 'Simulated adapter response: MISMATCH (demonstration only).',
        suggestedAction: 'Re-check the recorded identifier and resubmit for verification.',
        status: rand() < 0.5 ? 'Open' : 'Under Review',
        assignedTo: rand() < 0.5 ? 'Institution Verifier (demo)' : null,
      });
    } else if (student.apaarStatus === 'Correction Required') {
      push({
        ruleId: 'APAAR-005',
        ruleName: 'APAAR identifier requires correction',
        severity: 'High',
        institutionId: student.institutionId,
        studentId: student.id,
        recordRef: student.recordId,
        reason: 'The identifier is associated with conflicting student information.',
        evidence: 'The same identifier appears against a different name or institution.',
        suggestedAction: 'Verify the identifier against the source document and correct the record.',
        status: 'Correction Required',
        assignedTo: 'Institution Verifier (demo)',
      });
    } else if (student.apaarStatus === 'Verification Unavailable' && rand() < 0.3) {
      push({
        ruleId: 'APAAR-003',
        ruleName: 'Verification source unavailable',
        severity: 'Low',
        institutionId: student.institutionId,
        studentId: student.id,
        recordRef: student.recordId,
        reason: 'The last simulated verification attempt could not reach the adapter.',
        evidence: 'Adapter status: UNAVAILABLE (no live government service is contacted).',
        suggestedAction: 'Retry verification after the adapter is available.',
        status: 'Acknowledged',
        assignedTo: null,
      });
    }
  }

  for (const candidate of duplicates) {
    for (const student of candidate.students) {
      const isApaar = candidate.kind === 'apaar';
      push({
        ruleId: isApaar ? 'DUP-001' : 'DUP-002',
        ruleName: isApaar ? 'Repeated APAAR identifier' : 'Duplicate registration number',
        severity: 'Critical',
        institutionId: student.institutionId,
        studentId: student.id,
        recordRef: student.recordId,
        reason: candidate.evidence,
        evidence: `${candidate.label} appears on ${candidate.students.length} records (${candidate.institutionNames.join(', ')}).`,
        suggestedAction: isApaar
          ? 'Compare the source documents. Correct the identifier or confirm separate records.'
          : 'Confirm the correct registration number with the examination cell.',
        status: isApaar ? 'Under Review' : 'Open',
        assignedTo: isApaar ? 'AICTE Duplicate Review (demo)' : null,
      });
    }
  }

  const compliance = computeIntakeCompliance(institutions, courses, students, {});
  for (const row of compliance) {
    if (row.status === 'Potential excess') {
      push({
        ruleId: 'ENR-001',
        ruleName: 'Active enrolment exceeds approved intake',
        severity: 'High',
        institutionId: row.institutionId,
        recordRef: `${row.institutionCode}/${row.courseCode}/${row.academicYear}`,
        reason: `${row.activeEnrolment} active records compared with an approved intake of ${row.approvedIntake}.`,
        evidence: `Potential excess of ${row.excess} record(s) for ${row.courseName}, ${row.academicYear}.`,
        suggestedAction:
          'Review the underlying records and confirm whether the reference intake or the enrolment data needs correction.',
        status: 'Open',
        assignedTo: null,
      });
    }
    if (row.status === 'Reference data unverified' && row.totalRecords > 0) {
      push({
        ruleId: 'REF-001',
        ruleName: 'Approved intake reference unverified',
        severity: 'Medium',
        institutionId: row.institutionId,
        recordRef: `${row.institutionCode}/${row.courseCode}/${row.academicYear}`,
        reason: 'The approved intake reference for this course has not been verified.',
        evidence: 'Reference status is Unverified in the approved intake registry.',
        suggestedAction: 'Verify the reference extract before drawing compliance conclusions.',
        status: 'Acknowledged',
        assignedTo: 'AICTE Reviewer (demo)',
      });
    }
  }

  // A few issues already resolved, to show workflow history.
  const resolvable = issues.filter((i) => i.status === 'Open').slice(0, 4);
  resolvable.forEach((issue, index) => {
    issue.status = 'Resolved';
    issue.lastUpdated = at(5 + index);
    issue.comments = [
      {
        id: `cmt-${issue.id}-1`,
        author: 'Institution Data Operator (demo)',
        role: 'institution_operator',
        at: at(9 + index),
        message: 'Correction applied in the student registry and resubmitted for review.',
      } satisfies IssueComment,
      {
        id: `cmt-${issue.id}-2`,
        author: 'AICTE Reviewer (demo)',
        role: 'aicte_reviewer',
        at: at(5 + index),
        message: 'Resolved. The updated record now passes the rule check.',
      } satisfies IssueComment,
    ];
  });

  return issues;
}

interface SubmissionSeed {
  id: string;
  institutionId: string;
  academicYear: string;
  status: SubmissionStatus;
  recordCount: number;
  validRecords: number;
  correctionRecords: number;
  duplicateCandidates: number;
  daysAgo: number;
  reviewer: string | null;
  fileName: string;
  reviewerComment?: string;
}

const SUBMISSION_SEEDS: SubmissionSeed[] = [
  {
    id: 'SUB-2026-0118',
    institutionId: 'inst-1',
    academicYear: '2025-26',
    status: 'Accepted',
    recordCount: 96,
    validRecords: 96,
    correctionRecords: 0,
    duplicateCandidates: 0,
    daysAgo: 128,
    reviewer: 'AICTE Reviewer (demo)',
    fileName: 'sgiet_2025-26_enrolment_final.csv',
    reviewerComment: 'Accepted in demonstration mode. No official AICTE acceptance is implied.',
  },
  {
    id: 'SUB-2026-0139',
    institutionId: 'inst-1',
    academicYear: '2026-27',
    status: 'Under Review',
    recordCount: 58,
    validRecords: 52,
    correctionRecords: 6,
    duplicateCandidates: 2,
    daysAgo: 12,
    reviewer: 'AICTE Reviewer (demo)',
    fileName: 'sgiet_2026-27_sem1.csv',
    reviewerComment: 'Under review. Two repeated APAAR identifiers are pending clarification.',
  },
  {
    id: 'SUB-2026-0146',
    institutionId: 'inst-1',
    academicYear: '2026-27',
    status: 'Resubmitted',
    recordCount: 34,
    validRecords: 34,
    correctionRecords: 0,
    duplicateCandidates: 0,
    daysAgo: 5,
    reviewer: 'AICTE Reviewer (demo)',
    fileName: 'sgiet_2026-27_sem1_corrected.csv',
    reviewerComment: 'Resubmission received after corrections; queued for review.',
  },
  {
    id: 'SUB-2026-0121',
    institutionId: 'inst-2',
    academicYear: '2025-26',
    status: 'Accepted',
    recordCount: 64,
    validRecords: 64,
    correctionRecords: 0,
    duplicateCandidates: 0,
    daysAgo: 116,
    reviewer: 'AICTE Reviewer (demo)',
    fileName: 'cias_2025-26_enrolment.csv',
    reviewerComment: 'Accepted in demonstration mode.',
  },
  {
    id: 'SUB-2026-0134',
    institutionId: 'inst-2',
    academicYear: '2026-27',
    status: 'Submitted',
    recordCount: 21,
    validRecords: 21,
    correctionRecords: 0,
    duplicateCandidates: 1,
    daysAgo: 9,
    reviewer: null,
    fileName: 'cias_2026-27_batch1.csv',
  },
  {
    id: 'SUB-2026-0127',
    institutionId: 'inst-3',
    academicYear: '2026-27',
    status: 'Under Review',
    recordCount: 20,
    validRecords: 17,
    correctionRecords: 3,
    duplicateCandidates: 1,
    daysAgo: 16,
    reviewer: 'AICTE Reviewer (demo)',
    fileName: 'kims_2026-27_mba_bca.csv',
    reviewerComment: 'Clarification requested on one repeated identifier.',
  },
  {
    id: 'SUB-2026-0112',
    institutionId: 'inst-3',
    academicYear: '2025-26',
    status: 'Correction Required',
    recordCount: 18,
    validRecords: 12,
    correctionRecords: 6,
    duplicateCandidates: 0,
    daysAgo: 42,
    reviewer: 'AICTE Reviewer (demo)',
    fileName: 'kims_2025-26_enrolment.csv',
    reviewerComment: 'Six records have missing enrolment status. Please correct and resubmit.',
  },
  {
    id: 'SUB-2026-0136',
    institutionId: 'inst-4',
    academicYear: '2026-27',
    status: 'Validation in Progress',
    recordCount: 45,
    validRecords: 40,
    correctionRecords: 5,
    duplicateCandidates: 1,
    daysAgo: 2,
    reviewer: null,
    fileName: 'svpc_2026-27_diploma.csv',
  },
  {
    id: 'SUB-2026-0108',
    institutionId: 'inst-4',
    academicYear: '2024-25',
    status: 'Rejected',
    recordCount: 22,
    validRecords: 15,
    correctionRecords: 7,
    duplicateCandidates: 2,
    daysAgo: 71,
    reviewer: 'AICTE Reviewer (demo)',
    fileName: 'svpc_2024-25_enrolment.csv',
    reviewerComment: 'Rejected in demonstration mode: reference intake for the cycle was unverified.',
  },
  {
    id: 'SUB-2026-0141',
    institutionId: 'inst-5',
    academicYear: '2026-27',
    status: 'Submitted',
    recordCount: 19,
    validRecords: 18,
    correctionRecords: 1,
    duplicateCandidates: 0,
    daysAgo: 7,
    reviewer: null,
    fileName: 'lcpr_2026-27_pharmacy.csv',
  },
  {
    id: 'SUB-2026-0116',
    institutionId: 'inst-5',
    academicYear: '2025-26',
    status: 'Accepted',
    recordCount: 32,
    validRecords: 32,
    correctionRecords: 0,
    duplicateCandidates: 0,
    daysAgo: 122,
    reviewer: 'AICTE Reviewer (demo)',
    fileName: 'lcpr_2025-26_enrolment.csv',
    reviewerComment: 'Accepted in demonstration mode.',
  },
  {
    id: 'SUB-2026-0148',
    institutionId: 'inst-5',
    academicYear: '2026-27',
    status: 'Draft',
    recordCount: 8,
    validRecords: 6,
    correctionRecords: 2,
    duplicateCandidates: 0,
    daysAgo: 1,
    reviewer: null,
    fileName: 'lcpr_2026-27_partial_draft.csv',
  },
];

function buildSubmissions(): Submission[] {
  return SUBMISSION_SEEDS.map((seed) => {
    const submittedAt = at(seed.daysAgo, 11, 5);
    const timeline: Submission['timeline'] = [
      {
        at: submittedAt,
        actor: 'Institution Administrator (demo)',
        status: 'Submitted',
        note: `Batch uploaded from ${seed.fileName}.`,
      },
    ];
    if (seed.status !== 'Submitted' && seed.status !== 'Draft') {
      timeline.push({
        at: at(Math.max(0, seed.daysAgo - 2), 15, 30),
        actor: seed.reviewer ?? 'AICTE Reviewer (demo)',
        status: seed.status,
        note: seed.reviewerComment ?? 'Status updated by the reviewing authority.',
      });
    }
    if (seed.status === 'Resubmitted') {
      timeline.push({
        at: at(Math.max(0, seed.daysAgo - 1), 9, 45),
        actor: 'Institution Administrator (demo)',
        status: 'Resubmitted',
        note: 'Corrected rows uploaded and the batch was resubmitted for review.',
      });
    }
    const comments = seed.reviewerComment
      ? [
          {
            id: `sub-cmt-${seed.id}`,
            author: seed.reviewer ?? 'AICTE Reviewer (demo)',
            role: 'aicte_reviewer' as const,
            at: at(Math.max(0, seed.daysAgo - 2), 15, 30),
            message: seed.reviewerComment,
          },
        ]
      : [];
    return {
      id: seed.id,
      institutionId: seed.institutionId,
      academicYear: seed.academicYear,
      file: { name: seed.fileName, sizeBytes: seed.recordCount * 1418, rows: seed.recordCount },
      recordCount: seed.recordCount,
      validRecords: seed.validRecords,
      correctionRecords: seed.correctionRecords,
      duplicateCandidates: seed.duplicateCandidates,
      submittedAt,
      status: seed.status,
      reviewer: seed.reviewer,
      lastUpdated: at(Math.max(0, seed.daysAgo - 2)),
      comments,
      timeline,
    };
  }).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

function buildNotifications(): AppNotification[] {
  return [
    {
      id: 'ntf-1',
      type: 'intake',
      title: 'Potential intake excess detected',
      body: 'Artificial Intelligence & Data Science (2026-27) shows active enrolment above the approved intake. AICTE review is pending.',
      at: at(1, 9, 20),
      read: false,
      link: '/institution/intake-compliance',
      institutionId: 'inst-1',
    },
    {
      id: 'ntf-2',
      type: 'duplicate',
      title: 'Duplicate identifier candidate',
      body: 'Two records share the same synthetic APAAR identifier ending 2314. Review the candidate and clarify.',
      at: at(2, 12, 5),
      read: false,
      link: '/institution/apaar-status',
      institutionId: 'inst-1',
    },
    {
      id: 'ntf-3',
      type: 'submission',
      title: 'Batch SUB-2026-0139 under review',
      body: 'AICTE reviewer has started reviewing the 2026-27 semester 1 submission.',
      at: at(4, 16, 40),
      read: false,
      link: '/institution/submissions/SUB-2026-0139',
      institutionId: 'inst-1',
    },
    {
      id: 'ntf-4',
      type: 'apaar',
      title: 'Verification pending for 27 records',
      body: 'Identifiers recorded but not yet submitted through the (simulated) verification adapter.',
      at: at(6, 10, 10),
      read: true,
      link: '/institution/apaar-status',
      institutionId: 'inst-1',
    },
    {
      id: 'ntf-5',
      type: 'review',
      title: 'Correction request acknowledged',
      body: 'Six records flagged during the previous batch were corrected and resubmitted.',
      at: at(8, 14, 0),
      read: true,
      link: '/institution/submissions/SUB-2026-0146',
      institutionId: 'inst-1',
    },
    {
      id: 'ntf-6',
      type: 'submission',
      title: 'Submission awaiting review',
      body: 'Three institutional batches are awaiting an AICTE decision.',
      at: at(1, 11, 15),
      read: false,
      link: '/admin/submissions',
      institutionId: null,
    },
    {
      id: 'ntf-7',
      type: 'intake',
      title: 'Intake discrepancy alerts require action',
      body: 'Two course-year combinations show potential excess enrolment and need a recorded decision.',
      at: at(2, 9, 5),
      read: false,
      link: '/admin/intake-alerts',
      institutionId: null,
    },
    {
      id: 'ntf-8',
      type: 'review',
      title: 'Institution verification pending',
      body: 'Karnataka Institute of Management Studies is under verification for the 2026-27 cycle.',
      at: at(3, 15, 25),
      read: false,
      link: '/admin/institution-verification',
      institutionId: null,
    },
    {
      id: 'ntf-9',
      type: 'apaar',
      title: 'Verification adapter unavailable',
      body: 'The APAAR/ABC adapter is simulated in this build. No live verification is performed.',
      at: at(5, 8, 45),
      read: true,
      link: '/admin/apaar-monitoring',
      institutionId: null,
    },
    {
      id: 'ntf-10',
      type: 'system',
      title: 'Demonstration dataset loaded',
      body: 'EduTrace is running in demonstration mode with synthetic data. No official records are affected.',
      at: at(9, 9, 0),
      read: true,
      link: '/admin/integrations',
      institutionId: null,
    },
  ];
}

function buildAudit(): AuditEvent[] {
  const events: Array<Omit<AuditEvent, 'id'>> = [
    {
      at: at(1, 9, 20),
      actor: 'Validation Engine (demo)',
      actorRole: 'system',
      institutionId: 'inst-1',
      action: 'Intake discrepancy flagged',
      recordRef: 'SGIET/AIDS/2026-27',
      reason: 'Active enrolment exceeded the approved intake reference.',
      changeSummary: 'Alert created: 36 active records against an approved intake of 30.',
    },
    {
      at: at(2, 11, 5),
      actor: 'Prof. Sneha Kulkarni',
      actorRole: 'institution_admin',
      institutionId: 'inst-1',
      action: 'Batch submitted',
      recordRef: 'SUB-2026-0146',
      reason: null,
      changeSummary: '34 corrected records submitted for review.',
    },
    {
      at: at(2, 12, 5),
      actor: 'Validation Engine (demo)',
      actorRole: 'system',
      institutionId: 'inst-1',
      action: 'Duplicate candidate detected',
      recordRef: 'ETR-10023',
      reason: 'Same synthetic APAAR identifier on another record.',
      changeSummary: 'Duplicate review candidate created.',
    },
    {
      at: at(3, 15, 25),
      actor: 'AICTE Reviewer (demo)',
      actorRole: 'aicte_reviewer',
      institutionId: 'inst-3',
      action: 'Institution moved to Under Verification',
      recordRef: 'AICTE-PERM-1-4102883',
      reason: 'Awaiting confirmation of the extended MBA approval period.',
      changeSummary: 'Verification status changed from Submitted to Under Verification.',
    },
    {
      at: at(4, 16, 40),
      actor: 'AICTE Reviewer (demo)',
      actorRole: 'aicte_reviewer',
      institutionId: 'inst-1',
      action: 'Submission taken up for review',
      recordRef: 'SUB-2026-0139',
      reason: 'Routine review of the 2026-27 semester 1 batch.',
      changeSummary: 'Submission status changed to Under Review.',
    },
    {
      at: at(4, 10, 15),
      actor: 'AICTE Reviewer (demo)',
      actorRole: 'aicte_reviewer',
      institutionId: 'inst-4',
      action: 'Correction requested',
      recordRef: 'AICTE-PERM-1-5127334',
      reason: 'Civil Engineering intake approval reference expired on 31 May 2026.',
      changeSummary: 'Institution verification status changed to Correction Required.',
    },
    {
      at: at(5, 9, 45),
      actor: 'Ms. Divya Menon',
      actorRole: 'institution_operator',
      institutionId: 'inst-3',
      action: 'Student record updated',
      recordRef: 'ETR-10121',
      reason: 'Corrected enrolment status after withdrawal request.',
      changeSummary: 'Enrolment status changed from Active to Withdrawn.',
    },
    {
      at: at(6, 14, 30),
      actor: 'AICTE Administrator (demo)',
      actorRole: 'aicte_admin',
      institutionId: 'inst-4',
      action: 'Approved intake revision recorded',
      recordRef: 'SVPC/DCE',
      reason: 'Renewed approval extract could not be verified; reference marked unverified.',
      changeSummary: 'Reference status changed from Verified to Unverified for the 2026-27 cycle.',
    },
    {
      at: at(7, 11, 20),
      actor: 'Shri Nilesh Chauhan',
      actorRole: 'institution_operator',
      institutionId: 'inst-4',
      action: 'Batch submitted',
      recordRef: 'SUB-2026-0136',
      reason: null,
      changeSummary: '45 records submitted; 5 rows require correction.',
    },
    {
      at: at(9, 10, 10),
      actor: 'AICTE Reviewer (demo)',
      actorRole: 'aicte_reviewer',
      institutionId: 'inst-2',
      action: 'Submission accepted (demo)',
      recordRef: 'SUB-2026-0121',
      reason: 'Validation results consistent with the reference dataset.',
      changeSummary: 'Submission status changed to Accepted in demonstration mode.',
    },
    {
      at: at(12, 16, 0),
      actor: 'Validation Engine (demo)',
      actorRole: 'system',
      institutionId: 'inst-3',
      action: 'Batch validation completed',
      recordRef: 'SUB-2026-0127',
      reason: '3 records failed mandatory field checks.',
      changeSummary: 'Submission status changed to Under Review with correction follow-up.',
    },
    {
      at: at(16, 9, 35),
      actor: 'Mr. Harish Yadav',
      actorRole: 'institution_admin',
      institutionId: 'inst-5',
      action: 'Batch submitted',
      recordRef: 'SUB-2026-0141',
      reason: null,
      changeSummary: '19 records submitted for AICTE review.',
    },
    {
      at: at(18, 12, 15),
      actor: 'AICTE Administrator (demo)',
      actorRole: 'aicte_admin',
      institutionId: 'inst-1',
      action: 'Institution verified',
      recordRef: 'AICTE-PERM-1-2846191',
      reason: 'Approval reference matched the reference extract.',
      changeSummary: 'Verification status changed to Verified.',
    },
    {
      at: at(22, 15, 5),
      actor: 'Validation Engine (demo)',
      actorRole: 'system',
      institutionId: 'inst-4',
      action: 'Duplicate registration number detected',
      recordRef: 'ETR-10211',
      reason: 'Registration number repeated within the Mechanical Engineering cohort.',
      changeSummary: 'Critical validation issue created.',
    },
  ];
  return events.map((event, index) => ({ ...event, id: `aud-${100 + index}` }));
}

function buildUsers(): PortalUser[] {
  const users: PortalUser[] = [
    {
      id: 'usr-1',
      name: 'Prof. Sneha Kulkarni',
      email: 'admin@sgiet-demo.edu.in',
      role: 'institution_admin',
      scope: 'institution',
      institutionId: 'inst-1',
      status: 'Active',
      lastActive: at(0, 9, 15),
    },
    {
      id: 'usr-2',
      name: 'Rohit Tambe',
      email: 'operator@sgiet-demo.edu.in',
      role: 'institution_operator',
      scope: 'institution',
      institutionId: 'inst-1',
      status: 'Active',
      lastActive: at(1, 17, 40),
    },
    {
      id: 'usr-3',
      name: 'Anjali Deshpande',
      email: 'verifier@sgiet-demo.edu.in',
      role: 'institution_verifier',
      scope: 'institution',
      institutionId: 'inst-1',
      status: 'Active',
      lastActive: at(3, 11, 5),
    },
    {
      id: 'usr-4',
      name: 'Suresh Nair',
      email: 'registrar@sgiet-demo.edu.in',
      role: 'institution_verifier',
      scope: 'institution',
      institutionId: 'inst-1',
      status: 'Invited',
      lastActive: at(14, 10, 0),
    },
    {
      id: 'usr-5',
      name: 'Dr. Karthik Srinivasan',
      email: 'admin@cias-demo.edu.in',
      role: 'institution_admin',
      scope: 'institution',
      institutionId: 'inst-2',
      status: 'Active',
      lastActive: at(2, 14, 20),
    },
    {
      id: 'usr-6',
      name: 'Ms. Divya Menon',
      email: 'admin@kims-demo.edu.in',
      role: 'institution_admin',
      scope: 'institution',
      institutionId: 'inst-3',
      status: 'Active',
      lastActive: at(5, 9, 50),
    },
    {
      id: 'usr-7',
      name: 'Shri Nilesh Chauhan',
      email: 'principal@svpc-demo.edu.in',
      role: 'institution_operator',
      scope: 'institution',
      institutionId: 'inst-4',
      status: 'Active',
      lastActive: at(7, 16, 10),
    },
    {
      id: 'usr-8',
      name: 'Mr. Harish Yadav',
      email: 'dean@lcpr-demo.edu.in',
      role: 'institution_admin',
      scope: 'institution',
      institutionId: 'inst-5',
      status: 'Suspended',
      lastActive: at(38, 12, 30),
    },
    {
      id: 'usr-9',
      name: 'AICTE Administrator (demo)',
      email: 'admin@aicte-demo.gov.in',
      role: 'aicte_admin',
      scope: 'admin',
      institutionId: null,
      status: 'Active',
      lastActive: at(0, 8, 45),
    },
    {
      id: 'usr-10',
      name: 'AICTE Reviewer (demo)',
      email: 'reviewer@aicte-demo.gov.in',
      role: 'aicte_reviewer',
      scope: 'admin',
      institutionId: null,
      status: 'Active',
      lastActive: at(1, 10, 25),
    },
    {
      id: 'usr-11',
      name: 'Audit Observer (demo)',
      email: 'auditor@aicte-demo.gov.in',
      role: 'auditor',
      scope: 'admin',
      institutionId: null,
      status: 'Active',
      lastActive: at(4, 15, 15),
    },
    {
      id: 'usr-12',
      name: 'Regional Officer — West (demo)',
      email: 'west.ro@aicte-demo.gov.in',
      role: 'aicte_reviewer',
      scope: 'admin',
      institutionId: null,
      status: 'Invited',
      lastActive: at(20, 11, 0),
    },
  ];
  return users;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'demo-1',
    name: 'Prof. Sneha Kulkarni',
    email: 'admin@sgiet-demo.edu.in',
    password: 'Demo@2026',
    role: 'institution_admin',
    scope: 'institution',
    institutionId: 'inst-1',
    label: 'Institution Administrator',
    description: 'Full institution portal access, including submissions and user management.',
  },
  {
    id: 'demo-2',
    name: 'Rohit Tambe',
    email: 'operator@sgiet-demo.edu.in',
    password: 'Demo@2026',
    role: 'institution_operator',
    scope: 'institution',
    institutionId: 'inst-1',
    label: 'Institution Data Operator',
    description: 'Manages student records and batch uploads; cannot change institution profile.',
  },
  {
    id: 'demo-3',
    name: 'Anjali Deshpande',
    email: 'verifier@sgiet-demo.edu.in',
    password: 'Demo@2026',
    role: 'institution_verifier',
    scope: 'institution',
    institutionId: 'inst-1',
    label: 'Institution Verifier',
    description: 'Reviews validation issues and verifies records before submission.',
  },
  {
    id: 'demo-4',
    name: 'AICTE Administrator (demo)',
    email: 'admin@aicte-demo.gov.in',
    password: 'Demo@2026',
    role: 'aicte_admin',
    scope: 'admin',
    label: 'AICTE Administrator',
    description: 'Full administrative access to the institution registry and reference data.',
  },
  {
    id: 'demo-5',
    name: 'AICTE Reviewer (demo)',
    email: 'reviewer@aicte-demo.gov.in',
    password: 'Demo@2026',
    role: 'aicte_reviewer',
    scope: 'admin',
    label: 'AICTE Reviewer',
    description: 'Reviews submissions, intake alerts and institution verification requests.',
  },
  {
    id: 'demo-6',
    name: 'Audit Observer (demo)',
    email: 'auditor@aicte-demo.gov.in',
    password: 'Demo@2026',
    role: 'auditor',
    scope: 'admin',
    label: 'Read-only Auditor',
    description: 'Read-only access to administrative records and audit history.',
  },
];

export interface DemoDatabase {
  institutions: Institution[];
  courses: Course[];
  students: Student[];
  issues: ValidationIssue[];
  submissions: Submission[];
  notifications: AppNotification[];
  audit: AuditEvent[];
  users: PortalUser[];
  alertReviews: Record<string, IntakeAlertReview>;
  duplicateReviews: Record<string, DuplicateReview>;
}

export function createDemoDatabase(): DemoDatabase {
  // Reseed so a reset reproduces exactly the same demonstration dataset.
  rand = randFactory(26263);
  const institutions = DEMO_INSTITUTIONS.map((institution) => ({ ...institution }));
  const courses = buildCourses();
  const students = buildStudents();
  const duplicates = findDuplicateCandidates(students, institutions, courses, {});
  const issues = buildIssues(students, institutions, courses, duplicates);
  const submissions = buildSubmissions();

  const alertReviews: Record<string, IntakeAlertReview> = {
    [alertKey('inst-4', 'crs-4-civ', '2026-27')]: {
      key: alertKey('inst-4', 'crs-4-civ', '2026-27'),
      status: 'Reference Verification Required',
      actions: [
        {
          at: at(2, 14, 10),
          actor: 'AICTE Reviewer (demo)',
          action: 'Reference data needs verification',
          reason:
            'The Civil Engineering approval extract expired on 31 May 2026; the cohort cannot be assessed until the reference is renewed.',
        },
      ],
      lastUpdated: at(2, 14, 10),
    },
    [alertKey('inst-2', 'crs-2-bsc', '2025-26')]: {
      key: alertKey('inst-2', 'crs-2-bsc', '2025-26'),
      status: 'Resolved',
      actions: [
        {
          at: at(30, 10, 0),
          actor: 'AICTE Reviewer (demo)',
          action: 'Correction required',
          reason: 'Two records were duplicated in the previous batch.',
        },
        {
          at: at(26, 11, 30),
          actor: 'Dr. Karthik Srinivasan',
          action: 'Correction submitted',
          reason: 'Duplicate records merged; corrected batch resubmitted.',
        },
        {
          at: at(25, 15, 45),
          actor: 'AICTE Reviewer (demo)',
          action: 'Discrepancy resolved',
          reason: 'Post-correction enrolment is within the configured limit.',
        },
      ],
      lastUpdated: at(25, 15, 45),
    },
  };

  const duplicateReviews: Record<string, DuplicateReview> = {};
  const regDuplicate = duplicates.find((candidate) => candidate.kind === 'regNumber');
  if (regDuplicate) {
    duplicateReviews[regDuplicate.key] = {
      key: regDuplicate.key,
      status: 'Resolved — separate records',
      reason:
        'Examination cell confirmed two students with similar registration numbers; records retained separately.',
      actor: 'AICTE Reviewer (demo)',
      updatedAt: at(11, 13, 20),
    };
  }

  return {
    institutions,
    courses,
    students,
    issues,
    submissions,
    notifications: buildNotifications(),
    audit: buildAudit(),
    users: buildUsers(),
    alertReviews,
    duplicateReviews,
  };
}
