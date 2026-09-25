import { useEffect, useState } from 'react'
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  ImageOff,
  LogOut,
  UserCircle2,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useWarehouse, MEMBER_NOTIFICATIONS, type WarehouseEvent, type WarehouseTask } from '@/lib/warehouse'
import { FeedbackForm, IncidentForm, GenericTaskPanel } from '@/components/PwaWorkflows'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ErrorFallback } from '@/components/ErrorFallback'
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

export function WarehouseMemberPage() {
  const { adminName, adminEmail, logout } = useAuth()
  const { events, tasks, activity, updateTaskStatus } = useWarehouse()
  const [tab, setTab] = useState<Tab>('home')
  const [selectedEvent, setSelectedEvent] = useState<WarehouseEvent | null>(null)
  const [selectedTask, setSelectedTask] = useState<WarehouseTask | null>(null)
  const [toast, setToast] = useState('')
  const [selectedDate, setSelectedDate] = useState('2026-08-20')
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return { '2026-08-20': 'Double-check candelabra glass globes.' }
    try {
      const stored = localStorage.getItem('__lumiere_member_notes__')
      return stored ? JSON.parse(stored) : { '2026-08-20': 'Double-check candelabra glass globes.' }
    } catch {
      return { '2026-08-20': 'Double-check candelabra glass globes.' }
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('__lumiere_member_notes__', JSON.stringify(notes))
    } catch {
      // ignore
    }
  }, [notes])

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 4000)
  }

  const me = adminName || 'Warehouse Member'
  const myTasks = tasks.filter((t) => t.assignees.includes(me) || t.assignees.includes('Member') || t.assignees.length === 0)
  const myEvents = events.filter((e) => myTasks.some((t) => t.eventId === e.id))

  const submitTask = (taskId: string, title: string) => {
    updateTaskStatus(taskId, 'Submitted')
    setSelectedTask(null)
    notify(`${title} submitted for lead approval.`)
  }

  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const handleRefetch = async () => {
    setIsError(false)
    setIsLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 200))
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    handleRefetch()
  }, [])

  const pendingCount = myTasks.filter((t) => t.status === 'Assigned').length

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
              : 'Warehouse Member Console'
            : tab === 'calendar'
              ? 'Operations Calendar'
              : tab === 'activity'
                ? 'Operational Record'
                : me
        }
        subtitle={
          tab === 'home'
            ? selectedEvent
              ? `${selectedEvent.venue} • ${dateLabel(selectedEvent.date)}`
              : 'Assigned tasks, picking & staging work'
            : tab === 'calendar'
              ? 'Muster times, shift briefings & task deadlines'
              : tab === 'activity'
                ? 'Finished tasks, approvals & recent updates'
                : adminEmail || 'Warehouse Operations Member'
        }
        roleName="Warehouse Member"
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
        {isError ? (
          <ErrorFallback
            title="Warehouse Member Portal Unavailable"
            message="Could not load your assigned warehouse tasks."
            onRetry={handleRefetch}
          />
        ) : isLoading ? (
          <LoadingSkeleton variant="dashboard" />
        ) : (
          <>
            {tab === 'home' &&
              (selectedEvent ? (
                <EventTasks
                  event={selectedEvent}
                  tasks={myTasks.filter((t) => t.eventId === selectedEvent.id)}
                  onBack={() => setSelectedEvent(null)}
                  onOpenTask={setSelectedTask}
                />
              ) : (
                <>
                  <Home events={myEvents} tasks={myTasks} onOpen={setSelectedEvent} />
                  <GenericTaskPanel onNotify={notify} />
                </>
              ))}

            {tab === 'calendar' && (
              <CalendarView
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                notes={notes}
                setNotes={setNotes}
                onSave={() => notify('Personal note saved.')}
                tasks={myTasks}
              />
            )}

            {tab === 'activity' && <Activity activity={activity} tasks={myTasks} />}

            {tab === 'account' && (
              <Account name={me} email={adminEmail || 'member@lumiere.internal'} onLogout={logout} />
            )}
          </>
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
      {selectedTask && (
        <PwaModal
          isOpen={Boolean(selectedTask)}
          onClose={() => setSelectedTask(null)}
          title="Task Execution Checklist"
          subtitle={selectedTask.title}
        >
          <TaskDetail
            task={selectedTask}
            onSubmit={() => submitTask(selectedTask.id, selectedTask.title)}
          />
        </PwaModal>
      )}
    </div>
  )
}

function Home({
  events,
  tasks,
  onOpen,
}: {
  events: WarehouseEvent[]
  tasks: WarehouseTask[]
  onOpen: (event: WarehouseEvent) => void
}) {
  return (
    <div className="space-y-4">
      {/* Notifications Card */}
      <PwaCard title="Member Notifications" subtitle="Shift updates & warehouse announcements">
        <div className="mt-2 space-y-2 text-xs">
          {MEMBER_NOTIFICATIONS.map((item) => (
            <div key={item.id} className="rounded-xl border border-border/50 bg-muted/20 p-2.5">
              <span className="font-bold text-foreground">{item.label}: </span>
              <span className="text-muted-foreground">{item.detail}</span>
            </div>
          ))}
        </div>
      </PwaCard>

      {/* Assigned Events List */}
      <div>
        <h3 className="mb-2.5 font-serif text-sm font-semibold tracking-tight uppercase tracking-[0.14em] text-foreground">
          Assigned Events ({events.length})
        </h3>

        {events.length === 0 ? (
          <PwaEmptyState
            title="No Tasks Assigned"
            description="No warehouse tasks have been assigned to you yet. Check back after the lead schedules the next event."
          />
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const eventTasks = tasks.filter((t) => t.eventId === event.id)
              const done = eventTasks.filter((t) => t.status === 'Approved' || t.status === 'Submitted').length

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
                      variant="accent"
                      label={`${eventTasks.length} task${eventTasks.length > 1 ? 's' : ''}`}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                    <span className="text-muted-foreground">
                      {done} of {eventTasks.length} completed
                    </span>
                    <PwaButton onClick={() => onOpen(event)} variant="outline" size="sm">
                      Open Tasks
                    </PwaButton>
                  </div>
                </PwaCard>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function EventTasks({
  event,
  tasks,
  onBack,
  onOpenTask,
}: {
  event: WarehouseEvent
  tasks: WarehouseTask[]
  onBack: () => void
  onOpenTask: (task: WarehouseTask) => void
}) {
  return (
    <div className="space-y-4">
      <PwaButton onClick={onBack} variant="outline" size="sm" icon={<ChevronLeft className="size-4" />}>
        All Events
      </PwaButton>

      <div>
        <h3 className="mb-2.5 font-serif text-sm font-semibold tracking-tight uppercase tracking-[0.14em] text-foreground">
          Your Assigned Tasks ({tasks.length})
        </h3>

        {tasks.length === 0 ? (
          <PwaEmptyState title="No Tasks" description="No tasks assigned for this event." />
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const item = event.items.find((i) => i.id === task.itemId)

              return (
                <PwaCard key={task.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-serif text-sm font-bold text-foreground">{task.title}</h4>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item?.name} • Due {dateLabel(task.deadline)} at {task.deadlineTime}
                      </p>
                    </div>
                    <PwaBadge
                      variant={
                        task.status === 'Approved'
                          ? 'subrole'
                          : task.status === 'Submitted'
                            ? 'accent'
                            : task.status === 'Rejected'
                              ? 'destructive'
                              : 'neutral'
                      }
                      label={task.status}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-end border-t border-border/60 pt-2.5">
                    <PwaButton onClick={() => onOpenTask(task)} variant="outline" size="sm">
                      View Task Checklist
                    </PwaButton>
                  </div>
                </PwaCard>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function TaskDetail({
  task,
  onSubmit,
}: {
  task: WarehouseTask
  onSubmit: () => void
}) {
  const { events } = useWarehouse()
  const event = events.find((e) => e.id === task.eventId)
  const item = event?.items.find((i) => i.id === task.itemId)
  const [checked, setChecked] = useState(false)
  const locked = task.status === 'Submitted' || task.status === 'Approved'

  return (
    <div className="space-y-4">
      {/* Item Image Preview */}
      {item?.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="h-44 w-full rounded-2xl border border-border object-cover"
        />
      ) : (
        <div className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/20 text-muted-foreground">
          <ImageOff className="size-5" />
          <p className="text-xs">No image preview available</p>
        </div>
      )}

      {/* Task Specifications */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
          <p className="font-bold text-[0.625rem] uppercase tracking-wider text-muted-foreground">Item Name</p>
          <p className="mt-0.5 font-bold text-foreground truncate">{item?.name ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
          <p className="font-bold text-[0.625rem] uppercase tracking-wider text-muted-foreground">Quantity</p>
          <p className="mt-0.5 font-bold text-foreground">{item?.qty ?? '—'} units</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
          <p className="font-bold text-[0.625rem] uppercase tracking-wider text-muted-foreground">Color / Specs</p>
          <p className="mt-0.5 font-bold text-foreground">{item?.color ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
          <p className="font-bold text-[0.625rem] uppercase tracking-wider text-muted-foreground">Deadline</p>
          <p className="mt-0.5 font-bold text-foreground">{dateLabel(task.deadline)} • {task.deadlineTime}</p>
        </div>
      </div>

      {/* Instructions */}
      <div>
        <p className="text-xs font-bold text-foreground">Task Instructions</p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed bg-muted/20 p-3 rounded-xl border border-border/50">
          {task.description || 'No additional notes from the lead.'}
        </p>
      </div>

      {/* Completion Confirmation */}
      <label
        className={`flex items-start gap-3 rounded-xl border border-border p-3 text-xs transition-all ${
          locked ? 'opacity-60 bg-muted/30' : 'cursor-pointer hover:bg-muted/20'
        }`}
      >
        <input
          type="checkbox"
          checked={checked || locked}
          disabled={locked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 size-4 rounded border-input"
        />
        <span className="font-medium text-foreground">
          I confirm this task has been picked, prepped, and staged according to specifications.
        </span>
      </label>

      {locked ? (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-center text-xs">
          <PwaBadge
            variant={task.status === 'Approved' ? 'subrole' : 'accent'}
            label={task.status === 'Approved' ? 'Approved by Lead' : 'Submitted — Pending Approval'}
          />
          <p className="mt-2 text-muted-foreground">
            {task.status === 'Approved'
              ? 'This task has been verified and approved by the Warehouse Lead.'
              : 'Recorded as finished and submitted for lead review.'}
          </p>
        </div>
      ) : (
        <PwaButton
          onClick={onSubmit}
          disabled={!checked}
          variant="primary"
          size="md"
          icon={<Check className="size-4" />}
          className="w-full"
        >
          Mark Complete & Submit
        </PwaButton>
      )}
    </div>
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
}: {
  selectedDate: string
  setSelectedDate: (date: string) => void
  notes: Record<string, string>
  setNotes: (updater: (current: Record<string, string>) => Record<string, string>) => void
  onSave: () => void
  tasks: WarehouseTask[]
}) {
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const scheduleDates = new Set(SCHEDULE.map((item) => item.date))
  const deadlineDates = new Set(tasks.map((task) => task.deadline))
  const meetingsToday = SCHEDULE.filter((item) => item.date === selectedDate)
  const deadlinesToday = tasks.filter((task) => task.deadline === selectedDate)
  const noteValue = notes[selectedDate] ?? ''

  return (
    <div className="space-y-4">
      <PwaCard title="August 2026 Calendar">
        <div className="flex items-center justify-between mb-3">
          <PwaButton variant="ghost" size="sm" onClick={() => setSelectedDate('2026-08-01')}>
            <ChevronLeft className="size-4" /> Prev
          </PwaButton>
          <span className="font-serif text-sm font-bold text-foreground">August 2026</span>
          <PwaButton variant="ghost" size="sm" onClick={() => setSelectedDate('2026-08-31')}>
            Next <ChevronRight className="size-4" />
          </PwaButton>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <span key={`${d}-${i}`} className="font-bold text-muted-foreground text-[0.65rem] py-1">
              {d}
            </span>
          ))}
          {days.map((day) => {
            const date = `2026-08-${String(day).padStart(2, '0')}`
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
              <PwaBadge variant="neutral" label={`${task.deadlineTime} • Task Due`} />
              <h4 className="mt-1 font-bold text-foreground">{task.title}</h4>
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
  const mine = activity.filter((entry) => tasks.some((t) => entry.message.includes(t.title)))
  const finished = tasks.filter((t) => t.status === 'Submitted' || t.status === 'Approved')

  return (
    <div className="space-y-4">
      <PwaCard title="Finished Tasks">
        {finished.length === 0 ? (
          <PwaEmptyState title="Nothing Finished Yet" description="Tasks submitted or approved will appear here." />
        ) : (
          <div className="space-y-2.5 pt-1 text-xs">
            {finished.map((task) => (
              <div key={task.id} className="flex items-center justify-between border-b border-border/60 py-2.5">
                <div>
                  <p className="font-bold text-foreground">{task.title}</p>
                  <p className="text-muted-foreground">Due {dateLabel(task.deadline)}</p>
                </div>
                <PwaBadge
                  variant={task.status === 'Approved' ? 'subrole' : 'accent'}
                  label={task.status === 'Approved' ? 'Approved' : 'Pending Approval'}
                />
              </div>
            ))}
          </div>
        )}
      </PwaCard>

      <PwaCard title="Recent Updates">
        {mine.length === 0 ? (
          <PwaEmptyState title="No Activity Yet" description="Your shift updates will be recorded here." />
        ) : (
          <div className="space-y-2.5 pt-1 text-xs">
            {mine.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border p-3">
                <p className="text-foreground font-medium">{entry.message}</p>
                <p className="mt-1 text-[0.65rem] text-muted-foreground">{entry.at}</p>
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
      <PwaCard title={name} subtitle={email} action={<PwaBadge subRole="Warehouse" label="Member Operator" />}>
        <div className="flex items-center gap-3 pt-2">
          <CheckCircle2 className="size-5 text-primary shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-foreground">How it works</p>
            <p className="text-muted-foreground">
              Open an event on Home to see your assigned tasks. Complete the checklist to submit for lead approval.
            </p>
          </div>
        </div>
      </PwaCard>

      <PwaCard title="Member Actions">
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
