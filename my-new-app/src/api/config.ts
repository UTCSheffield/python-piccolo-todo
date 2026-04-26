/// <reference types="vite/client" />

/**
 * API configuration.
 * In development, Vite proxies /api requests to the backend.
 * Set VITE_API_URL in .env for production overrides.
 */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '';
}
