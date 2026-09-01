import { useState } from 'react'
import { Bell, Camera, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, FileText, Hammer, Lock, UserCircle2, Undo2, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useWarehouse, PRODUCTION_NOTIFICATIONS, type ProductionJob, type ProductionStage, type WarehouseEvent } from '@/lib/warehouse'

type Tab = 'home' | 'calendar' | 'activity' | 'account'

const SCHEDULE = [
  { date: '2026-08-19', time: '15:00', title: 'Production sync', venue: 'Lumière Depot' },
  { date: '2026-08-25', time: '10:00', title: 'Brass plinth QA check', venue: 'Lumière Depot' },
]

const STAGE_ORDER: ProductionStage[] = ['Unprepped', 'Prepping', 'Awaiting Approval', 'Ready']
const STAGE_STATUS_CLASS: Record<ProductionStage, string> = {
  Unprepped: 'status-neutral',
  Prepping: 'status-in-progress',
  'Awaiting Approval': 'status-submitted',
  Ready: 'status-approved',
}

function dateLabel(date: string) { return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) }

export function ProductionManagerPage() {
  const { adminName, adminEmail, logout } = useAuth()
  const { events, productionJobs, activity, moveProductionJob, toggleProductionMaterial, updateProductionNotes } = useWarehouse()
  const [tab, setTab] = useState<Tab>('home')
  const [selectedEvent, setSelectedEvent] = useState<WarehouseEvent | null>(null)
  const [openJob, setOpenJob] = useState<ProductionJob | null>(null)
  const [toast, setToast] = useState('')
  const [selectedDate, setSelectedDate] = useState('2026-08-20')
  const [notes, setNotes] = useState<Record<string, string>>({})

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 5000) }
  const pendingCount = productionJobs.filter((j) => j.stage === 'Awaiting Approval').length
  const activeJob = openJob ? productionJobs.find((j) => j.id === openJob.id) ?? openJob : null

  return <div className="mobile-shell admin-fade">
    <header className="app-header"><div><p className="eyebrow">Lumière Operations</p><div className="brand-mark">PRODUCTION</div></div><button className="avatar" onClick={() => setTab('account')} aria-label="Open account">{(adminName || 'PM').slice(0, 2).toUpperCase()}</button></header>
    <main className="app-main">
      {tab === 'home' && (selectedEvent ? (
        <EventJobs event={selectedEvent} jobs={productionJobs.filter((j) => j.eventId === selectedEvent.id)} onBack={() => setSelectedEvent(null)} onOpen={setOpenJob} />
      ) : (
        <Home events={events} jobs={productionJobs} pendingCount={pendingCount} onOpen={setSelectedEvent} />
      ))}
      {tab === 'calendar' && <CalendarView selectedDate={selectedDate} setSelectedDate={setSelectedDate} notes={notes} setNotes={setNotes} onSave={() => notify('Personal note saved.')} jobs={productionJobs} events={events} />}
      {tab === 'activity' && <Activity activity={activity} jobs={productionJobs} />}
      {tab === 'account' && <Account name={adminName || 'Production Manager'} email={adminEmail || 'production@lumiere.com'} onLogout={logout} />}
    </main>
    <nav className="bottom-nav" aria-label="Production navigation">{([['home', 'Home', ClipboardList], ['calendar', 'Calendar', CalendarDays], ['activity', 'Activity', FileText], ['account', 'Account', UserCircle2]] as const).map(([key, label, Icon]) => <button key={key} onClick={() => { setTab(key); setSelectedEvent(null) }} className={tab === key ? 'active' : ''}><Icon className="size-5" /><span>{label}</span></button>)}</nav>
    {toast && <div className="fixed bottom-24 left-1/2 z-40 w-[calc(100%-32px)] max-w-[528px] -translate-x-1/2 rounded-md bg-primary px-4 py-3 text-center text-sm text-primary-foreground shadow-lg">{toast}</div>}
    {activeJob && (
      <JobDetail
        job={activeJob}
        onClose={() => setOpenJob(null)}
        onToggleMaterial={(materialId) => toggleProductionMaterial(activeJob.id, materialId)}
        onNotesChange={(value) => updateProductionNotes(activeJob.id, value)}
        onAdvance={() => { moveProductionJob(activeJob.id, 'Awaiting Approval'); notify('Submitted for approval.') }}
        onApprove={() => { moveProductionJob(activeJob.id, 'Ready'); notify('Approved for dispatch.') }}
        onSendBack={() => { moveProductionJob(activeJob.id, 'Prepping'); notify('Sent back for revision.') }}
      />
    )}
  </div>
}

function Home({ events, jobs, pendingCount, onOpen }: { events: WarehouseEvent[]; jobs: ProductionJob[]; pendingCount: number; onOpen: (event: WarehouseEvent) => void }) {
  const eventsWithJobs = events.filter((event) => jobs.some((job) => job.eventId === event.id))
  return <div className="space-y-6">
    <section className="paper-card"><div className="flex items-center gap-2"><Bell className="size-4 text-primary" /><p className="eyebrow">Notifications</p></div><div className="mt-3 space-y-3 text-sm">{PRODUCTION_NOTIFICATIONS.map((item) => <p key={item.id}><strong>{item.label}:</strong> {item.detail}</p>)}</div></section>
    <header><p className="eyebrow">Fabrication queue</p><h1 className="mt-2 text-3xl font-serif">Your event list</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Open an event to track builds, check materials, and submit for approval.</p></header>
    {pendingCount > 0 && <div className="paper-card flex items-center gap-3 border-primary/50 bg-secondary/40"><CheckCircle2 className="size-4 shrink-0 text-primary" /><p className="text-sm">{pendingCount} build{pendingCount > 1 ? 's' : ''} awaiting approval.</p></div>}
    <div className="space-y-3">{eventsWithJobs.map((event) => { const eventJobs = jobs.filter((j) => j.eventId === event.id); const readyCount = eventJobs.filter((j) => j.stage === 'Ready').length; return <button key={event.id} onClick={() => onOpen(event)} className="paper-card w-full text-left transition-transform active:scale-[.99]"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">{dateLabel(event.date)}</p><h2 className="mt-2 font-serif text-xl">{event.name}</h2><p className="mt-1 text-sm text-muted-foreground">{event.venue}</p></div><span className={`status ${event.status === 'In Prep' ? 'status-in-progress' : event.status === 'Completed' ? 'status-approved' : ''}`}>{event.status}</span></div><div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground"><span>{eventJobs.length} build{eventJobs.length > 1 ? 's' : ''} · {readyCount} ready</span><span className="font-semibold text-primary">Open workspace →</span></div></button> })}</div>
    {eventsWithJobs.length === 0 && <div className="paper-card text-sm text-muted-foreground">No fabrication builds queued yet.</div>}
  </div>
}

function EventJobs({ event, jobs, onBack, onOpen }: { event: WarehouseEvent; jobs: ProductionJob[]; onBack: () => void; onOpen: (job: ProductionJob) => void }) {
  return <div className="space-y-5">
    <button onClick={onBack} className="button-secondary"><ChevronLeft className="size-4" /> All events</button>
    <header><p className="eyebrow">{dateLabel(event.date)} · {event.id}</p><h1 className="mt-2 text-3xl font-serif">{event.name}</h1><p className="mt-1 text-sm text-muted-foreground">{event.venue}</p></header>

    <section className="space-y-3">
      <div className="section-heading"><h2>Builds for this event</h2><Hammer className="size-5 text-primary" /></div>
      {jobs.length ? jobs.map((job) => (
        <button key={job.id} onClick={() => onOpen(job)} className="paper-card flex w-full items-center gap-3 text-left transition-transform active:scale-[.99]">
          <div className="size-12 shrink-0 overflow-hidden rounded-md bg-secondary">
            {job.imageUrl ? <img src={job.imageUrl} alt={job.itemName} crossOrigin="anonymous" className="size-full object-cover" /> : <div className="flex size-full items-center justify-center"><Hammer className="size-5 text-muted-foreground" /></div>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{job.itemName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{job.crew.join(', ')}</p>
          </div>
          <span className={`status shrink-0 ${STAGE_STATUS_CLASS[job.stage]}`}>{job.stage}</span>
        </button>
      )) : <div className="paper-card text-sm text-muted-foreground">No builds assigned for this event yet.</div>}
    </section>
  </div>
}

function StagePath({ stage }: { stage: ProductionStage }) {
  const activeIndex = STAGE_ORDER.indexOf(stage)
  return (
    <div className="grid grid-cols-4 gap-1.5" role="img" aria-label={`Build stage: ${stage}`}>
      {STAGE_ORDER.map((item, index) => {
        const state = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending'
        return (
          <div key={item} className={`rounded border px-1.5 py-2.5 text-center text-[9px] font-bold uppercase tracking-wide leading-tight ${state === 'active' ? 'border-primary bg-primary text-primary-foreground' : state === 'done' ? 'border-primary/40 bg-secondary/60 text-foreground' : 'border-border bg-card text-muted-foreground'}`}>
            <div className="flex items-center justify-center gap-1">{state === 'done' && <Check className="size-2.5" />}<span>{item}</span></div>
          </div>
        )
      })}
    </div>
  )
}

function JobDetail({ job, onClose, onToggleMaterial, onNotesChange, onAdvance, onApprove, onSendBack }: { job: ProductionJob; onClose: () => void; onToggleMaterial: (materialId: string) => void; onNotesChange: (value: string) => void; onAdvance: () => void; onApprove: () => void; onSendBack: () => void }) {
  const canSubmit = job.stage === 'Unprepped' || job.stage === 'Prepping'
  return (
    <div className="sheet-backdrop">
      <div className="sheet space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="size-12 shrink-0 overflow-hidden rounded-md bg-secondary">
              {job.imageUrl ? <img src={job.imageUrl} alt={job.itemName} crossOrigin="anonymous" className="size-full object-cover" /> : <div className="flex size-full items-center justify-center"><Hammer className="size-5 text-muted-foreground" /></div>}
            </div>
            <div><p className="eyebrow">Build detail</p><h2 className="mt-1 font-serif text-xl">{job.itemName}</h2></div>
          </div>
          <button type="button" onClick={onClose} className="icon-button" aria-label="Close"><X className="size-4" /></button>
        </div>

        <StagePath stage={job.stage} />

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>Crew: <strong className="text-foreground">{job.crew.join(', ')}</strong></span><span>Man count: <strong className="text-foreground">{job.manCount}</strong></span><span>Est. hours: <strong className="text-foreground">{job.estimatedHours}h</strong></span></div>

        <div>
          <p className="field-label mt-3">Raw materials checklist</p>
          <div className="mt-1 space-y-1 rounded border border-border p-2">
            {job.materials.map((material) => (
              <label key={material.id} className="flex items-center justify-between gap-3 rounded px-2 py-2 text-sm font-normal normal-case tracking-normal hover:bg-secondary/40">
                <span className="flex items-center gap-2"><input type="checkbox" checked={material.checked} onChange={() => onToggleMaterial(material.id)} className="size-4 accent-primary" /><span className={material.checked ? 'text-muted-foreground line-through' : ''}>{material.name}</span></span>
                <span className="text-xs text-muted-foreground shrink-0">{material.qty} {material.unit}</span>
              </label>
            ))}
          </div>
        </div>

        <label className="field-label">Build notes<textarea value={job.notes} onChange={(e) => onNotesChange(e.target.value)} rows={3} placeholder="Describe progress made on this build..." className="field-input" /></label>
        <button type="button" className="button-secondary w-full" onClick={() => {}}><Camera className="size-4" /> Attach photo (optional)</button>

        {canSubmit && <button type="button" onClick={onAdvance} disabled={job.notes.trim().length === 0} className="button-primary w-full disabled:pointer-events-none disabled:opacity-40"><Check className="size-4" /> Submit for approval</button>}
        {job.stage === 'Awaiting Approval' && (
          <div className="flex gap-3"><button type="button" onClick={onSendBack} className="button-secondary flex-1"><Undo2 className="size-4" /> Send back</button><button type="button" onClick={onApprove} className="button-primary flex-1"><Check className="size-4" /> Approve for dispatch</button></div>
        )}
        {job.stage === 'Ready' && <div className="rounded border border-border bg-secondary/40 p-3 text-center text-sm text-muted-foreground">Approved and ready for dispatch.</div>}
      </div>
    </div>
  )
}

function DayDots({ hasSchedule, hasNote }: { hasSchedule: boolean; hasNote: boolean }) {
  if (!hasSchedule && !hasNote) return <span className="mt-1 block h-1.5" />
  return <span className="mt-1 flex items-center justify-center gap-1">{hasSchedule && <span className="size-1.5 rounded-full bg-primary" />}{hasNote && <span className="size-1.5 rounded-full border border-current" />}</span>
}

function CalendarView({ selectedDate, setSelectedDate, notes, setNotes, onSave, jobs, events }: { selectedDate: string; setSelectedDate: (date: string) => void; notes: Record<string, string>; setNotes: (updater: (current: Record<string, string>) => Record<string, string>) => void; onSave: () => void; jobs: ProductionJob[]; events: WarehouseEvent[] }) {
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const scheduleDates = new Set(SCHEDULE.map((item) => item.date))
  const eventDates = new Set(events.map((event) => event.date))
  const meetingsToday = SCHEDULE.filter((item) => item.date === selectedDate)
  const eventsToday = events.filter((event) => event.date === selectedDate)
  const jobsForEventsToday = jobs.filter((job) => eventsToday.some((event) => event.id === job.eventId))
  const noteValue = notes[selectedDate] ?? ''
  return <div className="space-y-5">
    <header><p className="eyebrow">Build schedule & personal notes</p><h1 className="mt-2 text-3xl font-serif">Calendar</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Tap a day to see meetings and event dates for the fabrication queue.</p></header>
    <section className="paper-card">
      <div className="flex items-center justify-between"><button className="icon-button" onClick={() => setSelectedDate('2026-08-01')} aria-label="Previous month"><ChevronLeft className="size-4" /></button><h2 className="font-serif text-xl">August 2026</h2><button className="icon-button" onClick={() => setSelectedDate('2026-08-31')} aria-label="Next month"><ChevronRight className="size-4" /></button></div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs"><div className="col-span-7 grid grid-cols-7 text-muted-foreground">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={`${d}-${i}`}>{d}</span>)}</div><span /><span /><span /><span /><span /><span /><span />{days.map((day) => { const date = `2026-08-${String(day).padStart(2, '0')}`; const hasSchedule = scheduleDates.has(date) || eventDates.has(date); const hasNote = Boolean(notes[date]); return <button key={date} onClick={() => setSelectedDate(date)} className={`rounded p-2 ${date === selectedDate ? 'bg-primary text-primary-foreground' : hasSchedule ? 'font-bold text-primary' : ''}`}><span className="block">{day}</span><DayDots hasSchedule={hasSchedule} hasNote={hasNote} /></button> })}</div>
    </section>

    <section className="space-y-3">
      <div className="section-heading"><h2>Schedule for {dateLabel(selectedDate)}</h2><CalendarDays className="size-5 text-primary" /></div>
      {meetingsToday.map((entry) => <div key={`${entry.date}-${entry.time}`} className="paper-card"><p className="eyebrow">{entry.time} · Meeting</p><p className="mt-1 font-medium">{entry.title}</p><p className="mt-1 text-sm text-muted-foreground">{entry.venue}</p></div>)}
      {eventsToday.map((event) => <div key={event.id} className="paper-card"><p className="eyebrow">Event date</p><p className="mt-1 font-medium">{event.name}</p><p className="mt-1 text-sm text-muted-foreground">{event.venue} · {jobsForEventsToday.filter((j) => j.eventId === event.id).length} builds</p></div>)}
      {!meetingsToday.length && !eventsToday.length && <div className="paper-card text-sm text-muted-foreground">Nothing scheduled on this date.</div>}
      <div className="paper-card">
        <label className="field-label mt-0">Personal note for {dateLabel(selectedDate)}<textarea value={noteValue} onChange={(event) => setNotes((current) => ({ ...current, [selectedDate]: event.target.value }))} rows={3} placeholder="Add a reminder for yourself..." className="field-input" /></label>
        <button onClick={onSave} className="button-primary mt-4"><FileText className="size-4" /> Save note</button>
      </div>
    </section>
  </div>
}

function Activity({ activity, jobs }: { activity: { id: string; message: string; at: string }[]; jobs: ProductionJob[] }) {
  const ready = jobs.filter((j) => j.stage === 'Ready')
  return <div className="space-y-5">
    <header><p className="eyebrow">Fabrication record</p><h1 className="mt-2 text-3xl font-serif">Activity</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Submissions, approvals, and dispatch-ready builds.</p></header>
    <section className="space-y-3"><h2 className="font-serif text-xl">Recent activity</h2>{activity.length ? activity.map((entry) => <div key={entry.id} className="paper-card"><p className="text-sm">{entry.message}</p><p className="mt-2 text-xs text-muted-foreground">{entry.at}</p></div>) : <div className="paper-card text-sm text-muted-foreground">No activity yet.</div>}</section>
    <section className="space-y-3"><h2 className="font-serif text-xl">Ready for dispatch</h2>{ready.length ? ready.map((job) => <div key={job.id} className="paper-card flex items-center justify-between gap-3"><div><p className="font-medium">{job.itemName}</p><p className="text-sm text-muted-foreground">{job.crew.join(', ')}</p></div><span className="status status-approved">Ready</span></div>) : <div className="paper-card text-sm text-muted-foreground">No builds approved yet.</div>}</section>
  </div>
}

function Account({ name, email, onLogout }: { name: string; email: string; onLogout: () => void }) {
  return <div className="space-y-5">
    <header><p className="eyebrow">Production account</p><h1 className="mt-2 text-3xl font-serif">{name}</h1><p className="mt-1 text-sm text-muted-foreground">{email}</p></header>
    <section className="paper-card"><div className="flex items-center gap-3"><Lock className="size-4 text-primary" /><div><p className="text-sm font-semibold">Fabrication oversight</p><p className="text-xs text-muted-foreground">Track builds, verify materials, and approve items for dispatch from the Home tab.</p></div></div></section>
    <button className="button-secondary w-full" onClick={onLogout}>Sign out</button>
  </div>
}
