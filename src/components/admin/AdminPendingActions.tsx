import { useEffect, useState } from 'react'
import { KeyRound, Lock, ShieldQuestion, UserPlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserAction } from '@/lib/types'

export interface PendingSubRoleSetup {
  id: string
  parentId: string
  parentName: string
  subRoleId: string
  name: string
}

type SelectedAction = UserAction | PendingSubRoleSetup

interface AdminPendingActionsProps {
  items: UserAction[]
  onResolve: (item: UserAction) => void
  subRoleSetups?: PendingSubRoleSetup[]
  onConfigureSubRole?: (setup: PendingSubRoleSetup) => void
}

function actionMeta(item: UserAction) {
  const isForgot = item.type === 'forgot-password'
  const isAccessReq = item.type === 'access-request'
  return {
    Icon: isAccessReq ? UserPlus : isForgot ? KeyRound : Lock,
    title: isAccessReq ? 'New Access Request' : isForgot ? 'Forgot Password Request' : 'Account Locked Out',
    label: isAccessReq ? 'Review & Create Account' : isForgot ? 'Generate Temp Password' : 'Unlock & Send Temp',
    tone: isAccessReq ? 'text-primary' : isForgot ? 'text-rose-500' : 'text-amber-500',
  }
}

export function AdminPendingActions({ items, onResolve, subRoleSetups = [], onConfigureSubRole }: AdminPendingActionsProps) {
  const [selected, setSelected] = useState<SelectedAction | null>(null)
  const [previewNotice, setPreviewNotice] = useState(false)
  const isEmpty = items.length === 0 && subRoleSetups.length === 0
  const isPreviewItem = (item: SelectedAction): item is UserAction => 'type' in item && item.id === 'preview-account-locked-out'

  useEffect(() => {
    if (!selected) return
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setSelected(null)
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [selected])

  const isUserAction = (item: SelectedAction): item is UserAction => 'type' in item
  const runAction = (item: SelectedAction) => {
    if (isPreviewItem(item)) {
      setPreviewNotice(true)
      setSelected(null)
      return
    }
    if (isUserAction(item)) onResolve(item)
    else onConfigureSubRole?.(item)
    setSelected(null)
  }

  return (
    <>
      <section className="flex h-[24rem] flex-col rounded-xl border border-border bg-card p-4 text-foreground shadow-sm sm:p-5">
        <div className="flex shrink-0 items-baseline justify-between gap-3">
          <h2 className="font-serif text-2xl font-medium leading-tight text-foreground sm:text-3xl">Pending Actions</h2>
          <span className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{items.length + subRoleSetups.length} queued</span>
        </div>
        {previewNotice && <p role="status" className="mt-3 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">Preview record — no action performed.</p>}
        {isEmpty ? (
          <p className="mt-4 text-xs italic text-muted-foreground">No pending administrative actions.</p>
        ) : (
          <ul className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
            {subRoleSetups.map((setup) => (
              <li key={setup.id} className="border-t border-border first:border-t-0">
                <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" onClick={() => setSelected(setup)} className="flex min-w-0 flex-1 items-start gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <ShieldQuestion className="mt-0.5 size-3.5 shrink-0 text-amber-500" aria-hidden="true" />
                    <span className="min-w-0"><span className="flex flex-wrap items-center gap-1.5"><span className="text-xs font-semibold">Permission Configuration</span><span className="rounded-full border border-border bg-muted/80 px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.09em] text-foreground/80">{setup.parentName}</span></span><span className="mt-0.5 block truncate text-[0.65rem] font-medium text-muted-foreground">{setup.name}</span></span>
                  </button>
                  <button type="button" onClick={() => runAction(setup)} className="inline-flex w-full shrink-0 items-center justify-center rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground sm:w-auto">Configure</button>
                </div>
              </li>
            ))}
            {items.map((item) => {
              const meta = actionMeta(item)
              const Icon = meta.Icon
              return (
                <li key={item.id} className="border-t border-border first:border-t-0">
                  <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <button type="button" onClick={() => setSelected(item)} className="flex min-w-0 flex-1 items-start gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <Icon className={cn('mt-0.5 size-3.5 shrink-0', meta.tone)} aria-hidden="true" />
                      <span className="min-w-0"><span className="flex flex-wrap items-center gap-1.5"><span className="text-xs font-semibold">{meta.title}</span>{item.accountType && <span className="rounded-full border border-border bg-muted/80 px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.09em] text-foreground/80">{item.accountType}</span>}{isPreviewItem(item) && <span className="rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.09em] text-primary">Sample</span>}</span><span className="mt-0.5 block truncate text-[0.65rem] font-medium text-muted-foreground">{item.email || item.user}</span>{isPreviewItem(item) && <><span className="mt-0.5 block text-[0.65rem] text-muted-foreground">Too many failed login attempts</span><span className="block text-[0.6rem] italic text-muted-foreground">Sample / Preview</span></>}</span>
                    </button>
                    {item.status === 'completed' ? <span className="shrink-0 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Completed</span> : <button type="button" onClick={() => runAction(item)} className="inline-flex w-full shrink-0 items-center justify-center rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground sm:w-auto">{meta.label}</button>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {selected && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="pending-action-title" onClick={() => setSelected(null)}>
        <div className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-card shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-start justify-between border-b border-border px-5 py-4"><div><p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Pending Action Details</p><h2 id="pending-action-title" className="mt-1 font-serif text-xl font-medium text-card-foreground">{isUserAction(selected) ? actionMeta(selected).title : 'Permission Configuration'}</h2></div><button type="button" onClick={() => setSelected(null)} className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground" aria-label="Close details"><X className="size-5" /></button></div>
          <dl className="min-h-0 overflow-y-auto px-5 py-5 text-sm"><div className="flex flex-col gap-1 border-b border-border pb-3"><dt className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Affected Account</dt><dd className="break-words text-foreground">{isUserAction(selected) ? selected.email || selected.user : selected.name}</dd></div><div className="flex flex-col gap-1 border-b border-border py-3"><dt className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Role</dt><dd className="text-foreground">{isUserAction(selected) ? selected.accountType || 'Not provided' : selected.parentName}</dd></div>{isPreviewItem(selected) && <div className="flex flex-col gap-1 border-b border-border py-3"><dt className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Reason</dt><dd className="text-foreground">Too many failed login attempts</dd></div>}<div className="flex flex-col gap-1 pt-3"><dt className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Status</dt><dd className="capitalize text-foreground">{isUserAction(selected) ? selected.status : 'Pending'}{isPreviewItem(selected) && <span className="ml-2 rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.09em] text-primary">Sample / Preview</span>}</dd></div></dl>
          <div className="flex flex-wrap justify-end gap-3 border-t border-border px-5 py-4"><button type="button" onClick={() => setSelected(null)} className="rounded-md border border-input bg-background px-4 py-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-foreground hover:bg-muted">Close</button>{(isUserAction(selected) ? selected.status !== 'completed' : Boolean(onConfigureSubRole)) && <button type="button" onClick={() => runAction(selected)} className="rounded-md bg-primary px-4 py-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-primary-foreground hover:opacity-90">{isUserAction(selected) ? actionMeta(selected).label : 'Configure'}</button>}</div>
        </div>
      </div>}
    </>
  )
}
