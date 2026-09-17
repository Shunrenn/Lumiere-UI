import { Fragment, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Download, Search } from 'lucide-react'
import { AdminShell } from '@/components/admin/AdminShell'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ErrorFallback } from '@/components/ErrorFallback'
import { EmptyState } from '@/components/EmptyState'
import { useNav } from '@/lib/nav'
import { cn } from '@/lib/utils'
import type { AdminDestinationId } from '@/lib/admin-destinations'
import { usePortal } from '@/lib/store'
import type { SecurityEvent } from '@/lib/security-events'

/* ----------------------------- Domain ----------------------------- */

type AuditStatus = 'Success' | 'Failed' | 'Blocked' | 'Warning'
type AccountType = 'Admin' | 'Executive' | 'Event Planner' | 'Warehouse Ops' | 'Ground Crew'

const STATUS_FILTERS = ['All', 'Success', 'Failed', 'Blocked', 'Warning'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

const ACCOUNT_FILTERS = [
  'All',
  'Admin',
  'Executive',
  'Event Planner',
  'Warehouse Ops',
  'Ground Crew',
] as const
type AccountFilter = (typeof ACCOUNT_FILTERS)[number]

const statusStyles: Record<AuditStatus, string> = {
  Success: 'bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/30',
  Failed: 'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-300 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/30',
  Blocked: 'bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-300 dark:bg-rose-500/15 dark:text-rose-400 dark:ring-rose-500/30',
  Warning: 'bg-sky-100 text-sky-800 ring-1 ring-inset ring-sky-300 dark:bg-sky-500/15 dark:text-sky-400 dark:ring-sky-500/30',
}

const roleStyles: Record<AccountType, string> = {
  Admin: 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:border-transparent dark:bg-emerald-500/12 dark:text-emerald-300',
  Executive: 'bg-indigo-100 text-indigo-900 border border-indigo-300 dark:border-transparent dark:bg-indigo-500/15 dark:text-indigo-300',
  'Event Planner': 'bg-sky-100 text-sky-900 border border-sky-300 dark:border-transparent dark:bg-sky-500/15 dark:text-sky-300',
  'Warehouse Ops': 'bg-amber-100 text-amber-900 border border-amber-300 dark:border-transparent dark:bg-amber-500/15 dark:text-amber-300',
  'Ground Crew': 'bg-purple-100 text-purple-900 border border-purple-300 dark:border-transparent dark:bg-purple-500/15 dark:text-purple-300',
}

export function AdminSecurityAuditPage() {
  const { navigate } = useNav()
  const { logs: storeLogs } = usePortal()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('All')
  const [account, setAccount] = useState<AccountFilter>('All')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const securityLogs: SecurityEvent[] = useMemo(() => {
    return storeLogs.map((l) => {
      let role: AccountType = 'Admin'
      const init = (l.initiatorRole || '').toLowerCase()
      if (init.includes('executive')) role = 'Executive'
      else if (init.includes('planner') || init.includes('designer')) role = 'Event Planner'
      else if (init.includes('warehouse')) role = 'Warehouse Ops'
      else if (init.includes('ground') || init.includes('crew')) role = 'Ground Crew'

      return {
        id: l.id,
        timestamp: l.timestamp,
        date: l.date,
        logId: l.logId,
        employeeId: l.account || 'SYS-ROOT',
        role,
        action: l.action,
        status: (l.status as AuditStatus) || 'Success',
        ip: l.ip,
        terminal: 'T-01',
        token: `UID-${l.id.slice(-4)}`,
        note: l.detail,
        dotColor: l.status === 'Success' ? 'bg-emerald-400' : l.status === 'Blocked' ? 'bg-rose-400' : 'bg-amber-400',
      }
    })
  }, [storeLogs])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return securityLogs.filter((entry) => {
      const matchesStatus = status === 'All' || entry.status === status
      const matchesAccount = account === 'All' || entry.role === account
      const matchesQuery =
        !q ||
        entry.action.toLowerCase().includes(q) ||
        entry.employeeId.toLowerCase().includes(q) ||
        entry.logId.toLowerCase().includes(q) ||
        entry.role.toLowerCase().includes(q)
      return matchesStatus && matchesAccount && matchesQuery
    })
  }, [securityLogs, query, status, account])

  const exportCsv = () => {
    let exportRows = rows
    if (fromDate) {
      const fromTime = new Date(fromDate).getTime()
      exportRows = exportRows.filter((r) => new Date(r.date || r.timestamp).getTime() >= fromTime)
    }
    if (toDate) {
      const toTime = new Date(toDate).getTime() + 86400000 // full day end
      exportRows = exportRows.filter((r) => new Date(r.date || r.timestamp).getTime() <= toTime)
    }

    const header = 'Timestamp,Date,Log ID,Employee ID,Role,Action,Status,IP,Terminal,Token\n'
    const body = exportRows
      .map((r) =>
        [
          r.timestamp,
          r.date,
          r.logId,
          r.employeeId,
          r.role,
          r.action,
          r.status,
          r.ip,
          r.terminal,
          r.token,
        ]
          .map((field) => `"${field}"`)
          .join(','),
      )
      .join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lumiere-security-audit-logs.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const railSelect = (id: AdminDestinationId) => {
    if (id === 'system-dashboard') navigate('overview')
    else if (id === 'workforce') navigate('workforce')
    else if (id === 'security-audit') setExpanded(null)
    else if (id === 'rbac') navigate('rbac')
  }

  const stickyHeader = (
    <div>
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Admin Console / Audit
      </p>
      <h1 className="mt-2 font-serif text-3xl font-medium text-foreground sm:text-4xl">
        Security Audit Logs
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
        A read-only, cross-account trail of security and access events — logins, lockouts,
        permission requests, and password resets.
      </p>
    </div>
  )

  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const handleRefetch = async () => {
    setIsError(false)
    setIsLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 200))
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    handleRefetch()
  }, [])

  return (
    <AdminShell activeId="security-audit" onSelect={railSelect} stickyHeader={stickyHeader}>
      {isError ? (
        <ErrorFallback
          title="Security Audit Trail Unavailable"
          message="Could not load system security logs."
          onRetry={handleRefetch}
        />
      ) : isLoading ? (
        <LoadingSkeleton variant="table" />
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search action, Employee ID, or Log ID"
              className="w-full rounded-md border border-input bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-[0.6rem] font-bold uppercase tracking-wider">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-md border border-input bg-background px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-[0.6rem] font-bold uppercase tracking-wider">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-md border border-input bg-background px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary"
              />
            </div>
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setFromDate('')
                  setToDate('')
                }}
                className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground underline px-1"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
            >
              <Download className="size-3.5" aria-hidden="true" />
              Export CSV
            </button>
          </div>
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
              Account
            </span>
            {ACCOUNT_FILTERS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAccount(a)}
                aria-pressed={account === a}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
                  account === a
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        Showing {rows.length} of {securityLogs.length} security events. Click a row to reveal
        raw IP, terminal, and token metadata.
      </p>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* This div is the scroll container for BOTH axes (a lone `overflow-x-auto` computes
            `overflow-y: auto` too per the CSS spec, which would silently create a second,
            non-scrolling ancestor and break `position: sticky` on the thead below). Giving it
            an explicit max-height makes that scroll behavior real and lets the header stick
            to the top of this table specifically, independent of the page's own scroll. */}
        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-muted">
                {['Timestamp', 'Log ID', 'Employee ID', 'Role', 'Action Executed', 'Status', ''].map(
                  (h, i) => (
                    <th
                      key={h || `col-${i}`}
                      className="bg-muted px-4 py-3 text-[0.56rem] font-bold uppercase tracking-[0.14em] text-muted-foreground"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8">
                    <EmptyState
                      title="No audit entries found"
                      message="No security events match your search query, status, or role filters."
                    />
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
                          'cursor-pointer border-t border-border/60 align-middle transition-colors hover:bg-muted/40',
                          open && 'bg-muted/40',
                        )}
                        aria-expanded={open}
                      >
                        <td className="px-4 py-4 text-[0.65rem] text-muted-foreground">
                          <p className="font-semibold text-card-foreground">{entry.timestamp}</p>
                          <p>{entry.date}</p>
                        </td>
                        <td className="px-4 py-4 text-[0.65rem] font-medium text-muted-foreground">
                          {entry.logId}
                        </td>
                        <td className="px-4 py-4 text-xs font-semibold text-card-foreground">
                          {entry.employeeId}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={cn(
                              'inline-block rounded px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.1em]',
                              roleStyles[entry.role],
                            )}
                          >
                            {entry.role}
                          </span>
                        </td>
                        <td className="max-w-md px-4 py-4 text-xs font-medium text-card-foreground">
                          {entry.action}
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
                              <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-3">
                                <MetaField label="IP Address" value={entry.ip} />
                                <MetaField label="Terminal" value={entry.terminal} />
                                <MetaField label="Session Token" value={entry.token} />
                              </div>
                              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                                {entry.note}
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
        </>
      )}
    </AdminShell>
  )
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-xs text-card-foreground">{value}</p>
    </div>
  )
}

export default AdminSecurityAuditPage
