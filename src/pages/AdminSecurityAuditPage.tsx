import { Fragment, useMemo, useState } from 'react'
import { ChevronDown, Download, Search } from 'lucide-react'
import { AdminShell } from '@/components/admin/AdminShell'
import { useNav } from '@/lib/nav'
import { cn } from '@/lib/utils'
import type { AdminDestinationId } from '@/lib/admin-destinations'
import { SECURITY_EVENTS } from '@/lib/security-events'

/* ----------------------------- Domain ----------------------------- */

// Security/access events only: logins, lockouts, permission requests, password
// resets. A cross-account view — every entry carries the account type so the
// Admin can slice the trail by role alongside the status pills.
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

// Dark-mode friendly status treatments (translucent fill + readable text).
const statusStyles: Record<AuditStatus, string> = {
  Success: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-inset ring-emerald-500/30',
  Failed: 'bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/30',
  Blocked: 'bg-rose-500/15 text-rose-400 ring-1 ring-inset ring-rose-500/30',
  Warning: 'bg-sky-500/15 text-sky-400 ring-1 ring-inset ring-sky-500/30',
}

const roleStyles: Record<AccountType, string> = {
  Admin: 'bg-emerald-500/12 text-emerald-300',
  Executive: 'bg-indigo-500/15 text-indigo-300',
  'Event Planner': 'bg-sky-500/15 text-sky-300',
  'Warehouse Ops': 'bg-amber-500/15 text-amber-300',
  'Ground Crew': 'bg-rose-500/15 text-rose-300',
}

/* const LEGACY_SECURITY_AUDIT_LOG: SecurityAuditEntry[] = [
  {
    id: 'sa-1',
    timestamp: '08:42:11',
    date: 'May 14, 2026',
    logId: 'SEC-99281',
    employeeId: 'LM-0001',
    role: 'Event Planner',
    action: 'Portal session authenticated',
    status: 'Success',
    ip: '192.168.4.21',
    terminal: 'T-02',
    token: 'UID-4471',
    note: 'Successful login from a registered terminal within approved access scope.',
  },
  {
    id: 'sa-2',
    timestamp: '08:41:03',
    date: 'May 14, 2026',
    logId: 'SEC-99280',
    employeeId: 'LM-0006',
    role: 'Executive',
    action: '9 failed login attempts — account auto-locked',
    status: 'Blocked',
    ip: '192.168.4.88',
    terminal: 'T-04',
    token: 'UID-5510',
    note: '9 consecutive failed authentication attempts tripped the lockout threshold; the account was locked as a precaution.',
  },
  {
    id: 'sa-3',
    timestamp: '08:12:57',
    date: 'May 14, 2026',
    logId: 'SEC-99276',
    employeeId: 'LM-0009',
    role: 'Warehouse Ops',
    action: 'Elevated permission requested beyond role',
    status: 'Blocked',
    ip: '10.0.2.37',
    terminal: 'T-11',
    token: 'UID-5592',
    note: 'Requested root-level database export privileges outside approved scope. Auto-denied and routed for review.',
  },
  {
    id: 'sa-4',
    timestamp: '07:55:19',
    date: 'May 14, 2026',
    logId: 'SEC-99275',
    employeeId: 'LM-0013',
    role: 'Ground Crew',
    action: 'Password reset completed',
    status: 'Success',
    ip: '172.16.8.5',
    terminal: 'MOBILE-APP',
    token: 'UID-6120',
    note: 'Temporary credential redeemed and replaced with a permanent password on first login.',
  },
  {
    id: 'sa-5',
    timestamp: '07:31:44',
    date: 'May 14, 2026',
    logId: 'SEC-99271',
    employeeId: 'LM-0004',
    role: 'Event Planner',
    action: 'Failed login — invalid credentials',
    status: 'Failed',
    ip: '192.168.4.60',
    terminal: 'T-07',
    token: 'UID-4802',
    note: 'Single failed authentication attempt; below the lockout threshold. No action taken.',
  },
  {
    id: 'sa-6',
    timestamp: '07:15:48',
    date: 'May 14, 2026',
    logId: 'SEC-99268',
    employeeId: 'SYS-ROOT',
    role: 'Admin',
    action: 'Audit log integrity check',
    status: 'Success',
    ip: '10.0.0.1',
    terminal: 'CONSOLE',
    token: 'SYS-KEY',
    note: 'Scheduled checksum verification completed across 14 audit nodes. Zero tamper indicators recorded.',
  },
  {
    id: 'sa-7',
    timestamp: '06:58:02',
    date: 'May 14, 2026',
    logId: 'SEC-99263',
    employeeId: 'LM-0006',
    role: 'Executive',
    action: 'Password reset requested',
    status: 'Warning',
    ip: '192.168.4.88',
    terminal: 'T-04',
    token: 'UID-5510',
    note: 'Self-service reset requested shortly before the lockout event. Flagged for correlation review.',
  },
  {
    id: 'sa-8',
    timestamp: '06:22:35',
    date: 'May 14, 2026',
    logId: 'SEC-99257',
    employeeId: 'LM-0009',
    role: 'Warehouse Ops',
    action: 'Portal session authenticated',
    status: 'Success',
    ip: '10.0.2.37',
    terminal: 'T-11',
    token: 'UID-5592',
    note: 'Successful login from a registered terminal within approved access scope.',
  },
  {
    id: 'sa-9',
    timestamp: '05:47:10',
    date: 'May 14, 2026',
    logId: 'SEC-99249',
    employeeId: 'LM-0013',
    role: 'Ground Crew',
    action: 'Failed login — unrecognized device',
    status: 'Warning',
    ip: '172.16.8.42',
    terminal: 'UNKNOWN',
    token: 'UID-6120',
    note: 'Authentication attempted from an unrecognized device fingerprint. Step-up verification enforced.',
  },
  {
    id: 'sa-10',
    timestamp: '05:03:26',
    date: 'May 14, 2026',
    logId: 'SEC-99241',
    employeeId: 'LM-0002',
    role: 'Admin',
    action: 'Permission grant approved for Event Planner',
    status: 'Success',
    ip: '10.0.0.1',
    terminal: 'CONSOLE',
    token: 'SYS-KEY',
    note: 'Scoped read access to the asset registry granted following a reviewed request. Change recorded to the RBAC ledger.',
  },
] */

const SECURITY_AUDIT_LOG = SECURITY_EVENTS

/* ----------------------------- Page ----------------------------- */

export function AdminSecurityAuditPage() {
  const { navigate } = useNav()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('All')
  const [account, setAccount] = useState<AccountFilter>('All')
  const [expanded, setExpanded] = useState<string | null>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SECURITY_AUDIT_LOG.filter((entry) => {
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
  }, [query, status, account])

  const exportCsv = () => {
    const header = 'Timestamp,Date,Log ID,Employee ID,Role,Action,Status,IP,Terminal,Token\n'
    const body = rows
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

  return (
    <AdminShell activeId="security-audit" onSelect={railSelect} stickyHeader={stickyHeader}>
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
        Showing {rows.length} of {SECURITY_AUDIT_LOG.length} security events. Click a row to reveal
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
                  <td
                    colSpan={7}
                    className="px-4 py-20 text-center text-sm italic text-muted-foreground"
                  >
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
