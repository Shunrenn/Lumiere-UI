import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  Info,
  PackageCheck,
  RefreshCw,
  Truck,
  X,
} from 'lucide-react'
import type { DispatchBannerState, DispatchBatch } from '@/lib/event-detail'
import type { PortalEvent } from '@/lib/types'
import { EventDetailSection, SectionButton } from '@/components/warehouse/event-detail/EventDetailSection'
import { StateBanner } from '@/components/warehouse/event-detail/StateBanner'
import { DispatchStepper } from '@/components/warehouse/event-detail/DispatchStepper'
import type { Tone } from '@/components/warehouse/event-detail/status-tone'
import {
  getPreparation,
  prepareDispatch,
  verifyItem,
  dispatchEvent,
  type DispatchPreparationResponse,
  type DispatchPreparationItemDto,
} from '@/features/warehouse/api/dispatchApi'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

const BANNER_TONE: Record<DispatchBannerState, Tone> = {
  'No Dispatch Yet': 'neutral',
  'Ingress in progress': 'progress',
  'Ingress done, Egress in progress': 'progress',
  'Egress in progress': 'progress',
  'All stages done': 'positive',
  'Stage unavailable': 'neutral',
  'Delayed Dispatch': 'caution',
  'Stalled In Transit — Needs Attention': 'critical',
}

interface DispatchPanelProps {
  event?: PortalEvent
  banner: DispatchBannerState
  batches: DispatchBatch[]
  onNewBatch: () => void
  onOpenBatch: (batchId: string) => void
}

export function DispatchPanel({
  event,
  banner,
  batches,
  onNewBatch,
  onOpenBatch,
}: DispatchPanelProps) {
  const { adminRole } = useAuth()
  const canMutateDispatch =
    adminRole === 'Warehouse Operations Manager' ||
    adminRole === 'Warehouse Manager' ||
    adminRole === 'Admin' ||
    adminRole === 'Executive'

  const [activeOnly, setActiveOnly] = useState(false)
  const [prepData, setPrepData] = useState<DispatchPreparationResponse | null>(null)
  const [isLoadingPrep, setIsLoadingPrep] = useState(false)
  const [prepError, setPrepError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [verifyingAssetId, setVerifyingAssetId] = useState<string | null>(null)
  const [isStartingPrep, setIsStartingPrep] = useState(false)
  const [isDeparting, setIsDeparting] = useState(false)
  const [departureModalOpen, setDepartureModalOpen] = useState(false)
  const [departureError, setDepartureError] = useState<string | null>(null)
  const [departureSuccess, setDepartureSuccess] = useState(false)

  const eventId = event?.id

  const loadPreparation = useCallback(
    async (activeOnlyParam: boolean) => {
      if (!eventId) return
      setIsLoadingPrep(true)
      setPrepError(null)

      const result = await getPreparation(eventId, activeOnlyParam)
      setIsLoadingPrep(false)

      if (result.success) {
        setPrepData(result.data)
      } else {
        if (!result.notFound) {
          setPrepError(result.message)
        }
      }
    },
    [eventId],
  )

  useEffect(() => {
    void loadPreparation(activeOnly)

    const interval = setInterval(() => {
      void loadPreparation(activeOnly)
    }, 30000)

    const onFocus = () => {
      void loadPreparation(activeOnly)
    }
    window.addEventListener('focus', onFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [loadPreparation, activeOnly])

  const handleToggleActiveOnly = (newActiveOnly: boolean) => {
    setActiveOnly(newActiveOnly)
    void loadPreparation(newActiveOnly)
  }

  const handleStartPreparation = async () => {
    if (!eventId || !canMutateDispatch) return
    setIsStartingPrep(true)
    setActionError(null)

    const result = await prepareDispatch(eventId)
    setIsStartingPrep(false)

    if (result.success) {
      setPrepData(result.data)
    } else {
      setActionError(result.message)
      if (result.conflict) {
        void loadPreparation(activeOnly)
      }
    }
  }

  const handleVerifyItem = async (assetId: string) => {
    if (!eventId || !canMutateDispatch) return
    setVerifyingAssetId(assetId)
    setActionError(null)

    const result = await verifyItem(eventId, assetId)
    setVerifyingAssetId(null)

    if (result.success) {
      setPrepData(result.data)
    } else {
      setActionError(result.message)
      if (result.conflict) {
        void loadPreparation(activeOnly)
      }
    }
  }

  const handleConfirmDeparture = async () => {
    if (!eventId || !canMutateDispatch) return
    setIsDeparting(true)
    setDepartureError(null)

    const result = await dispatchEvent(eventId)
    setIsDeparting(false)

    if (result.success) {
      setDepartureSuccess(true)
      setDepartureModalOpen(false)
      void loadPreparation(activeOnly)
    } else {
      setDepartureError(result.message)
      if (result.conflict) {
        void loadPreparation(activeOnly)
      }
    }
  }

  const items = prepData?.items ?? []
  const hasPendingPull = items.some((i) => i.prepStatus === 'Pending Pull')
  const hasPrepping = items.some((i) => i.prepStatus === 'Prepping')
  const isManifestStale = prepData ? !prepData.isManifestCurrent : false
  const canDepart = Boolean(
    prepData &&
      prepData.isPreparationComplete &&
      prepData.isManifestCurrent &&
      canMutateDispatch,
  )

  return (
    <EventDetailSection
      title="Logistics / Dispatch"
      action={<SectionButton onClick={onNewBatch}>+ New Batch</SectionButton>}
    >
      <div className="flex flex-col gap-6">
        {/* Core State Banner */}
        <StateBanner label={banner} tone={BANNER_TONE[banner]} />

        {/* =========================================================================
            ZONE 1: AUTHORITATIVE PREPARATION (Warehouse Floor Readiness)
            Prepping != Transport. Answers: Are reserved assets physically verified?
           ========================================================================= */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <PackageCheck className="size-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-card-foreground">
                  Warehouse Preparation Queue
                </h3>
              </div>
              <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                Authoritative item staging, verification, and loading readiness. Verification does not trigger departure.
              </p>
            </div>

            {/* Preparation Controls & History Filter */}
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border border-border bg-muted/40 p-0.5 text-[0.6rem] font-semibold">
                <button
                  type="button"
                  onClick={() => handleToggleActiveOnly(false)}
                  className={cn(
                    'rounded px-2.5 py-1 transition',
                    !activeOnly ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Full History
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActiveOnly(true)}
                  className={cn(
                    'rounded px-2.5 py-1 transition',
                    activeOnly ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Active Work
                </button>
              </div>

              <button
                type="button"
                onClick={() => void loadPreparation(activeOnly)}
                disabled={isLoadingPrep}
                title="Refresh preparation status"
                className="flex size-7 items-center justify-center rounded border border-border bg-background text-muted-foreground hover:text-foreground transition"
              >
                <RefreshCw className={cn('size-3.5', isLoadingPrep && 'animate-spin')} />
              </button>
            </div>
          </div>

          {/* Operational Errors & Conflict Alerts */}
          {actionError && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-400 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0 text-rose-600" />
                <span>{actionError}</span>
              </div>
              <button type="button" onClick={() => setActionError(null)} className="text-muted-foreground hover:text-foreground">
                <X className="size-3.5" />
              </button>
            </div>
          )}

          {prepError && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <Info className="size-4 shrink-0" />
              <span>{prepError}</span>
            </div>
          )}

          {/* =========================================================================
              CRITICAL INVARIANT: Manifest Consistency Warning
              When reservation manifest drift is detected, show why departure is blocked!
             ========================================================================= */}
          {isManifestStale && prepData && (
            <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                  Manifest Changed — Preparation Out of Sync
                </h4>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                Preparation no longer matches the current reservation. Refresh and reconcile the highlighted items before departure.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[0.68rem] font-mono">
                <div className="rounded border border-amber-500/30 bg-background/60 p-2">
                  <span className="font-bold text-foreground">Missing Assets:</span> {prepData.missingPreparationAssetIds.length}
                </div>
                <div className="rounded border border-amber-500/30 bg-background/60 p-2">
                  <span className="font-bold text-foreground">Stale Assets:</span> {prepData.stalePreparationAssetIds.length}
                </div>
                <div className="rounded border border-amber-500/30 bg-background/60 p-2">
                  <span className="font-bold text-foreground">Qty Mismatches:</span> {prepData.quantityMismatches.length}
                </div>
              </div>
            </div>
          )}

          {/* Departure Confirmed Success Feedback */}
          {departureSuccess && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              <span>Physical outbound departure confirmed. Verified assets transitioned to In-Transit Outbound.</span>
            </div>
          )}

          {/* Start Preparation Trigger */}
          {hasPendingPull && !hasPrepping && canMutateDispatch && (
            <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div>
                <p className="text-xs font-semibold text-foreground">Preparation Pending Pull</p>
                <p className="text-[0.65rem] text-muted-foreground">
                  Reserved assets require staging and inspection on the warehouse floor.
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartPreparation}
                disabled={isStartingPrep}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
              >
                {isStartingPrep ? <RefreshCw className="size-3.5 animate-spin" /> : <Clock className="size-3.5" />}
                Start Preparation
              </button>
            </div>
          )}

          {/* Preparation Items List */}
          {items.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
              {isLoadingPrep
                ? 'Loading authoritative preparation queue...'
                : activeOnly
                  ? 'No active preparation items. All items are completed or in transit.'
                  : 'No preparation items found for this event.'}
            </p>
          ) : (
            <div className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border bg-background">
              {items.map((item: DispatchPreparationItemDto) => {
                const isCompleted = item.prepStatus === 'Completed'
                const isPrepping = item.prepStatus === 'Prepping'
                const isPendingPull = item.prepStatus === 'Pending Pull'
                const isAwaitingProduction = item.prepStatus === 'Awaiting Production'
                const isVerifying = verifyingAssetId === item.assetId

                return (
                  <div
                    key={item.queueId || item.assetId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 transition hover:bg-muted/30"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground truncate">
                          {item.assetName || 'Reserved Asset'}
                        </span>
                        <span className="text-[0.65rem] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          Qty: {item.quantityRequired}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[0.62rem] text-muted-foreground">
                        <span>Asset State: <span className="font-mono text-foreground">{item.assetState || 'Committed'}</span></span>
                        <span>·</span>
                        <span>Updated: {new Date(item.updatedAt || item.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                      {/* Canonical Preparation Status Badge */}
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider',
                          isCompleted && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
                          isPrepping && 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
                          isPendingPull && 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
                          isAwaitingProduction && 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-500/20',
                        )}
                      >
                        {isCompleted && <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />}
                        {isPrepping && <Clock className="size-3 text-sky-600 dark:text-sky-400" />}
                        {isPendingPull && <AlertTriangle className="size-3 text-amber-600 dark:text-amber-400" />}
                        {isAwaitingProduction && <Clock className="size-3 text-indigo-600 dark:text-indigo-400" />}
                        {item.prepStatus}
                      </span>

                      {/* Verify Action Button */}
                      {isPrepping && canMutateDispatch && (
                        <button
                          type="button"
                          onClick={() => handleVerifyItem(item.assetId)}
                          disabled={isVerifying}
                          className="inline-flex items-center gap-1 rounded border border-primary bg-primary/10 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-primary hover:bg-primary hover:text-primary-foreground transition disabled:opacity-50"
                        >
                          {isVerifying ? (
                            <RefreshCw className="size-3 animate-spin" />
                          ) : (
                            <PackageCheck className="size-3" />
                          )}
                          Verify Item
                        </button>
                      )}

                      {isAwaitingProduction && (
                        <span className="text-[0.6rem] text-muted-foreground italic hidden sm:inline">
                          Fabrication in progress · locked from staging
                        </span>
                      )}

                      {isCompleted && (
                        <span className="text-[0.6rem] text-muted-foreground italic hidden md:inline">
                          Ready for loading
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* =========================================================================
              ZONE 2: PHYSICAL OUTBOUND DEPARTURE (Consequential Action)
              Only enabled when isPreparationComplete === true && isManifestCurrent === true
             ========================================================================= */}
          <div className="border-t border-border/60 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-card-foreground uppercase tracking-wider">
                Outbound Fleet Departure
              </p>
              <p className="text-[0.65rem] text-muted-foreground">
                Consequential action: transitions all verified assets to In-Transit Outbound.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setDepartureModalOpen(true)}
              disabled={!canDepart}
              title={
                !canMutateDispatch
                  ? 'Requires Warehouse Operations Manager authority'
                  : isManifestStale
                    ? 'Departure blocked: reservation manifest changed'
                    : !prepData?.isPreparationComplete
                      ? 'Departure unavailable: all items must be Completed'
                      : 'Confirm departure of prepared manifest'
              }
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition',
                canDepart
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md cursor-pointer'
                  : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60 border border-border',
              )}
            >
              <Truck className="size-4" />
              Confirm Outbound Departure
            </button>
          </div>
        </div>

        {/* =========================================================================
            ZONE 3: TRANSPORTATION & VEHICLE BATCHES
            Physical transport answers: Have prepared assets progressed through transit?
           ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Transportation Checkpoints &amp; Vehicle Assignments
              </h4>
              <p className="text-[0.62rem] text-muted-foreground">
                Driver handoff logs, transit staging, and delivery checkpoints.
              </p>
            </div>
          </div>

          {batches.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-background px-5 py-8 text-center text-sm text-muted-foreground">
              No dispatch batches created for this event yet.
            </p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
              {batches.map((batch) => (
                <li key={batch.id}>
                  <button
                    type="button"
                    onClick={() => onOpenBatch(batch.id)}
                    className="flex w-full flex-wrap items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-accent cursor-pointer"
                  >
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
                      aria-label={batch.direction === 'outbound' ? 'Outbound / egress' : 'Return / ingress'}
                      title={batch.direction === 'outbound' ? 'Outbound / egress' : 'Return / ingress'}
                    >
                      {batch.direction === 'outbound' ? (
                        <ArrowUp className="size-4" aria-hidden="true" />
                      ) : (
                        <ArrowDown className="size-4" aria-hidden="true" />
                      )}
                    </span>

                    <div className="min-w-0 shrink-0">
                      <p className="truncate text-sm font-medium text-card-foreground">{batch.vehicleType}</p>
                      <p className="truncate text-[0.62rem] uppercase tracking-[0.06em] text-muted-foreground">
                        {batch.plateNumber} · Driver: {batch.driverName || 'Unassigned'}
                      </p>
                    </div>

                    <div className="ml-auto shrink-0">
                      <DispatchStepper direction={batch.direction} stage={batch.stage} stalled={batch.stalled} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* =========================================================================
          HIGH-CONSEQUENCE CONFIRMATION MODAL: Physical Departure
          Deliberate action requiring explicit confirmation before server mutation
         ========================================================================= */}
      {departureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Truck className="size-6" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-card-foreground">
                  Confirm Outbound Departure
                </h3>
                <p className="text-[0.68rem] text-muted-foreground uppercase tracking-wider font-semibold">
                  Physical Transport Milestone · REST Commit
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1 text-xs">
              <p className="font-semibold text-foreground">{event?.title || 'Active Event'}</p>
              <p className="text-muted-foreground">Destination: {event?.venue || 'Venue Pending'}</p>
              <p className="text-muted-foreground">
                Verified Preparation Items: <span className="font-mono font-bold text-foreground">{items.length} item(s)</span>
              </p>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Confirming departure certifies that the transport vehicle has been loaded and has physically departed the facility. All corresponding assets will transition to <strong className="text-foreground">In-Transit Outbound</strong> on the server.
            </p>

            {departureError && (
              <div className="rounded border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{departureError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDepartureModalOpen(false)}
                disabled={isDeparting}
                className="rounded-md border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeparture}
                disabled={isDeparting}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {isDeparting ? <RefreshCw className="size-3.5 animate-spin" /> : <Truck className="size-3.5" />}
                Confirm Departure
              </button>
            </div>
          </div>
        </div>
      )}
    </EventDetailSection>
  )
}
