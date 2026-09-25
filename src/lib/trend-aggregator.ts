import type { Staff, PortalEvent, DamageException } from '@/lib/types'

export interface TrendPoint {
  label: string
  value: number
}

// Generates trailing 6 month buckets ending at current month
export function getTrailing6Months(): { year: number; month: number; label: string }[] {
  const result: { year: number; month: number; label: string }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('en-US', { month: 'short' })
    result.push({ year: d.getFullYear(), month: d.getMonth(), label })
  }
  return result
}

export function parseFlexibleDate(raw?: string | null): Date | null {
  if (!raw) return null
  const clean = raw.split('·')[0].trim()
  const parsed = new Date(clean)
  if (!isNaN(parsed.getTime())) return parsed
  return null
}

/**
 * Aggregates User Growth over time.
 * Calculates cumulative account count for each month up to that point.
 */
export function aggregateUserGrowth(staffList: Staff[], subRoleCategory?: string | null): TrendPoint[] {
  const months = getTrailing6Months()
  
  const filtered = staffList.filter((s) => {
    if (!subRoleCategory) return true
    if (subRoleCategory === 'Warehouse Ops Manager') {
      return (
        s.role === 'Warehouse Manager' ||
        s.role === 'Warehouse Lead' ||
        s.role === 'Warehouse Member'
      )
    }
    if (subRoleCategory === 'Ground Crew' || subRoleCategory === 'Ground Crew') {
      return (s.role as string) === 'Ground Crew' || (s.role as string) === 'Ground Crew'
    }
    return s.role === subRoleCategory
  })

  return months.map(({ year, month, label }) => {
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59)
    const count = filtered.filter((s) => {
      const d = parseFlexibleDate(s.dateAdded)
      if (!d) return true // Include seed accounts without dateAdded in base count
      return d <= monthEnd
    }).length

    return { label, value: count }
  })
}

/**
 * Aggregates Event Activity volume per month.
 */
export function aggregateEventActivity(events: PortalEvent[]): TrendPoint[] {
  const months = getTrailing6Months()

  return months.map(({ year, month, label }) => {
    const count = events.filter((e) => {
      const d = parseFlexibleDate(e.targetDate || e.installationStart)
      if (!d) return false
      return d.getFullYear() === year && d.getMonth() === month
    }).length

    return { label, value: count }
  })
}

/**
 * Aggregates Damage Oversight claims volume per month.
 */
export function aggregateDamageOversight(damageList: DamageException[]): TrendPoint[] {
  const months = getTrailing6Months()

  return months.map(({ year, month, label }) => {
    const count = damageList.filter((d) => {
      const dt = parseFlexibleDate(d.capturedAt)
      if (!dt) return false
      return dt.getFullYear() === year && dt.getMonth() === month
    }).length

    return { label, value: count }
  })
}
