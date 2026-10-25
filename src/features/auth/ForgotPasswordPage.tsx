import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { AuthLayout } from '@/app/AuthLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/AuthProvider';

export function ForgotPasswordPage() {
  const { requestPasswordReset, isDemo } = useAuth();
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid official email address.');
      return;
    }
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The request could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      description="Password reset will be delivered by your identity provider once Keycloak is connected. This demonstration does not send email."
    >
      {submitted ? (
        <div className="space-y-4">
          <Alert tone="success">
            <AlertTitle className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" aria-hidden /> Request accepted (demonstration)
            </AlertTitle>
            <AlertDescription>
              In production, a reset link would be sent to <strong>{email}</strong> through the
              configured identity provider. No email has been sent from this demonstration build.
            </AlertDescription>
          </Alert>
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">
              <ArrowLeft className="size-4" aria-hidden /> Return to sign in
            </Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
          <div>
            <Label htmlFor="reset-email" className="mb-1 block">
              Official email address
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="reset-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError(null);
                }}
                placeholder="name@institution.ac.in"
                className="pl-8"
                aria-invalid={Boolean(error)}
              />
            </div>
            {error && (
              <p role="alert" className="mt-1 text-2xs text-critical">
                {error}
              </p>
            )}
          </div>

          <Alert tone="neutral">
            <AlertTitle>Demonstration behaviour</AlertTitle>
            <AlertDescription>
              {isDemo
                ? 'The mock auth service accepts any valid email address and shows a confirmation without contacting a mail service.'
                : 'Reset requests are handled by the configured identity provider.'}
            </AlertDescription>
          </Alert>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {submitting ? 'Submitting request…' : 'Request password reset'}
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/login">
              <ArrowLeft className="size-4" aria-hidden /> Back to sign in
            </Link>
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
