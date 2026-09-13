/**
 * Central configuration for backend REST API base URL.
 * Uses `import.meta.env.VITE_API_URL` when specified.
 * Defaults to 'http://localhost:8080' in development mode only — never in production builds.
 */
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ||
  (import.meta.env.DEV ? 'http://localhost:8080' : '')
