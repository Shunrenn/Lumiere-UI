import type { PortalEvent, DamageException, ProcurementItem } from '@/lib/types'

// The 10 unified event types from Phase 6, shared verbatim between Live
// Operations Feed and Operational Audit Logs so both surfaces render
// word-for-word identical wording, sourced from one place.
export type OperationalEventType =
    | 'Event Registered'
    | 'Event Status Updated'
    | 'New Venue Booking Confirmed'
    | 'Supplier Contract Updated'
    | 'Damage Report Submitted'
    | 'Damage Report Escalated'
    | 'Damage Verdict Recorded'
    | 'Audit Exception Flagged'
    | 'Asset Restock Requested'
    | 'Vendor Selection Confirmed'

// Status used for the Operational Audit Logs' filter pills (All / Success /
// Flagged / Approved / Pending) — distinct from DamageVerdict/EventStatus.
export type OperationalEventStatus = 'Success' | 'Flagged' | 'Approved' | 'Pending'

export interface OperationalEvent {
    id: string
    sourceId: string
    eventType: OperationalEventType
    title: string
    detail: string
    account: string
    initiatorRole: string
    status: OperationalEventStatus
    timestamp: string
    date: string
    ip: string
}

function formatNow(offsetMinutes: number) {
    const d = new Date(Date.now() - offsetMinutes * 60 * 1000)
    return {
        timestamp: d.toLocaleTimeString('en-US', { hour12: false }),
        date: d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    }
}

/**
 * Builds the unified operational activity list from live portal data.
 */
export function getOperationalEvents(
    events: PortalEvent[],
    damageExceptions: DamageException[],
    procurement: ProcurementItem[],
): OperationalEvent[] {
    const result: OperationalEvent[] = []
    let offset = 0
    const nextOffset = () => (offset += 7) // spaces entries out for a readable feed order

    // 1. Event Registered — one per event on record.
    events.forEach((e) => {
        const { timestamp, date } = formatNow(nextOffset())
        result.push({
            id: `op-ev-${e.id}`,
            sourceId: e.id,
            eventType: 'Event Registered',
            title: e.title,
            detail: `New event "${e.title}" registered${e.client ? ` for ${e.client}` : ''}. Ref ${e.refId}.`,
            account: 'EXEC-ROOT',
            initiatorRole: 'Executive',
            status: 'Success',
            timestamp,
            date,
            ip: '10.0.1.5',
        })
    })

    // 5. Damage Report Submitted — one per damage exception on record.
    damageExceptions.forEach((d) => {
        const { timestamp, date } = formatNow(nextOffset())
        result.push({
            id: `op-dmg-sub-${d.id}`,
            sourceId: d.id,
            eventType: 'Damage Report Submitted',
            title: d.assetName,
            detail: `${d.logId} filed by ${d.reportingOfficer} (${d.officerRole}) for "${d.boundEvent}".`,
            account: d.reportingOfficer,
            initiatorRole: d.officerRole,
            status: 'Success',
            timestamp,
            date,
            ip: '192.168.4.21',
        })
    })

    // 6. Damage Report Escalated — matches Round 1 or Round 2 escalation.
    damageExceptions
        .filter(
            (d) =>
                d.status === 'Escalated — Round 1 Review' ||
                d.status === 'Escalated — Round 2 Review',
        )
        .forEach((d) => {
            const { timestamp, date } = formatNow(nextOffset())
            result.push({
                id: `op-dmg-esc-${d.id}`,
                sourceId: d.id,
                eventType: 'Damage Report Escalated',
                title: d.assetName,
                detail: `${d.logId} escalated to Executive review (${d.status}).`,
                account: 'WOM',
                initiatorRole: 'Warehouse Manager',
                status: 'Flagged',
                timestamp,
                date,
                ip: '192.168.4.44',
            })
        })

    // 7. Damage Verdict Recorded — resolved to a terminal status.
    damageExceptions
        .filter(
            (d) =>
                d.status === 'Dismissed' ||
                d.status === 'Sent for Repair' ||
                d.status === 'Sent for Write-off',
        )
        .forEach((d) => {
            const { timestamp, date } = formatNow(nextOffset())
            result.push({
                id: `op-dmg-verdict-${d.id}`,
                sourceId: d.id,
                eventType: 'Damage Verdict Recorded',
                title: d.assetName,
                detail: `${d.logId} resolved: ${d.status}.`,
                account: 'EXEC-ROOT',
                initiatorRole: 'Executive',
                status: 'Approved',
                timestamp,
                date,
                ip: '10.0.1.5',
            })
        })

    // 9. Asset Restock Requested — items currently under threshold or on order.
    procurement
        .filter(
            (p) =>
                p.status === 'Critical Deficit' ||
                p.status === 'Low Stock' ||
                p.status === 'Order Placed',
        )
        .forEach((p) => {
            const { timestamp, date } = formatNow(nextOffset())
            result.push({
                id: `op-restock-${p.id}`,
                sourceId: p.id,
                eventType: 'Asset Restock Requested',
                title: p.name,
                detail: `${p.name} (${p.assetId}) fell below its restock threshold — currently ${p.status}.`,
                account: 'WAREHOUSE_MGR_01',
                initiatorRole: 'Warehouse Manager',
                status: p.status === 'Order Placed' ? 'Approved' : 'Pending',
                timestamp,
                date,
                ip: '10.0.4.12',
            })
        })

    return result
}