import { API_BASE_URL, getAuthToken } from '@/shared/api/apiConfig'

export interface PlannerCatalogAsset {
  id: string
  name: string
  category?: string
  catalogPhotoUrl?: string
  warehouseStock: number
}

export async function fetchPlannerCatalog(): Promise<PlannerCatalogAsset[]> {
  const token = getAuthToken()
  const response = await fetch(`${API_BASE_URL}/api/assets/planner-catalog`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!response.ok) {
    throw new Error(`Planner catalog failed to load (HTTP ${response.status}).`)
  }

  return response.json()
}
