import { Fragment, useMemo, useState } from 'react'
import { ChevronDown, Download, Search } from 'lucide-react'
import { ExecutiveShell } from '@/components/executive/ExecutiveShell'
import { usePortal } from '@/lib/store'
import { useNav } from '@/lib/nav'
import { cn } from '@/lib/utils'
import type { ExecutiveDestinationId } from '@/lib/executive-destinations'
import { getOperationalEvents, type OperationalEventStatus } from '@/lib/operational-events'

const STATUS_FILTERS = ['All', 'Success', 'Flagged', 'Approved', 'Pending'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

const ROLE_FILTERS = [
  'All',
  'Executive',
  'Warehouse Manager',
  'Ground Crew',
  'Field Lead',
] as const
type RoleFilter = (typeof ROLE_FILTERS)[number]

const statusStyles: Record<OperationalEventStatus, string> = {
  Success: 'bg-emerald-100 text-emerald-700',
  Flagged: 'bg-rose-100 text-rose-700',
  Approved: 'bg-sky-100 text-sky-700',
  Pending: 'bg-amber-100 text-amber-800',
}

const roleStyles: Record<string, string> = {
  Admin: 'bg-emerald-100 text-emerald-700',
  Executive: 'bg-indigo-100 text-indigo-700',
  'Warehouse Manager': 'bg-amber-100 text-amber-800',
  'Ground Crew': 'bg-rose-100 text-rose-700',
  'Field Lead': 'bg-rose-100 text-rose-700',
}

export function OperationalAuditLogsPage() {
  const { events, damageExceptions, procurement } = usePortal()
  const { navigate } = useNav()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('All')
  const [role, setRole] = useState<RoleFilter>('All')
  const [expanded, setExpanded] = useState<string | null>(null)

  const allLogs = useMemo(
    () => getOperationalEvents(events, damageExceptions, procurement),
    [events, damageExceptions, procurement],
  )

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allLogs.filter((entry) => {
      const matchesStatus = status === 'All' || entry.status === status
      const matchesRole = role === 'All' || entry.initiatorRole === role
      const matchesQuery =
        !q ||
        entry.eventType.toLowerCase().includes(q) ||
        entry.title.toLowerCase().includes(q) ||
        entry.account.toLowerCase().includes(q) ||
        entry.id.toLowerCase().includes(q)
      return matchesStatus && matchesRole && matchesQuery
    })
  }, [allLogs, query, status, role])

  const exportCsv = () => {
    const header = 'Timestamp,Date,Log ID,Account,Role,Event Type,Detail,Status,IP\n'
    const body = rows
      .map((r) =>
        [r.timestamp, r.date, r.id, r.account, r.initiatorRole, r.eventType, r.detail, r.status, r.ip]
          .map((field) => `"${field}"`)
          .join(','),
      )
      .join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lumiere-operational-audit-logs.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const destination = (id: ExecutiveDestinationId) => navigate(id)

  const stickyHeader = (
    <div>
      <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
        Operational Audit Logs
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
        A unified, read-only trail of event, asset, and damage-adjudication activity across the
        operations portfolio.
      </p>
    </div>
  )

  return (
    <ExecutiveShell activeId="logs" onSelect={destination} stickyHeader={stickyHeader}>
      <div className="mb-5 mt-6 flex flex-col gap-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search event type, account, or log ID"
              className="w-full rounded-md border border-input bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <Download className="size-3.5" aria-hidden="true" />
            Export CSV
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Status
            </span>
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                aria-pressed={status === s}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
                  status === s
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Role
            </span>
            {ROLE_FILTERS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                aria-pressed={role === r}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
                  role === r
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        Showing {rows.length} of {allLogs.length} operational events. Click a row to reveal full
        detail and network metadata.
      </p>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-muted">
                {['Timestamp', 'Log ID', 'Account', 'Role', 'Event', 'Status', ''].map((h, i) => (
                  <th
                    key={h || `col-${i}`}
                    className="bg-muted px-4 py-3 text-[0.56rem] font-bold uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-20 text-center text-sm italic text-muted-foreground">
                    No matching log entries — try adjusting your filters.
                  </td>
                </tr>
              ) : (
                rows.map((entry) => {
                  const open = expanded === entry.id
                  return (
                    <Fragment key={entry.id}>
                      <tr
                        onClick={() => setExpanded(open ? null : entry.id)}
                        className={cn(
                          'cursor-pointer border-t border-border/60 align-top transition-colors hover:bg-muted/40',
                          open && 'bg-muted/40',
                        )}
                        aria-expanded={open}
                      >
                        <td className="px-4 py-4 text-[0.65rem] text-muted-foreground">
                          <p className="font-semibold text-card-foreground">{entry.timestamp}</p>
                          <p>{entry.date}</p>
                        </td>
                        <td className="px-4 py-4 text-[0.65rem] font-medium text-muted-foreground">
                          {entry.id}
                        </td>
                        <td className="px-4 py-4 text-xs font-semibold text-card-foreground">
                          {entry.account}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={cn(
                              'inline-block rounded px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.1em]',
                              roleStyles[entry.initiatorRole] ?? 'bg-muted text-muted-foreground',
                            )}
                          >
                            {entry.initiatorRole}
                          </span>
                        </td>
                        <td className="max-w-md px-4 py-4">
                          <p className="text-xs font-semibold text-card-foreground">{entry.eventType}</p>
                          <p className="mt-0.5 text-[0.65rem] text-muted-foreground">{entry.title}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={cn(
                              'inline-block rounded-full px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em]',
                              statusStyles[entry.status],
                            )}
                          >
                            {entry.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <ChevronDown
                            className={cn(
                              'inline size-4 text-muted-foreground transition-transform',
                              open && 'rotate-180',
                            )}
                            aria-hidden="true"
                          />
                        </td>
                      </tr>
                      {open && (
                        <tr className="border-t border-border/60 bg-muted/20">
                          <td colSpan={7} className="px-4 pb-5 pt-1">
                            <div className="admin-fade rounded-lg border border-border bg-background/60 p-4">
                              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                                Details
                              </p>
                              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                                {entry.detail}
                              </p>
                              <p className="mt-3 font-mono text-[0.65rem] text-muted-foreground">
                                IP: {entry.ip}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ExecutiveShell>
  )
}