import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  LogOut,
  Plus,
  Send,
  UserCircle2,
  Users,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useWarehouse, LEAD_NOTIFICATIONS, type WarehouseEvent, type WarehouseTask } from '@/lib/warehouse'
import { FeedbackForm, IncidentForm, GenericTaskPanel } from '@/components/PwaWorkflows'
import {
  PwaBadge,
  PwaBottomNav,
  PwaButton,
  PwaCard,
  PwaEmptyState,
  PwaHeader,
  PwaModal,
  PwaToast,
  type PwaNavItem,
} from '@/components/pwa'

type Tab = 'home' | 'calendar' | 'activity' | 'account'

const SCHEDULE = [
  { date: '2026-08-19', time: '15:00', title: 'Production sync', venue: 'Lumière Depot' },
  { date: '2026-08-20', time: '05:30', title: 'Warehouse muster & loading', venue: 'Lumière Depot' },
  { date: '2026-08-27', time: '08:00', title: 'Maison Privée load-in briefing', venue: 'BGC Arts Center' },
]

function dateLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function WarehouseLeadPage() {
  const { adminName, adminEmail, logout } = useAuth()
  const { events, tasks, crew, activity, addTask, updateTaskStatus } = useWarehouse()
  const [tab, setTab] = useState<Tab>('home')
  const [selectedEvent, setSelectedEvent] = useState<WarehouseEvent | null>(null)
  const [assignItem, setAssignItem] = useState<WarehouseEvent['items'][number] | null>(null)
  const [toast, setToast] = useState('')
  const [selectedDate, setSelectedDate] = useState('2026-08-20')
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return { '2026-08-19': 'Confirm driver arrival time for stage gear.' }
    try {
      const stored = localStorage.getItem('__lumiere_lead_notes__')
      return stored ? JSON.parse(stored) : { '2026-08-19': 'Confirm driver arrival time for stage gear.' }
    } catch {
      return { '2026-08-19': 'Confirm driver arrival time for stage gear.' }
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('__lumiere_lead_notes__', JSON.stringify(notes))
    } catch {
      // ignore
    }
  }, [notes])

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 4000)
  }
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
    addTask({
      eventId: selectedEvent.id,
      itemId: assignItem.id,
      title,
      description: String(data.get('description') || ''),
      assignees,
      deadline,
      deadlineTime,
    })
    setAssignItem(null)
    notify('Task assigned.')
  }

  const navItems: PwaNavItem[] = [
    { id: 'home', label: 'Home', icon: ClipboardList, badgeCount: pendingCount },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'activity', label: 'Activity', icon: FileText },
    { id: 'account', label: 'Account', icon: UserCircle2 },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Shared PWA Station Header */}
      <PwaHeader
        title={
          tab === 'home'
            ? selectedEvent
              ? selectedEvent.name
              : 'Warehouse Lead Console'
            : tab === 'calendar'
              ? 'Team Operations Calendar'
              : tab === 'activity'
                ? 'Team Activity Record'
                : adminName || 'Lead Account'
        }
        subtitle={
          tab === 'home'
            ? selectedEvent
              ? `${selectedEvent.venue} • ${dateLabel(selectedEvent.date)}`
              : 'Events in production & crew task dispatch'
            : tab === 'calendar'
              ? 'Muster times, briefings & task deadlines'
              : tab === 'activity'
                ? 'Crew approvals, task assignments & audit trail'
                : adminEmail || 'Warehouse Operations Lead'
        }
        roleName="Warehouse Lead"
        subRole="Warehouse"
        icon={
          tab === 'home' ? (
            <ClipboardList className="size-5 text-primary" />
          ) : tab === 'calendar' ? (
            <CalendarDays className="size-5 text-primary" />
          ) : tab === 'activity' ? (
            <FileText className="size-5 text-primary" />
          ) : (
            <UserCircle2 className="size-5 text-primary" />
          )
        }
        actions={
          <button
            type="button"
            onClick={logout}
            className="flex size-10 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent/50 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        }
      />

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-[440px] px-4 pt-4 space-y-4">
        {tab === 'home' &&
          (selectedEvent ? (
            <EventDetail
              event={selectedEvent}
              tasks={tasks.filter((t) => t.eventId === selectedEvent.id)}
              crew={crew}
              onBack={() => setSelectedEvent(null)}
              onAssign={setAssignItem}
              onApprove={(id) => {
                updateTaskStatus(id, 'Approved')
                notify('Task approved.')
              }}
              onReject={(id) => {
                updateTaskStatus(id, 'Rejected')
                notify('Sent back for rework.')
              }}
            />
          ) : (
            <>
              <Home events={events} tasks={tasks} pendingCount={pendingCount} onOpen={setSelectedEvent} />
              <GenericTaskPanel canClaim={false} onNotify={notify} />
            </>
          ))}

        {tab === 'calendar' && (
          <CalendarView
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            notes={notes}
            setNotes={setNotes}
            onSave={() => notify('Personal note saved.')}
            tasks={tasks}
            events={events}
          />
        )}

        {tab === 'activity' && <Activity activity={activity} tasks={tasks} />}

        {tab === 'account' && (
          <Account name={adminName || 'Warehouse Lead'} email={adminEmail || 'lead@lumiere.internal'} onLogout={logout} />
        )}
      </main>

      {/* Shared Bottom Navigation */}
      <PwaBottomNav
        items={navItems}
        activeId={tab}
        onSelect={(key) => {
          setTab(key as Tab)
          setSelectedEvent(null)
        }}
      />

      {/* Toast Notification */}
      {toast && <PwaToast message={toast} />}

      {/* Shared Modals */}
      {assignItem && selectedEvent && (
        <PwaModal
          isOpen={Boolean(assignItem)}
          onClose={() => setAssignItem(null)}
          title="Assign Warehouse Task"
          subtitle={`${assignItem.name} • ${selectedEvent.name}`}
        >
          <AssignForm
            item={assignItem}
            event={selectedEvent}
            crew={crew}
            onSubmit={submitTask}
          />
        </PwaModal>
      )}
    </div>
  )
}

function Home({
  events,
  tasks,
  pendingCount,
  onOpen,
}: {
  events: WarehouseEvent[]
  tasks: WarehouseTask[]
  pendingCount: number
  onOpen: (event: WarehouseEvent) => void
}) {
  return (
    <div className="space-y-4">
      {/* Notifications Card */}
      <PwaCard title="Lead Notifications" subtitle="Operational updates for depot crew">
        <div className="mt-2 space-y-2 text-xs">
          {LEAD_NOTIFICATIONS.map((item) => (
            <div key={item.id} className="rounded-xl border border-border/50 bg-muted/20 p-2.5">
              <span className="font-bold text-foreground">{item.label}: </span>
              <span className="text-muted-foreground">{item.detail}</span>
            </div>
          ))}
        </div>
      </PwaCard>

      {/* Pending Approvals Alert */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-3.5 text-xs text-foreground">
          <CheckCircle2 className="size-4 shrink-0 text-primary" />
          <p className="font-medium">
            <span className="font-bold">{pendingCount} task{pendingCount > 1 ? 's' : ''}</span> submitted and awaiting your lead approval.
          </p>
        </div>
      )}

      {/* Production Events List */}
      <div>
        <h3 className="mb-2.5 font-serif text-sm font-semibold tracking-tight uppercase tracking-[0.14em] text-foreground">
          Events in Production
        </h3>
        <div className="space-y-3">
          {events.map((event) => {
            const eventTasks = tasks.filter((t) => t.eventId === event.id)
            return (
              <PwaCard key={event.id} className="p-4 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-serif text-base font-bold text-foreground">{event.name}</h4>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {event.venue} • {dateLabel(event.date)}
                    </p>
                  </div>
                  <PwaBadge
                    variant={event.status === 'In Prep' ? 'neutral' : event.status === 'Completed' ? 'subrole' : 'accent'}
                    label={event.status}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                  <span className="text-muted-foreground">
                    {event.items.length} item groups • {eventTasks.length} task(s)
                  </span>
                  <PwaButton onClick={() => onOpen(event)} variant="outline" size="sm">
                    Open Workspace
                  </PwaButton>
                </div>
              </PwaCard>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function EventDetail({
  event,
  tasks,
  onBack,
  onAssign,
  onApprove,
  onReject,
}: {
  event: WarehouseEvent
  tasks: WarehouseTask[]
  crew: { name: string; available: boolean }[]
  onBack: () => void
  onAssign: (item: WarehouseEvent['items'][number]) => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  return (
    <div className="space-y-4">
      <PwaButton onClick={onBack} variant="outline" size="sm" icon={<ChevronLeft className="size-4" />}>
        All Events
      </PwaButton>

      {/* Items Needed Card */}
      <PwaCard title="Items Needed for Event" subtitle="Tap an item to assign warehouse tasks to available crew">
        <div className="mt-3 divide-y divide-border/60">
          {event.items.map((item) => {
            const itemTasks = tasks.filter((t) => t.itemId === item.id)
            return (
              <div key={item.id} className="flex items-center justify-between gap-2 py-3 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground truncate">{item.name}</p>
                    {item.needsCreation && <PwaBadge variant="accent" label="To Create" />}
                  </div>
                  <p className="mt-0.5 text-muted-foreground">
                    {item.sku} • {item.qty} units • {item.color}
                  </p>
                  {itemTasks.length > 0 && (
                    <p className="mt-1 font-semibold text-primary">
                      {itemTasks.length} task{itemTasks.length > 1 ? 's' : ''} assigned
                    </p>
                  )}
                </div>
                <PwaButton
                  onClick={() => onAssign(item)}
                  variant="outline"
                  size="sm"
                  icon={<Plus className="size-3.5" />}
                  className="shrink-0"
                >
                  Assign
                </PwaButton>
              </div>
            )
          })}
        </div>
      </PwaCard>

      {/* Task Queue Card */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="font-serif text-sm font-semibold tracking-tight uppercase tracking-[0.14em] text-foreground">
            Task Queue
          </h3>
          <Users className="size-4 text-primary" />
        </div>

        {tasks.length === 0 ? (
          <PwaEmptyState title="No Tasks Assigned" description="No warehouse tasks have been assigned to this event yet." />
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onApprove={() => onApprove(task.id)}
                onReject={() => onReject(task.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TaskRow({ task, onApprove, onReject }: { task: WarehouseTask; onApprove: () => void; onReject: () => void }) {
  return (
    <PwaCard className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-serif text-sm font-bold text-foreground">{task.title}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {task.assignees.join(', ')} • Due {dateLabel(task.deadline)} at {task.deadlineTime}
          </p>
        </div>
        <PwaBadge
          variant={task.status === 'Approved' ? 'subrole' : task.status === 'Rejected' ? 'destructive' : 'accent'}
          label={task.status}
        />
      </div>

      <p className="text-xs text-foreground bg-muted/30 p-2.5 rounded-xl border border-border/50 leading-relaxed">
        {task.description}
      </p>

      {task.status === 'Submitted' && (
        <div className="flex items-center gap-2 pt-1">
          <PwaButton onClick={onApprove} variant="primary" size="sm" icon={<Check className="size-3.5" />} className="flex-1">
            Approve
          </PwaButton>
          <PwaButton onClick={onReject} variant="destructive" size="sm" className="flex-1">
            Reject
          </PwaButton>
        </div>
      )}
    </PwaCard>
  )
}

function AssignForm({
  item,
  event,
  crew,
  onSubmit,
}: {
  item: WarehouseEvent['items'][number]
  event: WarehouseEvent
  crew: { name: string; available: boolean }[]
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-xs font-semibold text-foreground">
        Task Name
        <input
          name="title"
          required
          defaultValue={`Prep ${item.name}`}
          placeholder="e.g. Inspect & clean chiavari chairs"
          className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      <label className="block text-xs font-semibold text-foreground">
        Instructions & Specs
        <textarea
          name="description"
          rows={3}
          defaultValue={`Prepare ${item.qty} units (${item.color}). SKU: ${item.sku}.`}
          className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-2">Assign Crew Members</label>
        <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
          {crew.map((person) => (
            <label key={person.name} className="flex items-center justify-between text-xs cursor-pointer">
              <span className="flex items-center gap-2 font-medium text-foreground">
                <input
                  type="checkbox"
                  name="assignees"
                  value={person.name}
                  disabled={!person.available}
                  className="size-4 rounded border-input"
                />
                {person.name}
              </span>
              <PwaBadge
                variant={person.available ? 'subrole' : 'neutral'}
                label={person.available ? 'Available' : 'Unavailable'}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-semibold text-foreground">
          Deadline Date
          <input
            name="deadline"
            type="date"
            defaultValue={event.date}
            className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <label className="block text-xs font-semibold text-foreground">
          Deadline Time
          <input
            name="time"
            type="time"
            defaultValue="17:00"
            className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
      </div>

      <PwaButton type="submit" variant="primary" size="md" icon={<Send className="size-4" />} className="w-full">
        Assign Task
      </PwaButton>
    </form>
  )
}

function DayDots({ hasSchedule, hasNote }: { hasSchedule: boolean; hasNote: boolean }) {
  if (!hasSchedule && !hasNote) return <span className="mt-1 block h-1.5" />
  return (
    <span className="mt-1 flex items-center justify-center gap-1">
      {hasSchedule && <span className="size-1.5 rounded-full bg-primary" />}
      {hasNote && <span className="size-1.5 rounded-full border border-current" />}
    </span>
  )
}

function CalendarView({
  selectedDate,
  setSelectedDate,
  notes,
  setNotes,
  onSave,
  tasks,
  events,
}: {
  selectedDate: string
  setSelectedDate: (date: string) => void
  notes: Record<string, string>
  setNotes: (updater: (current: Record<string, string>) => Record<string, string>) => void
  onSave: () => void
  tasks: WarehouseTask[]
  events: WarehouseEvent[]
}) {
  const [view, setView] = useState(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate.trim())) {
      const [y, m] = selectedDate.trim().split('-').map(Number)
      return { year: y, month: m - 1 }
    }
    return { year: 2026, month: 7 }
  })

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  const shiftMonth = (delta: number) => {
    setView((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  const firstWeekday = new Date(view.year, view.month, 1).getDay()
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const scheduleDates = new Set(SCHEDULE.map((item) => item.date))
  const deadlineDates = new Set(tasks.map((task) => task.deadline))
  const meetingsToday = SCHEDULE.filter((item) => item.date === selectedDate)
  const deadlinesToday = tasks.filter((task) => task.deadline === selectedDate)
  const eventsToday = events.filter((event) => event.date === selectedDate)
  const noteValue = notes[selectedDate] ?? ''

  return (
    <div className="space-y-4">
      <PwaCard title={`${MONTH_NAMES[view.month]} ${view.year} Calendar`}>
        <div className="flex items-center justify-between mb-3">
          <PwaButton variant="ghost" size="sm" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <ChevronLeft className="size-4" /> Prev
          </PwaButton>
          <span className="font-serif text-sm font-bold text-foreground">
            {MONTH_NAMES[view.month]} {view.year}
          </span>
          <PwaButton variant="ghost" size="sm" onClick={() => shiftMonth(1)} aria-label="Next month">
            Next <ChevronRight className="size-4" />
          </PwaButton>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <span key={`${d}-${i}`} className="font-bold text-muted-foreground text-[0.65rem] py-1">
              {d}
            </span>
          ))}
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <span key={`pad-${i}`} />
          ))}
          {days.map((day) => {
            const date = `${view.year}-${String(view.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const hasSchedule = scheduleDates.has(date) || deadlineDates.has(date)
            const hasNote = Boolean(notes[date])
            const isSelected = date === selectedDate

            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`flex min-h-[44px] flex-col items-center justify-center rounded-xl p-1 text-xs transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                    : hasSchedule
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'hover:bg-accent/40 text-foreground'
                }`}
              >
                <span>{day}</span>
                <DayDots hasSchedule={hasSchedule} hasNote={hasNote} />
              </button>
            )
          })}
        </div>
      </PwaCard>

      {eventsToday.length > 0 && (
        <PwaCard title="Events on Selected Date">
          <div className="space-y-2 pt-1 text-xs">
            {eventsToday.map((event) => (
              <p key={event.id} className="text-foreground">
                <strong className="font-bold">{event.name}</strong> • {event.venue}
              </p>
            ))}
          </div>
        </PwaCard>
      )}

      <PwaCard title={`Schedule for ${dateLabel(selectedDate)}`}>
        <div className="space-y-3 pt-1">
          {meetingsToday.map((entry) => (
            <div key={`${entry.date}-${entry.time}`} className="rounded-xl border border-border p-3 text-xs">
              <PwaBadge variant="accent" label={`${entry.time} • Meeting`} />
              <h4 className="mt-1 font-bold text-foreground">{entry.title}</h4>
              <p className="text-muted-foreground">{entry.venue}</p>
            </div>
          ))}

          {deadlinesToday.map((task) => (
            <div key={task.id} className="rounded-xl border border-border p-3 text-xs">
              <PwaBadge variant="neutral" label={`${task.deadlineTime} • Task Deadline`} />
              <h4 className="mt-1 font-bold text-foreground">{task.title}</h4>
              <p className="text-muted-foreground">{task.assignees.join(', ')}</p>
            </div>
          ))}

          {!meetingsToday.length && !deadlinesToday.length && (
            <p className="text-xs text-muted-foreground py-2">Nothing scheduled on this date.</p>
          )}

          <div className="mt-4 border-t border-border pt-3 space-y-2">
            <label className="block text-xs font-semibold text-foreground">
              Personal Note for {dateLabel(selectedDate)}
              <textarea
                value={noteValue}
                onChange={(e) => setNotes((curr) => ({ ...curr, [selectedDate]: e.target.value }))}
                rows={3}
                placeholder="Add a reminder for yourself..."
                className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <PwaButton onClick={onSave} variant="primary" size="sm" icon={<FileText className="size-3.5" />}>
              Save Note
            </PwaButton>
          </div>
        </div>
      </PwaCard>
    </div>
  )
}

function Activity({
  activity,
  tasks,
}: {
  activity: { id: string; message: string; at: string }[]
  tasks: WarehouseTask[]
}) {
  const approved = tasks.filter((t) => t.status === 'Approved')
  return (
    <div className="space-y-4">
      <PwaCard title="Recent Team Activity">
        <div className="space-y-2.5 pt-1 text-xs">
          {activity.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-border p-3">
              <p className="text-foreground font-medium">{entry.message}</p>
              <p className="mt-1 text-[0.65rem] text-muted-foreground">{entry.at}</p>
            </div>
          ))}
        </div>
      </PwaCard>

      <PwaCard title="Completed & Approved Tasks">
        {approved.length === 0 ? (
          <PwaEmptyState title="No Approved Tasks" description="No warehouse tasks have been approved yet." />
        ) : (
          <div className="space-y-2.5 pt-1 text-xs">
            {approved.map((task) => (
              <div key={task.id} className="flex items-center justify-between border-b border-border/60 py-2.5">
                <div>
                  <p className="font-bold text-foreground">{task.title}</p>
                  <p className="text-muted-foreground">{task.assignees.join(', ')}</p>
                </div>
                <PwaBadge variant="subrole" label="Approved" />
              </div>
            ))}
          </div>
        )}
      </PwaCard>
    </div>
  )
}

function Account({ name, email, onLogout }: { name: string; email: string; onLogout: () => void }) {
  const [form, setForm] = useState<'feedback' | 'incident' | null>(null)
  const [message, setMessage] = useState('')

  return (
    <div className="space-y-4">
      <PwaCard title={name} subtitle={email} action={<PwaBadge subRole="Warehouse" label="Lead Operator" />}>
        <div className="flex items-center gap-3 pt-2">
          <Users className="size-5 text-primary shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-foreground">Crew Oversight</p>
            <p className="text-muted-foreground">Assign tasks and review submissions from the Home tab.</p>
          </div>
        </div>
      </PwaCard>

      <PwaCard title="Lead Actions">
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <PwaButton onClick={() => setForm('feedback')} variant="outline" size="md" className="w-full">
              Feedback
            </PwaButton>
            <PwaButton onClick={() => setForm('incident')} variant="outline" size="md" className="w-full">
              Incident Report
            </PwaButton>
          </div>
          {message && <p className="text-xs text-primary font-medium text-center">{message}</p>}
          <PwaButton onClick={onLogout} variant="destructive" size="md" className="w-full">
            Sign Out
          </PwaButton>
        </div>
      </PwaCard>

      {form === 'feedback' && (
        <PwaModal
          isOpen={Boolean(form)}
          onClose={() => setForm(null)}
          title="Submit Operations Feedback"
          subtitle="Send feedback to Workforce Management"
        >
          <FeedbackForm onClose={() => setForm(null)} onSubmitted={setMessage} />
        </PwaModal>
      )}

      {form === 'incident' && (
        <PwaModal
          isOpen={Boolean(form)}
          onClose={() => setForm(null)}
          title="Submit Incident Report"
          subtitle="File emergency or operational incident"
        >
          <IncidentForm onClose={() => setForm(null)} onSubmitted={setMessage} />
        </PwaModal>
      )}
    </div>
  )
}
