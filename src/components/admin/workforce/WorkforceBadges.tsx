import type { AccountStatus, StaffRole } from '@/lib/types'

// Categorical role encoding. Subtle tints keep the warm-neutral console intact
// while still making each role scannable at a glance.
const ROLE_STYLES: Record<string, string> = {
  Admin: 'bg-primary/15 text-primary border-primary/25',
  Executive: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-400/15 dark:text-amber-300 dark:border-amber-400/30',
  'Warehouse Manager': 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-400/15 dark:text-sky-300 dark:border-sky-400/30',
  'Event Planner': 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-400/15 dark:text-violet-300 dark:border-violet-400/30',
  'Ground Crew': 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-400/15 dark:text-emerald-300 dark:border-emerald-400/30',
  'Field & Production Crew': 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-400/15 dark:text-emerald-300 dark:border-emerald-400/30',
}

export function RoleBadge({ role }: { role: StaffRole }) {
  const style = ROLE_STYLES[role] ?? 'bg-muted text-muted-foreground border-border'
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.65rem] font-semibold ${style}`}
    >
      {role}
    </span>
  )
}

const STATUS_STYLES: Record<AccountStatus, string> = {
  Active: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-400/15 dark:text-emerald-300 dark:border-emerald-400/30',
  Pending: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-400/15 dark:text-amber-300 dark:border-amber-400/30',
  Locked: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-400/15 dark:text-rose-300 dark:border-rose-400/30',
  Suspended: 'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-400/15 dark:text-zinc-300 dark:border-zinc-400/30',
}

export function StatusBadge({ status }: { status: AccountStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.65rem] font-semibold ${STATUS_STYLES[status]}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {status}
    </span>
  )
}

// Auto-generated temporary password for new full accounts (mixed case + digits).
export function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let out = 'Lm-'
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}
