/**
 * @file config/api.ts
 * @description Centralised API base-URL configuration for the MediKiosk+
 * frontend. The React app is deployed separately (Vercel) from the Express
 * backend (Render), so every request goes to an absolute API origin.
 *
 * Set VITE_API_URL in `frontend/.env.local` (or the Vercel dashboard) to the
 * deployed backend URL, e.g. `https://medikiosk-backend.onrender.com`.
 * Defaults to the local dev backend.
 */

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ||
  'http://localhost:3000';

/** Returns an absolute URL for a backend path, e.g. apiUrl('/api/queue'). */
export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path}`;
}

/** fetch() wrapper that targets the backend through API_BASE_URL. */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init);
}