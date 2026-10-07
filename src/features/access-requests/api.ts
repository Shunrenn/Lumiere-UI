import { API_BASE_URL, getAuthToken } from '@/shared/api/apiConfig'

export interface AccessRequest {
  id: string
  fullName: string
  email: string
  requestedRole: string
  reason?: string
  status: string
  createdAt: string
}

export interface CreateAccessRequestInput {
  fullName: string
  email: string
  requestedRole: string
  reason?: string
}

function authHeaders(): HeadersInit {
  const token = getAuthToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function createAccessRequest(input: CreateAccessRequestInput): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/access-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (response.ok) return
  const body = await response.json().catch(() => ({}))
  throw new Error(body.error || body.Error || `Access request failed (HTTP ${response.status}).`)
}

export async function fetchAccessRequests(): Promise<AccessRequest[]> {
  const response = await fetch(`${API_BASE_URL}/api/access-requests`, { headers: authHeaders() })
  // 403: non-Admin roles cannot access this endpoint — return empty rather than throwing
  if (response.status === 403 || response.status === 401) return []
  if (!response.ok) throw new Error(`Access requests failed to load (HTTP ${response.status}).`)
  return response.json()
}

export async function completeAccessRequest(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/access-requests/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status: 'Completed' }),
  })
  if (!response.ok) throw new Error(`Access request update failed (HTTP ${response.status}).`)
}