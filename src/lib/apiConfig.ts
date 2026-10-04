/**
 * Central configuration for backend REST API base URL.
 * Uses `import.meta.env.VITE_API_URL` when specified.
 * Defaults to 'http://localhost:8080' in development mode only — never in production builds.
 */
const envUrl: string | undefined =
  typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_API_URL as string | undefined) : undefined
const isDev: boolean =
  typeof import.meta !== 'undefined' ? Boolean(import.meta.env?.DEV) : false

if (!isDev && !envUrl) {
  throw new Error('VITE_API_URL is required for production builds.')
}

export const API_BASE_URL: string =
  (envUrl ? envUrl.replace(/\/+$/, '') : '') || (isDev ? 'http://localhost:8080' : '')

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

