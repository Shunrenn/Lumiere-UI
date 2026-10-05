import { useEffect, useState, useCallback } from 'react'
import {
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  XCircle,
} from 'lucide-react'
import {
  subscribeSyncEngine,
  triggerOutboxReplay,
  type SyncEngineStatus,
} from '@/lib/offline/offlineReplayEngine'
import { getUserMutations, type MutationOutboxEntry } from '@/lib/offline/db'
import { getPendingQueue } from '@/lib/offlineQueue'
import { subscribeOfflineSync, triggerOfflineReplay } from '@/lib/offlineReplay'
import { cn } from '@/shared/utils'

interface PwaSyncStatusBarProps {
  userId: string | null
  className?: string
  onSyncComplete?: () => void
}

export function PwaSyncStatusBar({
  userId,
  className,
  onSyncComplete,
}: PwaSyncStatusBarProps) {
  const [status, setStatus] = useState<SyncEngineStatus>({
    state: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'idle',
    pendingCount: 0,
    conflictCount: 0,
    lastSyncAt: null,
  })
  const [havaPendingCount, setHavaPendingCount] = useState<number>(0)
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [showConflicts, setShowConflicts] = useState(false)
  const [conflictList, setConflictList] = useState<MutationOutboxEntry<any>[]>([])
  const [manualSyncing, setManualSyncing] = useState(false)

  // Listen to network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Subscribe to central offline replay engine
  useEffect(() => {
    const unsubscribe = subscribeSyncEngine((newStatus) => {
      setStatus(newStatus)
    })
    return () => unsubscribe()
  }, [])

  // Subscribe to HAVA declaration queue
  useEffect(() => {
    let active = true
    const checkHava = async () => {
      try {
        const q = await getPendingQueue()
        if (active) setHavaPendingCount(q.length)
      } catch {
        if (active) setHavaPendingCount(0)
      }
    }
    void checkHava()
    const unsubHava = subscribeOfflineSync((count) => {
      if (active) setHavaPendingCount(count)
    })
    return () => {
      active = false
      unsubHava()
    }
  }, [])

  // Load conflict details when conflictCount > 0
  const loadConflicts = useCallback(async () => {
    if (!userId) return
    try {
      const conflicts = await getUserMutations(userId, ['conflict'])
      setConflictList(conflicts)
    } catch {
      setConflictList([])
    }
  }, [userId])

  useEffect(() => {
    if (status.conflictCount > 0) {
      void loadConflicts()
    } else {
      setConflictList([])
    }
  }, [status.conflictCount, loadConflicts])

  const handleManualSync = async () => {
    if (!userId || !isOnline || manualSyncing) return
    setManualSyncing(true)
    try {
      await Promise.allSettled([
        triggerOutboxReplay(userId),
        triggerOfflineReplay(),
      ])
      const q = await getPendingQueue().catch(() => [])
      setHavaPendingCount(q.length)
      if (onSyncComplete) {
        onSyncComplete()
      }
    } finally {
      setManualSyncing(false)
    }
  }

  const totalPending = status.pendingCount + havaPendingCount
  const isSyncing = status.state === 'syncing' || manualSyncing

  return (
    <div className={cn('w-full space-y-2', className)}>
      {/* Primary Reconciliation Status Pill */}
      <div
        className={cn(
          'flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all duration-200',
          !isOnline
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
            : isSyncing
            ? 'bg-sky-500/10 border-sky-500/30 text-sky-800 dark:text-sky-300'
            : status.conflictCount > 0
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
            : totalPending > 0
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
            : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-300'
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {!isOnline ? (
            <WifiOff className="size-4 shrink-0 text-amber-600 dark:text-amber-400 animate-pulse" />
          ) : isSyncing ? (
            <RefreshCw className="size-4 shrink-0 text-sky-600 dark:text-sky-400 animate-spin" />
          ) : status.conflictCount > 0 ? (
            <AlertTriangle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
          ) : totalPending > 0 ? (
            <RefreshCw className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          ) : (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          )}

          <div className="truncate">
            {!isOnline ? (
              <span>
                <strong className="font-semibold">Offline</strong> —{' '}
                {totalPending > 0
                  ? `${totalPending} item${totalPending > 1 ? 's' : ''} queued in device storage (${status.pendingCount} ops, ${havaPendingCount} HAVA)`
                  : 'mutations and evidence will queue safely'}
              </span>
            ) : isSyncing ? (
              <span>
                <strong className="font-semibold">Syncing</strong> — replaying queued mutations and evidence to server...
              </span>
            ) : status.conflictCount > 0 ? (
              <span>
                <strong className="font-semibold">{status.conflictCount} Conflict / Needs Attention</strong>
              </span>
            ) : status.pendingCount > 0 && havaPendingCount > 0 ? (
              <span>
                <strong className="font-semibold">{status.pendingCount} Ops & {havaPendingCount} HAVA Pending Sync</strong>
              </span>
            ) : status.pendingCount > 0 ? (
              <span>
                <strong className="font-semibold">{status.pendingCount} Pending Sync</strong> — operational changes
              </span>
            ) : havaPendingCount > 0 ? (
              <span>
                <strong className="font-semibold">{havaPendingCount} HAVA Evidence Pending Sync</strong> — forensic reports
              </span>
            ) : (
              <span>
                <strong className="font-semibold">Server Confirmed</strong> — verified current state
              </span>
            )}
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {status.conflictCount > 0 && (
            <button
              type="button"
              onClick={() => setShowConflicts(!showConflicts)}
              className="inline-flex items-center gap-1 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 transition"
            >
              {showConflicts ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              Details
            </button>
          )}

          {isOnline && (status.pendingCount > 0 || status.conflictCount > 0) && (
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[0.68rem] font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition"
            >
              <RefreshCw className={cn('size-3', isSyncing && 'animate-spin')} />
              Sync Now
            </button>
          )}
        </div>
      </div>

      {/* Expandable Conflict / Needs Attention Section */}
      {showConflicts && conflictList.length > 0 && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-50/50 p-3 dark:bg-rose-950/20 space-y-2 text-xs">
          <div className="flex items-center justify-between font-semibold text-rose-900 dark:text-rose-200">
            <span className="flex items-center gap-1.5">
              <XCircle className="size-3.5 text-rose-600 dark:text-rose-400" />
              Operations Requiring Attention
            </span>
            <span className="text-[0.65rem] text-rose-700 dark:text-rose-300 font-normal">
              Server authoritative rules preserved
            </span>
          </div>

          <div className="divide-y divide-rose-200 dark:divide-rose-900/50">
            {conflictList.map((entry) => (
              <div key={entry.id} className="py-2 space-y-1">
                <div className="flex items-center justify-between text-[0.7rem]">
                  <span className="font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                    {entry.domain} · {entry.action}
                  </span>
                  <span className="text-muted-foreground text-[0.65rem]">
                    {new Date(entry.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-rose-700 dark:text-rose-400 text-[0.7rem] leading-snug">
                  {entry.lastError || 'Rejected by backend validation (stale version or invalid state).'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
