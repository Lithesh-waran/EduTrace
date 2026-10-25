import type { Role } from '@/types';

export type Permission =
  | 'students.write'
  | 'students.create'
  | 'upload.create'
  | 'issues.comment'
  | 'issues.manage'
  | 'profile.edit'
  | 'submissions.resubmit'
  | 'users.manage'
  | 'settings.manage'
  | 'admin.review'
  | 'admin.verify'
  | 'admin.intake.edit'
  | 'admin.duplicates'
  | 'admin.submissions'
  | 'admin.users'
  | 'admin.settings'
  | 'admin.integrations';

const INSTITUTION_ADMIN: Permission[] = [
  'students.write',
  'students.create',
  'upload.create',
  'issues.comment',
  'issues.manage',
  'profile.edit',
  'submissions.resubmit',
  'users.manage',
  'settings.manage',
];

const INSTITUTION_OPERATOR: Permission[] = [
  'students.write',
  'students.create',
  'upload.create',
  'issues.comment',
  'submissions.resubmit',
];

const INSTITUTION_VERIFIER: Permission[] = [
  'students.write',
  'issues.comment',
  'issues.manage',
];

const AICTE_ADMIN: Permission[] = [
  'admin.review',
  'admin.verify',
  'admin.intake.edit',
  'admin.duplicates',
  'admin.submissions',
  'admin.users',
  'admin.settings',
  'admin.integrations',
  'users.manage',
];

const AICTE_REVIEWER: Permission[] = [
  'admin.review',
  'admin.verify',
  'admin.duplicates',
  'admin.submissions',
  'admin.integrations',
];

const PERMISSIONS: Record<Role, Permission[]> = {
  institution_admin: INSTITUTION_ADMIN,
  institution_operator: INSTITUTION_OPERATOR,
  institution_verifier: INSTITUTION_VERIFIER,
  aicte_admin: AICTE_ADMIN,
  aicte_reviewer: AICTE_REVIEWER,
  auditor: [],
};

/**
 * Frontend role checks shape navigation and hide actions the signed-in role
 * should not perform. They are a usability layer only — the Django backend
 * must enforce the same rules for every request.
 */
export function can(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false;
  return PERMISSIONS[role].includes(permission);
}

export function isReadOnly(role: Role | undefined): boolean {
  return role === 'auditor';
}

export function canAccessInstitutionPortal(role: Role | undefined): boolean {
  return (
    role === 'institution_admin' ||
    role === 'institution_operator' ||
    role === 'institution_verifier'
  );
}

export function canAccessAdminPortal(role: Role | undefined): boolean {
  return role === 'aicte_admin' || role === 'aicte_reviewer' || role === 'auditor';
}
