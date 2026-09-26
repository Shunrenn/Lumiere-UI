import { useState, useMemo } from 'react'
import {
  Calendar,
  MapPin,
  User,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  Package,
} from 'lucide-react'
import type { PortalEvent, ProcurementItem, Staff } from '@/lib/types'
import { getEventDetailSnapshot } from '@/lib/event-detail'
import { cn } from '@/lib/utils'

interface ProjectManagerEventsListProps {
  events: PortalEvent[]
  staff: Staff[]
  procurement: ProcurementItem[]
  assignedPmName?: string
  searchQuery?: string
  onOpenEvent: (eventId: string) => void
}

type FilterTab = 'all' | 'in-production' | 'planning' | 'attention' | 'completed'

export function ProjectManagerEventsList({
  events,
  staff,
  procurement,
  assignedPmName = 'Project Manager',
  searchQuery = '',
  onOpenEvent,
}: ProjectManagerEventsListProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  // Calculate snapshot and health status for each event
  const enrichedEvents = useMemo(() => {
    return events.map((ev) => {
      const snapshot = getEventDetailSnapshot(ev, staff, procurement)
      const isAttention = snapshot.overallStatus === 'Attention Needed' || ev.status === 'On Hold'
      return {
        ...ev,
        snapshot,
        isAttention,
      }
    })
  }, [events, staff, procurement])

  // Filter events by tab and search
  const filteredEvents = useMemo(() => {
    let list = enrichedEvents

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.client.toLowerCase().includes(q) ||
          e.venue.toLowerCase().includes(q) ||
          (e.refId && e.refId.toLowerCase().includes(q)),
      )
    }

    switch (activeTab) {
      case 'in-production':
        return list.filter((e) => e.status === 'In Production')
      case 'planning':
        return list.filter((e) => e.status === 'Initialized' || e.status === 'Reserved')
      case 'attention':
        return list.filter((e) => e.isAttention)
      case 'completed':
        return list.filter((e) => e.status === 'Completed' || e.status === 'Settled')
      case 'all':
      default:
        return list
    }
  }, [enrichedEvents, activeTab, searchQuery])

  const counts = useMemo(
    () => ({
      all: events.length,
      inProduction: events.filter((e) => e.status === 'In Production').length,
      planning: events.filter((e) => e.status === 'Initialized' || e.status === 'Reserved').length,
      attention: enrichedEvents.filter((e) => e.isAttention).length,
      completed: events.filter((e) => e.status === 'Completed' || e.status === 'Settled').length,
    }),
    [events, enrichedEvents],
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Section Header & Filter Tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-lg font-semibold text-foreground">
            Assigned Event Projects
          </h2>
          <p className="text-xs text-muted-foreground">
            Direct operational oversight & workspace transitions
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/70 bg-card/60 p-1 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              activeTab === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/40',
            )}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('in-production')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              activeTab === 'in-production'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/40',
            )}
          >
            In Production ({counts.inProduction})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('planning')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              activeTab === 'planning'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/40',
            )}
          >
            Planning ({counts.planning})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('attention')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              activeTab === 'attention'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/40',
            )}
          >
            Attention ({counts.attention})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              activeTab === 'completed'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/40',
            )}
          >
            Completed ({counts.completed})
          </button>
        </div>
      </div>

      {/* Events Grid */}
      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEvents.map((ev) => {
            const pmLabel = ev.projectManagerName || assignedPmName
            const healthStatus = ev.snapshot.overallStatus
            const crewCount = ev.snapshot.crew.length
            const itemsCount = ev.snapshot.items.length

            return (
              <div
                key={ev.id}
                onClick={() => onOpenEvent(ev.id)}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card/70 p-5 shadow-sm backdrop-blur-sm transition duration-200 hover:border-primary/50 hover:shadow-md cursor-pointer"
              >
                {/* Top Badge Strip */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md border border-border/80 bg-background px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-primary">
                      {ev.refId || 'PRT-2026'}
                    </span>
                    <span
                      className={cn(
                        'rounded-md px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider border',
                        ev.tier?.includes('Tier-1')
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                          : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
                      )}
                    >
                      {ev.tier?.includes('Tier-1') ? 'VIP Tier-1' : 'Premium Tier-2'}
                    </span>
                  </div>

                  {/* Health status badge */}
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.62rem] font-semibold border',
                      healthStatus === 'On Track'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                        : healthStatus === 'Attention Needed'
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
                    )}
                  >
                    {healthStatus === 'On Track' ? (
                      <CheckCircle2 className="size-3" />
                    ) : (
                      <AlertTriangle className="size-3" />
                    )}
                    {healthStatus}
                  </span>
                </div>

                {/* Event Title & Client */}
                <div className="mt-3">
                  <h3 className="font-serif text-base font-medium leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {ev.title}
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Building2 className="size-3 text-muted-foreground/70 shrink-0" />
                    <span className="truncate">{ev.client}</span>
                  </p>
                </div>

                {/* Key Event Details */}
                <div className="mt-3 flex flex-col gap-1.5 border-y border-border/50 py-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-3.5 text-primary shrink-0" />
                    <span>Target Date: <strong className="text-foreground font-medium">{ev.targetDate}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="size-3.5 text-primary shrink-0" />
                    <span className="truncate">{ev.venue}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="size-3.5 text-primary shrink-0" />
                    <span>Assigned PM: <strong className="text-foreground font-medium">{pmLabel}</strong></span>
                  </div>
                </div>

                {/* Micro Metrics Strip & Action CTA */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1" title="Assigned Crew">
                      <Users className="size-3 text-muted-foreground/70" />
                      <strong className="text-foreground font-semibold">{crewCount}</strong>
                    </span>
                    <span className="flex items-center gap-1" title="Allocated Assets">
                      <Package className="size-3 text-muted-foreground/70" />
                      <strong className="text-foreground font-semibold">{itemsCount}</strong>
                    </span>
                    <span className="rounded bg-muted/80 px-1.5 py-0.5 text-[0.62rem] font-semibold text-foreground">
                      {ev.status}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition group-hover:translate-x-1">
                    Open Workspace
                    <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
          <Calendar className="size-10 text-muted-foreground/40 mb-3" />
          <h3 className="font-serif text-base font-medium text-foreground">
            No events found
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            {searchQuery
              ? `No events matching "${searchQuery}". Try clearing your search.`
              : 'There are no events matching the selected filter criteria.'}
          </p>
        </div>
      )}
    </div>
  )
}
