import { HttpClient } from './httpClient';
import { HttpApiClient } from './httpApiClient';
import { MockApiClient } from './mockApiClient';
import type { EduTraceApi } from './services';
import type { ApiMode } from './types';

export * from './types';
export * from './services';
export { HttpClient } from './httpClient';
export { HttpApiClient } from './httpApiClient';
export { MockApiClient } from './mockApiClient';

const configuredMode = (import.meta.env.VITE_API_MODE ?? 'mock') as ApiMode;

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export const apiMode: ApiMode = configuredMode;

/** Access-token holder for the integration phase; unborn until Keycloak is wired. */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

let cachedApi: EduTraceApi | null = null;

/**
 * Returns the API implementation for the current mode.
 *
 * In demonstration mode the UI is backed by the local, persisted data layer;
 * `MockApiClient` exposes the same read contracts for API-shaped queries.
 */
export function getApi(): EduTraceApi {
  if (cachedApi) return cachedApi;
  if (apiMode === 'http') {
    if (!API_BASE_URL) {
      // Fail loudly rather than silently pretending a backend accepted writes.
      throw new Error(
        'VITE_API_MODE=http requires VITE_API_BASE_URL. Configure it in .env and rebuild.',
      );
    }
    cachedApi = new HttpApiClient(
      new HttpClient({
        baseUrl: API_BASE_URL,
        getAccessToken,
        onUnauthorized: () => setAccessToken(null),
      }),
    );
  } else {
    cachedApi = new MockApiClient();
  }
  return cachedApi;
}
