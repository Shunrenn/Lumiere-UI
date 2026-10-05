import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { PortalEvent } from '@/shared/types'
import type { ExecutivePendingItem } from './ExecutivePendingActions'

export type ExecutiveSummaryDetail =
  | 'total-events'
  | 'in-production'
  | 'completed-events'
  | 'ongoing-events'
  | 'total-reports'
  | 'audit-exceptions'
  | 'resolved-cases'
  | 'pending-verdicts'
  | 'pending-actions'

interface Props {
  detail: ExecutiveSummaryDetail | null
  events: PortalEvent[]
  damageExceptions: Array<{ id: string; assetName: string; boundEvent: string; status: string; logId: string }>
  pendingActions: ExecutivePendingItem[]
  onClose: () => void
}

const eventDetails: Record<Exclude<ExecutiveSummaryDetail, 'pending-actions' | 'total-reports' | 'audit-exceptions' | 'resolved-cases' | 'pending-verdicts'>, { title: string; empty: string; filter: (event: PortalEvent) => boolean }> = {
  'total-events': { title: 'Total Events', empty: 'No events found.', filter: () => true },
  'in-production': { title: 'In Production', empty: 'No events in production.', filter: (event) => event.status === 'In Production' },
  'completed-events': { title: 'Completed Events', empty: 'No completed events found.', filter: (event) => event.status === 'Completed' },
  'ongoing-events': { title: 'Ongoing Events', empty: 'No ongoing events found.', filter: (event) => event.status !== 'Completed' && event.status !== 'Cancelled' },
}

const formatDate = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ExecutiveSummaryDetailModal({ detail, events, damageExceptions, pendingActions, onClose }: Props) {
  const [query, setQuery] = useState('')

  const eventItems = useMemo(() => {
    if (!detail || !(detail in eventDetails)) return []
    const config = eventDetails[detail as keyof typeof eventDetails]
    const normalizedQuery = query.trim().toLowerCase()
    return events.filter(config.filter).filter((event) =>
      !normalizedQuery || `${event.title} ${event.client} ${event.venue} ${event.status}`.toLowerCase().includes(normalizedQuery),
    )
  }, [detail, events, query])

  const reportItems = useMemo(() => {
    if (!detail || ['total-reports', 'audit-exceptions', 'resolved-cases', 'pending-verdicts'].indexOf(detail) === -1) return []
    const filtered = damageExceptions.filter((item) => {
      if (detail === 'audit-exceptions') return item.status === 'Held for Audit' || item.status === 'Pending Second Sign-off'
      if (detail === 'resolved-cases') return !['Pending Verdict', 'Held for Audit', 'Pending Second Sign-off'].includes(item.status)
      if (detail === 'pending-verdicts') return ['Pending Verdict', 'Held for Audit', 'Pending Second Sign-off'].includes(item.status)
      return true
    })
    const normalizedQuery = query.trim().toLowerCase()
    return filtered.filter((item) => `${item.assetName} ${item.boundEvent} ${item.status} ${item.logId}`.toLowerCase().includes(normalizedQuery))
  }, [damageExceptions, detail, query])

  if (!detail) return null

  const isEvents = detail in eventDetails
  const isReports = !isEvents && detail !== 'pending-actions'
  const title = isEvents ? eventDetails[detail as keyof typeof eventDetails].title : detail === 'pending-actions' ? 'Pending Actions' : detail.replaceAll('-', ' ')
  const empty = isEvents ? eventDetails[detail as keyof typeof eventDetails].empty : isReports ? 'No matching reports found.' : 'No pending actions.'
  const isListEmpty = isEvents ? eventItems.length === 0 : isReports ? reportItems.length === 0 : pendingActions.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="executive-summary-title" onClick={onClose}>
      <section className="flex max-h-[min(720px,calc(100vh-2rem))] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between border-b border-border px-5 py-4 sm:px-6">
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Executive Dashboard Detail</p>
            <h2 id="executive-summary-title" className="mt-1 font-serif text-2xl font-medium capitalize text-foreground">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close detail">
            <X aria-hidden="true" />
          </button>
        </header>

        {detail !== 'pending-actions' && (
          <div className="border-b border-border px-5 py-3 sm:px-6">
            <label htmlFor="executive-summary-search" className="sr-only">Search {title.toLowerCase()}</label>
            <input id="executive-summary-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${isEvents ? 'events' : 'reports'}...`} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background focus:ring-2 focus:ring-ring" />
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2 sm:px-6">
          {isListEmpty ? <p className="py-12 text-center text-sm text-muted-foreground">{empty}</p> : isEvents ? (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-card text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="py-3 pr-3">Event</th><th className="hidden py-3 pr-3 sm:table-cell">Client</th><th className="py-3 pr-3">Date</th><th className="py-3">Status</th></tr></thead>
              <tbody>{eventItems.map((event) => <tr key={event.id} className="border-t border-border/70"><td className="py-3 pr-3 font-medium text-foreground">{event.title}<span className="block text-xs font-normal text-muted-foreground sm:hidden">{event.client}</span></td><td className="hidden py-3 pr-3 text-muted-foreground sm:table-cell">{event.client}</td><td className="py-3 pr-3 text-muted-foreground">{formatDate(event.targetDate)}</td><td className="py-3 text-muted-foreground">{event.status}</td></tr>)}</tbody>
            </table>
          ) : isReports ? (
            <table className="w-full text-left text-sm"><thead className="sticky top-0 bg-card text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="py-3 pr-3">Asset</th><th className="hidden py-3 pr-3 sm:table-cell">Event</th><th className="py-3 pr-3">Report</th><th className="py-3">Status</th></tr></thead><tbody>{reportItems.map((item) => <tr key={item.id} className="border-t border-border/70"><td className="py-3 pr-3 font-medium text-foreground">{item.assetName}<span className="block text-xs font-normal text-muted-foreground sm:hidden">{item.boundEvent}</span></td><td className="hidden py-3 pr-3 text-muted-foreground sm:table-cell">{item.boundEvent}</td><td className="py-3 pr-3 text-muted-foreground">{item.logId}</td><td className="py-3 text-muted-foreground">{item.status}</td></tr>)}</tbody></table>
          ) : (
            <ul className="divide-y divide-border/70">{pendingActions.map((item) => <li key={item.id} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-foreground">{item.title}</p><p className="text-sm text-muted-foreground">{item.subtitle}</p></div><button type="button" onClick={item.onAction} className="self-start rounded-md border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-foreground hover:bg-muted">{item.actionLabel || 'View'}</button></li>)}</ul>
          )}
        </div>
        <footer className="flex justify-end border-t border-border px-5 py-3 sm:px-6"><button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-foreground hover:bg-muted">Close</button></footer>
      </section>
    </div>
  )
}

export default ExecutiveSummaryDetailModal
