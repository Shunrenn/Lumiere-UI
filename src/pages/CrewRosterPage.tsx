import { useMemo, useState } from 'react'
import { Search, ChevronDown, CalendarDays } from 'lucide-react'
import { ConsoleLayout } from '@/components/ConsoleLayout'
import { CrewDetailModal, type CrewDetail } from '@/components/CrewDetailModal'
import { CREW, type CrewStatus } from '@/lib/roster'
import { cn } from '@/lib/utils'

const statusMeta: Record<CrewStatus, { badge: string; dot: string }> = {
  Available: { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  Assigned: { badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  'On Leave': { badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-400' },
}

interface Stat {
  label: string
  value: string
  accent: string
}

const STATS: Stat[] = [
  { label: 'Total Crew', value: '142', accent: 'bg-foreground' },
  { label: 'Auto-Allocated', value: '96', accent: 'bg-amber-500' },
  { label: 'Active Deployments', value: '48', accent: 'bg-sky-400' },
  { label: 'Pending Leave', value: '8', accent: 'bg-rose-400' },
]

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[0.65rem] font-bold uppercase tracking-wide text-primary ring-1 ring-border">
      {initials}
    </span>
  )
}

export function CrewRosterPage() {
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('All Roles')
  const [statusFilter, setStatusFilter] = useState<'All Statuses' | CrewStatus>('All Statuses')
  const [selected, setSelected] = useState<CrewDetail | null>(null)

  const roles = useMemo(
    () => ['All Roles', ...Array.from(new Set(CREW.map((c) => c.role)))],
    [],
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return CREW.filter((c) => {
      const matchesRole = roleFilter === 'All Roles' || c.role === roleFilter
      const matchesStatus = statusFilter === 'All Statuses' || c.status === statusFilter
      const matchesQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        c.employeeId.toLowerCase().includes(q) ||
        (c.allocation?.event.toLowerCase().includes(q) ?? false) ||
        (c.allocation?.task.toLowerCase().includes(q) ?? false)
      return matchesRole && matchesStatus && matchesQuery
    })
  }, [query, roleFilter, statusFilter])

  return (
    <ConsoleLayout>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Warehouse · Crew Roster
          </p>
          <h1 className="mt-1 font-serif text-3xl font-medium tracking-tight text-foreground lg:text-4xl">
            Crew Roster &amp; Event Allocation
          </h1>
          <p className="mt-2 max-w-2xl text-xs italic leading-relaxed text-muted-foreground">
            Deployments are auto-allocated by the scheduler. Each crew member&apos;s assigned event,
            date, and field task sync here automatically — no manual manning required.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, role, event, or task..."
              className="w-full rounded-md border border-input bg-card py-2 pl-9 pr-3 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30 sm:w-72"
            />
          </div>

        </div>
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap gap-3">
        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filter by role"
            className="appearance-none rounded-md border border-border bg-card py-2 pl-4 pr-9 text-xs font-medium text-card-foreground outline-none transition hover:bg-muted focus:border-primary focus:ring-2 focus:ring-ring/30"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r === 'All Roles' ? '— Filter by Role —' : r}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            aria-label="Filter by status"
            className="appearance-none rounded-md border border-border bg-card py-2 pl-4 pr-9 text-xs font-medium text-card-foreground outline-none transition hover:bg-muted focus:border-primary focus:ring-2 focus:ring-ring/30"
          >
            {['All Statuses', 'Available', 'Assigned', 'On Leave'].map((s) => (
              <option key={s} value={s}>
                {s === 'All Statuses' ? '— Filter by Status —' : s}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      {/* Stats */}
      <div className="mt-7 grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-4 lg:p-7">
        {STATS.map((s) => (
          <div key={s.label} className="flex flex-col">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {s.label}
            </p>
            <p className="mt-3 font-sans text-2xl font-bold leading-none text-card-foreground">
              {s.value}
            </p>
            <div className={cn('mt-4 h-0.5 w-full rounded-full', s.accent)} />
          </div>
        ))}
      </div>

      {/* Roster table */}
      <div className="mt-7 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[940px] text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-5 py-4 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Staff Member
              </th>
              <th className="px-5 py-4 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Core Role
              </th>
              <th className="px-5 py-4 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Allocated Event
              </th>
              <th className="px-5 py-4 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Date
              </th>
              <th className="px-5 py-4 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Field Task
              </th>
              <th className="px-5 py-4 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Status
              </th>
              <th className="px-5 py-4 text-right text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center text-xs text-muted-foreground">
                  No crew members match your search.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="cursor-pointer border-t border-border/60 align-middle transition hover:bg-muted/40"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} />
                      <div>
                        <p className="text-sm font-semibold text-card-foreground">{c.name}</p>
                        <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">
                          {c.employeeId}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs text-card-foreground">{c.role}</td>
                  <td className="px-5 py-4">
                    {c.allocation ? (
                      <div>
                        <p className="text-xs font-semibold text-card-foreground">
                          {c.allocation.event}
                        </p>
                        <p className="text-[0.65rem] text-muted-foreground">{c.allocation.venue}</p>
                      </div>
                    ) : (
                      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60">
                        Unassigned
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {c.allocation ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-card-foreground">
                        <CalendarDays className="size-3.5 text-muted-foreground" />
                        {c.allocation.date}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-card-foreground">
                    {c.allocation ? (
                      c.allocation.task
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em]',
                        statusMeta[c.status].badge,
                      )}
                    >
                      <span className={cn('size-1.5 rounded-full', statusMeta[c.status].dot)} />
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelected(c)
                      }}
                      className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary underline-offset-4 transition hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CrewDetailModal member={selected} onClose={() => setSelected(null)} />
    </ConsoleLayout>
  )
}
