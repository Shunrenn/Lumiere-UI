import { API_BASE_URL, getAuthToken } from './apiConfig'

export interface BudgetLineItem {
  label: string
  description?: string
  unitCost?: number | null
  quantity?: number | null
  lineTotal?: number | null
  isMissingCost: boolean
}

export interface EventBudgetData {
  eventId: string
  eventName: string
  estimatedRevenue?: number | null
  estimatedAssetCost: number
  unpricedAssetCount: number
  totalReservedAssets: number
  totalDamageCosts: number
  totalProcurementCosts: number
  totalEstimatedCost: number
  estimatedGrossMargin?: number | null
  isLossMaker: boolean
  hasIncompleteCostData: boolean
  assetLineItems: BudgetLineItem[]
  damageLineItems: BudgetLineItem[]
  procurementLineItems: BudgetLineItem[]
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export async function fetchEventBudget(eventId: string): Promise<EventBudgetData> {
  const res = await fetch(`${API_BASE_URL}/api/events/${eventId}/budget`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error(`Budget fetch failed: ${res.status}`)
  return res.json()
}