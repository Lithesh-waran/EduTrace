import * as React from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Eye,
  EyeOff,
  FlaskConical,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldAlert,
} from 'lucide-react';
import { AuthLayout } from '@/app/AuthLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatDate } from '@/lib/format';
import { ROLE_LABELS } from '@/types';

interface FieldErrors {
  email?: string;
  password?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPage() {
  const { status, user, signIn, signInAs, isSigningIn, demoAccounts, isDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [remember, setRemember] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [busyAccountId, setBusyAccountId] = React.useState<string | null>(null);

  if (status === 'authenticated' && user) {
    const destination = from ?? (user.scope === 'admin' ? '/admin/dashboard' : '/institution/dashboard');
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    const errors: FieldErrors = {};
    if (!email.trim()) errors.email = 'Enter your official email address.';
    else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.';
    if (!password) errors.password = 'Enter your password.';
    else if (password.length < 6) errors.password = 'Passwords are at least 6 characters.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      const session = await signIn(email, password, remember);
      navigate(
        from ?? (session.scope === 'admin' ? '/admin/dashboard' : '/institution/dashboard'),
        { replace: true },
      );
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : 'Sign-in failed. Check the demonstration credentials and try again.',
      );
    }
  };

  const handleDemoSignIn = async (accountId: string) => {
    setAuthError(null);
    setBusyAccountId(accountId);
    try {
      const session = await signInAs(accountId, remember);
      navigate(
        from ?? (session.scope === 'admin' ? '/admin/dashboard' : '/institution/dashboard'),
        { replace: true },
      );
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Demonstration sign-in failed.');
    } finally {
      setBusyAccountId(null);
    }
  };

  return (
    <AuthLayout
      title="Sign in to EduTrace"
      description="Use your institutional or AICTE account. This demonstration build provides seeded accounts instead of Keycloak."
    >
      <Alert tone="warning" className="mb-4">
        <AlertTitle className="flex items-center gap-1.5">
          <FlaskConical className="size-3.5" aria-hidden /> Demonstration authentication
        </AlertTitle>
        <AlertDescription>
          This is not production authentication. Credentials below are seeded demonstration
          accounts; no token is issued and no identity is verified. Production uses Keycloak (OIDC)
          with server-side authorization in Django.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
        {authError && (
          <Alert tone="critical">
            <AlertTitle className="flex items-center gap-1.5">
              <ShieldAlert className="size-3.5" aria-hidden /> Sign-in unsuccessful
            </AlertTitle>
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}

        <div>
          <Label htmlFor="email" className="mb-1 block">
            Official email address
          </Label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setFieldErrors((current) => ({ ...current, email: undefined }));
              }}
              placeholder="name@institution.ac.in"
              className="pl-8"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            />
          </div>
          {fieldErrors.email && (
            <p id="email-error" role="alert" className="mt-1 text-2xs text-critical">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-2xs font-medium text-secondary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <LockKeyhole
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setFieldErrors((current) => ({ ...current, password: undefined }));
              }}
              placeholder="Enter your password"
              className="pl-8 pr-9"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {fieldErrors.password && (
            <p id="password-error" role="alert" className="mt-1 text-2xs text-critical">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id="remember"
            checked={remember}
            onCheckedChange={(checked) => setRemember(checked === true)}
            className="mt-0.5"
          />
          <div>
            <Label htmlFor="remember" className="cursor-pointer">
              Keep me signed in on this device
            </Label>
            <p className="text-2xs text-muted-foreground">
              Demo only: stores the demonstration account id in local storage. Never use this
              pattern for production tokens.
            </p>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isSigningIn || busyAccountId !== null}>
          {isSigningIn ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden /> Signing in…
            </>
          ) : (
            <>
              Sign in <ArrowRight className="size-4" aria-hidden />
            </>
          )}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" aria-hidden />
        <span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
          Demonstration accounts
        </span>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>

      <div className="rounded-md border border-border bg-card">
        <div className="border-b border-border px-3 py-2">
          <p className="text-xs font-medium text-foreground">Sign in as a demonstration role</p>
          <p className="text-2xs text-muted-foreground">
            Password for every account: <code className="rounded bg-muted px-1 font-mono">Demo@2026</code>
          </p>
        </div>
        <ul className="divide-y divide-border">
          {demoAccounts.map((account) => {
            const busy = busyAccountId === account.id;
            return (
              <li key={account.id}>
                <button
                  type="button"
                  onClick={() => handleDemoSignIn(account.id)}
                  disabled={isSigningIn || busyAccountId !== null}
                  className="flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none disabled:opacity-60"
                >
                  <span
                    className={
                      account.scope === 'admin'
                        ? 'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-semibold text-primary'
                        : 'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded bg-secondary/10 text-[10px] font-semibold text-secondary'
                    }
                    aria-hidden
                  >
                    {account.scope === 'admin' ? 'AC' : 'IN'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-foreground">{account.label}</span>
                    <span className="block text-2xs leading-snug text-muted-foreground">
                      {account.description}
                    </span>
                  </span>
                  {busy ? (
                    <Loader2 className="mt-1 size-3.5 shrink-0 animate-spin text-secondary" aria-hidden />
                  ) : (
                    <ArrowRight className="mt-1 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
        Demonstration dataset generated on {formatDate('2026-10-20T09:30:00.000Z')}. Roles:{' '}
        {Array.from(new Set(demoAccounts.map((account) => ROLE_LABELS[account.role]))).join(' · ')}.
        {isDemo && ' Mock auth service active; set VITE_API_MODE=http for the Django backend.'}
      </p>
    </AuthLayout>
  );
}
