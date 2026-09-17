import { useMemo } from 'react'
import { X, Users, Calendar, AlertTriangle, ShieldCheck } from 'lucide-react'
import { usePortal } from '@/lib/store'

interface AnalyticsDetailModalProps {
  open: boolean
  onClose: () => void
  title: string
  monthLabel: string
  totalCount: number
  category: 'users' | 'events' | 'damage' | 'security'
}

export function AnalyticsDetailModal({
  open,
  onClose,
  title,
  monthLabel,
  totalCount,
  category,
}: AnalyticsDetailModalProps) {
  const { staff, events, damageExceptions, logs } = usePortal()

  const monthName = useMemo(() => {
    const months: Record<string, string> = {
      Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April',
      May: 'May', Jun: 'June', Jul: 'July', Aug: 'August',
      Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December',
    }
    return months[monthLabel] || monthLabel
  }, [monthLabel])

  const userItems = useMemo(() => {
    if (category !== 'users') return []
    return staff.filter((s) => {
      if (!s.dateAdded) return true
      const date = new Date(s.dateAdded)
      const m = date.toLocaleString('en-US', { month: 'short' })
      return m === monthLabel
    })
  }, [staff, monthLabel, category])

  const eventItems = useMemo(() => {
    if (category !== 'events') return []
    return events.filter((e) => {
      const dateStr = e.targetDate
      if (!dateStr) return true
      const date = new Date(dateStr)
      const m = date.toLocaleString('en-US', { month: 'short' })
      return m === monthLabel
    })
  }, [events, monthLabel, category])

  const damageItems = useMemo(() => {
    if (category !== 'damage') return []
    return damageExceptions.filter((d) => {
      const dateStr = d.capturedAt
      if (!dateStr) return true
      const date = new Date(dateStr)
      const m = date.toLocaleString('en-US', { month: 'short' })
      return m === monthLabel
    })
  }, [damageExceptions, monthLabel, category])

  const securityItems = useMemo(() => {
    if (category !== 'security') return []
    return logs.filter((l) => {
      if (!l.date) return true
      const date = new Date(l.date)
      const m = date.toLocaleString('en-US', { month: 'short' })
      return m === monthLabel
    })
  }, [logs, monthLabel, category])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              {category === 'users' && <Users className="size-4 text-primary" />}
              {category === 'events' && <Calendar className="size-4 text-sky-500" />}
              {category === 'damage' && <AlertTriangle className="size-4 text-rose-500" />}
              {category === 'security' && <ShieldCheck className="size-4 text-emerald-500" />}
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Data Point Detail · {monthName} 2026
              </span>
            </div>
            <h2 className="mt-1 font-serif text-2xl font-medium text-foreground">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-muted/40 p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close detail modal"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Aggregate Banner */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <span className="text-xs font-semibold text-foreground">
            Total Aggregate for {monthName}:
          </span>
          <span className="rounded-full bg-primary/10 px-3 py-1 font-serif text-lg font-bold text-primary">
            {totalCount} {category === 'users' ? 'members' : category === 'events' ? 'events' : category === 'damage' ? 'reports' : 'events'}
          </span>
        </div>

        {/* Content List */}
        <div className="mt-4 max-h-[50vh] overflow-y-auto pr-1 space-y-2">
          {category === 'users' && (
            userItems.length > 0 ? (
              userItems.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-lg border border-border/80 bg-background/60 p-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{u.firstName} {u.surname}</p>
                    <p className="text-[0.65rem] text-muted-foreground">{u.role} · {u.email}</p>
                  </div>
                  <span className="text-[0.6rem] font-semibold text-primary">{u.accountStatus || 'Active'}</span>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Showing {totalCount} cumulative staff registered through {monthName}.
              </p>
            )
          )}

          {category === 'events' && (
            eventItems.length > 0 ? (
              eventItems.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border border-border/80 bg-background/60 p-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{e.title}</p>
                    <p className="text-[0.65rem] text-muted-foreground">{e.venue} · {e.client}</p>
                  </div>
                  <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[0.6rem] font-bold text-sky-600">
                    {e.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Showing {totalCount} events active in {monthName}.
              </p>
            )
          )}

          {category === 'damage' && (
            damageItems.length > 0 ? (
              damageItems.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border border-border/80 bg-background/60 p-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{d.assetName}</p>
                    <p className="text-[0.65rem] text-muted-foreground">{d.boundEvent} · {d.damageType}</p>
                  </div>
                  <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[0.6rem] font-bold text-rose-600">
                    {d.status || 'Pending Verdict'}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Showing {totalCount} damage exceptions recorded in {monthName}.
              </p>
            )
          )}

          {category === 'security' && (
            securityItems.length > 0 ? (
              securityItems.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-lg border border-border/80 bg-background/60 p-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{l.action}</p>
                    <p className="text-[0.65rem] text-muted-foreground">{l.account} · {l.ip}</p>
                  </div>
                  <span className="text-[0.6rem] font-semibold text-emerald-600">{l.status}</span>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Showing {totalCount} security events recorded in {monthName}.
              </p>
            )
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="button-primary text-xs"
          >
            Close Detail
          </button>
        </div>
      </div>
    </div>
  )
}
