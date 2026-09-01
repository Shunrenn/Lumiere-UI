import { useMemo, useState } from 'react'
import { Search, Download } from 'lucide-react'
import { ExecutiveShell } from '@/components/executive/ExecutiveShell'
import { usePortal } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { useNav } from '@/lib/nav'
import { cn } from '@/lib/utils'
import type { ExecutiveDestinationId } from '@/lib/executive-destinations'

const roleStyles: Record<string, string> = {
  Admin: 'bg-emerald-100 text-emerald-700',
  Executive: 'bg-indigo-100 text-indigo-700',
  'Warehouse Manager': 'bg-amber-100 text-amber-800',
  'Warehouse Supervisor': 'bg-amber-100 text-amber-800',
  'Event Planner': 'bg-sky-100 text-sky-700',
  'Ground Crew': 'bg-rose-100 text-rose-700',
}

export function ActivityLogsPage() {
  const { logs } = usePortal()
  const { isAdmin } = useAuth()
  const { navigate } = useNav()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')

  // Admin sees system-wide audit logs; Executive sees operational audit logs.
  const isSystemAudit = isAdmin
  const logTitle = isSystemAudit ? 'Security Audit Logs' : 'Operational Audit Logs'
  const logSubtitle = isSystemAudit
    ? 'System-wide security and administrative audit trail — all roles, all actions, read-only record.'
    : 'Operational event, asset, and personnel audit trail — executive-level activity oversight.'

  const statusOptions = isSystemAudit
    ? ['All', 'Success', 'Failed', 'Blocked', 'Warning']
    : ['All', 'Success', 'Flagged', 'Approved', 'Pending']

  const statusCounts = useMemo(() => {
    const tally: Record<string, number> = { All: logs.length }
    logs.forEach((l) => {
      const status = l.status || 'Success'
      tally[status] = (tally[status] ?? 0) + 1
    })
    return tally
  }, [logs])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return logs.filter((l) => {
      const matchesQuery =
        !q ||
        l.action.toLowerCase().includes(q) ||
        l.account.toLowerCase().includes(q) ||
        l.initiatorRole.toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'All' || l.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [logs, query, statusFilter, isSystemAudit])

  const exportCsv = () => {
    const header = 'Timestamp,Log ID,Employee ID,Role,Action,IP\n'
    const rows = logs
      .map(
        (l) =>
          `"${l.timestamp} ${l.date}","${l.logId}","${l.account}","${l.initiatorRole}","${l.action}","${l.ip}"`,
      )
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lumiere-activity-logs.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const destination = (id: ExecutiveDestinationId) => navigate(id)

  const stickyHeader = (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground lg:text-4xl">
          {logTitle}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{logSubtitle}</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search logs, Employee ID, or action..."
          className="w-72 rounded-md border border-input bg-card py-2 pl-9 pr-3 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
        />
      </div>
    </div>
  )

  return (
    <ExecutiveShell activeId="logs" onSelect={destination} stickyHeader={stickyHeader}>
      {/* Status filters + export */}
      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={cn(
                'rounded-full px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] transition',
                statusFilter === status
                  ? 'bg-neutral-900 text-white'
                  : 'border border-border bg-card text-muted-foreground hover:bg-muted',
              )}
            >
              {status} ({statusCounts[status] ?? 0})
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-5 py-2 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-neutral-800"
        >
          <Download className="size-3.5" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[840px] text-left">
          <thead>
            <tr className="bg-muted/50">
              {[
                'Timestamp',
                'Log ID',
                'Employee ID',
                'Role',
                'Action Executed',
                'Status',
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-xs text-muted-foreground">
                  No activity recorded yet. Create a user or register an event to populate the
                  audit trail.
                </td>
              </tr>
            ) : (
              filtered.map((l) => (
                <tr key={l.id} className="border-t border-border/60 align-top">
                  <td className="px-4 py-4 text-[0.65rem] text-muted-foreground">
                    <p className="font-semibold text-card-foreground">{l.timestamp}</p>
                    <p>{l.date}</p>
                  </td>
                  <td className="px-4 py-4 text-[0.65rem] text-muted-foreground">{l.logId}</td>
                  <td className="px-4 py-4 text-xs font-semibold text-card-foreground">
                    {l.account}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.1em]',
                        roleStyles[l.initiatorRole] ?? 'bg-muted text-muted-foreground',
                      )}
                    >
                      {l.initiatorRole}
                    </span>
                  </td>
                  <td className="max-w-md px-4 py-4">
                    <p className="text-xs font-semibold text-card-foreground">{l.action}</p>
                    <p className="mt-1 text-[0.65rem] leading-relaxed text-muted-foreground">
                      {l.detail}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em] text-emerald-700">
                      {l.status || 'Success'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </ExecutiveShell>
  )
}
