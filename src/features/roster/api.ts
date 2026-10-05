import { API_BASE_URL, getAuthToken } from '@/shared/api/apiConfig'

export interface CrewRosterRecord {
  id: string
  employeeId: string
  name: string
  email: string
  role: string
  status: string
  weekMon: string
  weekTue: string
  weekWed: string
  weekThu: string
  weekFri: string
  weekSat: string
  weekSun: string
}

export async function fetchCrewRoster(): Promise<CrewRosterRecord[]> {
  const token = getAuthToken()
  if (!token) return []

  const response = await fetch(`${API_BASE_URL}/api/workforce/crew-roster`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    throw new Error(`Crew roster failed to load (HTTP ${response.status}).`)
  }
  return response.json()
}
