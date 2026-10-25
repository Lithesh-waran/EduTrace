import * as React from 'react';
import type { DemoAccount, SessionUser } from '@/types';
import { MockAuthService } from './mockAuthService';
import { can as canForRole, type Permission } from './permissions';
import type { AuthError, AuthService, AuthStatus } from './types';

interface AuthContextValue {
  status: AuthStatus;
  user: SessionUser | null;
  service: AuthService;
  demoAccounts: DemoAccount[];
  isDemo: boolean;
  isSigningIn: boolean;
  signIn: (email: string, password: string, remember?: boolean) => Promise<SessionUser>;
  signInAs: (accountId: string, remember?: boolean) => Promise<SessionUser>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ submitted: boolean }>;
  can: (permission: Permission) => boolean;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

/**
 * Swap this factory for a Keycloak-backed implementation during integration.
 * The rest of the application depends only on the AuthService interface.
 */
const authService: AuthService = new MockAuthService();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AuthStatus>('loading');
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [isSigningIn, setIsSigningIn] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    authService
      .getSession()
      .then((session) => {
        if (cancelled) return;
        setUser(session);
        setStatus(session ? 'authenticated' : 'anonymous');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('anonymous');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = React.useCallback(async (email: string, password: string, remember = false) => {
    setIsSigningIn(true);
    try {
      const session = await authService.signIn({ email, password, remember });
      setUser(session);
      setStatus('authenticated');
      return session;
    } catch (error) {
      throw error as AuthError;
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signInAs = React.useCallback(
    async (accountId: string, remember = false) => {
      const account = authService.demoAccounts.find((candidate) => candidate.id === accountId);
      if (!account) throw new Error('Unknown demonstration account.');
      return signIn(account.email, account.password, remember);
    },
    [signIn],
  );

  const signOut = React.useCallback(async () => {
    await authService.signOut();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const requestPasswordReset = React.useCallback(
    (email: string) => authService.requestPasswordReset(email),
    [],
  );

  const can = React.useCallback((permission: Permission) => canForRole(user?.role, permission), [user?.role]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      service: authService,
      demoAccounts: authService.demoAccounts,
      isDemo: authService.kind === 'mock',
      isSigningIn,
      signIn,
      signInAs,
      signOut,
      requestPasswordReset,
      can,
    }),
    [status, user, isSigningIn, signIn, signInAs, signOut, requestPasswordReset, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

/** Demo mode banner copy shared by the shell and login page. */
export const DEMO_MODE_NOTICE =
  'Demonstration build — synthetic data, simulated APAAR/ABC verification and no production authentication.';
