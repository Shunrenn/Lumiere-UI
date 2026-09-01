import { useState } from 'react'
import { Bell, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, FileText, ImageOff, UserCircle2, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useWarehouse, MEMBER_NOTIFICATIONS, type WarehouseEvent, type WarehouseTask } from '@/lib/warehouse'
import { FeedbackForm, IncidentForm, GenericTaskPanel } from '@/components/PwaWorkflows'

type Tab = 'home' | 'calendar' | 'activity' | 'account'

const SCHEDULE = [
  { date: '2026-08-19', time: '15:00', title: 'Production sync', venue: 'Lumière Depot' },
  { date: '2026-08-20', time: '05:30', title: 'Warehouse muster & loading', venue: 'Lumière Depot' },
]

function dateLabel(date: string) { return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) }

export function WarehouseMemberPage() {
  const { adminName, adminEmail, logout } = useAuth()
  const { events, tasks, activity, updateTaskStatus } = useWarehouse()
  const me = adminName || 'Warehouse Member'
  const myTasks = tasks.filter((t) => t.assignees.includes(me))
  const [tab, setTab] = useState<Tab>('home')
  const [selectedEvent, setSelectedEvent] = useState<WarehouseEvent | null>(null)
  const [selectedTask, setSelectedTask] = useState<WarehouseTask | null>(null)
  const [toast, setToast] = useState('')
  const [selectedDate, setSelectedDate] = useState('2026-08-20')
  const [notes, setNotes] = useState<Record<string, string>>({})

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 5000) }
  const myEvents = events.filter((event) => myTasks.some((t) => t.eventId === event.id))

  const submitTask = (id: string, title: string) => {
    updateTaskStatus(id, 'Submitted')
    setSelectedTask(null)
    notify(`"${title}" marked done — pending lead approval.`)
  }

  return <div className="mobile-shell admin-fade">
    <header className="app-header"><div><p className="eyebrow">Lumière Operations</p><div className="brand-mark">WAREHOUSE MEMBER</div></div><button className="avatar" onClick={() => setTab('account')} aria-label="Open account">{me.slice(0, 2).toUpperCase()}</button></header>
    <main className="app-main">
      {tab === 'home' && (selectedEvent ? (
        <EventTasks event={selectedEvent} tasks={myTasks.filter((t) => t.eventId === selectedEvent.id)} onBack={() => setSelectedEvent(null)} onOpenTask={setSelectedTask} />
      ) : (
        <><Home events={myEvents} tasks={myTasks} onOpen={setSelectedEvent} /><GenericTaskPanel onNotify={notify} /></>
      ))}
      {tab === 'calendar' && <CalendarView selectedDate={selectedDate} setSelectedDate={setSelectedDate} notes={notes} setNotes={setNotes} onSave={() => notify('Personal note saved.')} tasks={myTasks} />}
      {tab === 'activity' && <Activity activity={activity} tasks={myTasks} />}
      {tab === 'account' && <Account name={me} email={adminEmail || 'member@lumiere.com'} onLogout={logout} />}
    </main>
    <nav className="bottom-nav" aria-label="Member navigation">{([['home', 'Home', ClipboardList], ['calendar', 'Calendar', CalendarDays], ['activity', 'Activity', FileText], ['account', 'Account', UserCircle2]] as const).map(([key, label, Icon]) => <button key={key} onClick={() => { setTab(key); setSelectedEvent(null) }} className={tab === key ? 'active' : ''}><Icon className="size-5" /><span>{label}</span></button>)}</nav>
    {toast && <div className="fixed bottom-24 left-1/2 z-40 w-[calc(100%-32px)] max-w-[528px] -translate-x-1/2 rounded-md bg-primary px-4 py-3 text-center text-sm text-primary-foreground shadow-lg">{toast}</div>}
    {selectedTask && <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} onSubmit={() => submitTask(selectedTask.id, selectedTask.title)} />}
  </div>
}

function Home({ events, tasks, onOpen }: { events: WarehouseEvent[]; tasks: WarehouseTask[]; onOpen: (event: WarehouseEvent) => void }) {
  return <div className="space-y-6">
    <section className="paper-card"><div className="flex items-center gap-2"><Bell className="size-4 text-primary" /><p className="eyebrow">Notifications</p></div><div className="mt-3 space-y-3 text-sm">{MEMBER_NOTIFICATIONS.map((item) => <p key={item.id}><strong>{item.label}:</strong> {item.detail}</p>)}</div></section>
    <header><p className="eyebrow">Your events</p><h1 className="mt-2 text-3xl font-serif">Assigned events</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Select an event to see the tasks assigned to you.</p></header>
    {events.length ? <div className="space-y-3">{events.map((event) => { const eventTasks = tasks.filter((t) => t.eventId === event.id); const done = eventTasks.filter((t) => t.status === 'Approved' || t.status === 'Submitted').length; return <button key={event.id} onClick={() => onOpen(event)} className="paper-card w-full text-left transition-transform active:scale-[.99]"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">{dateLabel(event.date)}</p><h2 className="mt-2 font-serif text-xl">{event.name}</h2><p className="mt-1 text-sm text-muted-foreground">{event.venue}</p></div><span className="status status-in-progress">{eventTasks.length} task{eventTasks.length > 1 ? 's' : ''}</span></div><div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground"><span>{done} of {eventTasks.length} handled</span><span className="font-semibold text-primary">Open tasks →</span></div></button> })}</div> : <div className="paper-card text-sm text-muted-foreground">No tasks assigned to you yet — check back after the lead schedules the next event.</div>}
  </div>
}

function EventTasks({ event, tasks, onBack, onOpenTask }: { event: WarehouseEvent; tasks: WarehouseTask[]; onBack: () => void; onOpenTask: (task: WarehouseTask) => void }) {
  return <div className="space-y-5">
    <button onClick={onBack} className="button-secondary"><ChevronLeft className="size-4" /> All events</button>
    <header><p className="eyebrow">{dateLabel(event.date)} · {event.id}</p><h1 className="mt-2 text-3xl font-serif">{event.name}</h1><p className="mt-1 text-sm text-muted-foreground">{event.venue}</p></header>
    <section className="space-y-3">
      <div className="section-heading"><h2>Your tasks</h2><ClipboardList className="size-5 text-primary" /></div>
      {tasks.map((task) => { const item = event.items.find((i) => i.id === task.itemId); return <button key={task.id} onClick={() => onOpenTask(task)} className="paper-card w-full text-left transition-transform active:scale-[.99]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium">{task.title}</p><p className="mt-1 text-xs text-muted-foreground">{item?.name} · Due {dateLabel(task.deadline)} {task.deadlineTime}</p></div><Status status={task.status} /></div></button> })}
    </section>
  </div>
}

function Status({ status }: { status: WarehouseTask['status'] }) { return <span className={'status status-' + status.toLowerCase().replace(' ', '-')}>{status}</span> }

function TaskDetail({ task, onClose, onSubmit }: { task: WarehouseTask; onClose: () => void; onSubmit: () => void }) {
  const { events } = useWarehouse()
  const event = events.find((e) => e.id === task.eventId)
  const item = event?.items.find((i) => i.id === task.itemId)
  const [checked, setChecked] = useState(false)
  const locked = task.status === 'Submitted' || task.status === 'Approved'
  return <div className="sheet-backdrop">
    <div className="sheet space-y-4">
      <div className="flex items-start justify-between">
        <div><p className="eyebrow">{event?.name}</p><h2 className="mt-1 font-serif text-2xl">{task.title}</h2></div>
        <button type="button" onClick={onClose} className="icon-button" aria-label="Close"><X className="size-4" /></button>
      </div>

      {item?.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-44 w-full rounded-md border border-border object-cover" /> : <div className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-secondary/30 text-muted-foreground"><ImageOff className="size-5" /><p className="text-xs">No image available</p></div>}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded border border-border bg-secondary/40 p-3"><p className="eyebrow">Item</p><p className="mt-1 font-medium">{item?.name ?? '—'}</p></div>
        <div className="rounded border border-border bg-secondary/40 p-3"><p className="eyebrow">Number of items</p><p className="mt-1 font-medium">{item?.qty ?? '—'}</p></div>
        <div className="rounded border border-border bg-secondary/40 p-3"><p className="eyebrow">Color</p><p className="mt-1 font-medium">{item?.color ?? '—'}</p></div>
        <div className="rounded border border-border bg-secondary/40 p-3"><p className="eyebrow">Deadline</p><p className="mt-1 font-medium">{dateLabel(task.deadline)} · {task.deadlineTime}</p></div>
      </div>

      <div><p className="eyebrow">Description</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{task.description || 'No additional notes from the lead.'}</p></div>

      <label className={`flex items-start gap-3 rounded border border-border p-3 text-sm ${locked ? 'opacity-60' : ''}`}>
        <input type="checkbox" checked={checked || locked} disabled={locked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 size-4" />
        <span>I confirm this task is complete and ready for the lead&apos;s review.</span>
      </label>

      {locked ? (
        <div className="rounded border border-border bg-secondary/40 p-3 text-center text-sm text-muted-foreground"><Status status={task.status} /><p className="mt-2">{task.status === 'Approved' ? 'Approved by the lead.' : 'Recorded as finished — pending lead approval.'}</p></div>
      ) : (
        <button className="button-primary w-full" disabled={!checked} onClick={onSubmit}><Check className="size-4" /> Mark complete & submit</button>
      )}
    </div>
  </div>
}

function DayDots({ hasSchedule, hasNote }: { hasSchedule: boolean; hasNote: boolean }) {
  if (!hasSchedule && !hasNote) return <span className="mt-1 block h-1.5" />
  return <span className="mt-1 flex items-center justify-center gap-1">{hasSchedule && <span className="size-1.5 rounded-full bg-primary" />}{hasNote && <span className="size-1.5 rounded-full border border-current" />}</span>
}

function CalendarView({ selectedDate, setSelectedDate, notes, setNotes, onSave, tasks }: { selectedDate: string; setSelectedDate: (date: string) => void; notes: Record<string, string>; setNotes: (updater: (current: Record<string, string>) => Record<string, string>) => void; onSave: () => void; tasks: WarehouseTask[] }) {
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const scheduleDates = new Set(SCHEDULE.map((item) => item.date))
  const deadlineDates = new Set(tasks.map((task) => task.deadline))
  const meetingsToday = SCHEDULE.filter((item) => item.date === selectedDate)
  const deadlinesToday = tasks.filter((task) => task.deadline === selectedDate)
  const noteValue = notes[selectedDate] ?? ''
  return <div className="space-y-5">
    <header><p className="eyebrow">Your schedule & notes</p><h1 className="mt-2 text-3xl font-serif">Calendar</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">See your overall schedule — meetings, task deadlines, and personal notes.</p></header>
    <section className="paper-card">
      <div className="flex items-center justify-between"><button className="icon-button" onClick={() => setSelectedDate('2026-08-01')} aria-label="Previous month"><ChevronLeft className="size-4" /></button><h2 className="font-serif text-xl">August 2026</h2><button className="icon-button" onClick={() => setSelectedDate('2026-08-31')} aria-label="Next month"><ChevronRight className="size-4" /></button></div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs"><div className="col-span-7 grid grid-cols-7 text-muted-foreground">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={`${d}-${i}`}>{d}</span>)}</div><span /><span /><span /><span /><span /><span /><span />{days.map((day) => { const date = `2026-08-${String(day).padStart(2, '0')}`; const hasSchedule = scheduleDates.has(date) || deadlineDates.has(date); const hasNote = Boolean(notes[date]); return <button key={date} onClick={() => setSelectedDate(date)} className={`rounded p-2 ${date === selectedDate ? 'bg-primary text-primary-foreground' : hasSchedule ? 'font-bold text-primary' : ''}`}><span className="block">{day}</span><DayDots hasSchedule={hasSchedule} hasNote={hasNote} /></button> })}</div>
    </section>

    <section className="space-y-3">
      <div className="section-heading"><h2>Schedule for {dateLabel(selectedDate)}</h2><CalendarDays className="size-5 text-primary" /></div>
      {meetingsToday.map((entry) => <div key={`${entry.date}-${entry.time}`} className="paper-card"><p className="eyebrow">{entry.time} · Meeting</p><p className="mt-1 font-medium">{entry.title}</p><p className="mt-1 text-sm text-muted-foreground">{entry.venue}</p></div>)}
      {deadlinesToday.map((task) => <div key={task.id} className="paper-card"><p className="eyebrow">{task.deadlineTime} · Task due</p><p className="mt-1 font-medium">{task.title}</p></div>)}
      {!meetingsToday.length && !deadlinesToday.length && <div className="paper-card text-sm text-muted-foreground">Nothing scheduled on this date.</div>}
      <div className="paper-card">
        <label className="field-label mt-0">Personal note for {dateLabel(selectedDate)}<textarea value={noteValue} onChange={(event) => setNotes((current) => ({ ...current, [selectedDate]: event.target.value }))} rows={3} placeholder="Add a reminder for yourself..." className="field-input" /></label>
        <button onClick={onSave} className="button-primary mt-4"><FileText className="size-4" /> Save note</button>
      </div>
    </section>
  </div>
}

function Activity({ activity, tasks }: { activity: { id: string; message: string; at: string }[]; tasks: WarehouseTask[] }) {
  const mine = activity.filter((entry) => tasks.some((t) => entry.message.includes(t.title)))
  const finished = tasks.filter((t) => t.status === 'Submitted' || t.status === 'Approved')
  return <div className="space-y-5">
    <header><p className="eyebrow">Your record</p><h1 className="mt-2 text-3xl font-serif">Activity</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Submissions, approvals, and finished tasks.</p></header>
    <section className="space-y-3"><h2 className="font-serif text-xl">Finished tasks</h2>{finished.length ? finished.map((task) => <div key={task.id} className="paper-card flex items-center justify-between gap-3"><div><p className="font-medium">{task.title}</p><p className="text-sm text-muted-foreground">Due {dateLabel(task.deadline)}</p></div><span className={`status ${task.status === 'Approved' ? 'status-approved' : 'status-submitted'}`}>{task.status === 'Approved' ? 'Approved' : 'Pending approval'}</span></div>) : <div className="paper-card text-sm text-muted-foreground">Nothing finished yet.</div>}</section>
    <section className="space-y-3"><h2 className="font-serif text-xl">Recent updates</h2>{mine.length ? mine.map((entry) => <div key={entry.id} className="paper-card"><p className="text-sm">{entry.message}</p><p className="mt-2 text-xs text-muted-foreground">{entry.at}</p></div>) : <div className="paper-card text-sm text-muted-foreground">No activity yet.</div>}</section>
  </div>
}

function Account({ name, email, onLogout }: { name: string; email: string; onLogout: () => void }) {
  const [form, setForm] = useState<'feedback' | 'incident' | null>(null)
  const [message, setMessage] = useState('')
  return <div className="space-y-5">
    <header><p className="eyebrow">Member account</p><h1 className="mt-2 text-3xl font-serif">{name}</h1><p className="mt-1 text-sm text-muted-foreground">{email}</p></header>
    <section className="paper-card"><div className="flex items-center gap-3"><CheckCircle2 className="size-4 text-primary" /><div><p className="text-sm font-semibold">How it works</p><p className="text-xs text-muted-foreground">Open an event on Home to see your tasks. Confirm the checklist to submit for the lead&apos;s approval.</p></div></div></section>
    <div className="grid grid-cols-2 gap-2"><button className="button-secondary" onClick={() => setForm('feedback')}>Feedback</button><button className="button-secondary" onClick={() => setForm('incident')}>Incident Report</button></div>{message && <p className="text-sm text-primary">{message}</p>}<button className="button-secondary w-full" onClick={onLogout}>Sign out</button>{form === 'feedback' && <FeedbackForm onClose={() => setForm(null)} onSubmitted={setMessage} />}{form === 'incident' && <IncidentForm onClose={() => setForm(null)} onSubmitted={setMessage} />}
  </div>
}
