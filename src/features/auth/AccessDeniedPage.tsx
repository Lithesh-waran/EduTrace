import { Link, useNavigate } from 'react-router-dom';
import { Lock, LogOut } from 'lucide-react';
import { AuthLayout } from '@/app/AuthLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/AuthProvider';
import { ROLE_LABELS } from '@/types';

export function AccessDeniedPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="Access denied"
      description="Your signed-in role is not authorized for the requested portal or page."
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-md border border-critical/30 bg-critical/5 p-3">
          <Lock className="mt-0.5 size-4 shrink-0 text-critical" aria-hidden />
          <div className="text-xs leading-relaxed text-foreground/90">
            <p className="font-medium text-foreground">This action is not permitted for your role.</p>
            <p className="mt-1 text-muted-foreground">
              {user
                ? `Signed in as ${user.name} · ${ROLE_LABELS[user.role]}.`
                : 'No active session was found.'}{' '}
              Frontend role checks are a usability layer only; production authorization is enforced
              by the Django backend as well.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {user && (
            <Button asChild className="w-full">
              <Link to={user.scope === 'admin' ? '/admin/dashboard' : '/institution/dashboard'}>
                Return to your dashboard
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">Sign in with a different account</Link>
          </Button>
          {user && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={async () => {
                await signOut();
                navigate('/login');
              }}
            >
              <LogOut className="size-4" aria-hidden /> Sign out
            </Button>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
