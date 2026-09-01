import { useMemo, useState } from 'react'
import { LayoutGrid, Rows3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EventStatus, PortalEvent } from '@/lib/types'
import { useDeployments } from '@/lib/deployments'

const THUMBNAILS = [
  '/images/decor/chateau-ballroom.png',
  '/images/decor/garden-wedding.png',
  '/images/decor/floral-arch.png',
  '/images/decor/candelabra.png',
  '/images/decor/dance-floor.png',
  '/images/decor/velvet-sofa.png',
]

function hashOf(value: string) {
  return Math.abs(value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0))
}

function thumbnailFor(event: PortalEvent) {
  return THUMBNAILS[hashOf(event.id) % THUMBNAILS.length]
}

type ChipTone = 'ok' | 'warn' | 'progress' | 'muted'

function chipFor(event: PortalEvent, inTransit: boolean): { label: string; tone: ChipTone } {
  if (event.status === 'Completed') return { label: 'Completed', tone: 'muted' }
  if (event.status === 'Cancelled') return { label: 'Cancelled', tone: 'muted' }
  if (inTransit) return { label: 'Dispatch in progress', tone: 'progress' }
  if (event.status === 'On Hold') {
    const unresolved = (hashOf(event.refId) % 3) + 1
    return { label: `${unresolved} deficit${unresolved > 1 ? 's' : ''} unresolved`, tone: 'warn' }
  }
  return { label: 'On track', tone: 'ok' }
}

const chipStyles: Record<ChipTone, string> = {
  ok: 'bg-primary/15 text-primary',
  warn: 'bg-destructive/15 text-destructive',
  progress: 'bg-accent text-accent-foreground',
  muted: 'bg-muted text-muted-foreground',
}

const STATUS_FILTERS: Array<EventStatus | 'All'> = [
  'All',
  'Initialized',
  'In Production',
  'On Hold',
  'Reserved',
  'Completed',
  'Cancelled',
]

type SortKey = 'date' | 'name' | 'status'

interface EventsSectionProps {
  events: PortalEvent[]
  searchQuery: string
  onOpenEvent: (id: string) => void
}

export function EventsSection({ events, searchQuery, onOpenEvent }: EventsSectionProps) {
  const [view, setView] = useState<'grid' | 'row'>('grid')
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'All'>('All')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const deployments = useDeployments()

  const isInTransit = (event: PortalEvent) =>
    deployments.some(
      (record) => record.event.trim().toLowerCase() === event.title.trim().toLowerCase() && record.status === 'In Progress',
    )

  const visible = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    let list = events.filter((event) => {
      if (statusFilter !== 'All' && event.status !== statusFilter) return false
      if (!normalizedQuery) return true
      return (
        event.title.toLowerCase().includes(normalizedQuery) ||
        event.venue.toLowerCase().includes(normalizedQuery) ||
        event.client.toLowerCase().includes(normalizedQuery)
      )
    })
    list = [...list].sort((a, b) => {
      if (sortKey === 'name') return a.title.localeCompare(b.title)
      if (sortKey === 'status') return a.status.localeCompare(b.status)
      return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
    })
    return list
  }, [events, searchQuery, statusFilter, sortKey])

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-xl font-medium text-foreground">Events</h2>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as EventStatus | 'All')}
            aria-label="Filter events by status"
            className="rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-card-foreground outline-none focus:border-primary"
          >
            {STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {status === 'All' ? 'All statuses' : status}
              </option>
            ))}
          </select>

          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            aria-label="Sort events"
            className="rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-card-foreground outline-none focus:border-primary"
          >
            <option value="date">Sort by date</option>
            <option value="name">Sort by name</option>
            <option value="status">Sort by status</option>
          </select>

          <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setView('grid')}
              aria-label="Grid view"
              aria-pressed={view === 'grid'}
              className={cn(
                'flex size-7 items-center justify-center rounded-sm transition-colors',
                view === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
              )}
            >
              <LayoutGrid className="size-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setView('row')}
              aria-label="Row view"
              aria-pressed={view === 'row'}
              className={cn(
                'flex size-7 items-center justify-center rounded-sm transition-colors',
                view === 'row' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
              )}
            >
              <Rows3 className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-card/50 px-5 py-8 text-center text-sm text-muted-foreground">
          No events match your search or filters.
        </p>
      ) : view === 'grid' ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {visible.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              chip={chipFor(event, isInTransit(event))}
              onOpen={() => onOpenEvent(event.id)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {visible.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              chip={chipFor(event, isInTransit(event))}
              onOpen={() => onOpenEvent(event.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function EventCard({
  event,
  chip,
  onOpen,
}: {
  event: PortalEvent
  chip: { label: string; tone: ChipTone }
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group overflow-hidden rounded-lg border border-border bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="aspect-[3/2] w-full overflow-hidden">
        <img
          src={thumbnailFor(event) || '/placeholder.svg'}
          alt=""
          crossOrigin="anonymous"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="p-2.5">
        <h3 className="truncate font-serif text-sm font-medium text-card-foreground">{event.title}</h3>
        <div className="mt-1.5 flex items-center justify-between gap-1.5">
          <span className="truncate text-[0.58rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
            {event.targetDate}
          </span>
          <span
            className={cn(
              'shrink-0 rounded-full px-1.5 py-0.5 text-[0.52rem] font-bold uppercase tracking-[0.04em]',
              chipStyles[chip.tone],
            )}
          >
            {chip.label}
          </span>
        </div>
      </div>
    </button>
  )
}

function EventRow({
  event,
  chip,
  onOpen,
}: {
  event: PortalEvent
  chip: { label: string; tone: ChipTone }
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex items-center gap-4 overflow-hidden rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-accent"
    >
      <img
        src={thumbnailFor(event) || '/placeholder.svg'}
        alt=""
        crossOrigin="anonymous"
        className="size-16 shrink-0 rounded-lg object-cover"
      />
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-serif text-base font-medium text-card-foreground">{event.title}</h3>
        <p className="truncate text-xs text-muted-foreground">{event.venue}</p>
      </div>
      <span className="hidden shrink-0 text-[0.65rem] font-medium uppercase tracking-[0.08em] text-muted-foreground sm:inline">
        {event.targetDate}
      </span>
      <span
        className={cn(
          'shrink-0 rounded-full px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.06em]',
          chipStyles[chip.tone],
        )}
      >
        {chip.label}
      </span>
    </button>
  )
}
