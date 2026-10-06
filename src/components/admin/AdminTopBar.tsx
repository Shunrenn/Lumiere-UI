import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, LogOut, Menu, Moon, ShieldAlert, Sun, User, UserPlus, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useNav } from '@/lib/nav'
import { usePortal } from '@/lib/store'
import { useDarkMode } from '@/lib/theme'
import { NotificationsBell, type NotificationEntry } from '@/components/NotificationsBell'
import { SECURITY_EVENTS, type SecurityEvent } from '@/lib/security-events'

export function AdminTopBar({ onMenu }: { onMenu?: () => void }) {
  const { adminName, adminRole, adminEmail, currentUser, setConfirmLogout } = useAuth()
  const { navigate } = useNav()
  const { dark, toggle } = useDarkMode()
  const { userActions, pendingSubRoleSetups } = usePortal()
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const menuRef = useRef<HTMLDivElement>(null)

  const notifications = useMemo(() => {
    const list: NotificationEntry[] = []
    const actions = (userActions as any[]) || []
    const setups = (pendingSubRoleSetups as any[]) || []
    actions.filter((a: any) => a.type === 'account-locked').forEach((a: any) => {
      const email = a.email || a.user
      list.push({ id: `act-lock-${a.id}`, icon: ShieldAlert, color: 'text-destructive', text: `Account locked: ${a.name || email}`, time: a.status === 'pending' ? 'Action required' : 'Resolved', unread: a.status === 'pending', onClick: () => navigate('workforce', { kind: 'unlock-user', payload: { email } }) })
    })
    actions.filter((a: any) => a.type === 'forgot-password' || a.type === 'access-request').forEach((a: any) => {
      const access = a.type === 'access-request'
      const email = a.email || a.user
      list.push({ id: `act-req-${a.id}`, icon: access ? UserPlus : Activity, color: access ? 'text-primary' : 'text-rose-500', text: access ? `New access request: ${email}` : `Forgot password request: ${email}`, time: a.status === 'pending' ? 'Pending' : 'Resolved', unread: a.status === 'pending', onClick: () => navigate('workforce', { kind: 'unlock-user', payload: { email } }) })
    })
    setups.forEach((setup: any) => list.push({ id: `setup-${setup.id}`, icon: Activity, color: 'text-amber-500', text: `Sub-role "${setup.name}" needs permission configuration (${setup.parentName})`, time: 'Needs setup', unread: true, onClick: () => navigate('workforce') }))
    SECURITY_EVENTS.slice(0, 3).forEach((ev: SecurityEvent) => list.push({ id: `sec-ev-${ev.id}`, icon: Activity, color: ev.status === 'Blocked' || ev.status === 'Failed' ? 'text-destructive' : 'text-sky-500', text: `${ev.action}: ${ev.note}`, time: ev.timestamp, unread: false, onClick: () => navigate('security-audit') }))
    return list
  }, [userActions, pendingSubRoleSetups, navigate])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    if (!menuOpen) return
    const close = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: '2-digit', year: 'numeric' })
  const timeLabel = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-3 sm:px-8 md:static">
    <div className="flex min-w-0 items-center gap-2.5">
      {onMenu && <button type="button" onClick={onMenu} aria-label="Open admin navigation" className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:bg-muted md:hidden"><Menu className="size-4" aria-hidden="true" /></button>}
      <p className="truncate text-[0.58rem] font-medium uppercase tracking-[0.12em] text-muted-foreground sm:text-xs sm:tracking-[0.15em]">{dateLabel} <span className="mx-1 text-border">|</span> {timeLabel}</p>
    </div>
    <div className="flex items-center gap-1.5">
      <NotificationsBell notifications={notifications} size="md" />
      <div className="relative" ref={menuRef}>
        <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Account menu" className="flex size-10 items-center justify-center rounded-full border border-border bg-primary/15 text-primary transition-colors hover:bg-primary/25"><User className="size-4" aria-hidden="true" /></button>
        {menuOpen && <div role="menu" className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-card shadow-xl">
          <div className="px-4 py-3"><p className="truncate text-sm font-semibold text-card-foreground">{adminName}</p><p className="truncate text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground">{adminRole}</p></div>
          <div className="border-t border-border"><button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setAccountModalOpen(true) }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium text-card-foreground transition-colors hover:bg-accent"><User className="size-3.5" aria-hidden="true" />Account information</button></div>
          <div className="border-t border-border"><button type="button" role="menuitem" onClick={toggle} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium text-card-foreground transition-colors hover:bg-accent">{dark ? <Sun className="size-3.5" aria-hidden="true" /> : <Moon className="size-3.5" aria-hidden="true" />}{dark ? 'Switch to light mode' : 'Switch to dark mode'}</button></div>
          <div className="border-t border-border"><button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setConfirmLogout(true) }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium text-destructive transition-colors hover:bg-accent"><LogOut className="size-3.5" aria-hidden="true" />Sign out</button></div>
        </div>}
      </div>
    </div>
    {accountModalOpen && <AccountInformationModal name={adminName} email={adminEmail} role={adminRole} employeeId={currentUser?.id} onClose={() => setAccountModalOpen(false)} />}
  </header>
}

function AccountInformationModal({ name, email, role, employeeId, onClose }: { name: string; email: string; role: string; employeeId?: string; onClose: () => void }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [onClose])
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="account-information-title" onClick={onClose}>
    <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between border-b border-border px-5 py-4"><div><p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Admin account</p><h2 id="account-information-title" className="mt-1 font-serif text-xl font-medium text-card-foreground">Account Information</h2></div><button type="button" onClick={onClose} className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground" aria-label="Close account information"><X className="size-5" aria-hidden="true" /></button></div>
      <div className="flex flex-col gap-5 px-5 py-6"><div className="flex items-center gap-3"><div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary" aria-hidden="true">{initials || 'A'}</div><div><p className="font-semibold text-card-foreground">{name || 'Admin'}</p><p className="text-xs text-muted-foreground">{role || 'Admin'}</p></div></div><dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Full name</dt><dd className="mt-1 break-words text-sm text-card-foreground">{name || 'Not available'}</dd></div><div><dt className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Email</dt><dd className="mt-1 break-words text-sm text-card-foreground">{email || 'Not available'}</dd></div><div><dt className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Role</dt><dd className="mt-1 text-sm text-card-foreground">{role || 'Admin'}</dd></div>{employeeId && <div><dt className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Employee ID</dt><dd className="mt-1 break-words text-sm text-card-foreground">{employeeId}</dd></div>}</dl></div>
    </div>
  </div>
}

export default AdminTopBar
