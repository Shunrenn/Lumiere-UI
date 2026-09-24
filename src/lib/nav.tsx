import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Route } from '@/lib/types'

// A cross-page instruction: navigating from a dashboard "Open" button can
// carry an intent that the destination page consumes to auto-trigger an action
// (e.g. open a confirmation dialog or a detail modal).
export interface NavIntent {
  kind:
    | 'unlock-user'
    | 'add-user'
    | 'view-event'
    | 'review-damage'
    | 'reorder-asset'
    | 'configure-subrole'
  payload?: any
}

interface NavContextValue {
  route: Route
  navigate: (route: Route, intent?: NavIntent | null) => void
  intent: NavIntent | null
  clearIntent: () => void
}

const NavContext = createContext<NavContextValue | null>(null)

const VALID_ROUTES = new Set<Route>([
  'overview',
  'workforce',
  'dashboard',
  'registry',
  'logs',
  'security-audit',
  'rbac',
  'damage',
  'replenishment',
  'inventory',
  'warehouse-logs',
  'crew',
  'deployments',
  'dispatch',
  'event-detail',
  'canvas',
  'canvas-workspace',
  'field-ops',
  'warehouse-lead',
  'warehouse-member',
  'manning',
  'production-manager',
  'inventory-officer',
])

export function parseRouteFromUrl(): Route | null {
  if (typeof window === 'undefined') return null
  const param = new URLSearchParams(window.location.search).get('route')
  const rawPath = window.location.pathname.trim().replace(/^\/+|\/+$/g, '')
  const candidate = (param || rawPath) as Route
  return VALID_ROUTES.has(candidate) ? candidate : null
}

export function NavProvider({
  children,
  initialRoute = 'overview',
}: {
  children: ReactNode
  initialRoute?: Route
}) {
  const [route, setRoute] = useState<Route>(() => parseRouteFromUrl() || initialRoute)
  const [intent, setIntent] = useState<NavIntent | null>(null)

  // Keep browser address bar in sync with initial route on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const activeRoute = parseRouteFromUrl() || initialRoute
      const targetPath = `/${activeRoute}`
      if (window.location.pathname !== targetPath) {
        window.history.replaceState({ route: activeRoute }, '', targetPath)
      }
    }
  }, [initialRoute])

  // Handle browser Back & Forward button navigation
  useEffect(() => {
    const handleLocationChange = () => {
      const matched = parseRouteFromUrl()
      if (matched) {
        setRoute(matched)
      }
    }
    window.addEventListener('popstate', handleLocationChange)
    window.addEventListener('nav-change', handleLocationChange)
    return () => {
      window.removeEventListener('popstate', handleLocationChange)
      window.removeEventListener('nav-change', handleLocationChange)
    }
  }, [])

  const navigate = useCallback((next: Route, nextIntent: NavIntent | null = null) => {
    setIntent(nextIntent)
    setRoute(next)
    if (typeof window !== 'undefined') {
      const targetPath = `/${next}`
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ route: next }, '', targetPath)
      }
    }
  }, [])

  const clearIntent = useCallback(() => setIntent(null), [])

  const value = useMemo(
    () => ({ route, navigate, intent, clearIntent }),
    [route, navigate, intent, clearIntent],
  )
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}

export function useNav() {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used within a NavProvider')
  return ctx
}
