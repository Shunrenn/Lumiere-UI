import { useMemo, useState } from 'react'
import { KeyRound, Lock } from 'lucide-react'
import { ConsoleLayout } from '@/components/ConsoleLayout'
import { PendingUserActions, type PendingActionItem } from '@/components/PendingUserActions'
import { SecurityIncidents } from '@/components/SecurityIncidents'
import { TrendChart } from '@/components/TrendChart'
import { usePortal } from '@/lib/store'
import { useNav } from '@/lib/nav'

interface MetricCardProps {
  label: string
  value: string
  caption: string
  accent?: boolean
}

function MetricCard({ label, value, caption, accent }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p
        className={
          accent
            ? 'mt-3 font-sans text-2xl font-bold leading-none text-primary'
            : 'mt-3 font-sans text-2xl font-bold leading-none text-card-foreground'
        }
      >
        {value}
      </p>
      <p className="mt-2 text-[0.7rem] italic text-muted-foreground">{caption}</p>
    </div>
  )
}

// Donut chart for User Distribution — one segment per actual role, no "Other".
const ROLE_SEGMENTS = [
  { label: 'Admin', color: 'text-emerald-500', dot: 'bg-emerald-500' },
  { label: 'Executive', color: 'text-sky-500', dot: 'bg-sky-500' },
  { label: 'Warehouse Ops Manager', color: 'text-amber-500', dot: 'bg-amber-500' },
  { label: 'Event Planner', color: 'text-rose-500', dot: 'bg-rose-500' },
  { label: 'Field & Production Crew', color: 'text-indigo-500', dot: 'bg-indigo-500' },
]

function UserDistributionChart({ counts }: { counts: Record<string, number> }) {
  const total = ROLE_SEGMENTS.reduce((sum, r) => sum + (counts[r.label] ?? 0), 0)
  const circumference = 2 * Math.PI * 45 // r = 45

  let offset = 0
  const arcs = ROLE_SEGMENTS.map((seg) => {
    const value = counts[seg.label] ?? 0
    const fraction = total > 0 ? value / total : 0
    const dash = fraction * circumference
    const arc = { seg, dash, offset: -offset }
    offset += dash
    return arc
  })

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
        User Distribution
      </h3>
      <div className="mt-6 flex items-center justify-center">
        <div className="relative inline-flex items-center justify-center">
          <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
            {arcs.map(({ seg, dash, offset: dashOffset }) => (
              <circle
                key={seg.label}
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={dashOffset}
                className={seg.color}
              />
            ))}
          </svg>
          <div className="absolute text-center">
            <p className="text-2xl font-bold text-foreground">{total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 text-[0.65rem]">
        {ROLE_SEGMENTS.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <div className={`size-2 rounded-full ${seg.dot}`} />
            <span>
              {seg.label} ({counts[seg.label] ?? 0})
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Map a staff role onto the donut segment label it belongs to.
function roleToSegment(role: string): string {
  if (role === 'Warehouse Manager') return 'Warehouse Ops Manager'
  if (role === 'Ground Crew') return 'Field & Production Crew'
  return role
}

export function OverviewPage() {
  const { navigate } = useNav()
  const { staff, userActions } = usePortal()
  const [chartMode, setChartMode] = useState('users')

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

  // Pending security actions surfaced on the dashboard. Clicking "Open"
  // navigates to Workforce Management and pops the matching confirmation.
  const pendingItems: PendingActionItem[] = useMemo(
    () =>
      userActions
        .filter((a) => a.status !== 'completed')
        .map((a) => ({
          id: a.id,
          title: a.type === 'forgot-password' ? 'Forgot Password Request' : 'Account Locked Out',
          subtitle: `User: ${a.user}`,
          tone: a.type === 'forgot-password' ? 'rose' : 'amber',
          icon: a.type === 'forgot-password' ? KeyRound : Lock,
          user: a.user,
          type: a.type,
        })) as (PendingActionItem & { user: string; type: string })[],
    [userActions],
  )

  return (
    <ConsoleLayout>
      {/* Header */}
      <div className="mt-4">
        <h1 className="font-serif text-3xl font-medium leading-tight text-foreground sm:text-4xl">
          System Dashboard
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Real-time user access control, infrastructure focus, and security compliance oversight.
        </p>
      </div>

      {/* Row 1: Metric cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Total Users"
          value={String(totalUsers)}
          caption="Provisioned portal accounts"
        />
        <MetricCard
          label="Locked Accounts"
          value={String(lockedAccounts)}
          caption="Awaiting administrator unlock"
        />
        <MetricCard
          label="Pending Activations"
          value={String(pendingActivations)}
          caption="Access & password requests"
        />
        <MetricCard label="System Health" value="99.9%" caption="All audit nodes nominal" />
      </div>

      {/* Row 2: Pending Actions + Live Security Feed (side-by-side) */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <PendingUserActions
            variant="dark"
            items={pendingItems}
            onOpen={() => {
              // Route into the current Workforce Management screen (icon-rail shell).
              navigate('workforce')
            }}
          />
        </div>
        <div>
          <SecurityIncidents onViewLogs={() => navigate('logs')} />
        </div>
      </div>

      {/* Row 3: User Distribution + Trend Analytics (side-by-side) */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <UserDistributionChart counts={roleCounts} />
        </div>
        <div>
          <TrendChart
            mode={chartMode}
            onModeChange={setChartMode}
            options={[
              { value: 'users', label: 'User Growth' },
              { value: 'audit', label: 'Security Audit' },
            ]}
          />
        </div>
      </div>
    </ConsoleLayout>
  )
}
