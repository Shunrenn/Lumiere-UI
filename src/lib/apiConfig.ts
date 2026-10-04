/**
 * Central configuration for backend REST API base URL.
 * Uses `VITE_API_URL` when provided and falls back to the deployed API so
 * preview builds do not try to call a browser-local backend.
 */
const envUrl: string | undefined =
  typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_API_URL as string | undefined) : undefined
const DEFAULT_API_URL = 'https://lumiere-production-f6a1.up.railway.app'
const isDev = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV)

if (!isDev && !envUrl) {
  throw new Error('VITE_API_URL is required for production builds.')
}

export const API_BASE_URL: string =
  (envUrl ? envUrl.replace(/\/+$/, '') : '') || (isDev ? '' : DEFAULT_API_URL)

/**
 * Retrieves stored JWT auth token from localStorage or sessionStorage.
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('_lumiere_auth_token') || sessionStorage.getItem('_lumiere_auth_token')
}

// Global 401 Interceptor: Intercept window.fetch and emit 'lumiere:unauthorized' event when backend returns HTTP 401
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch
  window.fetch = async function (...args) {
    const res = await originalFetch.apply(this, args)
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent('lumiere:unauthorized'))
    }
    return res
  }
}

