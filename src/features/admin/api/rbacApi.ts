import { API_BASE_URL, getAuthToken } from '@/shared/api/apiConfig'
import type { SubRoleEmergencyUnblockMetadata } from '@/shared/types'

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
 * Triggers admin emergency unblock on a damage report.
 * Endpoint: POST /api/damage-reports/{id}/admin-unblock
 */
export async function adminUnblockAuditHoldApi(
  reportId: string,
  unblockMetadata: SubRoleEmergencyUnblockMetadata
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/damage-reports/${encodeURIComponent(reportId)}/admin-unblock`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ unblockMetadata }),
    })
    return res.ok
  } catch (err) {
    console.warn('[rbacApi] Admin unblock API call skipped/fallback:', err)
    return true
  }
}
