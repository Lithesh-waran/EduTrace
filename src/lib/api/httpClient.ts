import { ApiError, type ApiErrorBody, type HttpClientConfig, type RequestOptions } from './types';

function buildQuery(query?: RequestOptions['query']): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const serialised = params.toString();
  return serialised ? `?${serialised}` : '';
}

/**
 * Shared HTTP client for the Django REST Framework backend.
 *
 * - JSON request/response handling with typed responses.
 * - Consistent error normalisation (DRF error shapes included).
 * - Timeout and cancellation support.
 * - Authentication integration point: the token is read from the auth adapter
 *   and kept in memory. Access tokens must never be written to localStorage.
 */
export class HttpClient {
  private readonly config: HttpClientConfig;

  constructor(config: HttpClientConfig) {
    this.config = config;
  }

  get baseUrl(): string {
    return this.config.baseUrl.replace(/\/$/, '');
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? this.config.timeoutMs ?? 20_000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    const token = this.config.getAccessToken?.() ?? null;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...this.config.defaultHeaders,
      ...options.headers,
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(`${this.baseUrl}${path}${buildQuery(options.query)}`, {
        method,
        headers,
        body:
          body === undefined
            ? undefined
            : body instanceof FormData
              ? body
              : JSON.stringify(body),
        signal: controller.signal,
        credentials: 'include',
      });

      if (response.status === 401) {
        this.config.onUnauthorized?.();
        throw new ApiError(401, 'UNAUTHENTICATED', 'Your session has expired. Sign in again.');
      }

      if (!response.ok) {
        let errorBody: ApiErrorBody = {};
        try {
          errorBody = (await response.json()) as ApiErrorBody;
        } catch {
          /* Non-JSON error response. */
        }
        const message =
          errorBody.detail ??
          errorBody.message ??
          `Request failed with status ${response.status}.`;
        throw new ApiError(
          response.status,
          errorBody.code ?? `HTTP_${response.status}`,
          message,
          errorBody.errors,
          response.headers.get('x-request-id'),
        );
      }

      if (response.status === 204) return undefined as T;

      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        return (await response.json()) as T;
      }
      return (await response.text()) as unknown as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError(408, 'TIMEOUT', 'The request timed out. Try again.');
      }
      throw new ApiError(0, 'NETWORK', 'Could not reach the EduTrace API. Check your connection.');
    } finally {
      clearTimeout(timeout);
    }
  }

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, body, options);
  }

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  async getBlob(path: string, options?: RequestOptions): Promise<Blob> {
    const token = this.config.getAccessToken?.() ?? null;
    const response = await fetch(`${this.baseUrl}${path}${buildQuery(options?.query)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: 'include',
    });
    if (!response.ok) {
      throw new ApiError(response.status, `HTTP_${response.status}`, 'The export could not be generated.');
    }
    return response.blob();
  }
}
