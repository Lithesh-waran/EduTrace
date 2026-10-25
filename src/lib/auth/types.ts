import type { DemoAccount, SessionUser } from '@/types';

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_INACTIVE'
  | 'NETWORK'
  | 'UNKNOWN';

export class AuthError extends Error {
  code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

/**
 * Authentication boundary.
 *
 * `MockAuthService` implements this today. A `KeycloakAuthService` built on
 * `keycloak-js` / OIDC-PKCE will implement the same interface during the
 * Antigravity integration phase, without any page-level changes.
 */
export interface AuthService {
  readonly kind: 'mock' | 'oidc';
  /** Human-readable provider label shown in demo/session UI. */
  readonly providerLabel: string;
  readonly demoAccounts: DemoAccount[];
  getSession(): Promise<SessionUser | null>;
  signIn(credentials: { email: string; password: string; remember?: boolean }): Promise<SessionUser>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<{ submitted: boolean }>;
}

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';
