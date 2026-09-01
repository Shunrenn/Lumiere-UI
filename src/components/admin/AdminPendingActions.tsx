import { KeyRound, Lock, ShieldQuestion } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserAction } from '@/lib/types'

// A newly created sub-role whose permission table has never been saved.
export interface PendingSubRoleSetup {
  id: string
  parentId: string
  parentName: string
  subRoleId: string
  name: string
}

interface AdminPendingActionsProps {
  // Forgot-password / account-locked items aggregated across ALL account types.
  items: UserAction[]
  onResolve: (item: UserAction) => void
  // Sub-roles created without their permission table ever being saved.
  subRoleSetups?: PendingSubRoleSetup[]
  onConfigureSubRole?: (setup: PendingSubRoleSetup) => void
}

// Read-only glance panel: surfaces the pending account items needing an Admin
// action. Each row exposes exactly one action button; completed rows show a
// muted "✓ Completed" label instead. The dashboard itself edits nothing — the
// button routes into Workforce Management (or Roles & Sub-Roles, for setup
// items) to perform the action.
export function AdminPendingActions({
  items,
  onResolve,
  subRoleSetups = [],
  onConfigureSubRole,
}: AdminPendingActionsProps) {
  const isEmpty = items.length === 0 && subRoleSetups.length === 0
  return (
    <section className="flex h-[24rem] flex-col rounded-xl border border-border bg-card p-5 text-card-foreground">
      <h2 className="shrink-0 font-serif text-2xl font-medium leading-tight text-sidebar-primary text-balance sm:text-3xl">
        Pending Actions
      </h2>

      {isEmpty ? (
        <p className="mt-4 text-xs italic text-sidebar-foreground/50">
          No pending actions — all clear.
        </p>
      ) : (
        <ul className="mt-3 flex min-h-0 flex-1 flex-col overflow-y-auto">
          {subRoleSetups.map((setup) => (
            <li
              key={setup.id}
              className="flex flex-col gap-2 border-t border-sidebar-border/50 py-2.5 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-2">
                <ShieldQuestion
                  className="mt-0.5 size-3.5 shrink-0 text-amber-400"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-xs font-semibold text-sidebar-primary">
                      Sub-role &quot;{setup.name}&quot; needs permission configuration
                    </p>
                    <span className="inline-flex items-center rounded-full border border-sidebar-border bg-sidebar-accent/40 px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.09em] text-sidebar-foreground/75">
                      {setup.parentName}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[0.65rem] text-sidebar-foreground/65">
                    No permission levels have been saved yet
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onConfigureSubRole?.(setup)}
                className="inline-flex w-full items-center justify-center rounded-md border border-sidebar-border px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-sidebar-primary transition-colors hover:bg-sidebar-accent sm:w-auto"
              >
                Configure
              </button>
            </li>
          ))}
          {items.map((item) => {
            const isForgot = item.type === 'forgot-password'
            const completed = item.status === 'completed'
            const Icon = isForgot ? KeyRound : Lock
            const title = isForgot ? 'Forgot Password Request' : 'Account Locked Out'
            const actionLabel = isForgot ? 'Generate Temp Password' : 'Unlock & Send Temp'
            return (
              <li
                key={item.id}
                className="flex flex-col gap-2 border-t border-sidebar-border/50 py-2.5 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-2">
                  <Icon
                    className={cn(
                      'mt-0.5 size-3.5 shrink-0',
                      isForgot ? 'text-rose-400' : 'text-amber-400',
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-xs font-semibold text-sidebar-primary">{title}</p>
                      {item.accountType && (
                        <span className="inline-flex items-center rounded-full border border-sidebar-border bg-sidebar-accent/40 px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.09em] text-sidebar-foreground/75">
                          {item.accountType}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[0.65rem] text-sidebar-foreground/65">
                      {item.user}
                    </p>
                  </div>
                </div>

                {completed ? (
                  <span className="inline-flex items-center gap-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-sidebar-foreground/40 sm:justify-end">
                    <span aria-hidden="true">✓</span> Completed
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onResolve(item)}
                    className="inline-flex w-full items-center justify-center rounded-md border border-sidebar-border px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-sidebar-primary transition-colors hover:bg-sidebar-accent sm:w-auto"
                  >
                    {actionLabel}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
