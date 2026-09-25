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
import type { GroundCrewSubRoleWire } from './types'
import { GROUND_CREW_SUBROLE_MAP, womModuleAccessLevel, type AccessLevel } from './rbac'
import { API_BASE_URL } from './apiConfig'
import { useIdleTimeout } from './useIdleTimeout'
import type { UserRouteContext } from './allowedRoutes'

// Shared helper — validates that an unknown JWT claim value is a known wire
// key or legacy display string and returns the typed value, or undefined for absent/invalid input.
function parseGroundCrewSubRole(raw: unknown): GroundCrewSubRoleWire | undefined {
  if (typeof raw !== 'string') return undefined
  if (Object.hasOwn(GROUND_CREW_SUBROLE_MAP, raw)) return raw as GroundCrewSubRoleWire
  // Legacy string mappings
  if (raw === 'Warehouse Lead' || raw === 'Warehouse Member') return 'Warehouse'
  if (raw === 'Field & Production Crew') return 'Field'
  return undefined
}

export type WomSubRole =
  | 'Manning Officer'
  | 'Warehouse Manager'
  | 'Production Manager'
  | 'Inventory Officer'
  | 'Purchasing Officer'

const WOM_WIRE_TO_SUBROLE: Record<string, WomSubRole> = {
  ManningOfficer: 'Manning Officer',
  WarehouseManager: 'Warehouse Manager',
  ProductionManager: 'Production Manager',
  InventoryOfficer: 'Inventory Officer',
  PurchasingOfficer: 'Purchasing Officer',
  'Manning Officer': 'Manning Officer',
  'Warehouse Manager': 'Warehouse Manager',
  'Production Manager': 'Production Manager',
  'Inventory Officer': 'Inventory Officer',
  'Purchasing Officer': 'Purchasing Officer',
}

function parseWomSubRole(raw: unknown): WomSubRole | undefined {
  if (typeof raw !== 'string') return undefined
  return WOM_WIRE_TO_SUBROLE[raw]
}

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
  subRole?: WomSubRole
  groundCrewSubRole?: GroundCrewSubRoleWire
  fullWarehouseAccess?: boolean
  temporaryPassword: boolean
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

  let jwtPayload: Record<string, any> | null = null
  if (data.token) {
    jwtPayload = parseJwtPayload(data.token)
  }

  // Parse WOM Sub-Role from JWT claim or rawRole (supports wire format & legacy display name)
  const claimedWomSubRole = parseWomSubRole(
    jwtPayload?.wom_subrole ?? (rawRole !== 'Warehouse Operations Manager' ? rawRole : undefined)
  )

  // WOM parent status requires an EXPLICIT positive marker:
  // Either explicit JWT claim 'wom_parent' === true or (rawRole === 'Warehouse Operations Manager' AND no sub-role claim).
  const hasExplicitWomParentMarker =
    Boolean(jwtPayload?.wom_parent ?? jwtPayload?.is_wom_parent) ||
    (rawRole === 'Warehouse Operations Manager' && !claimedWomSubRole)

  if (hasExplicitWomParentMarker) {
    return {
      id: data.userId,
      email: data.email,
      name: data.fullName,
      role: 'Warehouse Operations Manager',
      fullWarehouseAccess: true,
      subRole: undefined,
      portal: 'web',
      temporaryPassword: isTemp,
      token: data.token,
    }
  }

  const womSubRolesPortal: Record<WomSubRole, PortalKind> = {
    'Manning Officer': 'web',
    'Warehouse Manager': 'web',
    'Production Manager': 'web',
    'Inventory Officer': 'web',
    'Purchasing Officer': 'web',
  }

  if (claimedWomSubRole) {
    return {
      id: data.userId,
      email: data.email,
      name: data.fullName,
      role: 'Warehouse Operations Manager',
      subRole: claimedWomSubRole,
      fullWarehouseAccess: false,
      portal: womSubRolesPortal[claimedWomSubRole],
      temporaryPassword: isTemp,
      token: data.token,
    }
  }

  // Legacy role mapping for Ground Crew cohorts
  let effectiveRole = rawRole
  let groundCrewSubRole = parseGroundCrewSubRole(jwtPayload?.ground_crew_subrole)

  if (rawRole === 'Warehouse Lead' || rawRole === 'Warehouse Member') {
    effectiveRole = 'Ground Crew'
    if (!groundCrewSubRole) groundCrewSubRole = 'Warehouse'
  } else if (rawRole === 'Field & Production Crew') {
    effectiveRole = 'Ground Crew'
    if (!groundCrewSubRole) groundCrewSubRole = 'Field' // Safe interim mapping to Field
  } else if (rawRole === 'Ground Crew') {
    effectiveRole = 'Ground Crew'
    if (!groundCrewSubRole && jwtPayload?.ground_crew_subrole) {
      groundCrewSubRole = parseGroundCrewSubRole(jwtPayload.ground_crew_subrole)
    }
  }

  const pwaRoles = new Set(['Ground Crew', 'Warehouse Lead', 'Warehouse Member', 'Event Admin'])
  const portal: PortalKind = pwaRoles.has(effectiveRole) || pwaRoles.has(rawRole) ? 'pwa' : 'web'

  return {
    id: data.userId,
    email: data.email,
    name: data.fullName,
    role: effectiveRole,
    portal,
    groundCrewSubRole,
    fullWarehouseAccess: false,
    temporaryPassword: isTemp,
    token: data.token,
  }
}

export const MANNING_OFFICER_SUBROLE: WomSubRole = 'Manning Officer'
export const EXECUTIVE_LOGIN_EMAILS = ['executive@lumiere.com']

export function buildUserRouteContext(currentUser: PortalAccount | null): Required<UserRouteContext> {
  return {
    isAdmin: Boolean(currentUser?.role === 'Admin'),
    isExecutive: Boolean(currentUser?.role === 'Executive'),
    isWarehouse: Boolean(currentUser?.role === 'Warehouse Operations Manager'),
    isPlanner: Boolean(currentUser?.role === 'Event Planner'),
    isGroundCrew: Boolean(currentUser?.role === 'Ground Crew' && !currentUser?.groundCrewSubRole),
    isGroundCrewWarehouse: Boolean(currentUser?.role === 'Ground Crew' && currentUser?.groundCrewSubRole === 'Warehouse'),
    isGroundCrewField: Boolean(currentUser?.role === 'Ground Crew' && currentUser?.groundCrewSubRole === 'Field'),
    isGroundCrewInventory: Boolean(currentUser?.role === 'Ground Crew' && currentUser?.groundCrewSubRole === 'Inventory'),
    isGroundCrewProduction: Boolean(currentUser?.role === 'Ground Crew' && currentUser?.groundCrewSubRole === 'Production'),
    isGroundCrewEventAdmin: Boolean(currentUser?.role === 'Ground Crew' && currentUser?.groundCrewSubRole === 'EventAdmin'),
    isManningOfficer: Boolean(currentUser?.subRole === MANNING_OFFICER_SUBROLE),
    isProductionManager: Boolean(currentUser?.subRole === 'Production Manager'),
    isInventoryOfficer: Boolean(currentUser?.subRole === 'Inventory Officer'),
    hasFullWarehouseAccess: Boolean(currentUser?.fullWarehouseAccess),
  }
}

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
  userId: string
  adminName: string
  adminRole: string
  adminEmail: string
  portal: PortalKind | null
  isAdmin: boolean
  isExecutive: boolean
  isWarehouse: boolean
  isPlanner: boolean
  isGroundCrew: boolean
  isGroundCrewWarehouse: boolean
  isGroundCrewField: boolean
  isGroundCrewInventory: boolean
  isGroundCrewProduction: boolean
  isGroundCrewEventAdmin: boolean
  subRole: string
  groundCrewSubRole?: GroundCrewSubRoleWire
  hasFullWarehouseAccess: boolean
  isManningOfficer: boolean
  isProductionManager: boolean
  isInventoryOfficer: boolean
  getModuleAccessLevel: (moduleId: string) => AccessLevel
  canModifyModule: (moduleId: string) => boolean
  canInteractModule: (moduleId: string) => boolean
  isTempPassword: boolean
  login: (email: string, password: string, portal?: PortalKind, remember?: boolean) => Promise<{ ok: boolean; reason?: 'wrong-portal' | 'invalid' }>
  changePassword: (current: string, next: string) => Promise<boolean>
  logout: () => void
  confirmLogout: boolean
  setConfirmLogout: (val: boolean) => void
  hasConfirmationPin: boolean
  verifyConfirmationPin: (pin: string) => Promise<boolean>
  setConfirmationPin: (pin: string) => Promise<boolean>
  verifyPassword: (password: string) => Promise<boolean>
  refetchHasPin: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<PortalAccount | null>(null)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [hasConfirmationPin, setHasConfirmationPin] = useState<boolean>(false)

  const logout = useCallback(() => {
    clearStoredAuth()
    setCurrentUser(null)
    setConfirmLogout(false)
    setHasConfirmationPin(false)
  }, [])

  useIdleTimeout(logout, Boolean(currentUser))

  const checkHasPin = useCallback(async (token?: string) => {
    const t = token || getStoredAuth().rawToken || currentUser?.token
    if (!t) return false
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/has-pin`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (res.ok) {
        const data = await res.json()
        const has = Boolean(data.hasPin ?? data.HasPin)
        setHasConfirmationPin(has)
        return has
      }
    } catch (err) {
      console.error('[Auth] error checking has-pin:', err)
    }
    return false
  }, [currentUser?.token])

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

        let groundCrewSubRole = parseGroundCrewSubRole(parsed.groundCrewSubRole)
        if (!groundCrewSubRole && token) {
          const payload = parseJwtPayload(token)
          groundCrewSubRole = parseGroundCrewSubRole(payload?.ground_crew_subrole)
        }

        const normalized: PortalAccount = {
          ...parsed,
          groundCrewSubRole,
          portal: inferPortal(parsed),
        }
        setCurrentUser(normalized)
        const storage = isSession ? sessionStorage : localStorage
        storage.setItem('_lumiere_auth_user', JSON.stringify(normalized))
        storage.setItem('_lumiere_auth_portal', normalized.portal)

        if (token) {
          checkHasPin(token)
        }
      } catch {
        clearStoredAuth()
        setCurrentUser(null)
      }
    }
  }, [checkHasPin])

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
            await checkHasPin(data.token)
          }
          return { ok: true }
        }

        return { ok: false, reason: 'invalid' }
      } catch (err) {
        console.error('[Auth] Login error:', err)
        return { ok: false, reason: 'invalid' }
      }
    },
    [checkHasPin]
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

  const setConfirmationPin = useCallback(
    async (pin: string): Promise<boolean> => {
      const token = currentUser?.token || getStoredAuth().rawToken
      if (!token) return false
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/set-pin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ pin }),
        })
        if (res.ok) {
          setHasConfirmationPin(true)
          return true
        }
      } catch (err) {
        console.error('[Auth] setConfirmationPin error:', err)
      }
      return false
    },
    [currentUser?.token],
  )

  const verifyConfirmationPin = useCallback(
    async (pin: string): Promise<boolean> => {
      const token = currentUser?.token || getStoredAuth().rawToken
      if (!token) return false
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/verify-pin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ pin }),
        })
        if (res.ok) {
          const data = await res.json()
          return Boolean(data.valid ?? data.Valid)
        }
      } catch (err) {
        console.error('[Auth] verifyConfirmationPin error:', err)
      }
      return false
    },
    [currentUser?.token],
  )

  const routeContext = useMemo(() => buildUserRouteContext(currentUser), [currentUser])

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(currentUser),
      userId: currentUser?.id ?? '',
      adminName: currentUser?.name ?? '',
      adminRole: currentUser?.role ?? '',
      adminEmail: currentUser?.email ?? '',
      portal: currentUser?.portal ?? null,
      ...routeContext,
      subRole: currentUser?.subRole ?? '',
      groundCrewSubRole: currentUser?.groundCrewSubRole,
      getModuleAccessLevel: (moduleId: string): AccessLevel => {
        if (currentUser?.fullWarehouseAccess || !currentUser?.subRole) return 'Modify'
        return womModuleAccessLevel(currentUser.subRole, moduleId)
      },
      canModifyModule: (moduleId: string) => {
        if (currentUser?.fullWarehouseAccess || !currentUser?.subRole) return true
        return womModuleAccessLevel(currentUser.subRole, moduleId) === 'Modify'
      },
      canInteractModule: (moduleId: string) => {
        if (currentUser?.fullWarehouseAccess || !currentUser?.subRole) return true
        const level = womModuleAccessLevel(currentUser.subRole, moduleId)
        return level === 'Modify' || level === 'Interact'
      },
      isTempPassword: currentUser?.temporaryPassword ?? false,
      login,
      changePassword,
      logout,
      confirmLogout,
      setConfirmLogout,
      hasConfirmationPin,
      verifyConfirmationPin,
      setConfirmationPin,
      verifyPassword,
      refetchHasPin: checkHasPin,
    }),
    [
      currentUser,
      login,
      changePassword,
      logout,
      confirmLogout,
      hasConfirmationPin,
      verifyConfirmationPin,
      setConfirmationPin,
      verifyPassword,
      checkHasPin,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
