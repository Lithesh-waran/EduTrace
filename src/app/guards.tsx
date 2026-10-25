import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { canAccessAdminPortal, canAccessInstitutionPortal } from '@/lib/auth/permissions';
import type { PortalScope } from '@/types';

export function FullPageLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background" role="status">
      <Loader2 className="size-5 animate-spin text-secondary" aria-hidden />
      <p className="text-xs text-muted-foreground">Loading EduTrace…</p>
    </div>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export function RequireScope({ scope }: { scope: PortalScope }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const allowed =
    scope === 'institution' ? canAccessInstitutionPortal(user.role) : canAccessAdminPortal(user.role);

  if (!allowed) return <Navigate to="/access-denied" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function RoleLanding() {
  const { status, user } = useAuth();
  if (status === 'loading') return <FullPageLoading />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Navigate
      to={user.scope === 'admin' ? '/admin/dashboard' : '/institution/dashboard'}
      replace
    />
  );
}
