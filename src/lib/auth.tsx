import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { womModuleAccessLevel } from './rbac'
import { API_BASE_URL } from './apiConfig'
import { useIdleTimeout } from './useIdleTimeout'

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
  subRole?: WomSubRole
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
      token: data.token,
    }
  }

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
      token: data.token,
    }
  }

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

export const MANNING_OFFICER_SUBROLE: WomSubRole = 'Manning Officer'
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
  setConfirmLogout: (val: boolean) => void
  hasConfirmationPin: boolean
  verifyConfirmationPin: (pin: string) => Promise<boolean>
  setConfirmationPin: (pin: string) => Promise<boolean>
  verifyPassword: (password: string) => Promise<boolean>
  refetchHasPin: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function getInitialHasPin(): boolean {
  if (typeof window === 'undefined') return true
  const { rawUser } = getStoredAuth()
  if (!rawUser) return true
  try {
    const parsed = JSON.parse(rawUser) as PortalAccount
    const emailKey = (parsed.email || '').trim().toLowerCase()
    if (emailKey && localStorage.getItem(`_lumiere_has_pin_${emailKey}`) === 'true') {
      return true
    }
    if (localStorage.getItem('_lumiere_has_pin_global') === 'true') {
      return true
    }
  } catch {}
  return true
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<PortalAccount | null>(null)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [hasConfirmationPin, setHasConfirmationPin] = useState<boolean>(getInitialHasPin)

  const logout = useCallback(() => {
    clearStoredAuth()
    setCurrentUser(null)
    setConfirmLogout(false)
    setHasConfirmationPin(false)
  }, [])

  useIdleTimeout(logout, Boolean(currentUser))

  const checkHasPin = useCallback(async (token?: string, userEmail?: string) => {
    const emailKey = (userEmail || currentUser?.email || '').trim().toLowerCase()
    if (emailKey && localStorage.getItem(`_lumiere_has_pin_${emailKey}`) === 'true') {
      setHasConfirmationPin(true)
      return true
    }
    if (localStorage.getItem('_lumiere_has_pin_global') === 'true') {
      setHasConfirmationPin(true)
      return true
    }

    const t = token || getStoredAuth().rawToken || currentUser?.token
    if (!t) return true

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 600)
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/has-pin`, {
        headers: { Authorization: `Bearer ${t}` },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if (res.ok) {
        const data = await res.json()
        const has = Boolean(data.hasPin ?? data.HasPin)
        if (has) {
          if (emailKey) localStorage.setItem(`_lumiere_has_pin_${emailKey}`, 'true')
          localStorage.setItem('_lumiere_has_pin_global', 'true')
          setHasConfirmationPin(true)
        }
        return has
      }
    } catch {
      clearTimeout(timeoutId)
    }
    return true
  }, [currentUser?.email, currentUser?.token])

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

        const normalized = {
          ...parsed,
          portal: inferPortal(parsed),
        }
        setCurrentUser(normalized)
        const storage = isSession ? sessionStorage : localStorage
        storage.setItem('_lumiere_auth_user', JSON.stringify(normalized))
        storage.setItem('_lumiere_auth_portal', normalized.portal)

        const emailKey = normalized.email.trim().toLowerCase()
        if (emailKey && localStorage.getItem(`_lumiere_has_pin_${emailKey}`) === 'true') {
          setHasConfirmationPin(true)
        } else if (localStorage.getItem('_lumiere_has_pin_global') === 'true') {
          setHasConfirmationPin(true)
        } else {
          void checkHasPin(token || undefined, emailKey)
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
      } catch (err) {
        console.warn('[Auth] REST API login failed:', err)
      }

      return { ok: false, reason: 'invalid' }
    },
    [checkHasPin]
  )

  const changePassword = useCallback(
    async (current: string, next: string) => {
      if (!currentUser) return false
      try {
        const token = currentUser.token || getStoredAuth().rawToken
        if (token) {
          const res = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              currentPassword: current,
              newPassword: next,
            }),
          })
          if (!res.ok) {
            console.warn('[Auth] change-password returned status', res.status)
            return false
          }
          const data = await res.json()
          const newToken = data.token || token

          const updated = { ...currentUser, temporaryPassword: false, token: newToken }
          setCurrentUser(updated)
          const { isSession } = getStoredAuth()
          const storage = isSession ? sessionStorage : localStorage
          storage.setItem('_lumiere_auth_user', JSON.stringify(updated))
          if (data.token) {
            storage.setItem('_lumiere_auth_token', data.token)
          }
          return true
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
      const emailKey = (currentUser?.email || '').trim().toLowerCase()
      try {
        if (emailKey) {
          localStorage.setItem(`_lumiere_has_pin_${emailKey}`, 'true')
          localStorage.setItem(`_lumiere_pin_${emailKey}`, pin)
        }
        localStorage.setItem('_lumiere_has_pin_global', 'true')
        setHasConfirmationPin(true)
      } catch {}

      const token = currentUser?.token || getStoredAuth().rawToken
      if (token) {
        try {
          await fetch(`${API_BASE_URL}/api/auth/set-pin`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ pin }),
          })
        } catch (err) {
          console.error('[Auth] setConfirmationPin error:', err)
        }
      }
      return true
    },
    [currentUser?.email, currentUser?.token],
  )

  const verifyConfirmationPin = useCallback(
    async (pin: string): Promise<boolean> => {
      const emailKey = (currentUser?.email || '').trim().toLowerCase()
      const storedPin = emailKey ? localStorage.getItem(`_lumiere_pin_${emailKey}`) : null
      if (storedPin && storedPin === pin) {
        return true
      }

      const token = currentUser?.token || getStoredAuth().rawToken
      if (token) {
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
      }
      return storedPin ? storedPin === pin : true
    },
    [currentUser?.email, currentUser?.token],
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
