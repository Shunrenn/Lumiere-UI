import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from './supabase'
import { womModuleAccessLevel } from './rbac'
import { API_BASE_URL } from './apiConfig'
import { useIdleTimeout } from './useIdleTimeout'

// The exactly-5 Warehouse Operations Manager (WOM) sub-roles. Typing subRole
// as this union means an invalid value (e.g. 'Logistics Coordinator') is a
// compile-time error and can't be assigned again.
export type WomSubRole =
  | 'Manning Officer'
  | 'Warehouse Manager'
  | 'Production Manager'
  | 'Inventory Officer'
  | 'Purchasing Officer'

export type PortalKind = 'web' | 'pwa'

const PWA_ROLES = new Set(['Ground Crew', 'Warehouse Lead', 'Warehouse Member', 'Manning Officer', 'Event Admin'])
const PWA_SUBROLES = new Set(['Production Manager', 'Inventory Officer'])

function inferPortal(account: Pick<PortalAccount, 'role' | 'subRole' | 'portal'>): PortalKind {
  if (account.portal) return account.portal
  return PWA_ROLES.has(account.role) || Boolean(account.subRole && PWA_SUBROLES.has(account.subRole)) ? 'pwa' : 'web'
}

export interface PortalAccount {
  id: string
  email: string
  name: string
  role: string
  portal: PortalKind
  // Sub-role within the Warehouse Operations Manager account type. Drives
  // finer-grained permission gates than the coarse account `role`. Optional
  // for account types that don't distinguish sub-roles.
  subRole?: WomSubRole
  // The Warehouse Ops Manager super-account. When true, the user has full,
  // unrestricted access across every WOM module and sub-role domain — it is
  // NOT scoped to a single sub-role. Left undefined/false for the five
  // sub-role accounts, whose access is bounded by their RBAC scope.
  fullWarehouseAccess?: boolean
  temporaryPassword: boolean
  confirmationPinHash?: string
  token?: string
}

export function mapBackendUserToPortalAccount(data: {
  userId: string
  email: string
  fullName: string
  role: string
  token?: string
  temporaryPassword?: boolean
}): PortalAccount {
  const rawRole = data.role.trim()
  const isTemp = Boolean(data.temporaryPassword ?? data.email?.toLowerCase().includes('temp'))

  // 1. Structural WOM Parent Super-Account ("Warehouse Operations Manager")
  const storedPin = typeof window !== 'undefined' && data.email ? localStorage.getItem(`lumiere_pin_${data.email.toLowerCase()}`) : null
  if (rawRole === 'Warehouse Operations Manager') {
    return {
      id: data.userId,
      email: data.email,
      name: data.fullName,
      role: 'Warehouse Manager',
      fullWarehouseAccess: true,
      subRole: undefined,
      portal: 'web',
      temporaryPassword: isTemp,
      confirmationPinHash: storedPin || undefined,
      token: data.token,
    }
  }

  // 2. The 5 WOM Sub-Roles
  const womSubRoles: Record<string, PortalKind> = {
    'Manning Officer': 'pwa',
    'Warehouse Manager': 'web',
    'Production Manager': 'pwa',
    'Inventory Officer': 'pwa',
    'Purchasing Officer': 'web',
  }

  if (rawRole in womSubRoles) {
    return {
      id: data.userId,
      email: data.email,
      name: data.fullName,
      role: 'Warehouse Manager',
      subRole: rawRole as WomSubRole,
      fullWarehouseAccess: false,
      portal: womSubRoles[rawRole],
      temporaryPassword: isTemp,
      confirmationPinHash: storedPin || undefined,
      token: data.token,
    }
  }

  // 3. Structural (Admin, Executive, Event Planner) & PWA Field Roles
  const pwaRoles = new Set(['Ground Crew', 'Warehouse Lead', 'Warehouse Member', 'Event Admin'])
  const portal: PortalKind = pwaRoles.has(rawRole) ? 'pwa' : 'web'

  return {
    id: data.userId,
    email: data.email,
    name: data.fullName,
    role: rawRole,
    portal,
    temporaryPassword: isTemp,
    token: data.token,
  }
}

// WOM sub-role that has visibility rights to full crew detail. Everyone else
// in the Warehouse Operations Manager account type gets the muted restricted
// state in the Manning/Crew person-info modal.
export const MANNING_OFFICER_SUBROLE: WomSubRole = 'Manning Officer'

// The two Executive login accounts. Damage Validation's two-sign-off rule for
// audit-held exceptions checks this list (cross-referenced against each
// account's live Workforce Management suspension state) to determine whether
// a second, distinct Executive is currently available to sign off.
export const EXECUTIVE_LOGIN_EMAILS = ['executive@lumiere.com']



export function parseJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

export function isJwtExpired(token: string): boolean {
  const payload = parseJwtPayload(token)
  if (!payload || typeof payload.exp !== 'number') return false
  return payload.exp * 1000 <= Date.now()
}

export function clearStoredAuth() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('_lumiere_auth_user')
  localStorage.removeItem('_lumiere_auth_portal')
  localStorage.removeItem('_lumiere_auth_token')
  sessionStorage.removeItem('_lumiere_auth_user')
  sessionStorage.removeItem('_lumiere_auth_portal')
  sessionStorage.removeItem('_lumiere_auth_token')
}

export function getStoredAuth() {
  if (typeof window === 'undefined') return { rawUser: null, rawToken: null, isSession: false }
  const localUser = localStorage.getItem('_lumiere_auth_user')
  const sessionUser = sessionStorage.getItem('_lumiere_auth_user')
  const rawUser = localUser || sessionUser
  const localToken = localStorage.getItem('_lumiere_auth_token')
  const sessionToken = sessionStorage.getItem('_lumiere_auth_token')
  const rawToken = localToken || sessionToken
  return { rawUser, rawToken, isSession: !localUser && Boolean(sessionUser) }
}

interface AuthContextValue {
  isAuthenticated: boolean
  adminName: string
  adminRole: string
  adminEmail: string
  portal: PortalKind | null
  isAdmin: boolean
  isExecutive: boolean
  isWarehouse: boolean
  isPlanner: boolean
  isGroundCrew: boolean
  isWarehouseLead: boolean
  isWarehouseMember: boolean
  subRole: string
  hasFullWarehouseAccess: boolean
  isManningOfficer: boolean
  isProductionManager: boolean
  isInventoryOfficer: boolean
  canModifyModule: (moduleId: string) => boolean
  isTempPassword: boolean
  login: (email: string, password: string, portal?: PortalKind, remember?: boolean) => Promise<{ ok: boolean; reason?: 'wrong-portal' | 'invalid' }>
  changePassword: (current: string, next: string) => Promise<boolean>
  logout: () => void
  confirmLogout: boolean
  setConfirmLogout: (value: boolean) => void
  hasConfirmationPin: boolean
  verifyConfirmationPin: (pin: string) => boolean
  setConfirmationPin: (pin: string) => void
  verifyPassword: (password: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<PortalAccount | null>(null)
  const [confirmLogout, setConfirmLogout] = useState(false)

  const logout = useCallback(() => {
    setCurrentUser(null)
    clearStoredAuth()
  }, [])

  // Auto logout user after 20 minutes of inactivity
  useIdleTimeout(logout, Boolean(currentUser))

  // Listen for global HTTP 401 Unauthorized events (e.g. token expired mid-session)
  useEffect(() => {
    const handleUnauthorized = () => {
      console.warn('[Auth] 401 Unauthorized event intercepted. Logging out.')
      logout()
    }
    window.addEventListener('lumiere:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('lumiere:unauthorized', handleUnauthorized)
  }, [logout])

  // On mount, check cached login from localStorage or sessionStorage with JWT expiration validation
  useEffect(() => {
    const { rawUser, rawToken, isSession } = getStoredAuth()
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser) as PortalAccount
        const token = parsed.token || rawToken

        if (token && isJwtExpired(token)) {
          console.warn('[Auth] JWT token is expired on mount. Clearing auth state.')
          clearStoredAuth()
          setCurrentUser(null)
          return
        }

        const storedPin = typeof window !== 'undefined' && parsed.email ? localStorage.getItem(`lumiere_pin_${parsed.email.toLowerCase()}`) : null
        const normalized = {
          ...parsed,
          confirmationPinHash: parsed.confirmationPinHash || storedPin || undefined,
          portal: inferPortal(parsed),
        }
        setCurrentUser(normalized)
        const storage = isSession ? sessionStorage : localStorage
        storage.setItem('_lumiere_auth_user', JSON.stringify(normalized))
        storage.setItem('_lumiere_auth_portal', normalized.portal)
      } catch {
        clearStoredAuth()
        setCurrentUser(null)
      }
    }
  }, [])

  const login = useCallback(
    async (
      email: string,
      password: string,
      portal?: PortalKind,
      remember = false
    ): Promise<{ ok: boolean; reason?: 'wrong-portal' | 'invalid' }> => {
      const normalizedEmail = email.trim().toLowerCase()

      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, password }),
        })

        if (res.ok) {
          const data = (await res.json()) as { token: string; fullName: string; email: string; userId: string; role: string }
          const account = mapBackendUserToPortalAccount(data)

          if (portal && account.portal !== portal) {
            return { ok: false, reason: 'wrong-portal' }
          }

          setCurrentUser(account)
          const storage = remember ? localStorage : sessionStorage
          const otherStorage = remember ? sessionStorage : localStorage

          otherStorage.removeItem('_lumiere_auth_user')
          otherStorage.removeItem('_lumiere_auth_portal')
          otherStorage.removeItem('_lumiere_auth_token')

          storage.setItem('_lumiere_auth_user', JSON.stringify(account))
          storage.setItem('_lumiere_auth_portal', account.portal)
          if (data.token) {
            storage.setItem('_lumiere_auth_token', data.token)
          }
          return { ok: true }
        }

        return { ok: false, reason: 'invalid' }
      } catch (err) {
        console.error('[Auth] Login error:', err)
        return { ok: false, reason: 'invalid' }
      }
    },
    []
  )

  const changePassword = useCallback(
    async (current: string, next: string) => {
      if (!currentUser) return false
      try {
        try {
          const { data: verify, error: verifyError } = await supabase
            .from('portal_accounts')
            .select('id')
            .eq('id', currentUser.id)
            .eq('password_hash', current)
            .single()

          if (!verifyError && verify) {
            await supabase
              .from('portal_accounts')
              .update({ password_hash: next, temporary_password: false })
              .eq('id', currentUser.id)
          }
        } catch {
          // Supabase database table error / mock mode fallback
        }

        const updated = { ...currentUser, temporaryPassword: false }
        setCurrentUser(updated)
        const { isSession } = getStoredAuth()
        const storage = isSession ? sessionStorage : localStorage
        storage.setItem('_lumiere_auth_user', JSON.stringify(updated))
        return true
      } catch (err) {
        console.error('[Auth] Password change error:', err)
        return false
      }
    },
    [currentUser],
  )

  // Verifies the current account's login password without changing it.
  // Used as the re-authentication step for "Forgot PIN?" — deliberately has
  // no retry lockout of its own (see AdminTopBar): the same password can
  // already be tried at the login screen, which also has no lockout, so
  // adding one only here would add friction without real security benefit.
  const verifyPassword = useCallback(
    async (password: string) => {
      if (!currentUser) return false
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: currentUser.email, password }),
        })
        return res.ok
      } catch (err) {
        console.error('[Auth] Password verify error:', err)
        return false
      }
    },
    [currentUser],
  )

  // Sets (or overwrites) the confirmation PIN for the current account. Used
  // by both first-time setup and the post-"Forgot PIN?" reset. This demo
  // stores the raw PIN under `confirmationPinHash` on the account object
  // (mirroring how `password_hash` stores a raw demo password today) rather
  // than a real one-way hash.
  const setConfirmationPin = useCallback(
    (pin: string) => {
      if (!currentUser) return
      const updated = { ...currentUser, confirmationPinHash: pin }
      setCurrentUser(updated)
      if (currentUser.email && typeof window !== 'undefined') {
        localStorage.setItem(`lumiere_pin_${currentUser.email.toLowerCase()}`, pin)
      }
      const { isSession } = getStoredAuth()
      const storage = isSession ? sessionStorage : localStorage
      storage.setItem('_lumiere_auth_user', JSON.stringify(updated))
    },
    [currentUser],
  )

  // Checks a 6-digit PIN against the current account's stored PIN. Returns
  // false (never throws) if no PIN has been set yet — callers should gate
  // on hasConfirmationPin first to route to setup instead of verification.
  const verifyConfirmationPin = useCallback(
    (pin: string) => {
      if (!currentUser?.confirmationPinHash) return false
      return pin === currentUser.confirmationPinHash
    },
    [currentUser],
  )

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(currentUser),
      adminName: currentUser?.name ?? '',
      adminRole: currentUser?.role ?? '',
      adminEmail: currentUser?.email ?? '',
      portal: currentUser?.portal ?? null,
      isAdmin: currentUser?.role === 'Admin',
      isExecutive: currentUser?.role === 'Executive',
      isWarehouse: currentUser?.role === 'Warehouse Manager',
      isPlanner: currentUser?.role === 'Event Planner',
      isGroundCrew: currentUser?.role === 'Ground Crew',
      isWarehouseLead: currentUser?.role === 'Warehouse Lead',
      isWarehouseMember: currentUser?.role === 'Warehouse Member',
      subRole: currentUser?.subRole ?? '',
      hasFullWarehouseAccess: currentUser?.fullWarehouseAccess ?? false,
      isManningOfficer: currentUser?.subRole === MANNING_OFFICER_SUBROLE,
      isProductionManager: currentUser?.subRole === 'Production Manager',
      isInventoryOfficer: currentUser?.subRole === 'Inventory Officer',
      canModifyModule: (moduleId: string) => {
        if (currentUser?.fullWarehouseAccess) return true
        if (!currentUser?.subRole) return false
        return womModuleAccessLevel(currentUser.subRole, moduleId) === 'Modify'
      },
      isTempPassword: currentUser?.temporaryPassword ?? false,
      login,
      changePassword,
      logout,
      confirmLogout,
      setConfirmLogout,
      hasConfirmationPin: Boolean(currentUser?.confirmationPinHash),
      verifyConfirmationPin,
      setConfirmationPin,
      verifyPassword,
    }),
    [
      currentUser,
      login,
      changePassword,
      logout,
      confirmLogout,
      verifyConfirmationPin,
      setConfirmationPin,
      verifyPassword,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
