/**
 * Central configuration for the backend REST API base URL.
 * The preview can run without the separate API service, so an unset URL is
 * represented by an empty string and callers can skip optional API hydration.
 */
const envUrl: string | undefined =
  typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_API_URL as string | undefined) : undefined

export const API_BASE_URL: string = envUrl ? envUrl.replace(/\/+$/, '') : ''

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

