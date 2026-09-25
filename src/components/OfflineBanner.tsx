import { useEffect, useState } from 'react'
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react'
import { subscribeOfflineSync, triggerOfflineReplay } from '@/lib/offlineReplay'
import { cn } from '@/lib/utils'

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0)
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [justReconnected, setJustReconnected] = useState<boolean>(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setJustReconnected(true)
      const timer = setTimeout(() => setJustReconnected(false), 4000)
      return () => clearTimeout(timer)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setJustReconnected(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const unsubscribe = subscribeOfflineSync((count, syncing) => {
      setPendingSyncCount(count)
      setIsSyncing(syncing)
    })

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      unsubscribe()
    }
  }, [])

  if (isOnline && !justReconnected && pendingSyncCount === 0) {
    return null
  }

  if (!isOnline) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="fixed top-2 left-1/2 z-[9999] flex w-[calc(100%-1.5rem)] max-w-[420px] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-950/90 px-4 py-2.5 text-amber-200 shadow-xl backdrop-blur-md transition-all"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
            <WifiOff className="size-4 animate-pulse" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-100">
              Offline Mode
            </p>
            <p className="truncate text-[0.65rem] text-amber-200/80">
              Changes saved locally; will sync upon reconnect
            </p>
          </div>
        </div>

        {pendingSyncCount > 0 && (
          <span className="inline-flex shrink-0 items-center rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-[0.625rem] font-bold text-amber-300">
            {pendingSyncCount} queued
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-2 left-1/2 z-[9999] flex w-[calc(100%-1.5rem)] max-w-[420px] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/90 px-4 py-2.5 text-emerald-200 shadow-xl backdrop-blur-md transition-all"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
          <CheckCircle2 className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-100">
            Connection Restored
          </p>
          <p className="truncate text-[0.65rem] text-emerald-200/80">
            Syncing queued changes to backend
          </p>
        </div>
      </div>

      {pendingSyncCount > 0 && (
        <button
          type="button"
          onClick={() => triggerOfflineReplay()}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/20 px-3 text-[0.65rem] font-bold uppercase tracking-wider text-emerald-100 transition-all hover:bg-emerald-500/30 active:scale-95"
        >
          <RefreshCw className={cn('size-3.5', isSyncing && 'animate-spin')} aria-hidden="true" />
          Sync now
        </button>
      )}
    </div>
  )
}
