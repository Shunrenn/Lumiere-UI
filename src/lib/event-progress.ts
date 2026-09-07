import type { PortalEvent } from '@/lib/types'

// Deterministic dispatch progress derived from an event's lifecycle status.
// Shared between the Readiness tab (Event Operations) and the Executive
// Dashboard's Urgent ticker (Phase 5) — single source of truth so both
// screens always agree on a given event's readiness percentage.
export const dispatchProgress: Record<string, number> = {
    Completed: 100,
    'In Production': 65,
    'On Hold': 40,
    Reserved: 25,
    Initialized: 15,
    Cancelled: 0,
}

// Progress bar severity coloring:
// Under 30% = warm red/rust, 30–69% = amber, 70–99% = primary brown/terracotta accent.
export function getProgressBarColor(pct: number): string {
    if (pct < 30) return 'bg-rose-600'
    if (pct < 70) return 'bg-amber-500'
    return 'bg-primary'
}

export function getEventProgress(event: PortalEvent): number {
    return dispatchProgress[event.status] ?? 0
}

// Active, incomplete events (excludes Completed/Cancelled), sorted ascending
// by readiness % — the same "what needs attention" ordering used by the
// Readiness tab and by the Dashboard's Urgent ticker.
export function getIncompleteEvents(events: PortalEvent[]): PortalEvent[] {
    return (events || [])
        .filter(Boolean)
        .filter(
            (e) =>
                e.status &&
                e.status !== 'Completed' &&
                e.status !== 'Cancelled' &&
                getEventProgress(e) < 100,
        )
        .sort((a, b) => getEventProgress(a) - getEventProgress(b))
}

// Rough "is this event's date coming up soon" check, used to decide whether
// a low-readiness event is urgent enough to surface on the Dashboard ticker.
// targetDate is stored as a display string (e.g. "Oct 18, 2026"); we parse it
// defensively since it isn't a strict ISO date.
export function isDateApproaching(targetDate: string, withinDays = 14): boolean {
    if (!targetDate) return false
    const parsed = new Date(targetDate)
    if (Number.isNaN(parsed.getTime())) return false
    const now = new Date()
    const diffMs = parsed.getTime() - now.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    return diffDays >= 0 && diffDays <= withinDays
}

// Events under 30% readiness with an approaching date — the Urgent tab's
// "low-readiness event" flag (Phase 5). Shown as an informational flag, not
// an actionable button.
export function getUrgentLowReadinessEvents(events: PortalEvent[], withinDays = 14): PortalEvent[] {
    return getIncompleteEvents(events).filter(
        (e) => getEventProgress(e) < 30 && isDateApproaching(e.targetDate, withinDays),
    )
}