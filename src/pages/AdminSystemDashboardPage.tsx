import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePortal } from '@/lib/store'
import { useNav } from '@/lib/nav'
import { useClickFlash } from '@/lib/use-click-flash'
import { useGrowthSummary } from '@/lib/admin-growth-summary'
import { AdminShell } from '@/components/admin/AdminShell'
import { AdminPendingActions, type PendingSubRoleSetup } from '@/components/admin/AdminPendingActions'
import { AdminSecurityFeed } from '@/components/admin/AdminSecurityFeed'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { UserDistributionCard, TrendAnalyticsCard } from '@/components/admin/AdminAnalytics'
import { SystemHealthMethodologyModal } from '@/components/admin/SystemHealthMethodologyModal'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ErrorFallback } from '@/components/ErrorFallback'
import {
  ADMIN_DESTINATIONS,
  getAdminDestination,
  type AdminDestinationId,
} from '@/lib/admin-destinations'
import type { UserAction } from '@/lib/types'

/* ----------------------------- Stat card ----------------------------- */

// Small stat card used in the 2x2 grid. Clickable cards flash briefly before
// their navigation/modal action fires (see useClickFlash).
function StatCard({
  label,
  value,
  caption,
  agentSelector,
  onSelect,
}: {
  label: string
  value: string
  caption: string
  agentSelector?: string
  onSelect?: () => void
}) {
  const { flashing, trigger } = useClickFlash(onSelect)
  const Tag = onSelect ? 'button' : 'div'
  return (
    <Tag
      type={onSelect ? 'button' : undefined}
      onClick={onSelect ? trigger : undefined}
      className={cn(
        'flex flex-col rounded-xl border border-border bg-card p-4 text-left',
        onSelect && 'cursor-pointer transition hover:border-primary/40 hover:bg-muted/40',
        flashing && 'ring-2 ring-primary/60 border-primary/60 glow-primary',
      )}
      {...(agentSelector ? { [agentSelector]: '' } : {})}
    >
      <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 font-sans text-2xl font-bold leading-none text-card-foreground">{value}</p>
      <p className="mt-2 text-[0.7rem] italic text-muted-foreground">{caption}</p>
    </Tag>
  )
}

// Map a staff role onto the donut segment label it belongs to.
function roleToSegment(role: string): string {
  if (role === 'Warehouse Manager') return 'Warehouse Ops Manager'
  if (role === 'Ground Crew') return 'Ground Crew'
  return role
}

/* ----------------------------- Placeholder for not-yet-built destinations ----------------------------- */

function AdminPlaceholder({ id }: { id: AdminDestinationId }) {
  const destination = getAdminDestination(id)
  if (!destination) return null
  const Icon = destination.icon
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-5 font-serif text-2xl font-medium text-foreground">{destination.label}</h2>
      <p className="mt-2 text-sm text-muted-foreground text-pretty">
        This area is coming in a follow-up phase. The destination is reachable from the rail so the
        navigation stays consistent across the console.
      </p>
    </div>
  )
}

type DashboardSummary = 'users' | 'gateway' | 'locked' | 'activations' | 'distribution' | 'pending' | 'trend'

function DashboardDetailModal({
  summary,
  staff,
  lockedAccounts,
  pendingActivations,
  pendingItems,
  roleCounts,
  isBackendConnected,
  onClose,
}: {
  summary: DashboardSummary | null
  staff: ReturnType<typeof usePortal>['staff']
  lockedAccounts: number
  pendingActivations: number
  pendingItems: UserAction[]
  roleCounts: Record<string, number>
  isBackendConnected: boolean
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  if (!summary) return null

  const titles: Record<DashboardSummary, string> = {
    users: 'Total Users', gateway: 'Gateway Connection', locked: 'Locked Accounts',
    activations: 'Pending Activations', distribution: 'User Distribution', pending: 'Pending Actions', trend: 'Trend Analytics',
  }
  const normalizedQuery = query.trim().toLowerCase()
  const visibleStaff = staff.filter((person) => {
    if (summary === 'locked' && person.accountStatus !== 'Locked') return false
    if (summary === 'activations' && person.accountStatus !== 'Pending') return false
    if (!normalizedQuery) return true
    return [person.firstName, person.surname, person.email, person.role, person.subRole].filter(Boolean).join(' ').toLowerCase().includes(normalizedQuery)
  })
  const rows = summary === 'pending' ? pendingItems : visibleStaff
  const isRecordList = ['users', 'locked', 'activations', 'pending'].includes(summary)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/50 p-4 backdrop-blur-sm dark:bg-black/60" role="dialog" aria-modal="true" aria-labelledby="dashboard-detail-title" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Admin System Dashboard</p>
            <h2 id="dashboard-detail-title" className="mt-1 font-serif text-xl font-medium text-card-foreground">{titles[summary]}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted-foreground hover:text-foreground" aria-label="Close details"><X className="size-5" /></button>
        </div>
        <div className="min-h-0 overflow-y-auto px-6 py-5">
          {isRecordList && (
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records" aria-label="Search records" className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30" />
            </div>
          )}
          {summary === 'gateway' && <div className="rounded-lg border border-border bg-background p-4"><p className="text-sm font-semibold text-foreground">Production API gateway</p><p className="mt-1 text-sm text-muted-foreground">{isBackendConnected ? 'Connected' : 'Offline / local cached mode'}</p></div>}
          {summary === 'locked' && <p className="mb-4 text-sm text-muted-foreground">{lockedAccounts} locked account event{lockedAccounts === 1 ? '' : 's'} currently require attention.</p>}
          {summary === 'activations' && <p className="mb-4 text-sm text-muted-foreground">{pendingActivations} activation request{pendingActivations === 1 ? '' : 's'} currently pending.</p>}
          {summary === 'distribution' && <div className="grid gap-2 sm:grid-cols-2">{Object.entries(roleCounts).map(([role, count]) => <div key={role} className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"><span className="text-sm text-foreground">{role}</span><span className="font-semibold tabular-nums text-foreground">{count}</span></div>)}</div>}
          {summary === 'trend' && <div className="rounded-lg border border-border bg-background p-4"><p className="text-sm text-muted-foreground">Trend details use the same user-growth data shown on the dashboard chart.</p><p className="mt-3 text-2xl font-bold text-foreground">{staff.length} tracked accounts</p></div>}
          {isRecordList && rows.length === 0 && <p className="py-8 text-center text-sm italic text-muted-foreground">No records found.</p>}
          {isRecordList && rows.length > 0 && <div className="overflow-x-auto rounded-lg border border-border"><div className="min-w-[34rem] divide-y divide-border">{rows.map((row) => 'user' in row ? <div key={row.id} className="grid grid-cols-[1.4fr_1fr_1fr] gap-3 px-4 py-3 text-sm"><span className="text-foreground">{row.user}</span><span className="text-muted-foreground">{row.type}</span><span className="text-muted-foreground">{row.status}</span></div> : <div key={row.id} className="grid grid-cols-[1.4fr_1fr_1fr] gap-3 px-4 py-3 text-sm"><span className="truncate text-foreground">{row.firstName} {row.surname}</span><span className="truncate text-muted-foreground">{row.role}{row.subRole ? ` · ${row.subRole}` : ''}</span><span className="text-muted-foreground">{row.accountStatus ?? row.sessionStatus}</span></div>)}</div></div>}
        </div>
        <div className="flex justify-end border-t border-border px-6 py-4"><button type="button" onClick={onClose} className="rounded-md border border-input bg-background px-5 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-foreground hover:bg-muted">Close</button></div>
      </div>
    </div>
  )
}

/* ----------------------------- Page ----------------------------- */

export function AdminSystemDashboardPage() {
  const { navigate } = useNav()
  const { staff, userActions, resolveUserAction, pendingSubRoleSetups, isBackendConnected } = usePortal()
  const { openGrowthSummary } = useGrowthSummary()
  const [activeId, setActiveId] = useState<AdminDestinationId>('system-dashboard')
  const [drillDownCategory, setDrillDownCategory] = useState<string | null>(null)
  // Pending-action confirmation state. The action is applied ONLY when the
  // admin confirms — nothing mutates on the initial button click.
  const [confirmItem, setConfirmItem] = useState<UserAction | null>(null)
  const [tempPassword, setTempPassword] = useState('lumierepassword123')
  const [methodologyOpen, setMethodologyOpen] = useState(false)
  const [detailSummary, setDetailSummary] = useState<DashboardSummary | null>(null)

  const totalUsers = staff.length
  const lockedAccounts = userActions.filter(
    (a) => a.status === 'pending' && a.type === 'account-locked',
  ).length
  const pendingActivations = userActions.filter(
    (a) => a.status === 'pending' && a.type !== 'account-locked',
  ).length

  const roleCounts = useMemo(() => {
    const tally: Record<string, number> = {}
    staff.forEach((s) => {
      const seg = roleToSegment(s.role)
      tally[seg] = (tally[seg] ?? 0) + 1
    })
    return tally
  }, [staff])

  // Forgot-password + account-locked items aggregated from every account type
  // (Executive, Event Planner, Warehouse Ops, Ground Crew). Pending first, then
  // recently completed so the "✓ Completed" state is visible on the glance screen.
  const pendingItems: UserAction[] = useMemo(() => {
    const relevant = userActions.filter(
      (a) => a.type === 'forgot-password' || a.type === 'account-locked' || a.type === 'access-request',
    )
    return [...relevant].sort((a, b) => {
      if (a.status === b.status) return 0
      return a.status === 'pending' ? -1 : 1
    })
  }, [userActions])

  const handleResolve = (item: UserAction) => {
    if (item.type === 'access-request') {
      navigate('workforce', {
        kind: 'add-user',
        payload: { email: item.email || item.user, actionId: item.id },
      })
      return
    }
    // Open a confirmation dialog in-place (icon-rail shell). The action is not
    // performed until the admin confirms — this gates the mutation properly.
    setTempPassword('lumierepassword123')
    setConfirmItem(item)
  }

  // pendingSubRoleSetups comes straight from usePortal() — store.tsx is the
  // single source of truth for which sub-roles still need their permission
  // table saved (see isPermissionsConfigured in lib/rbac.ts). Don't recompute
  // it here; that would create a second, driftable copy of the same logic.
  const handleConfigureSubRole = (setup: PendingSubRoleSetup) => {
    navigate('rbac', { kind: 'configure-subrole', payload: { subRoleId: setup.subRoleId } })
  }

  const isLocked = confirmItem?.type === 'account-locked'

  const [isLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  const isDashboard = activeId === 'system-dashboard'

  const stickyHeader = isDashboard ? (
    <div>
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          System Dashboard
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          A read-only glance at users, access requests, and system health.
        </p>
      </div>
    </div>
  ) : (
    <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
      {getAdminDestination(activeId)?.label}
    </h1>
  )

  return (
    <>
    <AdminShell
      activeId={activeId}
      onSelect={(id) => {
        const destination = ADMIN_DESTINATIONS.find((d) => d.id === id)
        if (destination) {
          if (id === 'workforce') navigate('workforce')
          else if (id === 'security-audit') navigate('security-audit')
          else if (id === 'rbac') navigate('rbac')
          else setActiveId(id)
        }
      }}
      stickyHeader={stickyHeader}
    >
      {isError ? (
        <ErrorFallback title="System Dashboard Unavailable" message="Failed to connect to admin telemetry service." onRetry={() => setIsError(false)} />
      ) : isLoading ? (
        <LoadingSkeleton variant="dashboard" />
      ) : isDashboard ? (
        <div className="flex flex-col gap-4">
          {/* Row 1: 4 small stat cards (left) + User Distribution / Live Security Feed (right) */}
          <div data-testid="admin-dashboard-stats" className="grid gap-4 lg:grid-cols-2">
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                agentSelector="data-agent-total-users"
                label="Total Users"
                value={String(totalUsers)}
                caption="Registered workforce accounts"
                onSelect={() => setDetailSummary('users')}
              />
              <StatCard
                agentSelector="data-agent-system-health"
                label="Gateway Connection"
                value={isBackendConnected ? 'Connected' : 'Offline'}
                caption={isBackendConnected ? 'Production API gateway active' : 'Offline / local cached mode'}
                onSelect={() => setDetailSummary('gateway')}
              />
              <StatCard
                agentSelector="data-agent-locked-accounts"
                label="Locked Accounts"
                value={String(lockedAccounts)}
                caption="Auto-locked security events"
                onSelect={() => setDetailSummary('locked')}
              />
              <StatCard
                agentSelector="data-agent-pending-activations"
                label="Pending Activations"
                value={String(pendingActivations)}
                caption="Access & password requests"
                onSelect={() => setDetailSummary('activations')}
              />
            </div>
            {/* Fixed row height so the feed scrolls internally instead of
                stretching the donut card with trailing blank space. */}
            <div className="grid h-[21rem] grid-cols-2 gap-3">
              <UserDistributionCard
                compact
                counts={roleCounts}
                onSelect={() => setDetailSummary('distribution')}
                drillDownCategory={drillDownCategory}
                onDrillDown={(cat) => setDrillDownCategory(cat)}
                onBack={() => setDrillDownCategory(null)}
              />
              <AdminSecurityFeed onSystemLogs={() => navigate('security-audit')} />
            </div>
          </div>

          {/* Row 2: Pending Actions (30%) + Trend Analytics (70%) */}
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-10">
            <div className="lg:col-span-3">
              <AdminPendingActions
                items={pendingItems}
                onResolve={handleResolve}
                subRoleSetups={pendingSubRoleSetups}
                onConfigureSubRole={handleConfigureSubRole}
                onSelect={() => setDetailSummary('pending')}
              />
            </div>
            <div
              className="lg:col-span-7"
              onClick={(event) => {
                if (!(event.target as HTMLElement).closest('button')) setDetailSummary('trend')
              }}
              onKeyDown={(event) => {
                if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
                  event.preventDefault()
                  setDetailSummary('trend')
                }
              }}
              tabIndex={0}
              role="button"
              aria-label="View trend analytics details"
            >
              <TrendAnalyticsCard
                onOpenGrowthSummary={openGrowthSummary}
                onOpenSecurityAudit={() => navigate('security-audit')}
                drillDownCategory={drillDownCategory}
                onBack={() => setDrillDownCategory(null)}
              />
            </div>
          </div>
        </div>
      ) : (
        <AdminPlaceholder id={activeId} />
      )}
    </AdminShell>

    <ConfirmDialog
      open={confirmItem !== null}
      eyebrow={isLocked ? 'Unlock Account' : 'Account Request'}
      title={isLocked ? 'Unlock Account & Issue Temp Password?' : 'Issue Temporary Password?'}
      description={
        <div className="space-y-3">
          <p>
            {isLocked
              ? 'This will unlock the account and dispatch a temporary password to '
              : 'A temporary password will be generated and dispatched to '}
            <span className="font-semibold text-foreground">{confirmItem?.user}</span>. The user
            must reset it on next login.
          </p>
          <div>
            <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">
              Temporary Password
            </label>
            <input
              type="text"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>
      }
      confirmLabel="Generate & Send"
      onConfirm={() => {
        if (confirmItem) resolveUserAction(confirmItem.id)
        setConfirmItem(null)
      }}
      onCancel={() => setConfirmItem(null)}
    />

    <SystemHealthMethodologyModal open={methodologyOpen} onClose={() => setMethodologyOpen(false)} />
    <DashboardDetailModal
      summary={detailSummary}
      staff={staff}
      lockedAccounts={lockedAccounts}
      pendingActivations={pendingActivations}
      pendingItems={pendingItems}
      roleCounts={roleCounts}
      isBackendConnected={isBackendConnected}
      onClose={() => setDetailSummary(null)}
    />
    </>
  )
}

export default AdminSystemDashboardPage
