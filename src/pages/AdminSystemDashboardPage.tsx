import { useMemo, useState } from 'react'
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
        flashing && 'ring-2 ring-primary/60 border-primary/60',
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
  if (role === 'Ground Crew') return 'Field & Production Crew'
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

/* ----------------------------- Page ----------------------------- */

export function AdminSystemDashboardPage() {
  const { navigate } = useNav()
  const { staff, userActions, resolveUserAction, pendingSubRoleSetups } = usePortal()
  const { openGrowthSummary } = useGrowthSummary()
  const [activeId, setActiveId] = useState<AdminDestinationId>('system-dashboard')
  // Pending-action confirmation state. The action is applied ONLY when the
  // admin confirms — nothing mutates on the initial button click.
  const [confirmItem, setConfirmItem] = useState<UserAction | null>(null)
  const [tempPassword, setTempPassword] = useState('lumierepassword123')
  const [methodologyOpen, setMethodologyOpen] = useState(false)

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
      (a) => a.type === 'forgot-password' || a.type === 'account-locked',
    )
    return [...relevant].sort((a, b) => {
      if (a.status === b.status) return 0
      return a.status === 'pending' ? -1 : 1
    })
  }, [userActions])

  const handleResolve = (item: UserAction) => {
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

  const isDashboard = activeId === 'system-dashboard'

  const stickyHeader = isDashboard ? (
    <div>
      <div>
        <h1 className="font-serif text-3xl font-medium leading-tight text-foreground sm:text-4xl">
          System Dashboard
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          A read-only glance at users, access requests, and system health.
        </p>
      </div>
    </div>
  ) : (
    <h1 className="font-serif text-3xl font-medium leading-tight text-foreground">
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
      {isDashboard ? (
        <div className="flex flex-col gap-4">
          {/* Row 1: 4 small stat cards (left) + User Distribution / Live Security Feed (right) */}
          <div data-testid="admin-dashboard-stats" className="grid gap-4 lg:grid-cols-2">
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                agentSelector="data-agent-system-health"
                label="System Health"
                value="99.9%"
                caption="30-day rolling uptime"
                onSelect={() => setMethodologyOpen(true)}
              />
              <StatCard
                agentSelector="data-agent-total-users"
                label="Total Users"
                value={String(totalUsers)}
                caption="Provisioned portal accounts"
                onSelect={() => navigate('workforce')}
              />
              <StatCard
                agentSelector="data-agent-locked-accounts"
                label="Locked Accounts"
                value={String(lockedAccounts)}
                caption="Awaiting administrator unlock"
                onSelect={() => navigate('workforce')}
              />
              <StatCard
                agentSelector="data-agent-pending-activations"
                label="Pending Activations"
                value={String(pendingActivations)}
                caption="Access & password requests"
                onSelect={() => navigate('workforce')}
              />
            </div>
            {/* Fixed row height so the feed scrolls internally instead of
                stretching the donut card with trailing blank space. */}
            <div className="grid h-[21rem] grid-cols-2 gap-3">
              <UserDistributionCard compact counts={roleCounts} onSelect={() => navigate('workforce')} />
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
              />
            </div>
            <div className="lg:col-span-7">
              <TrendAnalyticsCard onOpenGrowthSummary={openGrowthSummary} />
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
    </>
  )
}

export default AdminSystemDashboardPage
