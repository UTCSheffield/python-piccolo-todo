import { getApiBaseUrl } from './config';

// ─── Types ────────────────────────────────────────────────────────────────

export type SessionResponse = {
  authenticated: boolean;
  user?: { id: number; username: string; email?: string };
};

export type ListResponse<T> = { rows: T[]; count?: number };

// ─── Core request helper ──────────────────────────────────────────────────

const base = getApiBaseUrl();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    credentials: 'include', // sends session cookies automatically
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }

  // 204 No Content → return undefined rather than failing to parse
  if (res.status === 204) return undefined as T;

  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) return undefined as T;

  return res.json() as Promise<T>;
}

// ─── Session / Auth ───────────────────────────────────────────────────────

export const checkSession = () =>
  request<SessionResponse>('/api/session');

export const login = (username: string, password: string) =>
  request<void>('/api/session/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

export const logout = () =>
  request<void>('/api/session/logout', { method: 'POST' });

// ─── Generic CRUD helpers ─────────────────────────────────────────────────
// These work with any REST resource. Replace with resource-specific
// functions as your app grows.

export const getItems = <T>(resource: string): Promise<T[]> =>
  request<ListResponse<T>>(`/api/${resource}/`).then(d => d.rows ?? []);

export const getItem = <T>(resource: string, id: number): Promise<T> =>
  request<T>(`/api/${resource}/${id}/`);

export const createItem = <T>(resource: string, payload: T): Promise<void> =>
  request<void>(`/api/${resource}/`, { method: 'POST', body: JSON.stringify(payload) });

export const updateItem = <T>(resource: string, id: number, payload: T): Promise<void> =>
  request<void>(`/api/${resource}/${id}/`, { method: 'PUT', body: JSON.stringify(payload) });

export const deleteItem = (resource: string, id: number): Promise<void> =>
  request<void>(`/api/${resource}/${id}/`, { method: 'DELETE' });
