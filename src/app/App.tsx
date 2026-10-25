import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { RequireAuth, RequireScope, RoleLanding } from './guards';
import { AccessDeniedPage } from '@/features/auth/AccessDeniedPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { NotFoundPage } from '@/features/auth/NotFoundPage';
import { InstitutionDashboard } from '@/features/institutions/InstitutionDashboard';
import { InstitutionProfilePage } from '@/features/institutions/InstitutionProfilePage';
import { CoursesPage } from '@/features/institutions/CoursesPage';
import { StudentListPage } from '@/features/students/StudentListPage';
import { StudentDetailPage } from '@/features/students/StudentDetailPage';
import { UploadPage } from '@/features/students/UploadPage';
import { ApaarStatusPage } from '@/features/apaar/ApaarStatusPage';
import { InstitutionValidationIssuesPage } from '@/features/validation/ValidationIssuesPage';
import { IntakeCompliancePage } from '@/features/intake/IntakeCompliancePage';
import {
  InstitutionSubmissionDetailPage,
  InstitutionSubmissionsPage,
} from '@/features/submissions/SubmissionsPages';
import { InstitutionReportsPage } from '@/features/reports/ReportsPage';
import { NotificationsPage } from '@/features/notifications/NotificationsPage';
import { AuditHistoryPage } from '@/features/audit/AuditHistoryPage';
import { InstitutionUsersPage } from '@/features/institutions/InstitutionUsersPage';
import { InstitutionSettingsPage } from '@/features/institutions/InstitutionSettingsPage';
import { AdminDashboard } from '@/features/admin/AdminDashboard';
import { InstitutionRegistryPage } from '@/features/admin/InstitutionRegistryPage';
import { InstitutionDetailPage } from '@/features/admin/InstitutionDetailPage';
import { InstitutionVerificationPage } from '@/features/admin/InstitutionVerificationPage';
import { ApprovedIntakePage } from '@/features/admin/ApprovedIntakePage';
import { EnrolmentMonitoringPage } from '@/features/admin/EnrolmentMonitoringPage';
import { ApaarMonitoringPage } from '@/features/admin/ApaarMonitoringPage';
import { DuplicateReviewPage } from '@/features/admin/DuplicateReviewPage';
import { IntakeAlertsPage } from '@/features/admin/IntakeAlertsPage';
import { AdminValidationIssuesPage } from '@/features/validation/ValidationIssuesPage';
import {
  AdminSubmissionDetailPage,
  AdminSubmissionsPage,
} from '@/features/submissions/SubmissionsPages';
import { AdminReportsPage } from '@/features/reports/ReportsPage';
import { AdminAuditLogsPage } from '@/features/admin/AdminAuditLogsPage';
import { AdminUsersPage } from '@/features/admin/AdminUsersPage';
import { IntegrationsPage } from '@/features/admin/IntegrationsPage';
import { AdminSettingsPage } from '@/features/admin/AdminSettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/access-denied" element={<AccessDeniedPage />} />
      <Route path="/" element={<RoleLanding />} />

      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/institution" element={<RequireScope scope="institution" />}>
          <Route index element={<RoleLanding />} />
          <Route path="dashboard" element={<InstitutionDashboard />} />
          <Route path="profile" element={<InstitutionProfilePage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="students" element={<StudentListPage />} />
          <Route path="students/:id" element={<StudentDetailPage />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="apaar-status" element={<ApaarStatusPage />} />
          <Route path="validation-issues" element={<InstitutionValidationIssuesPage />} />
          <Route path="intake-compliance" element={<IntakeCompliancePage />} />
          <Route path="submissions" element={<InstitutionSubmissionsPage />} />
          <Route path="submissions/:id" element={<InstitutionSubmissionDetailPage />} />
          <Route path="reports" element={<InstitutionReportsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="audit-history" element={<AuditHistoryPage />} />
          <Route path="users" element={<InstitutionUsersPage />} />
          <Route path="settings" element={<InstitutionSettingsPage />} />
        </Route>

        <Route path="/admin" element={<RequireScope scope="admin" />}>
          <Route index element={<RoleLanding />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="institutions" element={<InstitutionRegistryPage />} />
          <Route path="institutions/:id" element={<InstitutionDetailPage />} />
          <Route path="institution-verification" element={<InstitutionVerificationPage />} />
          <Route path="approved-intake" element={<ApprovedIntakePage />} />
          <Route path="enrolment-monitoring" element={<EnrolmentMonitoringPage />} />
          <Route path="apaar-monitoring" element={<ApaarMonitoringPage />} />
          <Route path="duplicate-review" element={<DuplicateReviewPage />} />
          <Route path="intake-alerts" element={<IntakeAlertsPage />} />
          <Route path="validation-issues" element={<AdminValidationIssuesPage />} />
          <Route path="submissions" element={<AdminSubmissionsPage />} />
          <Route path="submissions/:id" element={<AdminSubmissionDetailPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="audit-logs" element={<AdminAuditLogsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="integrations" element={<IntegrationsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
