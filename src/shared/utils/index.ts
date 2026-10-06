import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateRandomPassword(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/** Expand a date or start/end date range into discrete YYYY-MM-DD calendar date strings. */
export function expandDateRange(startDate: string, endDate?: string | null): string[] {
  if (!startDate) return []
  const start = new Date(`${startDate}T00:00:00`)
  if (isNaN(start.getTime())) return [startDate]
  if (!endDate || startDate === endDate) return [startDate]

  const end = new Date(`${endDate}T00:00:00`)
  if (isNaN(end.getTime()) || end.getTime() < start.getTime()) return [startDate]

  const dates: string[] = []
  const current = new Date(start)
  while (current.getTime() <= end.getTime()) {
    dates.push(current.toISOString().slice(0, 10))
    current.setDate(current.getDate() + 1)
  }
  return dates
}
