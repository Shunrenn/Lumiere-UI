import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Route } from '@/lib/types'
import { VALID_ROUTES } from '@/lib/route-guard'

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
  navigate: (route: Route, intent?: NavIntent | null, options?: { replace?: boolean }) => void
  intent: NavIntent | null
  clearIntent: () => void
}

const NavContext = createContext<NavContextValue | null>(null)

export function parseRouteFromUrl(): Route | null {
  if (typeof window === 'undefined') return null
  const searchParams = new URLSearchParams(window.location.search)
  const param = searchParams.get('route')
  const moduleParam = searchParams.get('module')?.toLowerCase().trim()
  const rawPath = window.location.pathname.trim().replace(/^\/+|\/+$/g, '')

  if (rawPath === 'overview' && moduleParam === 'vendors') {
    window.history.replaceState({ route: 'vendors' }, '', '/vendors')
    return 'vendors'
  }

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
  const [route, setRoute] = useState<Route>(initialRoute)
  const [intent, setIntent] = useState<NavIntent | null>(null)

  // Keep internal state aligned if initialRoute is changed by the gate
  useEffect(() => {
    setRoute(initialRoute)
  }, [initialRoute])

  // Keep browser address bar in sync with initial route on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const targetPath = `/${initialRoute}`
      if (window.location.pathname !== targetPath) {
        window.history.replaceState({ route: initialRoute }, '', targetPath)
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

  const navigate = useCallback(
    (next: Route, nextIntent: NavIntent | null = null, options?: { replace?: boolean }) => {
      setIntent(nextIntent)
      setRoute(next)
      if (typeof window !== 'undefined') {
        const targetPath = `/${next}`
        if (options?.replace) {
          window.history.replaceState({ route: next }, '', targetPath)
        } else if (window.location.pathname !== targetPath) {
          window.history.pushState({ route: next }, '', targetPath)
        }
      }
    },
    [],
  )

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
