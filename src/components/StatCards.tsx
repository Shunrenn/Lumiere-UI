import { usePortal } from '@/lib/store'

interface StatCardProps {
  label: string
  value: string
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 font-sans text-2xl font-bold leading-none text-card-foreground">
        {value}
      </p>
    </div>
  )
}

export function StatCards() {
  const { userActions, staff } = usePortal()

  const pendingRequests = userActions.filter((a) => a.status === 'pending').length
  const lockedAccounts = userActions.filter(
    (a) => a.status === 'pending' && a.type === 'account-locked',
  ).length
  const activeStaff = staff.filter((s) => s.sessionStatus === 'Active Session').length

  const stats: StatCardProps[] = [
    { label: 'Pending Access Requests', value: String(pendingRequests) },
    { label: 'Locked Accounts', value: String(lockedAccounts) },
    { label: 'Active Staff', value: String(activeStaff) },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  )
}
