interface DashboardRoleHeaderProps {
  roleLabel: string
  name: string
}

/** Shared role dashboard greeting, intentionally kept independent of each role's data scope. */
export function DashboardRoleHeader({ roleLabel, name }: DashboardRoleHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-[0.6rem] font-bold uppercase tracking-[0.28em] text-primary">{roleLabel}</p>
        <h1 className="mt-0.5 font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Good to see you, {name.split(' ')[0] || 'there'}.
        </h1>
      </div>
    </header>
  )
}
