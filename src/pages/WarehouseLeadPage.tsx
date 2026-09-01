import { useState } from 'react'
import type { FormEvent } from 'react'
import { Bell, Calendar, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, FileText, Plus, Send, UserCircle2, Users, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useWarehouse, LEAD_NOTIFICATIONS, type WarehouseEvent, type WarehouseTask } from '@/lib/warehouse'
import { FeedbackForm, IncidentForm, GenericTaskPanel } from '@/components/PwaWorkflows'

type Tab = 'home' | 'calendar' | 'activity' | 'account'

const SCHEDULE = [
  { date: '2026-08-19', time: '15:00', title: 'Production sync', venue: 'Lumière Depot' },
  { date: '2026-08-20', time: '05:30', title: 'Warehouse muster & loading', venue: 'Lumière Depot' },
  { date: '2026-08-27', time: '08:00', title: 'Maison Privée load-in briefing', venue: 'BGC Arts Center' },
]

function dateLabel(date: string) { return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) }

export function WarehouseLeadPage() {
  const { adminName, adminEmail, logout } = useAuth()
  const { events, tasks, crew, activity, addTask, updateTaskStatus } = useWarehouse()
  const [tab, setTab] = useState<Tab>('home')
  const [selectedEvent, setSelectedEvent] = useState<WarehouseEvent | null>(null)
  const [assignItem, setAssignItem] = useState<WarehouseEvent['items'][number] | null>(null)
  const [toast, setToast] = useState('')
  const [selectedDate, setSelectedDate] = useState('2026-08-20')
  const [notes, setNotes] = useState<Record<string, string>>({})

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 5000) }
  const pendingCount = tasks.filter((t) => t.status === 'Submitted').length

  const submitTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!assignItem || !selectedEvent) return
    const data = new FormData(event.currentTarget)
    const title = String(data.get('title') || '')
    const deadline = String(data.get('deadline') || selectedEvent.date)
    const deadlineTime = String(data.get('time') || '17:00')
    const assignees = data.getAll('assignees').map(String)
    if (!title) return notify('Give the task a name.')
    if (!assignees.length) return notify('Assign at least one available person.')
    addTask({ eventId: selectedEvent.id, itemId: assignItem.id, title, description: String(data.get('description') || ''), assignees, deadline, deadlineTime })
    setAssignItem(null)
    notify('Task assigned.')
  }

  return <div className="mobile-shell admin-fade">
    <header className="app-header"><div><p className="eyebrow">Lumière Operations</p><div className="brand-mark">WAREHOUSE LEAD</div></div><button className="avatar" onClick={() => setTab('account')} aria-label="Open account">{(adminName || 'WL').slice(0, 2).toUpperCase()}</button></header>
    <main className="app-main">
      {tab === 'home' && (selectedEvent ? (
        <EventDetail event={selectedEvent} tasks={tasks.filter((t) => t.eventId === selectedEvent.id)} crew={crew} onBack={() => setSelectedEvent(null)} onAssign={setAssignItem} onApprove={(id) => { updateTaskStatus(id, 'Approved'); notify('Task approved.') }} onReject={(id) => { updateTaskStatus(id, 'Rejected'); notify('Sent back for rework.') }} />
      ) : (
        <><Home events={events} tasks={tasks} pendingCount={pendingCount} onOpen={setSelectedEvent} /><GenericTaskPanel canClaim={false} onNotify={notify} /></>
      ))}
      {tab === 'calendar' && <CalendarView selectedDate={selectedDate} setSelectedDate={setSelectedDate} notes={notes} setNotes={setNotes} onSave={() => notify('Personal note saved.')} tasks={tasks} events={events} />}
      {tab === 'activity' && <Activity activity={activity} tasks={tasks} />}
      {tab === 'account' && <Account name={adminName || 'Warehouse Lead'} email={adminEmail || 'lead@lumiere.com'} onLogout={logout} />}
    </main>
    <nav className="bottom-nav" aria-label="Lead navigation">{([['home', 'Home', ClipboardList], ['calendar', 'Calendar', CalendarDays], ['activity', 'Activity', FileText], ['account', 'Account', UserCircle2]] as const).map(([key, label, Icon]) => <button key={key} onClick={() => { setTab(key); setSelectedEvent(null) }} className={tab === key ? 'active' : ''}><Icon className="size-5" /><span>{label}</span></button>)}</nav>
    {toast && <div className="fixed bottom-24 left-1/2 z-40 w-[calc(100%-32px)] max-w-[528px] -translate-x-1/2 rounded-md bg-primary px-4 py-3 text-center text-sm text-primary-foreground shadow-lg">{toast}</div>}
    {assignItem && selectedEvent && <AssignForm item={assignItem} event={selectedEvent} crew={crew} onClose={() => setAssignItem(null)} onSubmit={submitTask} />}
  </div>
}

function Home({ events, tasks, pendingCount, onOpen }: { events: WarehouseEvent[]; tasks: WarehouseTask[]; pendingCount: number; onOpen: (event: WarehouseEvent) => void }) {
  return <div className="space-y-6">
    <section className="paper-card"><div className="flex items-center gap-2"><Bell className="size-4 text-primary" /><p className="eyebrow">Notifications</p></div><div className="mt-3 space-y-3 text-sm">{LEAD_NOTIFICATIONS.map((item) => <p key={item.id}><strong>{item.label}:</strong> {item.detail}</p>)}</div></section>
    <header><p className="eyebrow">Events in production</p><h1 className="mt-2 text-3xl font-serif">Your event list</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Open an event to see items needed and assign tasks to available crew.</p></header>
    {pendingCount > 0 && <div className="paper-card flex items-center gap-3 border-primary/50 bg-secondary/40"><CheckCircle2 className="size-4 shrink-0 text-primary" /><p className="text-sm">{pendingCount} task{pendingCount > 1 ? 's' : ''} submitted and awaiting your approval.</p></div>}
    <div className="space-y-3">{events.map((event) => { const eventTasks = tasks.filter((t) => t.eventId === event.id); return <button key={event.id} onClick={() => onOpen(event)} className="paper-card w-full text-left transition-transform active:scale-[.99]"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">{dateLabel(event.date)}</p><h2 className="mt-2 font-serif text-xl">{event.name}</h2><p className="mt-1 text-sm text-muted-foreground">{event.venue}</p></div><span className={`status ${event.status === 'In Prep' ? 'status-in-progress' : event.status === 'Completed' ? 'status-approved' : ''}`}>{event.status}</span></div><div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground"><span>{event.items.length} item groups · {eventTasks.length} tasks</span><span className="font-semibold text-primary">Open workspace →</span></div></button> })}</div>
  </div>
}

function EventDetail({ event, tasks, crew: _crew, onBack, onAssign, onApprove, onReject }: { event: WarehouseEvent; tasks: WarehouseTask[]; crew: { name: string; available: boolean }[]; onBack: () => void; onAssign: (item: WarehouseEvent['items'][number]) => void; onApprove: (id: string) => void; onReject: (id: string) => void }) {
  return <div className="space-y-5">
    <button onClick={onBack} className="button-secondary"><ChevronLeft className="size-4" /> All events</button>
    <header><p className="eyebrow">{dateLabel(event.date)} · {event.id}</p><h1 className="mt-2 text-3xl font-serif">{event.name}</h1><p className="mt-1 text-sm text-muted-foreground">{event.venue}</p></header>

    <section className="paper-card">
      <div><p className="eyebrow">Items needed</p><h2 className="mt-1 font-serif text-xl">Assign a task per item</h2></div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Tap an item to assign it to one or more available crew, with a schedule to finish.</p>
      <div className="mt-4 space-y-2">{event.items.map((item) => { const itemTasks = tasks.filter((t) => t.itemId === item.id); return <div key={item.id} className="flex items-center justify-between gap-3 border-t border-border py-3"><div className="min-w-0"><p className="font-medium">{item.name}{item.needsCreation && <span className="status status-submitted ml-2">To create</span>}</p><p className="text-xs text-muted-foreground">{item.sku} · {item.qty} units · {item.color}</p>{itemTasks.length > 0 && <p className="mt-1 text-xs text-primary">{itemTasks.length} task{itemTasks.length > 1 ? 's' : ''} assigned</p>}</div><button onClick={() => onAssign(item)} className="button-secondary shrink-0"><Plus className="size-4" /> Assign</button></div> })}</div>
    </section>

    <section className="space-y-3">
      <div className="section-heading"><h2>Task queue</h2><Users className="size-5 text-primary" /></div>
      {tasks.length ? tasks.map((task) => <TaskRow key={task.id} task={task} onApprove={() => onApprove(task.id)} onReject={() => onReject(task.id)} />) : <div className="paper-card text-sm text-muted-foreground">No tasks assigned to this event yet.</div>}
    </section>
  </div>
}

function TaskRow({ task, onApprove, onReject }: { task: WarehouseTask; onApprove: () => void; onReject: () => void }) {
  return <article className="paper-card">
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-md bg-secondary p-2"><ClipboardList className="size-4 text-primary" /></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold">{task.title}</p><p className="text-xs text-muted-foreground">{task.assignees.join(', ')} · Due {dateLabel(task.deadline)} {task.deadlineTime}</p></div><Status status={task.status} /></div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{task.description}</p>
        {task.status === 'Submitted' && <div className="mt-3 flex gap-2"><button className="button-primary flex-1" onClick={onApprove}><Check className="size-3.5" /> Approve</button><button className="button-secondary flex-1" onClick={onReject}>Reject</button></div>}
      </div>
    </div>
  </article>
}

function Status({ status }: { status: WarehouseTask['status'] }) { return <span className={'status status-' + status.toLowerCase().replace(' ', '-')}>{status}</span> }

function AssignForm({ item, event, crew, onClose, onSubmit }: { item: WarehouseEvent['items'][number]; event: WarehouseEvent; crew: { id: string; name: string; available: boolean }[]; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="sheet-backdrop">
    <form className="sheet space-y-4" onSubmit={onSubmit}>
      <div className="flex items-start justify-between">
        <div><p className="eyebrow">{event.name}</p><h2 className="mt-1 font-serif text-2xl">Assign task</h2><p className="mt-1 text-sm text-muted-foreground">{item.name} · {item.sku}</p></div>
        <button type="button" onClick={onClose} className="icon-button" aria-label="Close"><X className="size-4" /></button>
      </div>
      <label className="field-label">Task title<input name="title" required placeholder="e.g. Sew custom gold table runners" className="field-input" /></label>
      <label className="field-label">Details<textarea name="description" rows={3} placeholder="Quantity, color, and finishing notes for the crew..." className="field-input" defaultValue={`${item.qty} units · ${item.color}`} /></label>
      <fieldset className="field-label"><span>Assign available people</span>
        <div className="mt-1 space-y-2 rounded border border-border p-3">
          {crew.map((person) => <label key={person.id} className={`flex items-center justify-between gap-3 text-sm font-normal normal-case tracking-normal ${!person.available ? 'opacity-40' : ''}`}>
            <span className="flex items-center gap-2"><input type="checkbox" name="assignees" value={person.name} disabled={!person.available} className="size-4" />{person.name}</span>
            <span className={`status ${person.available ? 'status-approved' : ''}`}>{person.available ? 'Available' : 'Unavailable'}</span>
          </label>)}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <label className="field-label">Deadline date<input name="deadline" type="date" defaultValue={event.date} className="field-input" /></label>
        <label className="field-label">Deadline time<input name="time" type="time" defaultValue="17:00" className="field-input" /></label>
      </div>
      <button className="button-primary w-full" type="submit"><Send className="size-4" /> Assign task</button>
    </form>
  </div>
}

function DayDots({ hasSchedule, hasNote }: { hasSchedule: boolean; hasNote: boolean }) {
  if (!hasSchedule && !hasNote) return <span className="mt-1 block h-1.5" />
  return <span className="mt-1 flex items-center justify-center gap-1">{hasSchedule && <span className="size-1.5 rounded-full bg-primary" />}{hasNote && <span className="size-1.5 rounded-full border border-current" />}</span>
}

function CalendarView({ selectedDate, setSelectedDate, notes, setNotes, onSave, tasks, events }: { selectedDate: string; setSelectedDate: (date: string) => void; notes: Record<string, string>; setNotes: (updater: (current: Record<string, string>) => Record<string, string>) => void; onSave: () => void; tasks: WarehouseTask[]; events: WarehouseEvent[] }) {
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const scheduleDates = new Set(SCHEDULE.map((item) => item.date))
  const deadlineDates = new Set(tasks.map((task) => task.deadline))
  const meetingsToday = SCHEDULE.filter((item) => item.date === selectedDate)
  const deadlinesToday = tasks.filter((task) => task.deadline === selectedDate)
  const eventsToday = events.filter((event) => event.date === selectedDate)
  const noteValue = notes[selectedDate] ?? ''
  return <div className="space-y-5">
    <header><p className="eyebrow">Team schedule & personal notes</p><h1 className="mt-2 text-3xl font-serif">Calendar</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Tap a day to see meetings, task deadlines, and event dates.</p></header>
    <section className="paper-card">
      <div className="flex items-center justify-between"><button className="icon-button" onClick={() => setSelectedDate('2026-08-01')} aria-label="Previous month"><ChevronLeft className="size-4" /></button><h2 className="font-serif text-xl">August 2026</h2><button className="icon-button" onClick={() => setSelectedDate('2026-08-31')} aria-label="Next month"><ChevronRight className="size-4" /></button></div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs"><div className="col-span-7 grid grid-cols-7 text-muted-foreground">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={`${d}-${i}`}>{d}</span>)}</div><span /><span /><span /><span /><span /><span /><span />{days.map((day) => { const date = `2026-08-${String(day).padStart(2, '0')}`; const hasSchedule = scheduleDates.has(date) || deadlineDates.has(date); const hasNote = Boolean(notes[date]); return <button key={date} onClick={() => setSelectedDate(date)} className={`rounded p-2 ${date === selectedDate ? 'bg-primary text-primary-foreground' : hasSchedule ? 'font-bold text-primary' : ''}`}><span className="block">{day}</span><DayDots hasSchedule={hasSchedule} hasNote={hasNote} /></button> })}</div>
    </section>

    {eventsToday.length > 0 && <section className="paper-card"><div className="flex items-center gap-2"><Calendar className="size-4 text-primary" /><p className="eyebrow">Events on this date</p></div><div className="mt-3 space-y-2">{eventsToday.map((event) => <p key={event.id} className="text-sm"><strong>{event.name}</strong> · {event.venue}</p>)}</div></section>}

    <section className="space-y-3">
      <div className="section-heading"><h2>Schedule for {dateLabel(selectedDate)}</h2><CalendarDays className="size-5 text-primary" /></div>
      {meetingsToday.map((entry) => <div key={`${entry.date}-${entry.time}`} className="paper-card"><p className="eyebrow">{entry.time} · Meeting</p><p className="mt-1 font-medium">{entry.title}</p><p className="mt-1 text-sm text-muted-foreground">{entry.venue}</p></div>)}
      {deadlinesToday.map((task) => <div key={task.id} className="paper-card"><p className="eyebrow">{task.deadlineTime} · Task deadline</p><p className="mt-1 font-medium">{task.title}</p><p className="mt-1 text-sm text-muted-foreground">{task.assignees.join(', ')}</p></div>)}
      {!meetingsToday.length && !deadlinesToday.length && <div className="paper-card text-sm text-muted-foreground">Nothing scheduled on this date.</div>}
      <div className="paper-card">
        <label className="field-label mt-0">Personal note for {dateLabel(selectedDate)}<textarea value={noteValue} onChange={(event) => setNotes((current) => ({ ...current, [selectedDate]: event.target.value }))} rows={3} placeholder="Add a reminder for yourself..." className="field-input" /></label>
        <button onClick={onSave} className="button-primary mt-4"><FileText className="size-4" /> Save note</button>
      </div>
    </section>
  </div>
}

function Activity({ activity, tasks }: { activity: { id: string; message: string; at: string }[]; tasks: WarehouseTask[] }) {
  const approved = tasks.filter((t) => t.status === 'Approved')
  return <div className="space-y-5">
    <header><p className="eyebrow">Team record</p><h1 className="mt-2 text-3xl font-serif">Activity</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Approvals, assignments, and finished tasks across your crew.</p></header>
    <section className="space-y-3"><h2 className="font-serif text-xl">Recent activity</h2>{activity.map((entry) => <div key={entry.id} className="paper-card"><p className="text-sm">{entry.message}</p><p className="mt-2 text-xs text-muted-foreground">{entry.at}</p></div>)}</section>
    <section className="space-y-3"><h2 className="font-serif text-xl">Completed tasks</h2>{approved.length ? approved.map((task) => <div key={task.id} className="paper-card flex items-center justify-between gap-3"><div><p className="font-medium">{task.title}</p><p className="text-sm text-muted-foreground">{task.assignees.join(', ')}</p></div><span className="status status-approved">Approved</span></div>) : <div className="paper-card text-sm text-muted-foreground">No tasks approved yet.</div>}</section>
  </div>
}

function Account({ name, email, onLogout }: { name: string; email: string; onLogout: () => void }) {
  const [form, setForm] = useState<'feedback' | 'incident' | null>(null)
  const [message, setMessage] = useState('')
  return <div className="space-y-5">
    <header><p className="eyebrow">Lead account</p><h1 className="mt-2 text-3xl font-serif">{name}</h1><p className="mt-1 text-sm text-muted-foreground">{email}</p></header>
    <section className="paper-card"><div className="flex items-center gap-3"><Users className="size-4 text-primary" /><div><p className="text-sm font-semibold">Crew oversight</p><p className="text-xs text-muted-foreground">Assign tasks and review submissions from the Home tab.</p></div></div></section>
    <div className="grid grid-cols-2 gap-2"><button className="button-secondary" onClick={() => setForm('feedback')}>Feedback</button><button className="button-secondary" onClick={() => setForm('incident')}>Incident Report</button></div>{message && <p className="text-sm text-primary">{message}</p>}<button className="button-secondary w-full" onClick={onLogout}>Sign out</button>{form === 'feedback' && <FeedbackForm onClose={() => setForm(null)} onSubmitted={setMessage} />}{form === 'incident' && <IncidentForm onClose={() => setForm(null)} onSubmitted={setMessage} />}
  </div>
}
