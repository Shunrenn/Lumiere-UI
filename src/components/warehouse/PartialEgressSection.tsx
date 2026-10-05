import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { usePortal } from '@/lib/store'
import { queueOfflineEgressItemCompletion } from '@/lib/offline/checklistOutbox'
import type {
  EventEgressItemResponse,
  EventEgressResponse,
} from '@/shared/types'
import { cn } from '@/shared/utils'

interface PartialEgressSectionProps {
  eventId: string
  eventTitle?: string
  isSettled?: boolean
  isLead?: boolean
  className?: string
  onNavigateToDamage?: () => void
  onNavigateToAssets?: () => void
}

export function PartialEgressSection({
  eventId,
  eventTitle,
  isSettled,
  isLead,
  className,
  onNavigateToDamage,
  onNavigateToAssets,
}: PartialEgressSectionProps) {
  const { adminRole, isAdmin, hasFullWarehouseAccess, adminEmail } = useAuth()
  const {
    partialEgressesByEvent,
    fetchEventEgress,
    initiateEventEgress,
    completeEgressItem,
    exceptionResolveEgressItem,
    escalateEventEgress,
  } = usePortal()

  const [loading, setLoading] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [initiationNote, setInitiationNote] = useState('')
  const [errorBanner, setErrorBanner] = useState<string | null>(null)
  const [staleVersionBanner, setStaleVersionBanner] = useState(false)
  const [pendingOfflineItemIds, setPendingOfflineItemIds] = useState<string[]>([])

  // Modals for supervisory actions
  const [exceptionModalItem, setExceptionModalItem] = useState<EventEgressItemResponse | null>(null)
  const [exceptionReason, setExceptionReason] = useState('')
  const [escalateModalOpen, setEscalateModalOpen] = useState(false)
  const [escalateReason, setEscalateReason] = useState('')

  // Client time tick for relative display
  const [nowTick, setNowTick] = useState<number>(Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 5000)
    return () => clearInterval(timer)
  }, [])

  // Authoritative roles
  const effectiveRoleLower = (adminRole || '').trim().toLowerCase()
  const isSupervisor =
    isAdmin ||
    hasFullWarehouseAccess ||
    effectiveRoleLower.includes('warehouse manager') ||
    effectiveRoleLower.includes('operations manager') ||
    effectiveRoleLower.includes('wom') ||
    effectiveRoleLower.includes('event admin')

  const canInitiate =
    isSupervisor ||
    Boolean(isLead)

  // Current aggregate
  const egress: EventEgressResponse | undefined = partialEgressesByEvent[eventId]

  const loadAggregate = useCallback(async () => {
    if (!eventId) return
    setLoading(true)
    setErrorBanner(null)
    setStaleVersionBanner(false)
    try {
      await fetchEventEgress(eventId)
    } finally {
      setLoading(false)
    }
  }, [eventId, fetchEventEgress])

  useEffect(() => {
    loadAggregate()
  }, [loadAggregate])

  // Countdown and Overdue calculation based strictly on server timestamp
  const deadlineMs = useMemo(() => {
    if (!egress?.completionDeadlineAt) return null
    return new Date(egress.completionDeadlineAt).getTime()
  }, [egress?.completionDeadlineAt])

  const isServerOrClientOverdue = useMemo(() => {
    if (!egress) return false
    if (egress.isOverdue) return true
    if (deadlineMs && nowTick > deadlineMs && egress.state === 'Pending Completion') {
      return true
    }
    return false
  }, [egress, deadlineMs, nowTick])

  // Periodic deadline expiration check: if local clock crosses deadline, refetch canonical state
  useEffect(() => {
    if (!egress || egress.state !== 'Pending Completion' || !deadlineMs) return
    if (nowTick > deadlineMs && !egress.isOverdue) {
      loadAggregate()
    }
  }, [nowTick, deadlineMs, egress, loadAggregate])

  const formattedDeadline = useMemo(() => {
    if (!egress?.completionDeadlineAt) return '—'
    try {
      return new Date(egress.completionDeadlineAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    } catch {
      return egress.completionDeadlineAt
    }
  }, [egress?.completionDeadlineAt])

  const relativeTimeRemaining = useMemo(() => {
    if (!deadlineMs || !egress || egress.state === 'Completed') return null
    const diff = deadlineMs - nowTick
    if (diff <= 0) {
      const overdueMins = Math.floor(Math.abs(diff) / 60000)
      if (overdueMins < 60) return `Overdue by ${overdueMins}m`
      const hours = Math.floor(overdueMins / 60)
      const mins = overdueMins % 60
      return `Overdue by ${hours}h ${mins}m`
    }
    const remainMins = Math.floor(diff / 60000)
    if (remainMins < 60) return `${remainMins}m remaining`
    const hours = Math.floor(remainMins / 60)
    const mins = remainMins % 60
    return `${hours}h ${mins}m remaining`
  }, [deadlineMs, nowTick, egress])

  /* ---------------------- Handlers ---------------------- */

  const handleInitiate = async () => {
    if (!navigator.onLine) {
      setErrorBanner(
        'Network disconnected. Egress initiation requires an active connection. Offline queuing is rejected for post-egress accountability.',
      )
      return
    }

    setActionInProgress('initiate')
    setErrorBanner(null)
    setStaleVersionBanner(false)

    try {
      const res = await initiateEventEgress(eventId, initiationNote.trim() || undefined)
      if (!res.success) {
        setErrorBanner(res.error)
      } else {
        setInitiationNote('')
      }
    } finally {
      setActionInProgress(null)
    }
  }

  const handleCompleteItem = async (item: EventEgressItemResponse) => {
    if (!egress) return

    if (!navigator.onLine) {
      setActionInProgress(item.id)
      try {
        const userId = adminEmail || 'crew'
        await queueOfflineEgressItemCompletion(
          userId,
          eventId,
          item.id,
          egress.version,
          item.version
        )
        setPendingOfflineItemIds((prev) => [...prev, item.id])
        setErrorBanner(null)
      } catch (err: any) {
        setErrorBanner(`Failed to queue offline: ${err?.message}`)
      } finally {
        setActionInProgress(null)
      }
      return
    }

    setActionInProgress(item.id)
    setErrorBanner(null)
    setStaleVersionBanner(false)

    try {
      const res = await completeEgressItem(eventId, item.id, egress.version, item.version)
      if (!res.success) {
        if (res.isStaleVersion) {
          setStaleVersionBanner(true)
        } else {
          setErrorBanner(res.error)
        }
      }
    } finally {
      setActionInProgress(null)
    }
  }

  const handleExceptionResolveSubmit = async () => {
    if (!egress || !exceptionModalItem) return
    if (exceptionReason.trim().length < 20) {
      setErrorBanner(
        'A detailed operational reason (minimum 20 characters) is required for supervisory exceptions.',
      )
      return
    }
    if (!navigator.onLine) {
      setErrorBanner('Network disconnected. Supervisory exceptions require an active connection.')
      return
    }

    setActionInProgress(`exception-${exceptionModalItem.id}`)
    setErrorBanner(null)
    setStaleVersionBanner(false)

    try {
      const res = await exceptionResolveEgressItem(eventId, exceptionModalItem.id, {
        expectedEgressVersion: egress.version,
        expectedItemVersion: exceptionModalItem.version,
        reason: exceptionReason.trim(),
      })

      if (!res.success) {
        if (res.isStaleVersion) {
          setStaleVersionBanner(true)
        } else {
          setErrorBanner(res.error)
        }
      } else {
        setExceptionModalItem(null)
        setExceptionReason('')
      }
    } finally {
      setActionInProgress(null)
    }
  }

  const handleEscalateSubmit = async () => {
    if (!egress) return
    if (escalateReason.trim().length < 20) {
      setErrorBanner('An operational reason (minimum 20 characters) is required for escalation.')
      return
    }
    if (!navigator.onLine) {
      setErrorBanner('Network disconnected. Escalation requires an active connection.')
      return
    }

    setActionInProgress('escalate')
    setErrorBanner(null)
    setStaleVersionBanner(false)

    try {
      const res = await escalateEventEgress(eventId, {
        expectedVersion: egress.version,
        reason: escalateReason.trim(),
      })

      if (!res.success) {
        if (res.isStaleVersion) {
          setStaleVersionBanner(true)
        } else {
          setErrorBanner(res.error)
        }
      } else {
        setEscalateModalOpen(false)
        setEscalateReason('')
      }
    } finally {
      setActionInProgress(null)
    }
  }

  return (
    <section className={cn('rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm', className)}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-border/70 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-sm font-semibold tracking-wide text-card-foreground">
              Post-Event Partial Egress Accountability
              {eventTitle && <span className="text-muted-foreground ml-1.5 font-normal">· {eventTitle}</span>}
            </h2>

            {/* State Badges */}
            {egress ? (
              <>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider',
                    egress.state === 'Completed'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/25'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-500/25',
                  )}
                >
                  {egress.state}
                </span>

                {isServerOrClientOverdue && egress.state === 'Pending Completion' && (
                  <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 ring-1 ring-inset ring-rose-500/25 flex items-center gap-1">
                    <Clock className="size-3" />
                    Overdue
                  </span>
                )}

                {egress.escalationStatus === 'Escalated' && (
                  <span className="rounded-full bg-purple-500/15 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 ring-1 ring-inset ring-purple-500/25 flex items-center gap-1">
                    <ShieldAlert className="size-3" />
                    Escalated to Management
                  </span>
                )}
              </>
            ) : (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground ring-1 ring-inset ring-border">
                Not Initiated
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Post-event accountability aggregate governing unreturned assets and authoritative HAVA damage declarations.
            Protects warehouse reconciliation before event portfolio settlement.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAggregate}
          disabled={loading}
          className="self-start inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80 disabled:opacity-50 transition"
          title="Refetch canonical server state"
        >
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Error & Stale Version Notifications */}
      {staleVersionBanner && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold">Concurrent Session Conflict (Stale Version)</p>
              <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                This egress record was modified by another session. Please refresh to load verified server state.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadAggregate}
            className="shrink-0 rounded bg-amber-600 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-white hover:bg-amber-700"
          >
            Refresh Server State
          </button>
        </div>
      )}

      {errorBanner && (
        <div className="mt-4 rounded-lg border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-semibold">Action Rejected by Backend</p>
              <p className="mt-0.5 text-rose-800 dark:text-rose-300">{errorBanner}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-rose-600 hover:text-rose-800 dark:text-rose-400 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* State View 1: Not Initiated */}
      {!loading && !egress && (
        <div className="mt-5 rounded-lg border border-dashed border-border p-6 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">
            <Clock className="size-5 text-muted-foreground" />
          </div>
          <h3 className="mt-3 text-xs font-bold uppercase tracking-wider text-foreground">
            Awaiting Post-Event Departure Accountability
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            When ground crew completes teardown at the venue, initiating Partial Egress snapshots unreturned assets
            and open HAVA damage declarations into a time-bounded accountability window.
          </p>

          {canInitiate ? (
            <div className="mt-4 mx-auto max-w-md space-y-3">
              <input
                type="text"
                value={initiationNote}
                onChange={(e) => setInitiationNote(e.target.value)}
                placeholder="Optional field departure / handoff note..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={handleInitiate}
                disabled={actionInProgress === 'initiate' || isSettled}
                className="w-full rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {actionInProgress === 'initiate' ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="size-3.5" />
                )}
                Initiate Partial Egress
              </button>
            </div>
          ) : (
            <p className="mt-3 text-[0.7rem] text-muted-foreground font-medium">
              Requires Event Lead or supervisory authority to initiate post-event partial egress.
            </p>
          )}
        </div>
      )}

      {/* State View 2: Active or Completed Egress */}
      {egress && (
        <div className="mt-5 space-y-5">
          {/* Metadata & Deadline Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 rounded-lg bg-muted/40 border border-border/80 text-xs">
            <div>
              <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground block">
                Completion Deadline
              </span>
              <p className="mt-0.5 font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="size-3.5 text-muted-foreground shrink-0" />
                {formattedDeadline}
              </p>
              {relativeTimeRemaining && (
                <span
                  className={cn(
                    'text-[0.68rem] font-medium mt-0.5 block',
                    isServerOrClientOverdue ? 'text-rose-600 font-bold' : 'text-muted-foreground',
                  )}
                >
                  {relativeTimeRemaining}
                </span>
              )}
            </div>

            <div>
              <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground block">
                Snapshotted Window
              </span>
              <p className="mt-0.5 font-semibold text-foreground">
                {egress.completionWindowMinutes} minutes
              </p>
              <span className="text-[0.65rem] text-muted-foreground">Persisted policy snapshot</span>
            </div>

            <div>
              <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground block">
                Accountability Items
              </span>
              <p className="mt-0.5 font-semibold text-foreground">
                {egress.outstandingItems.length} Outstanding / {egress.items.length} Total
              </p>
              <span className="text-[0.65rem] text-muted-foreground">
                {egress.items.filter((i) => i.status === 'Resolved').length} resolved ·{' '}
                {egress.items.filter((i) => i.status === 'Exception Resolved').length} exception
              </span>
            </div>

            <div>
              <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground block">
                Egress Record Version
              </span>
              <p className="mt-0.5 font-semibold text-foreground">v{egress.version}</p>
              <span className="text-[0.65rem] text-muted-foreground">
                Initiated {new Date(egress.egressedAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Escalation Alert Banner if Overdue and not yet Escalated */}
          {isServerOrClientOverdue &&
            egress.state === 'Pending Completion' &&
            egress.escalationStatus !== 'Escalated' && (
              <div className="rounded-lg border border-rose-300 bg-rose-50/90 p-4 text-xs text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="size-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <p className="font-bold text-rose-900 dark:text-rose-300">
                      Completion Window Expired · Managerial Escalation Required
                    </p>
                    <p className="mt-0.5 text-rose-800 dark:text-rose-400">
                      The {egress.completionWindowMinutes}-minute window has elapsed. Routine field completion is
                      locked. A Warehouse Manager or WOM must formally escalate this egress before supervisor resolutions
                      can proceed.
                    </p>
                  </div>
                </div>
                {isSupervisor ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEscalateReason('')
                      setEscalateModalOpen(true)
                    }}
                    className="shrink-0 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-rose-700 transition"
                  >
                    Escalate to Management
                  </button>
                ) : (
                  <span className="shrink-0 text-[0.68rem] font-semibold text-rose-700 dark:text-rose-400">
                    Manager authority required to escalate
                  </span>
                )}
              </div>
            )}

          {/* Escalation Recorded Banner */}
          {egress.escalationStatus === 'Escalated' && (
            <div className="rounded-lg border border-purple-300 bg-purple-50/90 p-3.5 text-xs text-purple-950 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-200">
              <div className="flex items-center gap-2 font-bold text-purple-900 dark:text-purple-300">
                <ShieldAlert className="size-4 text-purple-600" />
                Overdue Egress Formally Escalated
              </div>
              <p className="mt-1 text-purple-800 dark:text-purple-400">
                <strong>Reason:</strong> {egress.escalationReason || 'Management escalation logged.'}
              </p>
              {egress.escalatedAt && (
                <span className="mt-1 text-[0.65rem] text-purple-600 dark:text-purple-400 block">
                  Escalated on {new Date(egress.escalatedAt).toLocaleString()}
                </span>
              )}
            </div>
          )}

          {/* Completion State Banner */}
          {egress.state === 'Completed' && (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50/90 p-4 text-xs text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="size-5 shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-900 dark:text-emerald-300">
                  Post-Event Accountability Fully Completed
                </p>
                <p className="mt-0.5 text-emerald-800 dark:text-emerald-400">
                  All asset return items and authoritative HAVA declarations have been verified and resolved.
                  {egress.completedAfterDeadline && ' (Resolved post-deadline via supervisory authorization).'}
                </p>
                {egress.completedAt && (
                  <span className="mt-1 text-[0.65rem] text-emerald-700 dark:text-emerald-400 block">
                    Completed on {new Date(egress.completedAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Items Accountability List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-card-foreground">
                Accountability Manifest ({egress.items.length})
              </h3>
              <span className="text-[0.68rem] text-muted-foreground">
                {egress.outstandingItems.length} outstanding
              </span>
            </div>

            {egress.items.length === 0 ? (
              <div className="p-4 rounded-lg border border-border bg-muted/20 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="size-4 text-emerald-600 inline mr-1.5" />
                All assets were accounted for at departure. No outstanding items recorded.
              </div>
            ) : (
              <div className="divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
                {egress.items.map((item) => {
                  const isOutstanding = item.status === 'Outstanding'
                  const isHava = item.itemType === 'HAVA Declaration Finalization'
                  const isOverdue = isServerOrClientOverdue
                  const isEscalated = egress.escalationStatus === 'Escalated'

                  // Button enablement rule:
                  // Complete:
                  // - before deadline: Ground Crew, Warehouse Lead, Manager, WOM, Admin
                  // - after deadline: Manager, WOM, Admin ONLY, AND must be Escalated
                  const canComplete =
                    isOutstanding && (!isOverdue ? canInitiate : isSupervisor && isEscalated)

                  // Exception Resolve:
                  // - Manager, WOM, Admin ONLY
                  // - after deadline ONLY
                  // - must be Escalated
                  // - NOT allowed for HAVA (cannot bypass HAVA)
                  const canExceptionResolve =
                    isOutstanding && isSupervisor && isOverdue && isEscalated && !isHava

                  const itemProcessing =
                    actionInProgress === item.id || actionInProgress === `exception-${item.id}`

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs transition',
                        isOutstanding ? 'bg-card' : 'bg-muted/15',
                      )}
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider',
                              isHava
                                ? 'bg-sky-500/15 text-sky-700 dark:text-sky-400 ring-1 ring-inset ring-sky-500/25'
                                : 'bg-slate-500/15 text-slate-700 dark:text-slate-300 ring-1 ring-inset ring-slate-500/25',
                            )}
                          >
                            {item.itemType}
                          </span>

                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider',
                              pendingOfflineItemIds.includes(item.id)
                                ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                                : item.status === 'Resolved'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                : item.status === 'Exception Resolved'
                                ? 'bg-purple-500/15 text-purple-700 dark:text-purple-400'
                                : isOverdue
                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
                            )}
                          >
                            {pendingOfflineItemIds.includes(item.id) ? 'Pending Sync' : item.status}
                          </span>

                          {item.resolvedAfterDeadline && (
                            <span className="rounded-full bg-muted px-1.5 py-0.2 text-[0.55rem] font-semibold uppercase text-muted-foreground">
                              Resolved Post-Deadline
                            </span>
                          )}
                        </div>

                        <p className="font-semibold text-foreground">{item.checkpoint}</p>

                        <div className="flex flex-wrap items-center gap-3 text-[0.68rem] text-muted-foreground">
                          {item.assetId && (
                            <span className="flex items-center gap-1">
                              Asset ID:{' '}
                              <code className="text-foreground font-mono">{item.assetId.substring(0, 8)}...</code>
                              {onNavigateToAssets && (
                                <button
                                  type="button"
                                  onClick={onNavigateToAssets}
                                  className="text-primary hover:underline ml-1 font-semibold"
                                >
                                  (View in Catalog)
                                </button>
                              )}
                            </span>
                          )}
                          {item.damageReportId && (
                            <span className="flex items-center gap-1">
                              HAVA Declaration:{' '}
                              <code className="text-foreground font-mono">
                                {item.damageReportId.substring(0, 8)}...
                              </code>
                              {onNavigateToDamage && (
                                <button
                                  type="button"
                                  onClick={onNavigateToDamage}
                                  className="text-sky-600 dark:text-sky-400 hover:underline ml-1 font-semibold"
                                >
                                  (Review HAVA)
                                </button>
                              )}
                            </span>
                          )}
                          <span>Created {new Date(item.createdAt).toLocaleTimeString()}</span>
                        </div>

                        {/* Resolution Details */}
                        {item.resolutionMethod && (
                          <div className="mt-1 text-[0.68rem] text-muted-foreground bg-muted/30 p-2 rounded border border-border/50">
                            <span className="font-semibold text-foreground">Method:</span> {item.resolutionMethod}
                            {item.resolutionReason && (
                              <span className="ml-2">
                                <span className="font-semibold text-foreground">Rationale:</span>{' '}
                                {item.resolutionReason}
                              </span>
                            )}
                          </div>
                        )}

                        {/* HAVA Rule notice */}
                        {isHava && isOutstanding && (
                          <p className="text-[0.65rem] text-sky-700 dark:text-sky-400 font-medium flex items-center gap-1">
                            <AlertCircle className="size-3 shrink-0" />
                            Authoritative HAVA evidence rule: Must reach 'Finalized' in Damage Validation to complete.
                            Cannot be bypassed.
                          </p>
                        )}
                      </div>

                      {/* Interactive Controls */}
                      {isOutstanding && (
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {/* Complete Item Button */}
                          <button
                            type="button"
                            onClick={() => handleCompleteItem(item)}
                            disabled={!canComplete || itemProcessing || pendingOfflineItemIds.includes(item.id)}
                            title={
                              pendingOfflineItemIds.includes(item.id)
                                ? 'Item completion queued for offline synchronization'
                                : !canComplete
                                ? isOverdue && !isEscalated
                                  ? 'Item completion locked: Overdue egress must be escalated first'
                                  : isOverdue && !isSupervisor
                                  ? 'Only Warehouse Managers or WOM can complete overdue items'
                                  : 'Unauthorized action'
                                : 'Complete item verification'
                            }
                            className={cn(
                              'rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition flex items-center gap-1.5',
                              pendingOfflineItemIds.includes(item.id)
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-400/40 cursor-default'
                                : canComplete
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60',
                            )}
                          >
                            {actionInProgress === item.id ? (
                              <RefreshCw className="size-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="size-3.5" />
                            )}
                            {pendingOfflineItemIds.includes(item.id) ? 'Queued (Pending Sync)' : 'Complete Item'}
                          </button>

                          {/* Supervisor Exception Button */}
                          {isSupervisor && !isHava && (
                            <button
                              type="button"
                              onClick={() => {
                                setExceptionModalItem(item)
                                setExceptionReason('')
                              }}
                              disabled={!canExceptionResolve || itemProcessing}
                              title={
                                !canExceptionResolve
                                  ? !isOverdue
                                    ? 'Supervisory exception is available only after completion deadline'
                                    : !isEscalated
                                    ? 'Requires egress to be escalated before supervisor exception'
                                    : 'Unauthorized action'
                                  : 'Record supervisory exception'
                              }
                              className={cn(
                                'rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition flex items-center gap-1.5',
                                canExceptionResolve
                                  ? 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
                                  : 'border-border bg-muted text-muted-foreground cursor-not-allowed opacity-50',
                              )}
                            >
                              <ShieldCheck className="size-3.5" />
                              Supervisor Exception
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Supervisory Exception Modal */}
      {exceptionModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Record Supervisory Exception</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Overrides overdue item accountability with an authoritative managerial justification.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExceptionModalItem(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ×
              </button>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
              <p>
                <strong className="text-foreground">Item:</strong> {exceptionModalItem.checkpoint}
              </p>
              <p>
                <strong className="text-foreground">Type:</strong> {exceptionModalItem.itemType}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Detailed Operational Rationale <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                placeholder="Explain why this item is resolved as an exception (minimum 20 characters)..."
                rows={4}
                className="w-full rounded-lg border border-input bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
              />
              <span
                className={cn(
                  'text-[0.65rem] mt-1 block',
                  exceptionReason.trim().length >= 20 ? 'text-muted-foreground' : 'text-rose-600 font-medium',
                )}
              >
                {exceptionReason.trim().length} / 20 minimum characters
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setExceptionModalItem(null)}
                className="rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExceptionResolveSubmit}
                disabled={exceptionReason.trim().length < 20 || actionInProgress !== null}
                className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 transition"
              >
                Confirm Exception Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalate Modal */}
      {escalateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Escalate Overdue Partial Egress</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Escalates the uncompleted egress to Warehouse Management for supervisory follow-up.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEscalateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ×
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Escalation Operational Reason <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                placeholder="Explain the circumstances preventing timely completion (minimum 20 characters)..."
                rows={4}
                className="w-full rounded-lg border border-input bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
              />
              <span
                className={cn(
                  'text-[0.65rem] mt-1 block',
                  escalateReason.trim().length >= 20 ? 'text-muted-foreground' : 'text-rose-600 font-medium',
                )}
              >
                {escalateReason.trim().length} / 20 minimum characters
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setEscalateModalOpen(false)}
                className="rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEscalateSubmit}
                disabled={escalateReason.trim().length < 20 || actionInProgress !== null}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50 transition"
              >
                Confirm Escalation
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
