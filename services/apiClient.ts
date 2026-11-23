/**
 * Transport for the Django API.
 *
 * Authentication is the HttpOnly cookie pair the API sets on login/signup
 * confirmation, so every call sends `credentials: 'include'`. Unsafe requests
 * carry the CSRF token from GET /auth/csrf. A 401 on a normal call (expired
 * 15-minute access cookie) rotates the session once with POST /auth/refresh and
 * retries; anything still unauthenticated notifies the auth store.
 */

export const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;
let refreshRequest: Promise<boolean> | null = null;
let unauthenticatedHandler: (() => void) | null = null;

export function apiUrl(path: string): string {
  // Pagination's `next` links are absolute and already point at the API.
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path}`;
}

export function setUnauthenticatedHandler(handler: (() => void) | null): void {
  unauthenticatedHandler = handler;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/** Envelope error shape the services return to callers. */
export interface ServiceError {
  message: string;
  status?: number;
}

export function toServiceError(error: unknown): ServiceError {
  if (error instanceof ApiError) return { message: error.message, status: error.status };
  if (error instanceof Error) return { message: error.message };
  return { message: 'Request failed' };
}

function messageFromBody(body: unknown): string {
  if (!body) return 'Request failed';
  if (typeof body === 'string') return body;
  if (typeof body !== 'object') return 'Request failed';
  const record = body as Record<string, unknown>;
  if (typeof record.detail === 'string') return record.detail;
  if (typeof record.error === 'string') return record.error;
  for (const value of Object.values(record)) {
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      if (typeof first === 'string') return first;
    }
    if (typeof value === 'string') return value;
  }
  return 'Request failed';
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const type = response.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  const text = await response.text();
  return text || null;
}

async function getCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = fetch(apiUrl('/auth/csrf'), { credentials: 'include' })
      .then(async (response) => {
        const body = await readBody(response);
        csrfToken = (body as { csrfToken?: string } | null)?.csrfToken || null;
        return csrfToken || '';
      })
      .catch(() => '')
      .finally(() => {
        csrfRequest = null;
      });
  }
  const token = await csrfRequest;
  return token || null;
}

/** Rotate the session from the refresh cookie. Also used by the auth store. */
export async function refreshSession(): Promise<boolean> {
  if (!refreshRequest) {
    refreshRequest = fetch(apiUrl('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshRequest = null;
      });
  }
  return refreshRequest;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  signal?: AbortSignal;
  /** Auth endpoints answer 401 normally; never try to refresh for them. */
  skipAuthRefresh?: boolean;
}

function withQuery(
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>
): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  const suffix = params.toString();
  if (!suffix) return path;
  return path.includes('?') ? `${path}&${suffix}` : `${path}?${suffix}`;
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const method = options.method || 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') {
    const token = await getCsrfToken();
    if (token) headers['X-CSRFToken'] = token;
  }
  return fetch(withQuery(apiUrl(path), options.query), {
    method,
    credentials: 'include',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });
}

export async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await send(path, options);

  if (response.status === 401 && !options.skipAuthRefresh) {
    if (await refreshSession()) {
      response = await send(path, options);
    }
  }

  const body = await readBody(response);
  if (!response.ok) {
    if (response.status === 401) unauthenticatedHandler?.();
    throw new ApiError(messageFromBody(body), response.status, body);
  }
  return body as T;
}

/** Follow DRF pagination (`results`/`next`) and return every row. */
export async function requestAll<T>(
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>
): Promise<T[]> {
  const first = await request<unknown>(path, {
    query: { page_size: 1000, ...query },
  });
  if (Array.isArray(first)) return first as T[];

  const page = first as { results?: T[]; next?: string | null };
  const rows = [...(page.results || [])];
  let next = page.next || null;
  while (next) {
    const following = await request<{ results?: T[]; next?: string | null }>(next);
    rows.push(...(following.results || []));
    next = following.next || null;
  }
  return rows;
}
