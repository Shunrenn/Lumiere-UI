import { API_BASE_URL, getAuthToken } from './apiConfig'

export interface RoleCapabilityDto {
  roleName: string
  allowAssetInventoryAndAllocation?: boolean
  canAccessAssetInventoryAndAllocation?: boolean
  enabled?: boolean
  [key: string]: unknown
}

export interface AuthCapabilitiesResponse {
  canAccessAssetInventoryAndAllocation: boolean
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

/**
 * GET /api/auth/capabilities
 * Authoritative capability refresh from the backend.
 * Stale browser cache or localStorage must never act as permission authority.
 */
export async function fetchAuthCapabilities(tokenOverride?: string): Promise<{ canAccessAssetInventoryAndAllocation: boolean } | null> {
  const token = tokenOverride || getAuthToken()
  if (!token) return null

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/capabilities`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    if (!res.ok) {
      console.warn(`[capabilitiesApi] GET /api/auth/capabilities returned HTTP ${res.status}`)
      return null
    }
    const data = await res.json()
    const allowed = Boolean(
      data?.canAccessAssetInventoryAndAllocation ??
      data?.CanAccessAssetInventoryAndAllocation ??
      data?.allowAssetInventoryAndAllocation
    )
    return { canAccessAssetInventoryAndAllocation: allowed }
  } catch (err) {
    console.warn('[capabilitiesApi] Failed to fetch auth capabilities from backend:', err)
    return null
  }
}

/**
 * GET /api/admin/permissions/roles
 * Reads authoritative role capability list from Admin RBAC authority.
 */
export async function fetchAdminRolePermissions(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/permissions/roles`, {
      headers: getAuthHeaders(),
    })
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` }
    }
    const data = await res.json()
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network request failed' }
  }
}

/**
 * PUT /api/admin/permissions/roles/{roleName}/asset-capability
 * Mutates role asset capability on the authoritative backend.
 * Body: { enabled: boolean }
 */
export async function updateRoleAssetCapability(
  roleName: string,
  enabled: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/permissions/roles/${encodeURIComponent(roleName)}/asset-capability`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ enabled }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return { success: false, error: errText || `HTTP ${res.status}` }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network request failed' }
  }
}

/**
 * GET /api/admin/permissions/matrix
 * Reads the full permission matrix from the backend authority.
 */
export async function fetchAdminPermissionsMatrix(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/permissions/matrix`, {
      headers: getAuthHeaders(),
    })
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` }
    }
    const data = await res.json()
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network request failed' }
  }
}

/**
 * Normalizes backend response from GET /api/admin/permissions/roles
 * to find the Executive asset capability.
 */
export function extractExecutiveAssetCapability(data: any): boolean | null {
  if (!data) return null

  // Array of roles
  if (Array.isArray(data)) {
    const exec = data.find((r: any) =>
      (r?.roleName || r?.name || r?.role || '').toString().toLowerCase() === 'executive'
    )
    if (exec) {
      const val =
        exec.allowAssetInventoryAndAllocation ??
        exec.canAccessAssetInventoryAndAllocation ??
        exec.enabled ??
        exec.hasAssetCapability
      if (val !== undefined) return Boolean(val)
    }
  }

  // Object keyed by role name
  if (typeof data === 'object') {
    const exec = data.Executive ?? data.executive
    if (exec !== undefined) {
      if (typeof exec === 'boolean') return exec
      if (typeof exec === 'object' && exec !== null) {
        const val =
          exec.allowAssetInventoryAndAllocation ??
          exec.canAccessAssetInventoryAndAllocation ??
          exec.enabled
        if (val !== undefined) return Boolean(val)
      }
    }
  }

  return null
}
