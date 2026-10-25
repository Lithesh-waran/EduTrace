import { DEMO_ACCOUNTS } from '@/lib/demo/seed';
import type { DemoAccount, SessionUser } from '@/types';
import { AuthError, type AuthService } from './types';

const SESSION_KEY = 'edutrace.demo.session.v1';
const REMEMBER_KEY = 'edutrace.demo.remember.v1';
const DEMO_PASSWORD_HINT = 'Demo@2026';

function delay(ms = 520): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toSession(account: DemoAccount): SessionUser {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    scope: account.scope,
    institutionId: account.institutionId,
    demo: true,
  };
}

export function getDemoPasswordHint(): string {
  return DEMO_PASSWORD_HINT;
}

/**
 * Demonstration authentication.
 *
 * This is NOT production authentication: it checks seeded demo credentials in
 * the browser and keeps only a demo account identifier in sessionStorage. No
 * access token is stored or issued. Production uses Keycloak (OIDC + PKCE) and
 * the Django backend must authorize every request independently.
 */
export class MockAuthService implements AuthService {
  readonly kind = 'mock' as const;
  readonly providerLabel = 'Demo authentication (no Keycloak)';
  readonly demoAccounts = DEMO_ACCOUNTS;

  async getSession(): Promise<SessionUser | null> {
    const accountId =
      window.sessionStorage.getItem(SESSION_KEY) ?? window.localStorage.getItem(REMEMBER_KEY);
    if (!accountId) return null;
    const account = DEMO_ACCOUNTS.find((candidate) => candidate.id === accountId);
    return account ? toSession(account) : null;
  }

  async signIn({
    email,
    password,
    remember,
  }: {
    email: string;
    password: string;
    remember?: boolean;
  }): Promise<SessionUser> {
    await delay();
    const account = DEMO_ACCOUNTS.find(
      (candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!account || account.password !== password) {
      throw new AuthError(
        'INVALID_CREDENTIALS',
        'The email or password does not match a demonstration account.',
      );
    }
    if (remember) {
      window.localStorage.setItem(REMEMBER_KEY, account.id);
      window.sessionStorage.removeItem(SESSION_KEY);
    } else {
      window.sessionStorage.setItem(SESSION_KEY, account.id);
      window.localStorage.removeItem(REMEMBER_KEY);
    }
    return toSession(account);
  }

  async signOut(): Promise<void> {
    window.sessionStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(REMEMBER_KEY);
    await delay(120);
  }

  async requestPasswordReset(email: string): Promise<{ submitted: boolean }> {
    await delay(600);
    if (!email.trim()) {
      throw new AuthError('UNKNOWN', 'Enter the email address associated with your account.');
    }
    // Demonstration only: no mail is sent and no reset token is created.
    return { submitted: true };
  }
}
