import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertTriangle, Bell, CalendarDays, Camera, Check, ChevronLeft, ChevronRight, ClipboardList, FileText, Lock, MapPin, MessageSquare, PackageCheck, Send, ShieldCheck, UserCircle2, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { usePortal } from '@/lib/store'
import { markBatchStalled, resolveBatchStall, useDispatchStore } from '@/lib/warehouse-dispatch'
import type { DispatchBatch } from '@/lib/event-detail'
import { IncidentForm } from '@/components/PwaWorkflows'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ErrorFallback } from '@/components/ErrorFallback'
import { decideGroundCrewDeclaration, getApproachingDeclarationsSummary, getDeclarationAging, submitGroundCrewDeclaration, useGroundCrewDeclarations, type GroundCrewDeclaration } from '@/lib/ground-crew-declarations'

type Tab = 'home' | 'tasks' | 'calendar' | 'activity' | 'account'
type AccessLevel = 'Ground Crew / Member' | 'Team Lead / Field Lead' | 'Receiver' | 'Event Admin'
type Phase = 'Egress' | 'On Venue' | 'Ingress'
type EventStatus = 'Current' | 'Upcoming' | 'Completed'
type RequestStatus = 'Pending' | 'Approved' | 'Denied'

interface EventItem { id: string; name: string; date: string; venue: string; status: EventStatus; editable: boolean; phase: Phase; items: { id: string; name: string; sku: string; qty: number; color: string }[] }
interface DamageReport { id: string; event: string; item: string; phase: Phase; quantity: number; description: string; photo: string; capturedAt: string; location: string }
interface CrewRequest { id: string; type: string; date: string; note: string; status: RequestStatus }

// Event phase is driven by warehouse confirmation, not by the ground crew —
// Solstice Motors Reveal already cleared egress, so it opens on the
// active "On Venue" reporting checkpoint.
const SEED_REPORTS: DamageReport[] = [{ id: 'r1', event: 'Solstice Motors Electric SUV Reveal', item: 'Gold Chiavari Chairs', phase: 'On Venue', quantity: 2, description: 'Light scratches on back rail', photo: '', capturedAt: 'Sep 16, 2026 · 09:42', location: 'The Peninsula Manila' }]
const SEED_REQUESTS: CrewRequest[] = [{ id: 'q1', type: 'Personal leave', date: '2026-09-22', note: 'Family commitment', status: 'Approved' }, { id: 'q2', type: 'Schedule request', date: '2026-09-28', note: 'Request earlier call time', status: 'Pending' }]

function dateLabel(date: string) { return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) }

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
      : effectiveRole === 'Warehouse Lead' || effectiveRole === 'Field & Production Crew'
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
      phase: idx === 0 ? 'On Venue' : 'Egress',
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
  const [egressError, setEgressError] = useState('')
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestType, setRequestType] = useState('Sick leave')
  const [requestDate, setRequestDate] = useState('2026-08-30')
  const [requestNote, setRequestNote] = useState('')

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 5000) }
  const openReport = (item: EventItem['items'][number]) => { setReportItem(item); setShowReport(true) }
  const submitReport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!reportItem || !selectedEvent) return
    const data = new FormData(event.currentTarget)
    const condition = String(data.get('condition') || 'Damaged')
    const photoCaptured = data.get('photoCaptured') === '1'
    const quantity = Number(data.get('quantity'))
    if (!quantity || quantity < 1) return notify('Enter the affected quantity.')
    if (condition === 'Damaged' && !photoCaptured) return notify('A photo is required for damaged items.')
    const save = (location: string) => {
      const description = String(data.get('description') || '')
      submitGroundCrewDeclaration({ eventId: selectedEvent.id, eventName: selectedEvent.name, item: reportItem.name, condition: condition as 'Damaged' | 'Missing', quantity, description, submittedBy: adminName || 'Ground Crew Member', submittedRole: accessLevel === 'Event Admin' ? 'Field Lead' : accessLevel === 'Ground Crew / Member' ? 'Member' : 'Team Lead', submittedAt: new Date().toISOString(), demoLabel: undefined })
      setReports((current) => [{ id: `r-${Date.now()}`, event: selectedEvent.name, item: reportItem.name, phase: selectedEvent.phase, quantity, description, photo: photoCaptured ? 'photo-capture.jpg' : '', capturedAt: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }), location }, ...current])
      setShowReport(false)
      notify(typeof navigator !== 'undefined' && navigator.onLine ? 'Validation report submitted for Event Admin confirmation.' : 'Offline mode: Report saved locally. Will sync when back online.')
    }
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition((position) => save(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`), () => save('GPS unavailable'))
    else save('GPS unavailable')
  }
  const submitRequest = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setRequests((current) => [{ id: `q-${Date.now()}`, type: requestType, date: requestDate, note: requestNote, status: 'Pending' }, ...current]); setRequestOpen(false); setRequestNote(''); notify('Request sent to admin for review.') }
  const setHandoffNote = (eventId: string, value: string) => { setHandoffNotes((current) => ({ ...current, [eventId]: value })); if (egressError) setEgressError('') }
  const startEgress = (eventId: string) => {
    const note = (handoffNotes[eventId] ?? '').trim()
    if (!note) { setEgressError('Add a handoff note before starting Egress.'); return }
    setEgressError('')
    setCrewEvents((current) => current.map((event) => (event.id === eventId ? { ...event, phase: 'On Venue' } : event)))
    notify('Egress started — advanced to On Venue.')
  }

  const [isLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  return <div className="mobile-shell admin-fade">
    <header className="app-header">
      <div>
        <p className="eyebrow flex items-center gap-1.5">
          <span>Lumière Operations</span>
        </p>
        <div className="brand-mark">GROUND CREW</div>
      </div>
      <button className="avatar" onClick={() => setTab('account')} aria-label="Open account">{(adminName || 'GC').slice(0, 2).toUpperCase()}</button>
    </header>
    <main className="app-main">
      {isError ? (
        <ErrorFallback title="Ground Crew Console Unavailable" message="Could not load assigned events or checkpoint task list." onRetry={() => setIsError(false)} />
      ) : isLoading ? (
        <LoadingSkeleton variant="cards" />
      ) : (
        <>
          {tab === 'tasks' && <DecisionMode declarations={declarations} accessLevel={accessLevel} adminEventId={adminEventId} events={crewEvents} onEventChange={setAdminEventId} onDecision={(id, decision) => { decideGroundCrewDeclaration(id, decision, adminName || 'Event Admin'); notify(`Declaration ${decision.toLowerCase()}.`) }} />}
          {tab === 'home' && (selectedEvent ? <EventDetail event={selectedEvent} batches={dispatchStore.get(selectedEvent.id) ?? []} handoffNote={handoffNotes[selectedEvent.id] ?? ''} onHandoffNoteChange={(value) => setHandoffNote(selectedEvent.id, value)} egressError={egressError} onStartEgress={() => startEgress(selectedEvent.id)} onBack={() => { setSelectedEventId(null); setEgressError('') }} onReport={openReport} onStall={(batchId, reason) => { markBatchStalled(selectedEvent.id, batchId, reason); notify('Batch marked Stalled In Transit.') }} onResume={(batchId) => { resolveBatchStall(selectedEvent.id, batchId); notify('Transit resumed.') }} /> : <Home events={crewEvents} onOpen={(event) => setSelectedEventId(event.id)} approachingSummary={accessLevel === 'Event Admin' ? getApproachingDeclarationsSummary() : null} />)}
          {tab === 'calendar' && <CalendarView selectedDate={selectedDate} setSelectedDate={setSelectedDate} notes={notes} setNotes={setNotes} onSave={() => notify('Personal note saved.')} events={crewEvents} />}
          {tab === 'activity' && <Activity reports={reports} requests={requests} events={crewEvents} />}
          {tab === 'account' && <Account name={adminName || 'Ground Crew'} email={adminEmail || 'crew@lumiere.com'} requests={requests} onRequest={() => setRequestOpen(true)} onLogout={logout} />}
        </>
      )}
    </main>
    <nav className="bottom-nav" aria-label="Crew navigation">{([['home', 'Home', ClipboardList], ['tasks', 'Tasks', ShieldCheck], ['calendar', 'Calendar', CalendarDays], ['activity', 'Activity', FileText], ['account', 'Account', UserCircle2]] as const).map(([key, label, Icon]) => <button key={key} onClick={() => { setTab(key); setSelectedEventId(null); setEgressError('') }} className={tab === key ? 'active' : ''}><Icon className="size-5" /><span>{label}</span></button>)}</nav>
    {toast && <div className="fixed bottom-24 left-1/2 z-40 w-[calc(100%-32px)] max-w-[528px] -translate-x-1/2 rounded-md bg-primary px-4 py-3 text-center text-sm text-primary-foreground shadow-lg">{toast}</div>}
    {showReport && reportItem && selectedEvent && <DamageForm item={reportItem} event={selectedEvent.name} phase={selectedEvent.phase} onClose={() => setShowReport(false)} onSubmit={submitReport} />}
    {requestOpen && <RequestForm type={requestType} setType={setRequestType} date={requestDate} setDate={setRequestDate} note={requestNote} setNote={setRequestNote} onClose={() => setRequestOpen(false)} onSubmit={submitRequest} />}
  </div>
}

function DecisionMode({ declarations, accessLevel, adminEventId, events, onEventChange, onDecision }: { declarations: GroundCrewDeclaration[]; accessLevel: AccessLevel; adminEventId: string; events: EventItem[]; onEventChange: (value: string) => void; onDecision: (id: string, decision: 'Confirmed' | 'Rejected') => void }) {
  const [now, setNow] = useState(() => Date.now())
  const assigned = declarations.filter((declaration) => declaration.eventId === adminEventId && declaration.status === 'Pending Event Admin')
  const approachingForEvent = assigned.filter((declaration) => getDeclarationAging(declaration.submittedAt, now).approaching)
  useEffect(() => { if (accessLevel !== 'Event Admin') return; const id = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(id) }, [accessLevel])
  return (
    <div className="space-y-5">
      <header>
        <p className="eyebrow">Tasks · Decision mode</p>
        <h1 className="mt-2 text-3xl font-serif">Confirmation authority</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Review Team Lead / Field Lead condition and damage declarations before they become committed records.
        </p>
      </header>

      {/* Read-Only Assigned Access Level Card — Set strictly by Manning / Admin */}
      <section className="paper-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Assigned Role &amp; Access Tier</p>
            <h2 className="mt-1 font-serif text-lg font-medium">{accessLevel}</h2>
          </div>
          <span className="status status-approved">
            Assigned by Manning / Admin
          </span>
        </div>
        {accessLevel === 'Event Admin' ? (
          <label className="field-label mt-2">
            Assigned event
            <select value={adminEventId} onChange={(event) => onEventChange(event.target.value)} className="field-input mt-1">
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} · {event.id}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Event Admin authority is scoped to this event. Unhandled declarations escalate to Manning after 48 hours.
            </p>
          </label>
        ) : (
          <p className="text-xs leading-5 text-muted-foreground">
            Role tier is assigned through Workforce Management &amp; Manning. Ground crew accounts cannot self-modify access privileges.
          </p>
        )}
      </section>

      {accessLevel === 'Ground Crew / Member' ? (
        <section className="paper-card">
          <p className="eyebrow">Base access</p>
          <h2 className="mt-1 font-serif text-xl">Ground Crew / Member</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            You can submit condition and damage declarations. Checkpoint reporting, receipt, and confirmation authority are assigned to elevated roles by Manning.
          </p>
        </section>
      ) : accessLevel !== 'Event Admin' ? (
        <section className="paper-card">
          <p className="eyebrow">Checkpoint privileges</p>
          <h2 className="mt-1 font-serif text-xl">{accessLevel}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            You retain checkpoint reporting and receipt privileges as a {accessLevel.toLowerCase()}. Event Admin confirmation authority is managed separately in Manning.
          </p>
        </section>
      ) : (
        <section className="space-y-3">
          <div className="section-heading">
            <h2>Pending declarations · {assigned.length}</h2>
            <ShieldCheck className="size-5 text-primary" />
          </div>

          {approachingForEvent.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50/80 p-3 text-xs text-amber-900 shadow-sm dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200" role="alert">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
                <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400" />
                48-Hour Escalation Warning
              </div>
              <p className="mt-1 leading-relaxed">
                {approachingForEvent.length === 1
                  ? '1 unconfirmed declaration is within 12 hours of the 48-hour safety cutoff. Unresolved items will auto-escalate to Manning Daily Review.'
                  : `${approachingForEvent.length} unconfirmed declarations are within 12 hours of the 48-hour safety cutoff. Unresolved items will auto-escalate to Manning Daily Review.`}
              </p>
            </div>
          )}

          {assigned.length === 0 ? (
            <div className="paper-card text-sm text-muted-foreground">No unconfirmed reports for this event.</div>
          ) : (
            assigned.map((declaration) => (
              <article key={declaration.id} className="paper-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">{declaration.condition} · {declaration.item}</p>
                    <h3 className="mt-1 font-serif text-lg">{declaration.eventName}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {declaration.quantity} affected · submitted by {declaration.submittedBy} ({declaration.submittedRole})
                    </p>
                  </div>
                  <span className={`status ${getDeclarationAging(declaration.submittedAt, now).approaching ? 'status-in-progress' : 'status-submitted'}`}>
                    Pending {getDeclarationAging(declaration.submittedAt, now).elapsedHours}h
                    {getDeclarationAging(declaration.submittedAt, now).approaching ? ' · approaching' : ''}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6">{declaration.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Submitted {new Date(declaration.submittedAt).toLocaleString()} · 48-hour safety fallback applies
                </p>
                <div className="mt-4 flex gap-2">
                  <button className="button-primary" onClick={() => onDecision(declaration.id, 'Confirmed')}>
                    Confirm declaration
                  </button>
                  <button className="button-secondary" onClick={() => onDecision(declaration.id, 'Rejected')}>
                    Reject
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
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
  const [activeNotif, setActiveNotif] = useState<{ id: string; label: string; detail: string; category?: string; date?: string; venue?: string } | null>(null)

  const notificationsList = useMemo(() => {
    const list = []
    if (approachingSummary && approachingSummary.totalApproaching > 0) {
      list.push({
        id: 'rem-sla',
        label: 'Escalation Alert',
        detail: `${approachingSummary.totalApproaching} pending declaration${
          approachingSummary.totalApproaching > 1 ? 's are' : ' is'
        } approaching the 48-hour deadline across ${approachingSummary.eventsCount} event${
          approachingSummary.eventsCount > 1 ? 's' : ''
        }. Review in Tasks tab.`,
        category: 'SLA Escalation',
        venue: 'All Active Venues',
      })
    }
    if (events && events.length > 0) {
      events.slice(0, 3).forEach((ev, i) => {
        list.push({
          id: `ev-notif-${ev.id || i}`,
          label: 'Assignment',
          detail: `Assigned to ${ev.name} (${ev.venue || 'Depot'}) · Target Date: ${ev.date}`,
          category: 'Event Dispatch',
          venue: ev.venue || 'Depot',
        })
      })
    }
    return list
  }, [events, approachingSummary])

  return (
    <div className="space-y-6">
      <section className="paper-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            <p className="eyebrow">Notifications &amp; Field Announcements</p>
          </div>
          {notificationsList.length > 0 && <span className="text-xs font-semibold text-primary">Click notification for details →</span>}
        </div>
        <div className="mt-3 space-y-2 text-sm">
          {notificationsList.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 italic">No shift briefings assigned.</p>
          ) : (
            notificationsList.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveNotif(item)}
                className="flex w-full items-center justify-between p-2 rounded-lg text-left transition-colors hover:bg-secondary/60 cursor-pointer"
              >
                <div>
                  <strong className="text-foreground">{item.label}:</strong> <span className="text-muted-foreground">{item.detail}</span>
                </div>
                <span className="text-xs font-medium text-primary shrink-0 ml-2">Open →</span>
              </button>
            ))
          )}
        </div>
      </section>

      {activeNotif && (
        <div className="sheet-backdrop" onClick={() => setActiveNotif(null)}>
          <div className="sheet space-y-4 max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <p className="eyebrow text-primary">Ground Crew Field Briefing</p>
                <h2 className="mt-1 font-serif text-2xl">{activeNotif.label}</h2>
              </div>
              <button type="button" onClick={() => setActiveNotif(null)} className="icon-button" aria-label="Close modal">
                <X className="size-5" />
              </button>
            </div>

            <div className="paper-card space-y-3 bg-secondary/30">
              <p className="text-sm font-medium">{activeNotif.detail}</p>
              <div className="grid grid-cols-2 gap-2 text-xs border-t border-border pt-3">
                <div>
                  <p className="text-muted-foreground">Source Type</p>
                  <p className="font-semibold mt-0.5">{activeNotif.category || 'Field Dispatch'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Location / Venue</p>
                  <p className="font-semibold mt-0.5">{activeNotif.venue || 'Assigned Event'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Assigned Shift</p>
                  <p className="font-semibold mt-0.5">Ground Crew Tier A</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Required Gear</p>
                  <p className="font-semibold mt-0.5 text-primary">Handset &amp; Vest</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border p-3 text-xs space-y-1">
              <p className="font-bold uppercase tracking-wider text-muted-foreground">Broadcast Details</p>
              <p>• Verification timestamp logged with Dispatch Store.</p>
              <p>• Mandatory safety protocol applies to all field members.</p>
              <p>• Contact Manning Officer if shift conflicts occur.</p>
            </div>

            <div className="pt-2 border-t border-border flex justify-end gap-2">
              <button type="button" onClick={() => setActiveNotif(null)} className="button-secondary text-xs">
                Acknowledge &amp; Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
      <header>
        <p className="eyebrow">Assigned events</p>
        <h1 className="mt-2 text-3xl font-serif">Your event list</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Select an event to view the item list and venue validations.</p>
      </header>
      <div className="space-y-3">
        {events.map((event) => (
          <button
            key={event.id}
            onClick={() => onOpen(event)}
            className="paper-card w-full text-left transition-transform active:scale-[.99]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">{dateLabel(event.date)}</p>
                <h2 className="mt-2 font-serif text-xl">{event.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{event.venue}</p>
              </div>
              <span
                className={`status ${
                  event.status === 'Current'
                    ? 'status-in-progress'
                    : event.status === 'Completed'
                      ? 'status-approved'
                      : ''
                }`}
              >
                {event.status}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
              <span>
                {event.items.length} item groups · {event.id}
              </span>
              <span className="font-semibold text-primary">
                {event.editable ? 'Open workspace →' : 'View details →'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// Non-interactive progress map — the phase order is set by the warehouse's
// egress confirmation, never by tapping here.
function PhaseMap({ phase }: { phase: Phase }) {
  const order: Phase[] = ['Egress', 'On Venue', 'Ingress']
  const activeIndex = order.indexOf(phase)
  return (
    <div className="grid grid-cols-3 gap-2" role="img" aria-label={`Event progress: ${phase} is the active checkpoint`}>
      {order.map((item, index) => {
        const state = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending'
        return (
          <div key={item} className={`rounded border px-2 py-3 text-center text-xs font-bold uppercase tracking-wide ${state === 'active' ? 'border-primary bg-primary text-primary-foreground' : state === 'done' ? 'border-primary/40 bg-secondary/60 text-foreground' : 'border-border bg-card text-muted-foreground'}`}>
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

function EventDetail({ event, batches, handoffNote, onHandoffNoteChange, egressError, onStartEgress, onBack, onReport, onStall, onResume }: { event: EventItem; batches: DispatchBatch[]; handoffNote: string; onHandoffNoteChange: (value: string) => void; egressError: string; onStartEgress: () => void; onBack: () => void; onReport: (item: EventItem['items'][number]) => void; onStall: (batchId: string, reason: string) => void; onResume: (batchId: string) => void }) {
  const { phase } = event
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="button-secondary"><ChevronLeft className="size-4" /> All events</button>
      <header><p className="eyebrow">{dateLabel(event.date)} · {event.id}</p><h1 className="mt-2 text-3xl font-serif">{event.name}</h1><p className="mt-1 text-sm text-muted-foreground">{event.venue}</p></header>

      <PhaseMap phase={phase} />

      <section className="paper-card space-y-4">
        <div><p className="eyebrow">Chain of custody</p><h2 className="mt-1 font-serif text-xl">Transit checkpoints</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Mark the executing batch stalled if transit is interrupted. The underlying checkpoint is preserved.</p></div>
        {batches.length === 0 ? <p className="text-sm text-muted-foreground">No dispatch batch is assigned to this event yet.</p> : batches.map((batch) => <StallControl key={batch.id} batch={batch} onStall={onStall} onResume={onResume} />)}
      </section>

      {phase === 'Egress' && (
        <section className="paper-card space-y-4">
          <div><p className="eyebrow">Egress checklist</p><h2 className="mt-1 font-serif text-xl">Item validation</h2></div>
          <p className="flex items-start gap-2 text-sm leading-6 text-muted-foreground"><PackageCheck className="mt-0.5 size-4 shrink-0 text-primary" /> The warehouse crew confirms every item is packed and truck-ready.</p>
          <div className="space-y-2">{event.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 border-t border-border py-3"><div className="min-w-0"><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.sku} · {item.qty} units · {item.color}</p></div><span className="status status-submitted shrink-0">Awaiting warehouse</span></div>)}</div>
          <div className="border-t border-border pt-4">
            <label className="field-label" htmlFor={`handoff-${event.id}`}>Field Lead handoff note<span className="text-destructive"> *</span>
              <textarea id={`handoff-${event.id}`} value={handoffNote} onChange={(e) => onHandoffNoteChange(e.target.value)} rows={3} placeholder="Where are damaged items placed? (prevents duplicate reporting on arrival)" className="field-input" />
            </label>
            {egressError && <p className="mt-1 text-sm text-destructive">{egressError}</p>}
            <button type="button" onClick={onStartEgress} className="button-primary mt-3 w-full"><ChevronRight className="size-4" /> Start Egress</button>
          </div>
        </section>
      )}

      {phase === 'On Venue' && (
        <section className="paper-card">
          <div><p className="eyebrow">On venue checklist</p><h2 className="mt-1 font-serif text-xl">Item validation</h2></div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Review each item group. Report damage or missing quantities before closing the checkpoint.</p>
          <div className="mt-4 space-y-2">{event.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 border-t border-border py-3"><div className="min-w-0"><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.sku} · {item.qty} units · {item.color}</p></div><button onClick={() => onReport(item)} className="button-secondary shrink-0"><Camera className="size-4" /> Report</button></div>)}</div>
        </section>
      )}

      {phase === 'Ingress' && (
        <section className="paper-card">
          <div><p className="eyebrow">Ingress checklist</p><h2 className="mt-1 font-serif text-xl">Item validation</h2></div>
          <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-muted-foreground"><Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> This checkpoint opens once the on-venue validation closes.</p>
          <div className="mt-4 space-y-2 opacity-60">{event.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 border-t border-border py-3"><div className="min-w-0"><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.sku} · {item.qty} units · {item.color}</p></div><span className="status">Locked</span></div>)}</div>
        </section>
      )}
    </div>
  )
}

function StallControl({ batch, onStall, onResume }: { batch: DispatchBatch; onStall: (batchId: string, reason: string) => void; onResume: (batchId: string) => void }) {
  const [reason, setReason] = useState('')
  const [open, setOpen] = useState(false)
  const submit = () => { const value = reason.trim(); if (!value) return; onStall(batch.id, value); setReason(''); setOpen(false) }
  return <div className={`rounded-lg border p-3.5 transition-colors ${batch.stalled ? 'border-amber-300 bg-amber-50/80 dark:border-amber-700/60 dark:bg-amber-950/40' : 'border-border bg-secondary/30'}`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-medium">{batch.vehicleType}</p>
        <p className="text-xs text-muted-foreground">{batch.plateNumber} · {batch.stage}</p>
      </div>
      {batch.stalled ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-900 shadow-sm dark:border-amber-700/60 dark:bg-amber-900/50 dark:text-amber-200">
          <AlertTriangle className="size-3 text-amber-600 dark:text-amber-400" />
          Stalled In Transit
        </span>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="button-secondary text-xs">
          Interrupt / Report Breakdown
        </button>
      )}
    </div>
    {batch.stalled && (
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-amber-200/60 pt-2.5 text-sm dark:border-amber-800/40">
        <p className="text-xs font-medium text-amber-950 dark:text-amber-200">{batch.stalledReason}</p>
        <button type="button" onClick={() => onResume(batch.id)} className="button-secondary shrink-0 text-xs">
          Resume transit
        </button>
      </div>
    )}
    {open && (
      <div className="mt-3 space-y-2 border-t border-border pt-3">
        <label className="field-label" htmlFor={`stall-${batch.id}`}>
          Breakdown reason / Disruption notes <span className="text-destructive">*</span>
          <textarea
            id={`stall-${batch.id}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            placeholder="Breakdown, road closure, tire puncture, or other interruption…"
            className="field-input mt-1"
          />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="button-secondary text-xs">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={!reason.trim()} className="button-primary text-xs disabled:opacity-50">
            Confirm stall
          </button>
        </div>
      </div>
    )}
  </div>
}

// Mock in-app camera. Real crew devices would open the native camera via a
// capture-enabled input, but for this demo we simulate the viewfinder and
// shutter so the flow can be tested without device camera access.
function CameraCapture({ onClose, onCapture }: { onClose: () => void; onCapture: () => void }) {
  const [flash, setFlash] = useState(false)
  const shoot = () => {
    setFlash(true)
    window.setTimeout(() => { setFlash(false); onCapture() }, 260)
  }
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {flash && <div className="absolute inset-0 z-10 bg-white" />}
      <div className="flex items-center justify-between px-4 py-4"><button type="button" onClick={onClose} className="rounded-full bg-white/10 p-2 text-white" aria-label="Close camera"><X className="size-5" /></button><p className="text-sm font-medium text-white/80">Photo proof</p><span className="w-9" /></div>
      <div className="relative mx-4 flex flex-1 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-neutral-900">
        <div className="absolute inset-6 rounded-xl border border-dashed border-white/25" />
        <Camera className="size-14 text-white/25" />
        <p className="absolute bottom-5 text-xs text-white/40">Point at the item and tap the shutter</p>
      </div>
      <div className="flex items-center justify-center py-8">
        <button type="button" onClick={shoot} aria-label="Capture photo" className="flex size-20 items-center justify-center rounded-full border-4 border-white/70 p-1"><span className="size-full rounded-full bg-white" /></button>
      </div>
    </div>
  )
}

function DamageForm({ item, event, phase, onClose, onSubmit }: { item: EventItem['items'][number]; event: string; phase: Phase; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const [condition, setCondition] = useState<'Damaged' | 'Missing'>('Damaged')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [photoCount, setPhotoCount] = useState<number>(0)
  const photoRequired = condition === 'Damaged'
  return (
    <div className="sheet-backdrop">
      <form className="sheet space-y-4" onSubmit={onSubmit}>
        <div className="flex items-start justify-between">
          <div><p className="eyebrow">{phase} validation</p><h2 className="mt-1 font-serif text-2xl">Report an issue</h2><p className="mt-1 text-sm text-muted-foreground">{item.name} · {event}</p></div>
          <button type="button" onClick={onClose} className="icon-button" aria-label="Close"><X className="size-4" /></button>
        </div>
        <label className="field-label">Condition
          <select name="condition" value={condition} onChange={(e) => { setCondition(e.target.value as 'Damaged' | 'Missing'); setPhotoCount(0) }} className="field-input">
            <option>Damaged</option>
            <option>Missing</option>
          </select>
        </label>
        <input type="hidden" name="photoCaptured" value={photoCount > 0 ? '1' : ''} />
        <div className="field-label">
          <span>{photoRequired ? 'Photos required for damaged items (multiple allowed)' : 'Photos (optional for missing items)'}</span>
          {photoCount > 0 ? (
            <div className="mt-1 flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/40 p-3">
              <div className="flex items-center gap-2 text-sm"><span className="flex size-9 items-center justify-center rounded bg-foreground text-background font-bold text-xs">{photoCount}</span> {photoCount === 1 ? '1 Photo attached' : `${photoCount} Photos attached`}</div>
              <button type="button" onClick={() => setCameraOpen(true)} className="text-xs font-semibold text-primary underline-offset-2 hover:underline">+ Add another photo</button>
            </div>
          ) : (
            <button type="button" onClick={() => setCameraOpen(true)} className="button-secondary mt-1 w-full"><Camera className="size-4" /> Open camera to capture photo</button>
          )}
        </div>
        {photoRequired && photoCount === 0 && (
          <p className="-mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Camera className="size-3.5" /> Use the built-in camera to capture photo evidence of the damage.</p>
        )}
        <label className="field-label">Number affected<input name="quantity" type="number" min="1" defaultValue="1" className="field-input" /></label>
        <label className="field-label">Damage or description<textarea name="description" required rows={3} placeholder="Describe the damage, missing count, or notes..." className="field-input" /></label>
        <div className="rounded border border-border bg-secondary/40 p-3 text-xs leading-5 text-muted-foreground"><MapPin className="mr-1 inline size-3" /> Timestamp and GPS location are captured automatically when you submit.</div>
        <button className="button-primary w-full" type="submit"><Send className="size-4" /> Submit validation</button>
      </form>
      {cameraOpen && <CameraCapture onClose={() => setCameraOpen(false)} onCapture={() => { setPhotoCount((prev) => prev + 1); setCameraOpen(false) }} />}
    </div>
  )
}

// Shared month-grid look for every crew/lead/member calendar: a filled dot
// marks a day with a scheduled item (meeting, call time, deadline), a hollow
// dot marks a day with a saved personal note. Both can show on the same day.
function DayDots({ hasSchedule, hasNote }: { hasSchedule: boolean; hasNote: boolean }) {
  if (!hasSchedule && !hasNote) return <span className="mt-1 block h-1.5" />
  return (
    <span className="mt-1 flex items-center justify-center gap-1">
      {hasSchedule && <span className="size-1.5 rounded-full bg-primary" />}
      {hasNote && <span className="size-1.5 rounded-full border border-current" />}
    </span>
  )
}

function CalendarView({ selectedDate, setSelectedDate, notes, setNotes, onSave, events }: { selectedDate: string; setSelectedDate: (date: string) => void; notes: Record<string, string>; setNotes: (updater: (current: Record<string, string>) => Record<string, string>) => void; onSave: () => void; events: EventItem[] }) {
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const entries = events.filter((item) => item.date === selectedDate)
  const noteValue = notes[selectedDate] ?? ''
  return (
    <div className="space-y-5">
      <header><p className="eyebrow">Schedule & personal notes</p><h1 className="mt-2 text-3xl font-serif">Calendar</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Tap a day to see call sheets, meetings, and event assignments.</p></header>
      <section className="paper-card">
        <div className="flex items-center justify-between"><button className="icon-button" onClick={() => setSelectedDate('2026-08-01')} aria-label="Previous month"><ChevronLeft className="size-4" /></button><h2 className="font-serif text-xl">August 2026</h2><button className="icon-button" onClick={() => setSelectedDate('2026-08-31')} aria-label="Next month"><ChevronRight className="size-4" /></button></div>
        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs"><div className="col-span-7 grid grid-cols-7 text-muted-foreground">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={`${d}-${i}`}>{d}</span>)}</div><span /><span /><span /><span /><span /><span /><span />{days.map((day) => { const date = `2026-08-${String(day).padStart(2, '0')}`; const hasSchedule = events.some((item) => item.date === date); const hasNote = Boolean(notes[date]); return <button key={date} onClick={() => setSelectedDate(date)} className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center rounded p-1 ${date === selectedDate ? 'bg-primary text-primary-foreground' : hasSchedule ? 'font-bold text-primary' : ''}`}><span className="block text-xs">{day}</span><DayDots hasSchedule={hasSchedule} hasNote={hasNote} /></button> })}</div>
      </section>

      <section className="space-y-3">
        <div className="section-heading"><h2>Schedule for {dateLabel(selectedDate)}</h2><CalendarDays className="size-5 text-primary" /></div>
        {entries.length ? entries.map((entry) => <div key={entry.id} className="paper-card"><p className="eyebrow">{entry.phase}</p><p className="mt-1 font-medium">{entry.name}</p><p className="mt-1 text-sm text-muted-foreground">{entry.venue}</p></div>) : <div className="paper-card text-sm text-muted-foreground">No shift briefings assigned.</div>}
        <div className="paper-card">
          <label className="field-label mt-0">Personal note for {dateLabel(selectedDate)}<textarea value={noteValue} onChange={(event) => setNotes((current) => ({ ...current, [selectedDate]: event.target.value }))} rows={3} placeholder="Add a reminder for yourself..." className="field-input" /></label>
          <button onClick={onSave} className="button-primary mt-4"><MessageSquare className="size-4" /> Save note</button>
        </div>
      </section>
    </div>
  )
}

function Activity({ reports, requests, events }: { reports: DamageReport[]; requests: CrewRequest[]; events: EventItem[] }) { return <div className="space-y-5"><header><p className="eyebrow">Your record</p><h1 className="mt-2 text-3xl font-serif">Activity</h1><p className="mt-2 text-sm text-muted-foreground">Reports, requests, and completed event history.</p></header><section className="space-y-3"><h2 className="font-serif text-xl">Validation reports</h2>{reports.map((report) => <div key={report.id} className="paper-card"><div className="flex justify-between gap-3"><div><p className="font-medium">{report.item}</p><p className="mt-1 text-sm text-muted-foreground">{report.event} · {report.phase}</p></div><span className="status status-submitted">Submitted</span></div><p className="mt-3 text-sm">{report.quantity} affected · {report.description}</p><p className="mt-2 text-xs text-muted-foreground">{report.capturedAt} · {report.location}</p></div>)}</section><section className="space-y-3"><h2 className="font-serif text-xl">Requests</h2>{requests.map((request) => <div key={request.id} className="paper-card flex items-center justify-between gap-3"><div><p className="font-medium">{request.type}</p><p className="text-sm text-muted-foreground">{dateLabel(request.date)} · {request.note}</p></div><span className={`status ${request.status === 'Approved' ? 'status-approved' : request.status === 'Denied' ? 'status-rejected' : 'status-submitted'}`}>{request.status}</span></div>)}</section><section className="space-y-3"><h2 className="font-serif text-xl">Events done</h2>{events.filter((event) => event.status === 'Completed').map((event) => <div key={event.id} className="paper-card"><p className="font-medium">{event.name}</p><p className="text-sm text-muted-foreground">{dateLabel(event.date)} · Completed</p></div>)}<div className="paper-card text-sm text-muted-foreground">Founders Dinner is in progress and will appear here after close-out.</div></section></div> }

function Account({ name, email, requests, onRequest, onLogout }: { name: string; email: string; requests: CrewRequest[]; onRequest: () => void; onLogout: () => void }) { const [incidentOpen, setIncidentOpen] = useState(false); const [message, setMessage] = useState(''); return <div className="space-y-5"><header><p className="eyebrow">Crew account</p><h1 className="mt-2 text-3xl font-serif">{name}</h1><p className="mt-1 text-sm text-muted-foreground">{email}</p></header><section className="paper-card"><div className="flex items-center justify-between"><div><p className="eyebrow">Leave & requests</p><p className="mt-1 text-sm text-muted-foreground">Submit a request and track its review status.</p></div><button className="button-primary" onClick={onRequest}>New request</button></div><div className="mt-4 space-y-2">{requests.slice(0, 3).map((request) => <div key={request.id} className="flex items-center justify-between border-t border-border pt-3 text-sm"><span>{request.type} · {dateLabel(request.date)}</span><span className={`status ${request.status === 'Approved' ? 'status-approved' : request.status === 'Denied' ? 'status-rejected' : 'status-submitted'}`}>{request.status}</span></div>)}</div></section><button className="button-secondary w-full" onClick={() => setIncidentOpen(true)}>Incident Report</button>{message && <p className="text-sm text-primary">{message}</p>}<button className="button-secondary w-full" onClick={onLogout}>Sign out</button>{incidentOpen && <IncidentForm onClose={() => setIncidentOpen(false)} onSubmitted={setMessage} />}</div> }

function RequestForm({ type, setType, date, setDate, note, setNote, onClose, onSubmit }: { type: string; setType: (value: string) => void; date: string; setDate: (value: string) => void; note: string; setNote: (value: string) => void; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) { return <div className="sheet-backdrop"><form className="sheet space-y-4" onSubmit={onSubmit}><div className="flex items-start justify-between"><div><p className="eyebrow">Admin request</p><h2 className="mt-1 font-serif text-2xl">Submit a request</h2></div><button type="button" onClick={onClose} className="icon-button" aria-label="Close"><X className="size-4" /></button></div><label className="field-label">Request type<select value={type} onChange={(event) => setType(event.target.value)} className="field-input"><option>Sick leave</option><option>Personal leave</option><option>Schedule request</option><option>Other request</option></select></label><label className="field-label">Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="field-input" /></label><label className="field-label">Details<textarea required value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="field-input" placeholder="Tell admin what you need..." /></label><button className="button-primary w-full" type="submit"><Send className="size-4" /> Send request</button></form></div> }
