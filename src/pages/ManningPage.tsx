import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { Bell, CalendarDays, ClipboardList, FileText, Lock, ShieldAlert, UserCircle2, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { WarningPanel, ActionButton } from '@/components/PwaWorkflows'
import { MaskedPinInput } from '@/components/admin/MaskedPinInput'
import { decideGroundCrewDeclaration, getApproachingDeclarationsSummary, getManningFallbackDeclarations, reconcileExpiredDeclarations, useGroundCrewDeclarations, type GroundCrewDeclaration } from '@/lib/ground-crew-declarations'

type Tab = 'home' | 'calendar' | 'activity' | 'account'
const incidents = [{ id: 'inc-1', title: 'Welfare concern during load-in', detail: 'Founders Dinner · submitted Aug 20, 09:42', status: 'New' }, { id: 'inc-2', title: 'Missing radio handset', detail: 'Maison Privée Launch · submitted Aug 19, 16:10', status: 'New' }]
const initialOverdue = [{ id: 't-1', title: 'Polish & crate candelabras', lead: 'Warehouse Lead', due: 'Aug 19, 12:00' }, { id: 't-2', title: 'Confirm return count', lead: 'Warehouse Lead', due: 'Aug 18, 17:00' }]

export function ManningPage() {
  const { adminName, adminEmail, logout } = useAuth()
  const declarations = useGroundCrewDeclarations()
  const [tab, setTab] = useState<Tab>('home')
  const [toast, setToast] = useState('')
  const [pinOpen, setPinOpen] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [pin, setPin] = useState('')
  const [incidentStates, setIncidentStates] = useState<Record<string, string>>({})
  const [overdueTasks, setOverdueTasks] = useState(initialOverdue)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    reconcileExpiredDeclarations()
    const interval = window.setInterval(() => {
      setNow(Date.now())
      reconcileExpiredDeclarations()
    }, 30_000)
    return () => window.clearInterval(interval)
  }, [declarations])

  const approachingSummary = getApproachingDeclarationsSummary(now)
  const fallbackDeclarations = getManningFallbackDeclarations(now)

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 5000) }
  const unlock = () => { if (pin === '246810') { setUnlocked(true); setPinOpen(false); setPin(''); notify('Incident Inbox unlocked for this session.') } else notify('Enter the 6-digit Manning PIN.') }

  return <div className="mobile-shell admin-fade"><header className="app-header"><div><p className="eyebrow">Lumière Operations</p><div className="brand-mark">MANNING OFFICER</div></div><button className="avatar" onClick={() => setTab('account')} aria-label="Open account">{(adminName || 'MO').slice(0,2).toUpperCase()}</button></header><main className="app-main">{tab === 'home' && <Home onNotify={notify} overdue={overdueTasks} fallbackDeclarations={fallbackDeclarations} approachingSummary={approachingSummary} onOverrideTask={(id, title) => { setOverdueTasks((prev) => prev.filter((t) => t.id !== id)); notify(`${title} overridden by Manning.`) }} onOverrideDeclaration={(id, decision) => { decideGroundCrewDeclaration(id, decision, adminName || 'Manning Officer'); notify(`Escalated declaration ${decision.toLowerCase()} by Manning.`) }} onInbox={() => unlocked ? null : setPinOpen(true)} unlocked={unlocked} incidentStates={incidentStates} setIncidentStates={setIncidentStates} />}{tab === 'calendar' && <DailyReview onNotify={notify} fallbackCount={fallbackDeclarations.length} approachingCount={approachingSummary.totalApproaching} />}{tab === 'activity' && <Activity />}{tab === 'account' && <Account name={adminName || 'Manning Officer'} email={adminEmail || 'manning@lumiere.com'} onLogout={logout} />}</main><nav className="bottom-nav" aria-label="Manning navigation">{([['home','Home',ClipboardList],['calendar','Calendar',CalendarDays],['activity','Activity',FileText],['account','Account',UserCircle2]] as const).map(([key,label,Icon]) => <button key={key} onClick={() => setTab(key)} className={tab === key ? 'active' : ''}><Icon className="size-5" /><span>{label}</span></button>)}</nav>{toast && <div className="fixed bottom-24 left-1/2 z-40 w-[calc(100%-32px)] -translate-x-1/2 rounded-md bg-primary px-4 py-3 text-center text-sm text-primary-foreground shadow-lg">{toast}</div>}{pinOpen && <div className="sheet-backdrop"><div className="sheet space-y-4"><div className="flex items-start justify-between"><div><p className="eyebrow">Restricted</p><h2 className="mt-1 font-serif text-2xl">Incident Inbox</h2></div><button className="icon-button" onClick={() => setPinOpen(false)} aria-label="Close"><X className="size-4" /></button></div><div className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="size-4" /> Enter your six-digit PIN to continue.</div><div className="mt-2 text-left"><MaskedPinInput id="manning-pin-input" label="6-digit PIN" value={pin} onChange={setPin} onKeyDown={(e) => { if (e.key === 'Enter' && pin.length === 6) unlock() }} autoFocus /></div><button className="button-primary w-full" onClick={unlock}>Unlock inbox</button></div></div>}</div>
}

function Home({ onNotify, overdue, fallbackDeclarations, approachingSummary, onOverrideTask, onOverrideDeclaration, onInbox, unlocked, incidentStates, setIncidentStates }: { onNotify: (message:string)=>void; overdue: { id: string; title: string; lead: string; due: string }[]; fallbackDeclarations: GroundCrewDeclaration[]; approachingSummary: { totalApproaching: number; eventsCount: number }; onOverrideTask: (id: string, title: string) => void; onOverrideDeclaration: (id: string, decision: 'Confirmed' | 'Rejected') => void; onInbox:()=>void; unlocked:boolean; incidentStates:Record<string,string>; setIncidentStates: Dispatch<SetStateAction<Record<string,string>>> }) {
  const totalBreaches = overdue.length + fallbackDeclarations.length
  return (
    <div className="space-y-5">
      <section className="paper-card">
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-primary" />
          <p className="eyebrow">Notifications &amp; Escalations</p>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          {totalBreaches > 0 && (
            <p>
              <strong>{totalBreaches} item{totalBreaches > 1 ? 's' : ''} escalated:</strong> {overdue.length} lead confirmation{overdue.length === 1 ? '' : 's'} and {fallbackDeclarations.length} field declaration{fallbackDeclarations.length === 1 ? '' : 's'} are beyond the 48-hour window.
            </p>
          )}
          {approachingSummary.totalApproaching > 0 && (
            <p className="text-amber-800 dark:text-amber-300">
              <strong>Escalation Warning:</strong> {approachingSummary.totalApproaching} pending field declaration{approachingSummary.totalApproaching > 1 ? 's are' : ' is'} approaching the 48-hour deadline across {approachingSummary.eventsCount} event{approachingSummary.eventsCount > 1 ? 's' : ''}.
            </p>
          )}
          {totalBreaches === 0 && approachingSummary.totalApproaching === 0 && (
            <p className="text-muted-foreground">All lead confirmations and field declarations are within SLA.</p>
          )}
        </div>
      </section>

      <header>
        <p className="eyebrow">Manning control</p>
        <h1 className="mt-2 text-3xl font-serif">Daily review</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Resolve overdue confirmations and manage people operations.</p>
      </header>

      <section className="space-y-3">
        <div className="section-heading">
          <h2>48-hour override · {totalBreaches}</h2>
          <ShieldAlert className="size-5 text-primary" />
        </div>

        {totalBreaches === 0 ? (
          <div className="paper-card text-sm text-muted-foreground">No overdue tasks or escalated declarations.</div>
        ) : (
          <>
            {overdue.map((task) => (
              <article key={task.id} className="paper-card flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{task.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Due {task.due} · {task.lead}</p>
                  <span className="status status-rejected mt-2">Overdue</span>
                </div>
                <button className="button-primary" onClick={() => onOverrideTask(task.id, task.title)}>Override</button>
              </article>
            ))}

            {fallbackDeclarations.map((decl) => (
              <article key={decl.id} className="paper-card space-y-3 border-l-4 border-l-destructive">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">{decl.condition} · {decl.item}</p>
                    <p className="font-medium">{decl.eventName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {decl.quantity} affected · reported by {decl.submittedBy} ({decl.submittedRole})
                    </p>
                  </div>
                  <span className="status status-rejected">Escalated to Manning (48h+)</span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{decl.description}</p>
                <div className="flex gap-2 pt-1">
                  <button className="button-primary" onClick={() => onOverrideDeclaration(decl.id, 'Confirmed')}>
                    Manning Confirm
                  </button>
                  <button className="button-secondary" onClick={() => onOverrideDeclaration(decl.id, 'Rejected')}>
                    Manning Reject
                  </button>
                </div>
              </article>
            ))}
          </>
        )}
      </section>

      <WarningPanel onNotify={onNotify} />

      <section className="paper-card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Private workflow</p>
            <h2 className="mt-1 font-serif text-xl">Incident Inbox</h2>
          </div>
          <span className="status status-submitted">PIN gated</span>
        </div>
        {!unlocked ? (
          <button className="button-secondary w-full" onClick={onInbox}>
            <Lock className="size-4" /> Unlock with PIN
          </button>
        ) : (
          incidents.map((incident) => (
            <div key={incident.id} className="border-t border-border pt-3">
              <p className="font-medium">{incident.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{incident.detail}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['Acknowledged', 'Call for Talk', 'No Action Needed'].map((action) => (
                  <ActionButton
                    key={action}
                    label={incidentStates[incident.id] === action ? 'Saved' : action}
                    onClick={() => setIncidentStates((current) => ({ ...current, [incident.id]: action }))}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  )
}

function DailyReview({ onNotify, fallbackCount, approachingCount }: { onNotify: (message:string)=>void; fallbackCount: number; approachingCount: number }) {
  const [date, setDate] = useState('2026-08-20')
  return (
    <div className="space-y-5">
      <header>
        <p className="eyebrow">Manning log</p>
        <h1 className="mt-2 text-3xl font-serif">Daily Review</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Review tasks and declarations left unconfirmed by Leads or Event Admins.</p>
      </header>
      <label className="field-label mt-0">
        Review date
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field-input" />
      </label>
      <section className="space-y-3">
        <div className="paper-card space-y-2">
          <p className="eyebrow">{date}</p>
          <p className="text-sm">2 tasks remained unconfirmed by end of day.</p>
          {fallbackCount > 0 && (
            <p className="text-xs text-destructive">
              <strong>{fallbackCount} field declaration{fallbackCount > 1 ? 's' : ''}</strong> exceeded the 48-hour event confirmation window.
            </p>
          )}
          {approachingCount > 0 && (
            <p className="text-xs text-amber-800 dark:text-amber-300">
              <strong>{approachingCount} declaration{approachingCount > 1 ? 's' : ''}</strong> currently approaching 48h deadline.
            </p>
          )}
        </div>
        <button className="button-primary w-full" onClick={() => onNotify('Daily review saved.')}>
          Save daily review
        </button>
      </section>
    </div>
  )
}

function Activity() {
  return (
    <div className="space-y-5">
      <header>
        <p className="eyebrow">Manning record</p>
        <h1 className="mt-2 text-3xl font-serif">Activity</h1>
      </header>
      <div className="paper-card">
        <p className="font-medium">Standing warning issued to Warehouse Lead</p>
        <p className="mt-2 text-xs text-muted-foreground">Aug 20, 2026 · 10:14</p>
      </div>
      <div className="paper-card">
        <p className="font-medium">Incident Inbox response recorded</p>
        <p className="mt-2 text-xs text-muted-foreground">Aug 20, 2026 · 09:42</p>
      </div>
    </div>
  )
}

function Account({ name, email, onLogout }: { name: string; email: string; onLogout: () => void }) {
  return (
    <div className="space-y-5">
      <header>
        <p className="eyebrow">Manning account</p>
        <h1 className="mt-2 text-3xl font-serif">{name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{email}</p>
      </header>
      <div className="paper-card">
        <p className="font-medium">Operations authority</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">You can review overdue tasks, issue warnings, and route personnel incidents.</p>
      </div>
      <button className="button-secondary w-full" onClick={onLogout}>
        Sign out
      </button>
    </div>
  )
}
