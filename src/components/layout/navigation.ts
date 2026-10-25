import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpen,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Database,
  FileBarChart,
  FileClock,
  FileText,
  GitCompareArrows,
  LayoutDashboard,
  ListChecks,
  ScanSearch,
  Settings,
  ShieldCheck,
  Upload,
  UserCog,
  Users,
  WalletCards,
  Workflow,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Permission } from '@/lib/auth/permissions';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  permission?: Permission;
  end?: boolean;
  badge?: 'issues' | 'notifications' | 'submissions';
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const INSTITUTION_NAV: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', to: '/institution/dashboard', icon: LayoutDashboard, end: true },
    ],
  },
  {
    title: 'Student data',
    items: [
      { label: 'Student records', to: '/institution/students', icon: Users },
      { label: 'Bulk upload', to: '/institution/upload', icon: Upload },
      { label: 'APAAR status', to: '/institution/apaar-status', icon: WalletCards },
      {
        label: 'Validation issues',
        to: '/institution/validation-issues',
        icon: AlertTriangle,
        badge: 'issues',
      },
    ],
  },
  {
    title: 'Compliance',
    items: [
      { label: 'Intake compliance', to: '/institution/intake-compliance', icon: Activity },
      { label: 'Approved courses', to: '/institution/courses', icon: BookOpen },
      { label: 'Submissions', to: '/institution/submissions', icon: ClipboardList, badge: 'submissions' },
    ],
  },
  {
    title: 'Institution',
    items: [
      { label: 'Institution profile', to: '/institution/profile', icon: Building2 },
      { label: 'Reports', to: '/institution/reports', icon: FileBarChart },
      { label: 'Notifications', to: '/institution/notifications', icon: Bell, badge: 'notifications' },
      { label: 'Audit history', to: '/institution/audit-history', icon: FileClock },
      { label: 'Portal users', to: '/institution/users', icon: UserCog, permission: 'users.manage' },
      { label: 'Settings', to: '/institution/settings', icon: Settings },
    ],
  },
];

export const ADMIN_NAV: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'National dashboard', to: '/admin/dashboard', icon: LayoutDashboard, end: true },
    ],
  },
  {
    title: 'Institutions',
    items: [
      { label: 'Institution registry', to: '/admin/institutions', icon: Building2 },
      { label: 'Institution verification', to: '/admin/institution-verification', icon: ShieldCheck },
      { label: 'Approved intake', to: '/admin/approved-intake', icon: BookOpen },
      { label: 'Enrolment monitoring', to: '/admin/enrolment-monitoring', icon: Activity },
      { label: 'APAAR monitoring', to: '/admin/apaar-monitoring', icon: WalletCards },
    ],
  },
  {
    title: 'Review queues',
    items: [
      { label: 'Duplicate review', to: '/admin/duplicate-review', icon: GitCompareArrows },
      { label: 'Intake alerts', to: '/admin/intake-alerts', icon: AlertTriangle },
      { label: 'Validation issues', to: '/admin/validation-issues', icon: ListChecks, badge: 'issues' },
      { label: 'Submissions', to: '/admin/submissions', icon: ClipboardCheck, badge: 'submissions' },
    ],
  },
  {
    title: 'Reporting',
    items: [
      { label: 'Reports & analytics', to: '/admin/reports', icon: FileBarChart },
      { label: 'Audit logs', to: '/admin/audit-logs', icon: FileClock },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'User management', to: '/admin/users', icon: UserCog },
      { label: 'Integration status', to: '/admin/integrations', icon: Workflow },
      { label: 'System settings', to: '/admin/settings', icon: Settings },
    ],
  },
];

export const ROUTE_TITLES: Record<string, string> = {
  '/login': 'Sign in',
  '/forgot-password': 'Reset password',
  '/access-denied': 'Access denied',
  '/institution/dashboard': 'Institution dashboard',
  '/institution/profile': 'Institution profile',
  '/institution/courses': 'Approved courses & intake',
  '/institution/students': 'Student records',
  '/institution/upload': 'Bulk CSV upload',
  '/institution/apaar-status': 'APAAR status',
  '/institution/validation-issues': 'Validation issues',
  '/institution/intake-compliance': 'Intake compliance',
  '/institution/submissions': 'Submissions',
  '/institution/reports': 'Reports',
  '/institution/notifications': 'Notifications',
  '/institution/audit-history': 'Audit history',
  '/institution/users': 'Portal users',
  '/institution/settings': 'Settings',
  '/admin/dashboard': 'National overview',
  '/admin/institutions': 'Institution registry',
  '/admin/institution-verification': 'Institution verification',
  '/admin/approved-intake': 'Approved intake registry',
  '/admin/enrolment-monitoring': 'Enrolment monitoring',
  '/admin/apaar-monitoring': 'APAAR monitoring',
  '/admin/duplicate-review': 'Duplicate review',
  '/admin/intake-alerts': 'Intake alert review',
  '/admin/validation-issues': 'Validation issues',
  '/admin/submissions': 'Submission management',
  '/admin/reports': 'Reports & analytics',
  '/admin/audit-logs': 'Audit logs',
  '/admin/users': 'User management',
  '/admin/integrations': 'Integration status',
  '/admin/settings': 'System settings',
};

export const SECTION_LABELS: Record<string, string> = {
  institution: 'Institution portal',
  admin: 'AICTE administration',
};

export function navForScope(scope: 'institution' | 'admin'): NavSection[] {
  return scope === 'institution' ? INSTITUTION_NAV : ADMIN_NAV;
}

export const NAV_ICON_FALLBACK = Database;
export const REPORT_ICON = FileText;
export const SCAN_ICON = ScanSearch;
