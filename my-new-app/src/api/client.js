import { getApiBaseUrl } from './config';
// ─── Core request helper ──────────────────────────────────────────────────
const base = getApiBaseUrl();
async function request(path, init) {
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
    if (res.status === 204)
        return undefined;
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('application/json'))
        return undefined;
    return res.json();
}
// ─── Session / Auth ───────────────────────────────────────────────────────
export const checkSession = () => request('/api/session');
export const login = (username, password) => request('/api/session/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
});
export const logout = () => request('/api/session/logout', { method: 'POST' });
// ─── Generic CRUD helpers ─────────────────────────────────────────────────
// These work with any REST resource. Replace with resource-specific
// functions as your app grows.
export const getItems = (resource) => request(`/api/${resource}/`).then(d => d.rows ?? []);
export const getItem = (resource, id) => request(`/api/${resource}/${id}/`);
export const createItem = (resource, payload) => request(`/api/${resource}/`, { method: 'POST', body: JSON.stringify(payload) });
export const updateItem = (resource, id, payload) => request(`/api/${resource}/${id}/`, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteItem = (resource, id) => request(`/api/${resource}/${id}/`, { method: 'DELETE' });
