export interface Paginated<T> {
  results: T[];
  count: number;
  page: number;
  pageSize: number;
  next: string | null;
  previous: string | null;
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  ordering?: string;
  academicYear?: string;
  state?: string;
  institutionId?: string;
  courseId?: string;
  status?: string;
  apaarStatus?: string;
  enrolmentStatus?: string;
  validationStatus?: string;
  submissionStatus?: string;
  severity?: string;
  read?: boolean;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface ApiErrorBody {
  detail?: string;
  code?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details: Record<string, string[]> | undefined;
  requestId: string | null;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, string[]>,
    requestId?: string | null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId ?? null;
  }
}

export interface HttpClientConfig {
  baseUrl: string;
  /** Returns a short-lived access token held in memory by the auth adapter. */
  getAccessToken?: () => string | null;
  onUnauthorized?: () => void;
  timeoutMs?: number;
  defaultHeaders?: Record<string, string>;
}

export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
}

export type ApiMode = 'mock' | 'http';
