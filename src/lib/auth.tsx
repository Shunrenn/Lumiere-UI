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
  // Per-account 6-digit confirmation PIN gating high-stakes actions (e.g.
  // creating/deleting an RBAC sub-role). Undefined until the account
  // completes first-time PIN setup — every admin (including seed/mock
  // accounts) goes through the same real setup flow, nothing is
  // pre-seeded.
  confirmationPinHash?: string
}

// WOM sub-role that has visibility rights to full crew detail. Everyone else
// in the Warehouse Operations Manager account type gets the muted restricted
// state in the Manning/Crew person-info modal.
export const MANNING_OFFICER_SUBROLE: WomSubRole = 'Manning Officer'

// The two Executive login accounts. Damage Validation's two-sign-off rule for
// audit-held exceptions checks this list (cross-referenced against each
// account's live Workforce Management suspension state) to determine whether
// a second, distinct Executive is currently available to sign off.
export const EXECUTIVE_LOGIN_EMAILS = ['executive@lumiere.com', 'executive2@lumiere.com']

// Hardcoded mock demo accounts — always available as fallback
const MOCK_ACCOUNTS: Record<string, PortalAccount> = {
  'admin@lumiere.com': {
    id: 'mock-admin-001',
    email: 'admin@lumiere.com',
    name: 'Admin User',
    role: 'Admin',
    portal: 'web',
    temporaryPassword: false,
  },
  'executive@lumiere.com': {
    id: 'mock-executive-001',
    email: 'executive@lumiere.com',
    name: 'Adrienne Devereux',
    role: 'Executive',
    portal: 'web',
    temporaryPassword: false,
  },
  // Second Executive account — required alongside the first to resolve a
  // Damage Validation exception held for audit (two-sign-off rule).
  'executive2@lumiere.com': {
    id: 'mock-executive-002',
    email: 'executive2@lumiere.com',
    name: 'Marcus Whitfield',
    role: 'Executive',
    portal: 'web',
    temporaryPassword: false,
  },
  // Warehouse Ops Manager — the full-access super-account. No subRole: it is
  // not restricted to any one sub-role's scope and can see/do everything
  // across all WOM modules and sub-role domains.
  'warehouseops@lumiere.com': {
    id: 'mock-warehouse-001',
    email: 'warehouseops@lumiere.com',
    name: 'Warehouse Ops Manager',
    role: 'Warehouse Manager',
    portal: 'web',
    fullWarehouseAccess: true,
    temporaryPassword: false,
  },
  // The five sub-role accounts — each restricted to exactly what its RBAC
  // sub-role scope allows (see rbac.ts WOM_SUBROLES).
  'manning@lumiere.com': {
    id: 'mock-warehouse-002',
    email: 'manning@lumiere.com',
    name: 'Manning Officer',
    role: 'Warehouse Manager',
    portal: 'pwa',
    subRole: 'Manning Officer',
    temporaryPassword: false,
  },
  'warehouse@lumiere.com': {
    id: 'mock-warehouse-003',
    email: 'warehouse@lumiere.com',
    name: 'Warehouse Manager',
    role: 'Warehouse Manager',
    portal: 'web',
    subRole: 'Warehouse Manager',
    temporaryPassword: false,
  },
  'production@lumiere.com': {
    id: 'mock-warehouse-004',
    email: 'production@lumiere.com',
    name: 'Production Manager',
    role: 'Warehouse Manager',
    portal: 'pwa',
    subRole: 'Production Manager',
    temporaryPassword: false,
  },
  'inventory@lumiere.com': {
    id: 'mock-warehouse-005',
    email: 'inventory@lumiere.com',
    name: 'Inventory Officer',
    role: 'Warehouse Manager',
    portal: 'pwa',
    subRole: 'Inventory Officer',
    temporaryPassword: false,
  },
  'purchasing@lumiere.com': {
    id: 'mock-warehouse-006',
    email: 'purchasing@lumiere.com',
    name: 'Purchasing Officer',
    role: 'Warehouse Manager',
    portal: 'web',
    subRole: 'Purchasing Officer',
    temporaryPassword: false,
  },
  'planner@lumiere.com': {
    id: 'mock-planner-001',
    email: 'planner@lumiere.com',
    name: 'Event Planner',
    role: 'Event Planner',
    portal: 'web',
    temporaryPassword: false,
  },
  'crew@lumiere.com': {
    id: 'mock-crew-001',
    email: 'crew@lumiere.com',
    name: 'Ground Crew',
    role: 'Ground Crew',
    portal: 'pwa',
    temporaryPassword: false,
  },
  'eventadmin@lumiere.com': {
    id: 'mock-eventadmin-001',
    email: 'eventadmin@lumiere.com',
    name: 'Elena Rostova (Event Admin)',
    role: 'Event Admin',
    portal: 'pwa',
    temporaryPassword: false,
  },
  'lead@lumiere.com': {
    id: 'mock-lead-001',
    email: 'lead@lumiere.com',
    name: 'Warehouse Lead',
    role: 'Warehouse Lead',
    portal: 'pwa',
    temporaryPassword: false,
  },
  'member@lumiere.com': {
    id: 'mock-member-001',
    email: 'member@lumiere.com',
    name: 'Warehouse Member',
    role: 'Warehouse Member',
    portal: 'pwa',
    temporaryPassword: false,
  },
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
  // Sub-role of the current account ('' when none, including the full-access
  // Warehouse Ops Manager super-account).
  subRole: string
  // Warehouse Ops Manager super-account — full, unrestricted WOM access.
  hasFullWarehouseAccess: boolean
  // WOM Manning Officer sub-role — has full crew-detail visibility rights.
  isManningOfficer: boolean
  // WOM Production Manager sub-role — may approve/reject production runs.
  isProductionManager: boolean
  isInventoryOfficer: boolean
  // True when the current account may Modify the given operational module id
  // (per its RBAC sub-role scope, or always for the full-access account).
  canModifyModule: (moduleId: string) => boolean
  isTempPassword: boolean
  login: (email: string, password: string, portal?: PortalKind) => Promise<{ ok: boolean; reason?: 'wrong-portal' | 'invalid' }>
  changePassword: (current: string, next: string) => Promise<boolean>
  logout: () => void
  confirmLogout: boolean
  setConfirmLogout: (value: boolean) => void
  // Whether the current account has completed first-time PIN setup yet.
  hasConfirmationPin: boolean
  // Checks a 6-digit PIN against the current account's stored PIN.
  verifyConfirmationPin: (pin: string) => boolean
  // Sets the PIN for the first time, or overwrites it (used by both
  // first-time setup and the post-password-reset flow). No "current PIN"
  // check here — callers gate this themselves (first-time = nothing to
  // check; reset = already gated by verifyPassword).
  setConfirmationPin: (pin: string) => void
  // Re-verifies the current account's login password (used by "Forgot
  // PIN?" as the re-authentication step). Distinct from changePassword,
  // which also mutates the password.
  verifyPassword: (password: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<PortalAccount | null>(null)
  const [confirmLogout, setConfirmLogout] = useState(false)

  // On mount, check if there's a cached login in localStorage
  useEffect(() => {
    const cached = localStorage.getItem('_lumiere_auth_user')
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as PortalAccount
        const normalized = { ...parsed, portal: inferPortal(parsed) }
        setCurrentUser(normalized)
        localStorage.setItem('_lumiere_auth_user', JSON.stringify(normalized))
        localStorage.setItem('_lumiere_auth_portal', normalized.portal)
      } catch {
        localStorage.removeItem('_lumiere_auth_user')
      }
    }
  }, [])

  const login = useCallback(async (email: string, password: string, portal?: PortalKind): Promise<{ ok: boolean; reason?: 'wrong-portal' | 'invalid' }> => {
    const normalizedEmail = email.trim().toLowerCase()
    
    try {
      // First, check if credentials match a hardcoded mock account (password: lumiere2026)
      const mockAccount = MOCK_ACCOUNTS[normalizedEmail]
      if (mockAccount && password === 'lumiere2026') {
        if (portal && mockAccount.portal !== portal) return { ok: false, reason: 'wrong-portal' }
        setCurrentUser(mockAccount)
        localStorage.setItem('_lumiere_auth_user', JSON.stringify(mockAccount))
        localStorage.setItem('_lumiere_auth_portal', mockAccount.portal)
        return { ok: true }
      }

      // Fall back to querying Supabase database
      const { data, error } = await supabase
        .from('portal_accounts')
        .select('id, email, name, role, temporary_password')
        .eq('email', normalizedEmail)
        .eq('password_hash', password)
        .single()

      if (error || !data) {
        return { ok: false, reason: 'invalid' }
      }

      const inferredPortal: PortalKind = PWA_ROLES.has(data.role) ? 'pwa' : 'web'
      if (portal && inferredPortal !== portal) return { ok: false, reason: 'wrong-portal' }
      const user: PortalAccount = {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        temporaryPassword: data.temporary_password,
        portal: inferredPortal,
      }

      setCurrentUser(user)
      localStorage.setItem('_lumiere_auth_user', JSON.stringify(user))
      localStorage.setItem('_lumiere_auth_portal', user.portal)
      return { ok: true }
    } catch (err) {
      console.error('[v0] Login error:', err)
      return { ok: false, reason: 'invalid' }
    }
  }, [])

  const changePassword = useCallback(
    async (current: string, next: string) => {
      if (!currentUser) return false
      try {
        // Verify current password
        const { data: verify, error: verifyError } = await supabase
          .from('portal_accounts')
          .select('id')
          .eq('id', currentUser.id)
          .eq('password_hash', current)
          .single()

        if (verifyError || !verify) {
          return false
        }

        // Update password and clear temporary flag
        const { error } = await supabase
          .from('portal_accounts')
          .update({ password_hash: next, temporary_password: false })
          .eq('id', currentUser.id)

        if (error) {
          return false
        }

        // Update local state
        const updated = { ...currentUser, temporaryPassword: false }
        setCurrentUser(updated)
        localStorage.setItem('_lumiere_auth_user', JSON.stringify(updated))
        return true
      } catch (err) {
        console.error('[v0] Password change error:', err)
        return false
      }
    },
    [currentUser],
  )

  const logout = useCallback(() => {
    setCurrentUser(null)
    localStorage.removeItem('_lumiere_auth_user')
    localStorage.removeItem('_lumiere_auth_portal')
  }, [])

  // Verifies the current account's login password without changing it.
  // Used as the re-authentication step for "Forgot PIN?" — deliberately has
  // no retry lockout of its own (see AdminTopBar): the same password can
  // already be tried at the login screen, which also has no lockout, so
  // adding one only here would add friction without real security benefit.
  const verifyPassword = useCallback(
    async (password: string) => {
      if (!currentUser) return false
      try {
        const mockAccount = MOCK_ACCOUNTS[currentUser.email]
        if (mockAccount) {
          return password === 'lumiere2026'
        }
        const { data, error } = await supabase
          .from('portal_accounts')
          .select('id')
          .eq('id', currentUser.id)
          .eq('password_hash', password)
          .single()
        return !error && !!data
      } catch (err) {
        console.error('[v0] Password verify error:', err)
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
      localStorage.setItem('_lumiere_auth_user', JSON.stringify(updated))
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
