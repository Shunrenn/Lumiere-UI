import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Lock,
  LogOut,
  MapPin,
  MessageSquare,
  PackageCheck,
  Send,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { usePortal } from '@/lib/store'
import { markBatchStalled, resolveBatchStall, useDispatchStore } from '@/lib/warehouse-dispatch'
import type { DispatchBatch } from '@/lib/event-detail'
import { IncidentForm } from '@/components/PwaWorkflows'
import {
  decideGroundCrewDeclaration,
  getApproachingDeclarationsSummary,
  getDeclarationAging,
  submitGroundCrewDeclaration,
  useGroundCrewDeclarations,
  type GroundCrewDeclaration,
} from '@/lib/ground-crew-declarations'
import { computePhotoSha256, extractPhotoMetadata, type HavaPhotoMetadata } from '@/lib/hava'
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
import type { GroundCrewSubRole } from '@/lib/types'

type Tab = 'home' | 'tasks' | 'calendar' | 'activity' | 'account'
type AccessLevel = 'Ground Crew / Member' | 'Team Lead / Field Lead' | 'Receiver' | 'Event Admin'
export type CheckpointPhase = 'Dispatch Loading' | 'Venue Arrival' | 'Pre-Event Setup' | 'Post-Event Egress'
type EventStatus = 'Current' | 'Upcoming' | 'Completed'
type RequestStatus = 'Pending' | 'Approved' | 'Denied'

interface EventItem {
  id: string
  name: string
  date: string
  venue: string
  status: EventStatus
  editable: boolean
  phase: CheckpointPhase
  items: { id: string; name: string; sku: string; qty: number; color: string }[]
}
interface DamageReport {
  id: string
  event: string
  item: string
  phase: CheckpointPhase
  quantity: number
  description: string
  photo: string
  photoHash?: string
  capturedAt: string
  location: string
  sha256Hash?: string
  gpsCoordinates?: string
}
interface CrewRequest {
  id: string
  type: string
  date: string
  note: string
  status: RequestStatus
}

const SEED_REPORTS: DamageReport[] = [
  {
    id: 'r1',
    event: 'Solstice Motors Electric SUV Reveal',
    item: 'Gold Chiavari Chairs',
    phase: 'Pre-Event Setup',
    quantity: 2,
    description: 'Light scratches on back rail',
    photo: '',
    capturedAt: 'Sep 16, 2026 • 09:42',
    location: 'The Peninsula Manila',
  },
]
const SEED_REQUESTS: CrewRequest[] = [
  { id: 'q1', type: 'Personal leave', date: '2026-09-22', note: 'Family commitment', status: 'Approved' },
  { id: 'q2', type: 'Schedule request', date: '2026-09-28', note: 'Request earlier call time', status: 'Pending' },
]

function dateLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function GroundCrewPage() {
  const { adminName, adminEmail, adminRole, logout } = useAuth()
  const { events, staff, procurement } = usePortal()
  const dispatchStore = useDispatchStore(events, staff, procurement)
  const declarations = useGroundCrewDeclarations()
  const [tab, setTab] = useState<Tab>('home')

  // Authoritative staff role lookup — derived strictly from authentication / roster, NEVER self-selected
  const userStaffRecord = staff.find((s) => s.email.toLowerCase() === (adminEmail || '').toLowerCase())
  const effectiveRole = userStaffRecord?.role || adminRole || 'Ground Crew'

  const accessLevel: AccessLevel =
    effectiveRole === 'Event Admin' || effectiveRole === 'Admin'
      ? 'Event Admin'
      : effectiveRole === 'Warehouse Lead' || effectiveRole === 'Ground Crew'
        ? 'Team Lead / Field Lead'
        : 'Ground Crew / Member'

  const derivedEvents = useMemo<EventItem[]>(() => {
    if (!events || events.length === 0) return []
    return events.map((evt, idx) => ({
      id: evt.id || `e-${idx + 1}`,
      name: evt.title,
      date: evt.targetDate,
      venue: evt.venue,
      status: idx === 0 ? 'Current' : 'Upcoming',
      editable: idx === 0,
      phase: 'Dispatch Loading' as CheckpointPhase,
      items: [
        { id: `i-${idx}-1`, name: 'Premium Crystal Candelabra', sku: 'LM-0012', qty: 24, color: 'Clear / Gold' },
        { id: `i-${idx}-2`, name: 'Gold Chiavari Chairs', sku: 'LM-0048', qty: 200, color: 'Antique Gold' },
        { id: `i-${idx}-3`, name: 'Velvet Drapery Panels', sku: 'LM-0211', qty: 40, color: 'Midnight Blue' },
      ],
    }))
  }, [events])

  const [adminEventId, setAdminEventId] = useState('')
  const [crewEvents, setCrewEvents] = useState<EventItem[]>([])

  useEffect(() => {
    if (derivedEvents.length > 0) {
      setCrewEvents(derivedEvents)
      if (!adminEventId) {
        setAdminEventId(derivedEvents[0].id)
      }
    }
  }, [derivedEvents])

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const selectedEvent = selectedEventId ? crewEvents.find((event) => event.id === selectedEventId) ?? null : null
  const [reports, setReports] = useState(SEED_REPORTS)
  const [requests, setRequests] = useState(SEED_REQUESTS)
  const [showReport, setShowReport] = useState(false)
  const [reportItem, setReportItem] = useState<EventItem['items'][number] | null>(null)
  const [toast, setToast] = useState('')
  const [selectedDate, setSelectedDate] = useState('2026-08-20')
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const stored = localStorage.getItem('__lumiere_crew_notes__')
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('__lumiere_crew_notes__', JSON.stringify(notes))
    } catch {
      // ignore
    }
  }, [notes])

  const [handoffNotes, setHandoffNotes] = useState<Record<string, string>>({})
  const [egressErrors, setEgressErrors] = useState<Record<string, string>>({})

  const [requestOpen, setRequestOpen] = useState(false)
  const [requestType, setRequestType] = useState('Sick leave')
  const [requestDate, setRequestDate] = useState('2026-09-25')
  const [requestNote, setRequestNote] = useState('')

  const openReport = (item: EventItem['items'][number]) => {
    setReportItem(item)
    setShowReport(true)
  }

  const submitReport = (
    event: FormEvent<HTMLFormElement>,
    capture?: { photoDataUrl: string; sha256Hash: string; meta: HavaPhotoMetadata }
  ) => {
    event.preventDefault()
    if (!reportItem || !selectedEvent) return

    const formData = new FormData(event.currentTarget)
    const condition = (formData.get('condition') as 'Damaged' | 'Missing') || 'Damaged'
    const qty = Number(formData.get('quantity') || '1')
    const desc = (formData.get('description') as string) || ''

    if (condition === 'Damaged' && !capture) {
      setToast('Photo evidence is required for damaged items.')
      window.setTimeout(() => setToast(''), 3500)
      return
    }

    submitGroundCrewDeclaration({
      eventId: selectedEvent.id,
      eventName: selectedEvent.name,
      item: reportItem.name,
      quantity: qty,
      condition,
      description: desc,
      submittedBy: adminName || 'Ground Crew Member',
      submittedAt: new Date().toISOString(),
      submittedRole:
        accessLevel === 'Event Admin'
          ? 'Field Lead'
          : accessLevel === 'Ground Crew / Member'
            ? 'Member'
            : 'Team Lead',
      sha256Hash: capture?.sha256Hash,
      gpsCoordinates: capture?.meta.gpsCoordinates,
      
    })

    const newReport: DamageReport = {
      id: `r-${Date.now()}`,
      event: selectedEvent.name,
      item: reportItem.name,
      phase: selectedEvent.phase,
      quantity: qty,
      description: desc,
      photo: capture?.photoDataUrl ?? '',
      capturedAt: capture?.meta.capturedAt
        ? new Date(capture.meta.capturedAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })
        : 'Just now',
      location: selectedEvent.venue,
      sha256Hash: capture?.sha256Hash,
      gpsCoordinates: capture?.meta.gpsCoordinates,
    }

    setReports((prev) => [newReport, ...prev])
    setShowReport(false)
    setReportItem(null)
    setToast('Condition report submitted to Event Admin review queue.')
    window.setTimeout(() => setToast(''), 3500)
  }

  const handleDecision = (declarationId: string, decision: 'Confirmed' | 'Rejected') => {
    decideGroundCrewDeclaration(declarationId, decision, adminName || 'Event Admin')
    setToast(`Declaration ${declarationId} ${decision.toLowerCase()} by ${adminName || 'Event Admin'}.`)
    window.setTimeout(() => setToast(''), 3500)
  }

  const advancePhase = (eventId: string) => {
    setCrewEvents((prev) =>
      prev.map((item) => {
        if (item.id !== eventId) return item
        const order: CheckpointPhase[] = ['Dispatch Loading', 'Venue Arrival', 'Pre-Event Setup', 'Post-Event Egress']
        const idx = order.indexOf(item.phase)
        if (idx < order.length - 1) {
          return { ...item, phase: order[idx + 1] }
        }
        return item
      })
    )
  }

  const handleStartEgress = (eventId: string) => {
    const note = (handoffNotes[eventId] || '').trim()
    if (!note) {
      setEgressErrors((prev) => ({
        ...prev,
        [eventId]: 'Field Lead handoff note is required before completing egress.',
      }))
      return
    }

    setEgressErrors((prev) => ({ ...prev, [eventId]: '' }))
    setCrewEvents((prev) =>
      prev.map((item) => {
        if (item.id !== eventId) return item
        return { ...item, status: 'Completed' }
      })
    )

    setToast(`Post-Event Egress completed for ${selectedEvent?.name || 'event'}. Transit lock acquired.`)
    window.setTimeout(() => setToast(''), 3500)
    setSelectedEventId(null)
  }

  const handleStall = (batchId: string, reason: string) => {
    if (!selectedEvent) return
    markBatchStalled(selectedEvent.id, batchId, reason)
    setToast(`Dispatch batch ${batchId} marked STALLED. Alert sent to Warehouse Lead.`)
    window.setTimeout(() => setToast(''), 3500)
  }

  const handleResume = (batchId: string) => {
    if (!selectedEvent) return
    resolveBatchStall(selectedEvent.id, batchId)
    setToast(`Dispatch batch ${batchId} returned to IN_TRANSIT.`)
    window.setTimeout(() => setToast(''), 3500)
  }

  const submitRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!requestNote.trim()) return

    const newReq: CrewRequest = {
      id: `q-${Date.now()}`,
      type: requestType,
      date: requestDate,
      note: requestNote.trim(),
      status: 'Pending',
    }

    setRequests((prev) => [newReq, ...prev])
    setRequestOpen(false)
    setRequestNote('')
    setToast('Request submitted to Workforce Admin review queue.')
    window.setTimeout(() => setToast(''), 3500)
  }

  const pendingDeclarationsForCurrentAdmin = declarations.filter(
    (d) => d.eventId === adminEventId && d.status === 'Pending Event Admin'
  )

  const approachingSummary = useMemo(() => {
    if (accessLevel !== 'Event Admin') return null
    return getApproachingDeclarationsSummary()
  }, [accessLevel])

  const navItems: PwaNavItem[] = [
    { id: 'home', label: 'Console', icon: MapPin },
    {
      id: 'tasks',
      label: 'Decision',
      icon: ShieldCheck,
      badgeCount: pendingDeclarationsForCurrentAdmin.length,
    },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'activity', label: 'Record', icon: FileText },
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
              : 'Ground Crew Console'
            : tab === 'tasks'
              ? 'Confirmation Authority'
              : tab === 'calendar'
                ? 'Operations Calendar'
                : tab === 'activity'
                  ? 'Operational Record'
                  : adminName || 'Ground Crew Account'
        }
        subtitle={
          tab === 'home'
            ? selectedEvent
              ? `${selectedEvent.venue} • ${dateLabel(selectedEvent.date)}`
              : 'Active shifts & transit checkpoints'
            : tab === 'tasks'
              ? 'Condition & damage declaration review'
              : tab === 'calendar'
                ? 'Call sheets & event assignments'
                : tab === 'activity'
                  ? 'Reports, requests & completed shifts'
                  : adminEmail || 'Ground Crew Member'
        }
        roleName={accessLevel}
        subRole={effectiveRole as GroundCrewSubRole}
        icon={
          tab === 'home' ? (
            <MapPin className="size-5 text-primary" />
          ) : tab === 'tasks' ? (
            <ShieldCheck className="size-5 text-primary" />
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

      {/* Main Tab Content */}
      <main className="mx-auto w-full max-w-[440px] px-4 pt-4 space-y-4">
        {tab === 'home' && (
          <>
            {selectedEvent ? (
              <EventDetail
                event={selectedEvent}
                batches={dispatchStore.get(selectedEvent.id) ?? []}
                handoffNote={handoffNotes[selectedEvent.id] || ''}
                onHandoffNoteChange={(val) => setHandoffNotes((prev) => ({ ...prev, [selectedEvent.id]: val }))}
                egressError={egressErrors[selectedEvent.id] || ''}
                onAdvancePhase={() => advancePhase(selectedEvent.id)}
                onStartEgress={() => handleStartEgress(selectedEvent.id)}
                onBack={() => {
                  setSelectedEventId(null)
                  setEgressErrors({})
                }}
                onReport={openReport}
                onStall={handleStall}
                onResume={handleResume}
              />
            ) : (
              <Home
                events={crewEvents}
                onOpen={(item) => setSelectedEventId(item.id)}
                approachingSummary={approachingSummary}
              />
            )}
          </>
        )}

        {tab === 'tasks' && (
          <DecisionMode
            declarations={declarations}
            accessLevel={accessLevel}
            adminEventId={adminEventId}
            events={crewEvents}
            onEventChange={setAdminEventId}
            onDecision={handleDecision}
          />
        )}

        {tab === 'calendar' && (
          <CalendarView
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            notes={notes}
            setNotes={setNotes}
            onSave={() => {
              try {
                localStorage.setItem('__lumiere_crew_notes__', JSON.stringify(notes))
                setToast('Personal note saved.')
              } catch {
                setToast('Failed to save note.')
              }
              window.setTimeout(() => setToast(''), 3000)
            }}
            events={crewEvents}
          />
        )}

        {tab === 'activity' && <Activity reports={reports} requests={requests} events={crewEvents} />}

        {tab === 'account' && (
          <Account
            name={adminName || 'Ground Crew'}
            email={adminEmail || 'crew@lumiere.internal'}
            requests={requests}
            onRequest={() => setRequestOpen(true)}
            onLogout={logout}
          />
        )}
      </main>

      {/* Shared Bottom Navigation */}
      <PwaBottomNav items={navItems} activeId={tab} onSelect={(id) => setTab(id as Tab)} />

      {/* Toast Notification */}
      {toast && <PwaToast message={toast} />}

      {/* Shared Modals */}
      {showReport && reportItem && selectedEvent && (
        <PwaModal
          isOpen={showReport}
          onClose={() => setShowReport(false)}
          title="Report Item Condition"
          subtitle={`${reportItem.name} • ${selectedEvent.name}`}
        >
          <DamageForm
            item={reportItem}
            event={selectedEvent.name}
            phase={selectedEvent.phase}
            onSubmit={submitReport}
          />
        </PwaModal>
      )}

      {requestOpen && (
        <PwaModal
          isOpen={requestOpen}
          onClose={() => setRequestOpen(false)}
          title="Submit Admin Request"
          subtitle="Submit leave or schedule requests to Workforce Admin"
        >
          <RequestForm
            type={requestType}
            setType={setRequestType}
            date={requestDate}
            setDate={setRequestDate}
            note={requestNote}
            setNote={setRequestNote}
            onSubmit={submitRequest}
          />
        </PwaModal>
      )}
    </div>
  )
}

function Home({
  events,
  onOpen,
  approachingSummary,
}: {
  events: EventItem[]
  onOpen: (event: EventItem) => void
  approachingSummary?: { totalApproaching: number; eventsCount: number } | null
}) {
  const currentEvent = events.find((e) => e.status === 'Current') || events[0]
  const upcomingEvents = events.filter((e) => e.id !== currentEvent?.id && e.status !== 'Completed')

  return (
    <div className="space-y-4">
      {approachingSummary && approachingSummary.totalApproaching > 0 && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            48-Hour Escalation Warning
          </div>
          <p className="mt-1 leading-relaxed">
            {approachingSummary.totalApproaching} declaration(s) approaching safety cutoff across{' '}
            {approachingSummary.eventsCount} event(s). Review in Decision tab.
          </p>
        </div>
      )}

      {currentEvent && (
        <PwaCard
          title="Active Shift Context"
          subtitle="Primary operational focus for today"
          action={<PwaBadge subRole={currentEvent.phase === 'Dispatch Loading' ? 'Field' : 'Warehouse'} label={currentEvent.phase} />}
        >
          <div className="mt-1 space-y-3">
            <div>
              <h4 className="font-serif text-lg font-bold text-foreground">{currentEvent.name}</h4>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5 text-primary" /> {currentEvent.venue}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3.5 text-primary" /> {dateLabel(currentEvent.date)}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs">
              <span className="font-bold text-foreground uppercase tracking-wider text-[0.625rem]">Manifest Items: </span>
              <span className="text-muted-foreground">
                {currentEvent.items.map((i) => `${i.qty}x ${i.name}`).join(', ')}
              </span>
            </div>

            <PwaButton onClick={() => onOpen(currentEvent)} variant="primary" size="md" className="w-full">
              Open Event Console
            </PwaButton>
          </div>
        </PwaCard>
      )}

      <div className="pt-2">
        <h3 className="mb-2.5 font-serif text-sm font-semibold tracking-tight text-foreground uppercase tracking-[0.14em]">
          Upcoming Operational Shifts
        </h3>
        {upcomingEvents.length === 0 ? (
          <PwaEmptyState title="No Upcoming Shifts" description="All scheduled events for this period have been completed." />
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map((evt) => (
              <PwaCard key={evt.id} className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-serif text-sm font-bold text-foreground">{evt.name}</h4>
                    <p className="mt-0.5 text-xs text-muted-foreground">{evt.venue} • {dateLabel(evt.date)}</p>
                  </div>
                  <PwaBadge variant="neutral" label={evt.phase} />
                </div>
                <div className="mt-3 flex items-center justify-end">
                  <PwaButton onClick={() => onOpen(evt)} variant="outline" size="sm">
                    View Shift
                  </PwaButton>
                </div>
              </PwaCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DecisionMode({
  declarations,
  accessLevel,
  adminEventId,
  events,
  onEventChange,
  onDecision,
}: {
  declarations: GroundCrewDeclaration[]
  accessLevel: AccessLevel
  adminEventId: string
  events: EventItem[]
  onEventChange: (value: string) => void
  onDecision: (id: string, decision: 'Confirmed' | 'Rejected') => void
}) {
  const [now, setNow] = useState(() => Date.now())
  const assigned = declarations.filter((d) => d.eventId === adminEventId && d.status === 'Pending Event Admin')
  const approachingForEvent = assigned.filter((d) => getDeclarationAging(d.submittedAt, now).approaching)

  useEffect(() => {
    if (accessLevel !== 'Event Admin') return
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [accessLevel])

  return (
    <div className="space-y-4">
      <PwaCard
        title="Assigned Role & Access Tier"
        subtitle="Workforce Management & Manning Authority"
        action={<PwaBadge variant="accent" label={accessLevel} />}
      >
        {accessLevel === 'Event Admin' ? (
          <div className="mt-2 space-y-2">
            <label className="block text-xs font-semibold text-foreground">
              Assigned Event Scope
              <select
                value={adminEventId}
                onChange={(e) => onEventChange(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.id})
                  </option>
                ))}
              </select>
            </label>
            <p className="text-[0.68rem] text-muted-foreground leading-relaxed">
              Event Admin authority is scoped to this event. Unhandled declarations escalate to Manning after 48 hours.
            </p>
          </div>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Role tier is assigned through Workforce Management & Manning. Ground crew accounts cannot self-modify access privileges.
          </p>
        )}
      </PwaCard>

      {accessLevel !== 'Event Admin' ? (
        <PwaCard title="Base Privilege Level" subtitle={accessLevel}>
          <p className="text-xs leading-relaxed text-muted-foreground">
            You retain checkpoint reporting and condition submission privileges. Event Admin confirmation authority is managed separately in Manning.
          </p>
        </PwaCard>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-sm font-semibold tracking-[0.14em] uppercase text-foreground">
              Pending Declarations ({assigned.length})
            </h3>
            <ShieldCheck className="size-4 text-primary" />
          </div>

          {approachingForEvent.length > 0 && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
                <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
                48-Hour Escalation Warning
              </div>
              <p className="mt-1 leading-relaxed">
                {approachingForEvent.length} declaration(s) approaching safety cutoff. Unresolved items will auto-escalate.
              </p>
            </div>
          )}

          {assigned.length === 0 ? (
            <PwaEmptyState
              title="No Pending Declarations"
              description="All submitted condition and damage declarations for this event have been reviewed."
            />
          ) : (
            assigned.map((declaration) => (
              <PwaCard key={declaration.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <PwaBadge
                      variant={declaration.condition === 'Damaged' ? 'destructive' : 'neutral'}
                      label={declaration.condition}
                    />
                    <h4 className="mt-1.5 font-serif text-base font-bold text-foreground">{declaration.item}</h4>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {declaration.quantity} unit(s) • Submitted by {declaration.submittedBy} ({declaration.submittedRole})
                    </p>
                  </div>
                  <span className="text-[0.65rem] font-bold text-amber-600 dark:text-amber-400">
                    Pending {getDeclarationAging(declaration.submittedAt, now).elapsedHours}h
                  </span>
                </div>
                <p className="text-xs text-foreground bg-muted/30 p-2.5 rounded-xl border border-border/50">
                  {declaration.description}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <PwaButton
                    onClick={() => onDecision(declaration.id, 'Confirmed')}
                    variant="primary"
                    size="sm"
                    className="flex-1"
                  >
                    Confirm
                  </PwaButton>
                  <PwaButton
                    onClick={() => onDecision(declaration.id, 'Rejected')}
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                  >
                    Reject
                  </PwaButton>
                </div>
              </PwaCard>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function PhaseMap({ phase }: { phase: CheckpointPhase }) {
  const order: CheckpointPhase[] = ['Dispatch Loading', 'Venue Arrival', 'Pre-Event Setup', 'Post-Event Egress']
  const activeIndex = order.indexOf(phase)
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="img" aria-label={`Event progress: ${phase}`}>
      {order.map((item, index) => {
        const state = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending'
        return (
          <div
            key={item}
            className={`rounded-xl border px-2.5 py-2 text-center text-[0.625rem] font-bold uppercase tracking-wider transition-all ${
              state === 'active'
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : state === 'done'
                  ? 'border-primary/40 bg-secondary/80 text-foreground'
                  : 'border-border bg-card/60 text-muted-foreground'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              {state === 'done' && <Check className="size-3" />}
              {state === 'pending' && <Lock className="size-3" />}
              <span>{item}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EventDetail({
  event,
  batches,
  handoffNote,
  onHandoffNoteChange,
  egressError,
  onAdvancePhase,
  onStartEgress,
  onBack,
  onReport,
  onStall,
  onResume,
}: {
  event: EventItem
  batches: DispatchBatch[]
  handoffNote: string
  onHandoffNoteChange: (value: string) => void
  egressError: string
  onAdvancePhase: () => void
  onStartEgress: () => void
  onBack: () => void
  onReport: (item: EventItem['items'][number]) => void
  onStall: (batchId: string, reason: string) => void
  onResume: (batchId: string) => void
}) {
  const { phase } = event
  return (
    <div className="space-y-4">
      <PwaButton onClick={onBack} variant="outline" size="sm" icon={<ChevronLeft className="size-4" />}>
        All Events
      </PwaButton>

      <PhaseMap phase={phase} />

      <PwaCard title="Transit Checkpoints" subtitle="Chain of Custody Batches">
        {batches.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">No dispatch batch assigned to this event yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {batches.map((batch) => (
              <StallControl key={batch.id} batch={batch} onStall={onStall} onResume={onResume} />
            ))}
          </div>
        )}
      </PwaCard>

      {phase === 'Dispatch Loading' && (
        <PwaCard title="Dispatch Loading Handoff" subtitle="Checkpoint 1 of 4">
          <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
            <PackageCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            Confirm warehouse dispatch manifest loading and vehicle clearance.
          </p>
          <div className="mt-3 divide-y divide-border/60">
            {event.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 py-2.5 text-xs">
                <div>
                  <p className="font-bold text-foreground">{item.name}</p>
                  <p className="text-muted-foreground">{item.sku} • {item.qty} units • {item.color}</p>
                </div>
                <PwaBadge variant="subrole" subRole="Warehouse" label="Verified" />
              </div>
            ))}
          </div>
          <PwaButton onClick={onAdvancePhase} variant="primary" size="md" className="mt-4 w-full">
            Confirm Loading — Advance to Venue Arrival
          </PwaButton>
        </PwaCard>
      )}

      {phase === 'Venue Arrival' && (
        <PwaCard title="Venue Arrival Verification" subtitle="Checkpoint 2 of 4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Verify vehicle arrival and transit condition before unloading.
          </p>
          <div className="mt-3 divide-y divide-border/60">
            {event.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 py-2.5 text-xs">
                <div>
                  <p className="font-bold text-foreground">{item.name}</p>
                  <p className="text-muted-foreground">{item.sku} • {item.qty} units • {item.color}</p>
                </div>
                <PwaButton onClick={() => onReport(item)} variant="outline" size="sm" icon={<Camera className="size-3.5" />}>
                  Condition Check
                </PwaButton>
              </div>
            ))}
          </div>
          <PwaButton onClick={onAdvancePhase} variant="primary" size="md" className="mt-4 w-full">
            Confirm Arrival — Advance to Pre-Event Setup
          </PwaButton>
        </PwaCard>
      )}

      {phase === 'Pre-Event Setup' && (
        <PwaCard title="Pre-Event Setup Validation" subtitle="Checkpoint 3 of 4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Review each item group. Report damage or missing quantities before event activation.
          </p>
          <div className="mt-3 divide-y divide-border/60">
            {event.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 py-2.5 text-xs">
                <div>
                  <p className="font-bold text-foreground">{item.name}</p>
                  <p className="text-muted-foreground">{item.sku} • {item.qty} units • {item.color}</p>
                </div>
                <PwaButton onClick={() => onReport(item)} variant="outline" size="sm" icon={<Camera className="size-3.5" />}>
                  Report
                </PwaButton>
              </div>
            ))}
          </div>
          <PwaButton onClick={onAdvancePhase} variant="primary" size="md" className="mt-4 w-full">
            Confirm Setup — Advance to Post-Event Egress
          </PwaButton>
        </PwaCard>
      )}

      {phase === 'Post-Event Egress' && (
        <PwaCard title="Post-Event Egress Checklist" subtitle="Checkpoint 4 of 4">
          <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
            <PackageCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            The warehouse crew confirms every item is packed and truck-ready.
          </p>
          <div className="mt-3 divide-y divide-border/60">
            {event.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 py-2.5 text-xs">
                <div>
                  <p className="font-bold text-foreground">{item.name}</p>
                  <p className="text-muted-foreground">{item.sku} • {item.qty} units • {item.color}</p>
                </div>
                <PwaBadge variant="subrole" subRole="Field" label="Egress Ready" />
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-border/80 pt-3 space-y-3">
            <label className="block text-xs font-semibold text-foreground">
              Field Lead Handoff Note <span className="text-destructive">*</span>
              <textarea
                value={handoffNote}
                onChange={(e) => onHandoffNoteChange(e.target.value)}
                rows={3}
                placeholder="Where are damaged items placed? (prevents duplicate reporting on arrival)"
                className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            {egressError && <p className="text-xs text-destructive font-medium">{egressError}</p>}
            <PwaButton onClick={onStartEgress} variant="primary" size="md" className="w-full">
              Complete Post-Event Egress
            </PwaButton>
          </div>
        </PwaCard>
      )}
    </div>
  )
}

function StallControl({
  batch,
  onStall,
  onResume,
}: {
  batch: DispatchBatch
  onStall: (batchId: string, reason: string) => void
  onResume: (batchId: string) => void
}) {
  const [reason, setReason] = useState('')
  const [open, setOpen] = useState(false)
  const submit = () => {
    const value = reason.trim()
    if (!value) return
    onStall(batch.id, value)
    setReason('')
    setOpen(false)
  }

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-mono text-[0.65rem] font-bold text-muted-foreground">{batch.id}</span>
          <p className="font-bold text-foreground">{batch.driverName || 'Transit Driver'}</p>
        </div>
        <PwaBadge
          variant={batch.stalled ? 'destructive' : 'accent'}
          label={batch.stalled ? 'STALLED' : 'IN TRANSIT'}
        />
      </div>

      {batch.stalled ? (
        <div className="mt-2 space-y-2">
          <p className="text-[0.68rem] text-destructive font-medium">Stall Reason: {batch.stalledReason}</p>
          <PwaButton onClick={() => onResume(batch.id)} variant="outline" size="sm" className="w-full">
            Resume Transit
          </PwaButton>
        </div>
      ) : (
        <div className="mt-2">
          {open ? (
            <div className="space-y-2">
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for transit stall..."
                className="w-full rounded-lg border border-input bg-background p-2 text-xs"
              />
              <div className="flex gap-2">
                <PwaButton onClick={submit} variant="destructive" size="sm" className="flex-1">
                  Report Stall
                </PwaButton>
                <PwaButton onClick={() => setOpen(false)} variant="ghost" size="sm">
                  Cancel
                </PwaButton>
              </div>
            </div>
          ) : (
            <PwaButton onClick={() => setOpen(true)} variant="ghost" size="sm" className="w-full text-destructive">
              Mark Stalled
            </PwaButton>
          )}
        </div>
      )}
    </div>
  )
}

function DamageForm({
  item,
  event,
  phase,
  onSubmit,
}: {
  item: EventItem['items'][number]
  event: string
  phase: CheckpointPhase
  onSubmit: (
    e: FormEvent<HTMLFormElement>,
    capture?: { photoDataUrl: string; sha256Hash: string; meta: HavaPhotoMetadata }
  ) => void
}) {
  const [condition, setCondition] = useState<'Damaged' | 'Missing'>('Damaged')
  const [captures, setCaptures] = useState<
    { photoDataUrl: string; sha256Hash: string; meta: HavaPhotoMetadata }[]
  >([])
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const latestCapture = captures[captures.length - 1]
  const photoCount = captures.length
  const photoRequired = condition === 'Damaged'

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsProcessing(true)
    try {
      const buffer = await file.arrayBuffer()
      const [sha256Hash, meta] = await Promise.all([computePhotoSha256(buffer), extractPhotoMetadata(file)])
      const photoDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = (ev) => resolve(ev.target?.result as string)
        reader.readAsDataURL(file)
      })
      setCaptures((prev) => [...prev, { sha256Hash, meta, photoDataUrl }])
    } catch (err) {
      console.warn('[HAVA] Failed to process photo:', err)
    } finally {
      setIsProcessing(false)
      e.target.value = ''
    }
  }

  return (
    <form onSubmit={(e) => onSubmit(e, latestCapture)} className="space-y-4">
      <div>
        <p className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">{phase} Validation</p>
        <p className="text-xs text-muted-foreground">{item.name} • {event}</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-hidden
        onChange={handleFileSelect}
      />

      <label className="block text-xs font-semibold text-foreground">
        Condition Type
        <select
          name="condition"
          value={condition}
          onChange={(e) => {
            setCondition(e.target.value as 'Damaged' | 'Missing')
            setCaptures([])
          }}
          className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="Damaged">Damaged</option>
          <option value="Missing">Missing</option>
        </select>
      </label>

      <input type="hidden" name="photoCaptured" value={photoCount > 0 ? '1' : ''} />

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-foreground">
          {photoRequired ? 'Photos (Required — SHA-256 Fingerprinted)' : 'Photos (Optional for missing items)'}
        </label>

        {photoCount > 0 ? (
          <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
            {latestCapture?.photoDataUrl && (
              <img
                src={latestCapture.photoDataUrl}
                alt="Damage preview"
                className="h-28 w-full rounded-lg object-cover border border-border"
              />
            )}
            <div className="flex items-center justify-between">
              <span className="flex size-6 items-center justify-center rounded bg-emerald-600 font-bold text-white text-[0.65rem]">
                {photoCount}
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="text-xs font-semibold text-primary underline hover:opacity-80"
              >
                + Add photo
              </button>
            </div>
            <div className="break-all rounded-lg bg-background p-2 font-mono text-[0.6rem] text-muted-foreground border border-border">
              <span className="font-bold text-emerald-600">SHA-256: </span>
              {latestCapture?.sha256Hash}
            </div>
          </div>
        ) : (
          <PwaButton
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            variant="outline"
            size="md"
            icon={<Camera className="size-4" />}
            className="w-full"
          >
            {isProcessing ? 'Processing HAVA photo...' : 'Capture Photo (Auto-fingerprinted)'}
          </PwaButton>
        )}
      </div>

      <label className="block text-xs font-semibold text-foreground">
        Quantity Affected
        <input
          name="quantity"
          type="number"
          min="1"
          defaultValue="1"
          className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      <label className="block text-xs font-semibold text-foreground">
        Damage Description
        <textarea
          name="description"
          required
          rows={3}
          placeholder="Describe item condition or missing count details..."
          className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      <PwaButton type="submit" disabled={isProcessing} variant="primary" size="md" className="w-full">
        Submit Validation Report
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
  events,
}: {
  selectedDate: string
  setSelectedDate: (date: string) => void
  notes: Record<string, string>
  setNotes: (updater: (current: Record<string, string>) => Record<string, string>) => void
  onSave: () => void
  events: EventItem[]
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
  const entries = events.filter((item) => item.date === selectedDate)
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
            const hasSchedule = events.some((item) => item.date === date)
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

      <PwaCard title={`Shift Schedule • ${dateLabel(selectedDate)}`}>
        {entries.length ? (
          <div className="space-y-2 pt-1">
            {entries.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border p-3">
                <PwaBadge variant="subrole" subRole="Field" label={entry.phase} />
                <h4 className="mt-1 font-serif text-sm font-bold text-foreground">{entry.name}</h4>
                <p className="text-xs text-muted-foreground">{entry.venue}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-2">No shift briefings assigned for this date.</p>
        )}

        <div className="mt-4 border-t border-border pt-3 space-y-2">
          <label className="block text-xs font-semibold text-foreground">
            Personal Shift Reminders
            <textarea
              value={noteValue}
              onChange={(e) => setNotes((curr) => ({ ...curr, [selectedDate]: e.target.value }))}
              rows={3}
              placeholder="Add personal notes or reminders..."
              className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <PwaButton onClick={onSave} variant="primary" size="sm" icon={<MessageSquare className="size-3.5" />}>
            Save Reminder
          </PwaButton>
        </div>
      </PwaCard>
    </div>
  )
}

function Activity({
  reports,
  requests,
  events,
}: {
  reports: DamageReport[]
  requests: CrewRequest[]
  events: EventItem[]
}) {
  return (
    <div className="space-y-4">
      <PwaCard title="Validation Reports Submitted">
        {reports.length === 0 ? (
          <PwaEmptyState title="No Reports" description="You have not submitted any damage or condition reports." />
        ) : (
          <div className="space-y-3 pt-1">
            {reports.map((r) => (
              <div key={r.id} className="rounded-xl border border-border p-3 text-xs space-y-1">
                <div className="flex items-start justify-between">
                  <h4 className="font-bold text-foreground">{r.item}</h4>
                  <PwaBadge variant="accent" label="Submitted" />
                </div>
                <p className="text-muted-foreground">{r.event} • {r.phase}</p>
                <p className="text-foreground">{r.quantity} unit(s) affected • {r.description}</p>
                <p className="text-[0.65rem] text-muted-foreground pt-1">{r.capturedAt} • {r.location}</p>
              </div>
            ))}
          </div>
        )}
      </PwaCard>

      <PwaCard title="Workforce Requests">
        {requests.map((q) => (
          <div key={q.id} className="flex items-center justify-between border-b border-border/60 py-2.5 text-xs">
            <div>
              <p className="font-bold text-foreground">{q.type}</p>
              <p className="text-muted-foreground">{dateLabel(q.date)} • {q.note}</p>
            </div>
            <PwaBadge
              variant={q.status === 'Approved' ? 'subrole' : q.status === 'Denied' ? 'destructive' : 'neutral'}
              label={q.status}
            />
          </div>
        ))}
      </PwaCard>

      <PwaCard title="Completed Events">
        {events.filter((e) => e.status === 'Completed').length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Founders Dinner is in progress and will appear here after close-out.</p>
        ) : (
          events.filter((e) => e.status === 'Completed').map((e) => (
            <div key={e.id} className="py-2 text-xs">
              <p className="font-bold text-foreground">{e.name}</p>
              <p className="text-muted-foreground">{dateLabel(e.date)} • Completed</p>
            </div>
          ))
        )}
      </PwaCard>
    </div>
  )
}

function Account({
  name,
  email,
  requests,
  onRequest,
  onLogout,
}: {
  name: string
  email: string
  requests: CrewRequest[]
  onRequest: () => void
  onLogout: () => void
}) {
  const [incidentOpen, setIncidentOpen] = useState(false)
  const [message, setMessage] = useState('')

  return (
    <div className="space-y-4">
      <PwaCard title={name} subtitle={email} action={<PwaBadge subRole="Field" label="Active Operator" />}>
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h4 className="font-serif text-sm font-bold text-foreground">Leave & Admin Requests</h4>
            <PwaButton onClick={onRequest} variant="primary" size="sm">
              New Request
            </PwaButton>
          </div>

          <div className="divide-y divide-border/60">
            {requests.slice(0, 3).map((req) => (
              <div key={req.id} className="flex items-center justify-between py-2 text-xs">
                <span>{req.type} ({dateLabel(req.date)})</span>
                <PwaBadge
                  variant={req.status === 'Approved' ? 'subrole' : req.status === 'Denied' ? 'destructive' : 'neutral'}
                  label={req.status}
                />
              </div>
            ))}
          </div>
        </div>
      </PwaCard>

      <PwaCard title="Operator Actions">
        <div className="space-y-2">
          <PwaButton onClick={() => setIncidentOpen(true)} variant="outline" size="md" className="w-full">
            Incident Report
          </PwaButton>
          {message && <p className="text-xs text-primary font-medium text-center">{message}</p>}
          <PwaButton onClick={onLogout} variant="destructive" size="md" className="w-full">
            Sign Out
          </PwaButton>
        </div>
      </PwaCard>

      {incidentOpen && (
        <PwaModal
          isOpen={incidentOpen}
          onClose={() => setIncidentOpen(false)}
          title="Submit Incident Report"
          subtitle="File emergency or operational incident"
        >
          <IncidentForm onClose={() => setIncidentOpen(false)} onSubmitted={setMessage} />
        </PwaModal>
      )}
    </div>
  )
}

function RequestForm({
  type,
  setType,
  date,
  setDate,
  note,
  setNote,
  onSubmit,
}: {
  type: string
  setType: (val: string) => void
  date: string
  setDate: (val: string) => void
  note: string
  setNote: (val: string) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-xs font-semibold text-foreground">
        Request Type
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option>Sick leave</option>
          <option>Personal leave</option>
          <option>Schedule request</option>
          <option>Other request</option>
        </select>
      </label>

      <label className="block text-xs font-semibold text-foreground">
        Target Date
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      <label className="block text-xs font-semibold text-foreground">
        Details
        <textarea
          required
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Specify details for admin review..."
          className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      <PwaButton type="submit" variant="primary" size="md" icon={<Send className="size-4" />} className="w-full">
        Send Request
      </PwaButton>
    </form>
  )
}
