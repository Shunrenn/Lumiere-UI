import { useMemo, useState, useEffect } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import type { PortalEvent, ProcurementItem, Staff, DamageException } from '@/shared/types'
import type { ProjectPitch } from '@/lib/project-pitch'
import { fetchDeficitQueueApi, type DeficitQueueItemDto } from '@/features/inventory/api/deficitApi'
import { cn } from '@/shared/utils'

export interface ActionItem {
  id: string
  type: 'event-hold' | 'missing-venue' | 'pitch-revision' | 'damage-hold' | 'deficit-alert'
  severity: 'high' | 'medium' | 'low'
  title: string
  subtitle: string
  eventId?: string
  pitchId?: string
  badgeLabel: string
}

interface ProjectManagerActionRequiredProps {
  events: PortalEvent[]
  staff?: Staff[]
  procurement?: ProcurementItem[]
  damageExceptions: DamageException[]
  pitches: ProjectPitch[]
  onOpenEvent: (eventId: string) => void
  onOpenPitch: (pitchId: string) => void
}

export function ProjectManagerActionRequired({
  events,
  damageExceptions,
  pitches,
  onOpenEvent,
  onOpenPitch,
}: ProjectManagerActionRequiredProps) {
  const [deficits, setDeficits] = useState<DeficitQueueItemDto[]>([])

  useEffect(() => {
    fetchDeficitQueueApi()
      .then((data) => setDeficits(data))
      .catch((err) => console.warn('[ProjectManagerActionRequired] fetchDeficitQueueApi failed:', err))
  }, [])

  const actionItems: ActionItem[] = useMemo(() => {
    const items: ActionItem[] = []

    // 1. Events on Hold
    events
      .filter((e) => e.status === 'On Hold')
      .forEach((e) => {
        items.push({
          id: `hold-${e.id}`,
          type: 'event-hold',
          severity: 'high',
          title: `${e.title}: Event Operations On Hold`,
          subtitle: `Event status marked as On Hold. Execution cannot proceed until resolved.`,
          eventId: e.id,
          badgeLabel: 'Operations Blocked',
        })
      })

    // 2. Events with Missing / Pending Venue
    events
      .filter(
        (e) =>
          !e.venue ||
          e.venue.toLowerCase().includes('pending') ||
          e.venue.toLowerCase().includes('tbd'),
      )
      .forEach((e) => {
        items.push({
          id: `venue-${e.id}`,
          type: 'missing-venue',
          severity: 'medium',
          title: `${e.title}: Venue Assignment Required`,
          subtitle: `Target date is ${e.targetDate || 'TBD'} with venue still pending formal reservation.`,
          eventId: e.id,
          badgeLabel: 'Venue Pending',
        })
      })

    // 3. Client Pitches in For Revision state
    pitches
      .filter((p) => p.status === 'For Revision')
      .forEach((p) => {
        items.push({
          id: `pitch-${p.id}`,
          type: 'pitch-revision',
          severity: 'medium',
          title: `Client Pitch Revision: ${p.brief.clientName}`,
          subtitle: `Client provided feedback requesting adjustments before final approval.`,
          pitchId: p.id,
          badgeLabel: 'Pitch Revision',
        })
      })

    // 5. Open Damage Exceptions & Settlement Blockers
    const openDamages = damageExceptions.filter(
      (d) => d.status === 'Pending Verdict' || d.status === 'Held for Audit',
    )

    // Match damages to events to flag settlement blockers
    events.forEach((e) => {
      const eventBlockingDamages = openDamages.filter(
        (d) =>
          d.boundEvent === e.title ||
          d.boundEvent === e.refId ||
          d.boundEvent === e.id,
      )
      if (eventBlockingDamages.length > 0) {
        items.push({
          id: `settle-block-${e.id}`,
          type: 'damage-hold',
          severity: e.status === 'Completed' ? 'high' : 'medium',
          title: `${e.title}: Settlement Blocked (${eventBlockingDamages.length} Damage Hold${eventBlockingDamages.length > 1 ? 's' : ''})`,
          subtitle: `Unresolved asset damage reports hold financial clearance for this project.`,
          eventId: e.id,
          badgeLabel: 'Settlement Blocker',
        })
      }
    })

    // If there are general open damages not attached to mapped events, show up to 2 items
    if (!items.some((it) => it.badgeLabel === 'Settlement Blocker')) {
      openDamages.slice(0, 2).forEach((d) => {
        const matchingEvent = events.find(
          (e) => e.title === d.boundEvent || e.refId === d.boundEvent || e.id === d.boundEvent,
        )
        items.push({
          id: `damage-${d.id}`,
          type: 'damage-hold',
          severity: 'medium',
          title: `Logistics Damage Flag: ${d.assetName || 'Asset Item'}`,
          subtitle: `Damage report logged in logistics pipeline pending sign-off.`,
          eventId: matchingEvent?.id,
          badgeLabel: 'Audit Exception',
        })
      })
    }

    // 6. Critical Deficit Alerts from Deficit Queue
    const activeDeficits = deficits.filter(
      (d) => d.status !== 'Fulfilled' && d.status !== 'Cancelled',
    )
    events.forEach((e) => {
      const eventDeficits = activeDeficits.filter(
        (d) => d.eventId === e.id || (d.eventName && d.eventName === e.title),
      )
      const criticalDeficits = eventDeficits.filter(
        (d) => d.priority === 'Critical' || d.urgencyLevel === 'Critical',
      )
      if (criticalDeficits.length > 0) {
        items.push({
          id: `deficit-${e.id}`,
          type: 'deficit-alert',
          severity: 'high',
          title: `${e.title}: Material Deficit Flagged (${criticalDeficits.length} Critical Item${criticalDeficits.length > 1 ? 's' : ''})`,
          subtitle: `Critical inventory shortage requires supplier PO replenishment to avoid dispatch delay.`,
          eventId: e.id,
          badgeLabel: 'Material Deficit',
        })
      }
    })

    return items
  }, [events, damageExceptions, pitches, deficits])

  if (actionItems.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              All Project Pipelines On Schedule
            </h3>
            <p className="text-xs text-muted-foreground">
              No blocking operational issues, pending venue exceptions, or pitch revisions requiring urgent PM attention.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-lg font-semibold text-foreground">
            Action Required
          </h2>
          <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-400">
            {actionItems.length} Issues Flagged
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          Immediate coordination items
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {actionItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              'flex flex-col justify-between rounded-xl border p-4 shadow-sm transition backdrop-blur-sm',
              item.severity === 'high'
                ? 'border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50'
                : item.severity === 'medium'
                ? 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50'
                : 'border-border bg-card/60 hover:border-primary/40',
            )}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span
                  className={cn(
                    'rounded px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider',
                    item.severity === 'high'
                      ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                      : item.severity === 'medium'
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {item.badgeLabel}
                </span>

                <span className="text-[0.65rem] text-muted-foreground font-medium uppercase tracking-wider">
                  {item.severity === 'high' ? 'Priority 1' : 'Priority 2'}
                </span>
              </div>

              <h4 className="text-xs font-semibold text-foreground line-clamp-1">
                {item.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {item.subtitle}
              </p>
            </div>

            <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-end">
              {item.eventId ? (
                <button
                  type="button"
                  onClick={() => onOpenEvent(item.eventId!)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition hover:underline"
                >
                  Resolve in Event Workspace
                  <ArrowRight className="size-3" />
                </button>
              ) : item.pitchId ? (
                <button
                  type="button"
                  onClick={() => onOpenPitch(item.pitchId!)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition hover:underline"
                >
                  Review Client Pitch
                  <ArrowRight className="size-3" />
                </button>
              ) : (
                <span className="text-[0.68rem] text-muted-foreground">
                  Monitored via System Logs
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
