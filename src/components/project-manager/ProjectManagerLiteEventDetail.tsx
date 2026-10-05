import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Calendar, MapPin, User, Edit3, RefreshCw, ShieldCheck } from 'lucide-react'
import type { PortalEvent, ProcurementItem, Staff } from '@/shared/types'
import {
  getEventDetailSnapshot,
  resolveCatalogAssetForItem,
  type AllocatedItemStatus,
  type EventAllocatedItem,
} from '@/lib/event-detail'
import { fetchReservationsForEvent, type ReservationResponseDto } from '@/features/events/api/reservationsApi'
import { ItemsPanel } from '@/components/warehouse/event-detail/ItemsPanel'
import { AssetDetailModal } from '@/components/warehouse/asset-catalog/AssetDetailModal'
import { StatusBadge, type StatusVariant } from '@/components/StatusBadge'
import { cn } from '@/shared/utils'

const eventStatusVariants: Record<string, StatusVariant> = {
  Initialized: 'warning',
  'In Production': 'info',
  Completed: 'success',
  Settled: 'success',
  'On Hold': 'destructive',
  Reserved: 'accent',
  Cancelled: 'neutral',
}

interface ProjectManagerLiteEventDetailProps {
  event: PortalEvent
  staff: Staff[]
  procurement: ProcurementItem[]
  onBack: () => void
  onEditEvent: () => void
}

export function ProjectManagerLiteEventDetail({
  event,
  staff,
  procurement,
  onBack,
  onEditEvent,
}: ProjectManagerLiteEventDetailProps) {
  // Authoritative reservations from GET /api/reservations/event/{eventId}
  const [reservations, setReservations] = useState<ReservationResponseDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAssetItem, setSelectedAssetItem] = useState<EventAllocatedItem | null>(null)

  const loadReservations = async () => {
    if (!event.id) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchReservationsForEvent(event.id)
      setReservations(data)
    } catch (err: any) {
      console.warn('[ProjectManagerLiteEventDetail] fetchReservationsForEvent failed:', err)
      setError(err?.message || 'Failed to load reservations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReservations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id])

  // Deterministic canonical snapshot fallback
  const snapshot = useMemo(() => getEventDetailSnapshot(event, staff, procurement), [event, staff, procurement])

  // Map backend reservations or snapshot into EventAllocatedItem display records
  const displayItems = useMemo<EventAllocatedItem[]>(() => {
    if (reservations.length > 0) {
      return reservations.map((res, index) => {
        const rawStatus = (res.status || '').toLowerCase()
        let status: AllocatedItemStatus = 'Reserved'
        if (rawStatus.includes('pack')) status = 'Packed'
        else if (rawStatus.includes('short') || rawStatus.includes('deficit')) status = 'Short'

        return {
          id: res.id || `${res.assetId}-${index}`,
          name: res.assetName || res.assetSku || `Reserved Asset (${res.assetId.slice(0, 8)})`,
          quantity: 1,
          unit: 'unit',
          status,
        }
      })
    }
    return snapshot.items
  }, [reservations, snapshot.items])

  const resolvedCatalogAsset = selectedAssetItem ? resolveCatalogAssetForItem(selectedAssetItem) : null

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Top sticky navigation bar */}
      <div className="sticky top-0 z-30 border-b border-border/80 bg-card/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-[94rem] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Projects</span>
            </button>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-muted-foreground">{event.refId}</span>
              <span className="text-muted-foreground/60">•</span>
              <h1 className="font-serif text-lg font-bold text-foreground truncate max-w-md">{event.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge variant={eventStatusVariants[event.status] ?? 'neutral'}>
              {event.status}
            </StatusBadge>
            <button
              type="button"
              onClick={onEditEvent}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow transition hover:opacity-90"
            >
              <Edit3 className="size-3.5" />
              <span>Edit Event</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-[94rem] mx-auto px-6 sm:px-8 py-8 flex flex-col gap-8">
        {/* Event Profile & Context Banner */}
        <div className="rounded-2xl border border-border/80 bg-card/60 p-6 shadow-sm backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <User className="size-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Client Name</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{event.client || '—'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="size-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Event Venue</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{event.venue || '—'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="size-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Target Date</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{event.targetDate || '—'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Allocation Authority</p>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">Read-Only Oversight</p>
              </div>
            </div>
          </div>
        </div>

        {/* Read-Only Allocation Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-xl font-bold text-foreground">Event Asset Allocation</h2>
                <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Read-Only
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Canonical inventory allocation and asset reservation status for this event
              </p>
            </div>

            <button
              type="button"
              onClick={loadReservations}
              disabled={loading}
              title="Refresh reservations"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
              <span>Refresh</span>
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center justify-between">
              <span>Could not refresh live reservations: {error} (showing canonical event snapshot)</span>
              <button
                type="button"
                onClick={loadReservations}
                className="underline hover:no-underline ml-4"
              >
                Retry
              </button>
            </div>
          )}

          {/* ItemsPanel extracted/reused from warehouse event-detail */}
          <ItemsPanel
            items={displayItems}
            onViewAllocation={() => {}}
            onOpenItem={(item) => setSelectedAssetItem(item)}
          />
        </div>
      </main>

      {/* Read-only asset detail modal */}
      {selectedAssetItem && resolvedCatalogAsset && (
        <AssetDetailModal
          asset={resolvedCatalogAsset}
          onClose={() => setSelectedAssetItem(null)}
        />
      )}
    </div>
  )
}
