import { useState, type FormEvent } from 'react'
import { AlertTriangle, Check, MessageSquare, Pin, Send, ShieldAlert, UserRound, X } from 'lucide-react'

export function FeedbackForm({ onClose, onSubmitted }: { onClose: () => void; onSubmitted: (message: string) => void }) {
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSubmitted('Feedback sent to the operations team.'); onClose() }
  return <div className="sheet-backdrop"><form className="sheet space-y-4" onSubmit={submit}><div className="flex items-start justify-between"><div><p className="eyebrow">Account</p><h2 className="mt-1 font-serif text-2xl">Feedback</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X className="size-4" /></button></div><label className="field-label">What would you like to share?<textarea name="feedback" required rows={5} className="field-input" placeholder="Tell us what would make the workflow better..." /></label><button className="button-primary w-full"><Send className="size-4" /> Submit feedback</button></form></div>
}

export function IncidentForm({ onClose, onSubmitted }: { onClose: () => void; onSubmitted: (message: string) => void }) {
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSubmitted('Incident report submitted with an automatic timestamp.'); onClose() }
  return <div className="sheet-backdrop"><form className="sheet space-y-4" onSubmit={submit}><div className="flex items-start justify-between"><div><p className="eyebrow">Personnel & welfare</p><h2 className="mt-1 font-serif text-2xl">Incident Report</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X className="size-4" /></button></div><label className="field-label">What happened?<textarea name="description" required rows={4} className="field-input" placeholder="Describe the concern..." /></label><label className="field-label">Employee or department involved (optional)<input name="involved" className="field-input" placeholder="Name or department" /></label><label className="field-label">Send to<select name="recipient" className="field-input"><option>Admin</option><option>Manning</option><option>Both</option></select></label><p className="text-xs leading-5 text-muted-foreground">Date and time are captured automatically when you submit.</p><button className="button-primary w-full"><ShieldAlert className="size-4" /> Submit incident</button></form></div>
}

export function PinButton({ pinned, onToggle }: { pinned: boolean; onToggle: () => void }) { return <button type="button" className={`icon-button shrink-0 ${pinned ? 'bg-primary text-primary-foreground' : ''}`} onClick={(event) => { event.stopPropagation(); onToggle() }} aria-label={pinned ? 'Unpin' : 'Pin'} title="Pin"><Pin className="size-4" /></button> }

export function GenericTaskPanel({ canClaim = true, onNotify }: { canClaim?: boolean; onNotify: (message: string) => void }) {
  const [claimed, setClaimed] = useState<string[]>([])
  const pool = [{ id: 'generic-1', title: 'Audit return crates', detail: 'Founders Dinner · Due Aug 21, 17:00' }, { id: 'generic-2', title: 'Prepare loading labels', detail: 'Maison Privée Launch · Due Aug 25, 12:00' }]
  return <section className="space-y-3"><div className="section-heading"><h2>Generic Task</h2><ClipboardMark /></div>{pool.map((task) => <article key={task.id} className="paper-card flex items-center justify-between gap-3"><div><p className="font-medium">{task.title}</p><p className="mt-1 text-xs text-muted-foreground">{task.detail}</p>{claimed.includes(task.id) && <span className="status status-approved mt-2">Claimed</span>}</div>{canClaim && <button className="button-secondary" disabled={claimed.includes(task.id)} onClick={() => { setClaimed((current) => [...current, task.id]); onNotify(`You claimed “${task.title}”.`) }}>{claimed.includes(task.id) ? 'Claimed' : 'Claim task'}</button>}</article>)}</section>
}
function ClipboardMark() { return <MessageSquare className="size-5 text-primary" /> }

export function WarningPanel({ onNotify }: { onNotify: (message: string) => void }) {
  const [count, setCount] = useState(2)
  const issue = (tier: string, automatic = false) => { if (automatic) setCount((value) => value + 1); onNotify(`${tier} issued${automatic ? ` · warning total ${count + 1}` : ''}.`) }
  return <section className="paper-card space-y-3"><div className="flex items-center gap-2"><AlertTriangle className="size-4 text-primary" /><p className="eyebrow">Warning issuance</p></div><p className="text-sm leading-6 text-muted-foreground">Standing warnings count toward the automatic Call to Office threshold of 3.</p><div className="grid grid-cols-2 gap-2"><button className="button-secondary" onClick={() => issue('Minor warning')}>Minor</button><button className="button-secondary" onClick={() => issue('Standing warning', true)}>Standing</button></div><button className="button-primary w-full" onClick={() => issue('Manual Call to Office')}>Manual Call to Office</button><p className="text-xs text-muted-foreground">Standing warnings: {count} · manual calls do not change this total.</p></section>
}

export function EmptyWorkflowNote() { return <p className="flex items-start gap-2 text-sm leading-6 text-muted-foreground"><UserRound className="mt-0.5 size-4 shrink-0 text-primary" /> All submissions are routed to the selected recipient and appear in the relevant activity record.</p> }
export function ActionButton({ label, onClick }: { label: string; onClick: () => void }) { return <button className="button-secondary" onClick={onClick}><Check className="size-4" />{label}</button> }
