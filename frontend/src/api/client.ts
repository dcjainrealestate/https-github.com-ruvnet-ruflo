const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  status: number;
  tempToken?: string;
  details?: unknown;

  constructor(status: number, message: string, extra?: { tempToken?: string; details?: unknown }) {
    super(message);
    this.status = status;
    this.tempToken = extra?.tempToken;
    this.details = extra?.details;
  }
}

// Loaded synchronously at module init (not inside a React effect) so that
// any component's effect - regardless of mount/effect ordering relative to
// AuthProvider - sees the persisted token on the very first render after a
// full page load, rather than racing it and sending an unauthenticated
// request.
let accessToken: string | null =
  typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
  }
}

export function loadStoredAccessToken(): string | null {
  accessToken = localStorage.getItem('accessToken');
  return accessToken;
}

export function getAccessToken(): string | null {
  return accessToken;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  extraHeaders?: Record<string, string>;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, extraHeaders } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extraHeaders };
  if (auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : undefined;

  if (!response.ok) {
    const message = payload?.error ?? `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, { tempToken: payload?.tempToken, details: payload?.details });
  }

  return payload as T;
}
