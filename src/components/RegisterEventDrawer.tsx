import { useState, useEffect, useMemo } from 'react'
import { X, FileText, Building2, Palette, CalendarDays, Plus, AlertTriangle, Info } from 'lucide-react'
import { usePortal, checkEventConflicts, checkDateAdvisory } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { useNav } from '@/lib/nav'
import { cn } from '@/lib/utils'
import { EventCalendar } from '@/components/EventCalendar'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { NewEventDraft, PortalEvent } from '@/lib/types'

type DrawerMode = 'create' | 'view' | 'edit'

interface Props {
  open: boolean
  onClose: () => void
  // When provided, the drawer opens bound to an existing event.
  event?: PortalEvent | null
  // 'create' registers a new event, 'view' is read-only, 'edit' saves changes.
  mode?: DrawerMode
}

const baseVenues = [
  'Grand Ballroom at Lumière Estate',
  'Riverside Pavilion',
  'Urban Loft Space',
  'Garden Terrace',
]

// Convert "4:00 PM" or "16:00" format to HTML time input format "16:00"
function normalizeTimeFormat(time: string): string {
  if (!time) return ''
  // If already in HH:MM format, return as-is
  if (/^\d{1,2}:\d{2}$/.test(time)) return time
  // Convert "4:00 PM" or "4:00 AM" to "16:00" or "04:00"
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
  if (!match) return time
  let hours = parseInt(match[1], 10)
  const minutes = match[2]
  const meridiem = match[3]?.toUpperCase()
  if (meridiem === 'PM' && hours !== 12) hours += 12
  if (meridiem === 'AM' && hours === 12) hours = 0
  return `${String(hours).padStart(2, '0')}:${minutes}`
}

const ADD_VENUE = '__add_new_venue__'

const emptyDraft: NewEventDraft = {
  title: '',
  client: '',
  venue: '',
  targetDate: '',
  installationStart: '',
  installationEnd: '',
  moodPlan: '',
  geoClass: 'Local',
  ingressDate: '',
  ingressTime: '08:00',
  fullStop: '23:00',
}

const labelClass =
  'block text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground'
const inputClass =
  'mt-2 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-ring/30'

function SectionHeading({
  icon: Icon,
  children,
}: {
  icon: typeof FileText
  children: string
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border pb-2">
      <Icon className="size-3.5 text-primary" />
      <h3 className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-card-foreground">
        {children}
      </h3>
    </div>
  )
}

export function RegisterEventDrawer({ open, onClose, event = null, mode = 'create' }: Props) {
  const { addEvent, updateEvent, events, damageExceptions, settleEvent } = usePortal()
  const { adminRole } = useAuth()
  const { navigate } = useNav()
  const [draft, setDraft] = useState<NewEventDraft>(emptyDraft)
  const [showCalendar, setShowCalendar] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Custom venues added on the fly via the "+ Add New Venue" option.
  const [customVenues, setCustomVenues] = useState<string[]>([])
  const [addingVenue, setAddingVenue] = useState(false)
  const [newVenue, setNewVenue] = useState('')
  const [showValidation, setShowValidation] = useState(false)
  const [serverConflict, setServerConflict] = useState<{ message: string; conflictingEvents: any[] } | null>(null)

  const readOnly = mode === 'view'

  const blockingDamageItems = useMemo(() => {
    if (!event) return []
    return damageExceptions.filter((d) => {
      const matchesEvent =
        d.boundEvent === event.title ||
        d.boundEvent === event.refId ||
        d.boundEvent === event.id
      const isBlocking =
        d.status === 'Pending Verdict' ||
        d.status === 'Held for Audit' ||
        d.status === 'Pending Second Sign-off'
      return matchesEvent && isBlocking
    })
  }, [event, damageExceptions])

  // Sync the form with the bound event whenever the drawer opens (or the
  // target event changes). Create mode falls back to a blank draft.
  useEffect(() => {
    if (!open) return
    if (event) {
      setDraft({
        title: event.title,
        client: event.client,
        venue: event.venue,
        targetDate: event.targetDate,
        installationStart: normalizeTimeFormat(
          event.eventStart ||
            (!event.installationStart.includes('-') ? event.installationStart : '18:00'),
        ),
        installationEnd: normalizeTimeFormat(
          event.eventEnd ||
            (!event.installationEnd.includes('-') ? event.installationEnd : '23:00'),
        ),
        moodPlan: event.moodPlan ?? '',
        geoClass: event.geoClass ?? 'Local',
        ingressDate: event.ingressDate ?? event.targetDate,
        ingressTime: normalizeTimeFormat(event.ingressTime || '08:00'),
        fullStop: normalizeTimeFormat(event.fullStop || '23:30'),
      })
    } else {
      setDraft(emptyDraft)
    }
  }, [open, event])

  const venues = useMemo(() => {
    const list = new Set([...baseVenues, ...customVenues])
    if (draft.venue) list.add(draft.venue)
    if (event?.venue) list.add(event.venue)
    return Array.from(list)
  }, [customVenues, draft.venue, event?.venue])

  const set = (key: keyof NewEventDraft, value: string) => {
    if (readOnly) return
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const close = () => {
    setDraft(emptyDraft)
    setShowCalendar(false)
    setConfirmOpen(false)
    setAddingVenue(false)
    setNewVenue('')
    setShowValidation(false)
    onClose()
  }

  const conflicts = useMemo(
    () => checkEventConflicts(draft, events, mode === 'edit' ? event?.id : null),
    [draft, events, mode, event?.id],
  )
  const hasConflicts = conflicts.length > 0

  // Advisory date warnings (same day, different venue) — do NOT block, shown in confirm dialog
  const dateAdvisories = useMemo(
    () => checkDateAdvisory(draft, events, mode === 'edit' ? event?.id : null),
    [draft, events, mode, event?.id],
  )


  const todayIso = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])

  const isPastDate = useMemo(() => {
    if (!draft.targetDate) return false
    const clean = draft.targetDate.includes('T') ? draft.targetDate.split('T')[0] : draft.targetDate
    return clean < todayIso
  }, [draft.targetDate, todayIso])

  const submit = async (allowOverride = false) => {
    if (!draft.title.trim() || isPastDate) return
    try {
      if (mode === 'edit' && event) {
        updateEvent(event.id, draft, adminRole || 'Executive')
        close()
      } else {
        const res = await addEvent(draft, adminRole || 'Executive', allowOverride)
        if (res.conflict) {
          setServerConflict({
            message: res.message || 'Venue scheduling conflict detected.',
            conflictingEvents: res.conflictingEvents || [],
          })
        } else {
          setServerConflict(null)
          close()
        }
      }
    } catch (err: any) {
      console.error('[RegisterEventDrawer] Failed to save event:', err)
      close()
    }
  }

  const handleRequestOpen = () => {
    setShowValidation(true)
    if (!draft.title.trim() || isPastDate) return  // don't open confirm if required fields missing or past date
    setConfirmOpen(true)
  }

  const commitNewVenue = () => {
    const v = newVenue.trim()
    if (!v) {
      setAddingVenue(false)
      return
    }
    if (!venues.includes(v)) setCustomVenues((prev) => [...prev, v])
    set('venue', v)
    setNewVenue('')
    setAddingVenue(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      {/* Overlay */}
      <div className="fixed inset-0 bg-neutral-700/60 backdrop-blur-sm" onClick={close} />

      {/* Centered modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'create' ? 'Register new event' : 'Event details'}
        className="relative z-10 my-8 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-card shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {mode === 'create'
                ? 'Lumière · Planning — Initialization Mode'
                : mode === 'edit'
                  ? 'Lumière · Planning — Edit Mode'
                  : 'Lumière · Planning — Read-Only View'}
            </p>
            <h2 className="mt-1 font-serif text-2xl font-medium text-card-foreground">
              {mode === 'create'
                ? 'Register New Event'
                : mode === 'edit'
                  ? 'Edit Event'
                  : 'View Event'}
            </h2>
            <p className="mt-0.5 text-[0.58rem] uppercase tracking-[0.15em] text-muted-foreground">
              Ref ID: {event?.refId ?? 'PRT-Pending-2026'}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="text-muted-foreground transition hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <fieldset
          disabled={readOnly}
          className="space-y-7 overflow-y-auto px-6 py-6 disabled:opacity-90"
          style={{ maxHeight: 'calc(90vh - 200px)' }}
        >
          {/* Conflict Banner */}
          {hasConflicts && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-xs">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-destructive">
                <AlertTriangle className="size-4 shrink-0" />
                <span>Event Conflict Detected — Creation Blocked</span>
              </div>
              <p className="mt-1 text-[0.7rem] text-muted-foreground">
                The proposed event details conflict with existing active portfolios in the registry:
              </p>
              <ul className="mt-2.5 space-y-1.5 pl-4 list-disc text-card-foreground">
                {conflicts.map((c, i) => (
                  <li key={i} className="leading-tight">
                    <span className="font-semibold text-destructive">{c.eventTitle} ({c.eventRefId})</span>: {c.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Core */}
          <div className="space-y-4">
            <SectionHeading icon={FileText}>Core Portfolio Characteristics</SectionHeading>
            <div>
              <label className={labelClass} htmlFor="ev-title">
                <span className="text-destructive mr-0.5">*</span>Event Concept / Title
              </label>
              <input
                id="ev-title"
                className={cn(
                  inputClass,
                  showValidation && !draft.title.trim() && 'border-destructive ring-2 ring-destructive/30',
                )}
                placeholder="e.g. La Nuit Dorée..."
                value={draft.title}
                onChange={(e) => { set('title', e.target.value); }}
              />
              {showValidation && !draft.title.trim() && (
                <p className="mt-1.5 flex items-center gap-1 text-[0.65rem] font-medium text-destructive">
                  <AlertTriangle className="size-3" /> Event title is required.
                </p>
              )}
            </div>
            <div>
              <label className={labelClass} htmlFor="ev-client">
                Client / Organizer Name (optional)
              </label>
              <input
                id="ev-client"
                className={inputClass}
                placeholder="Optional — enter primary stakeholder..."
                value={draft.client}
                onChange={(e) => set('client', e.target.value)}
              />
            </div>
          </div>

          {/* Venue & Timeline */}
          <div className="space-y-4">
            <SectionHeading icon={Building2}>Venue &amp; Timeline Matrices</SectionHeading>
            <div>
              <label className={labelClass} htmlFor="ev-venue">
                Bind to Registry Venue
              </label>
              {addingVenue ? (
                <div className="mt-2 flex gap-2">
                  <input
                    autoFocus
                    className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-ring/30"
                    placeholder="Type a new venue name..."
                    value={newVenue}
                    onChange={(e) => setNewVenue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing) commitNewVenue()
                    }}
                  />
                  <button
                    type="button"
                    onClick={commitNewVenue}
                    className="shrink-0 rounded-md bg-primary px-4 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:opacity-90"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <select
                  id="ev-venue"
                  className={`${inputClass} appearance-none`}
                  value={draft.venue}
                  disabled={readOnly}
                  onChange={(e) => {
                    if (e.target.value === ADD_VENUE) {
                      setAddingVenue(true)
                      return
                    }
                    set('venue', e.target.value)
                  }}
                >
                  <option value="">Select an established estate...</option>
                  {venues.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                  {!readOnly && <option value={ADD_VENUE}>+ Add New Venue</option>}
                </select>
              )}
            </div>

            <div>
              <label className={labelClass} htmlFor="ev-date">
                <span className="text-destructive mr-0.5">*</span>Event Date
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="ev-date"
                  type="date"
                  min={todayIso}
                  disabled={readOnly}
                  className={cn(
                    inputClass,
                    'flex-1',
                    (isPastDate || (showValidation && !draft.targetDate)) && 'border-destructive ring-2 ring-destructive/30',
                  )}
                  value={draft.targetDate ? (draft.targetDate.includes('T') ? draft.targetDate.split('T')[0] : draft.targetDate) : ''}
                  onChange={(e) => set('targetDate', e.target.value)}
                />
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => !readOnly && setShowCalendar((v) => !v)}
                  title="Toggle Visual Event Calendar"
                  className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition"
                >
                  <CalendarDays className="size-4" />
                  <span className="hidden sm:inline">Visual Calendar</span>
                </button>
              </div>
              {isPastDate && (
                <p className="mt-1.5 flex items-center gap-1 text-[0.65rem] font-medium text-destructive">
                  <AlertTriangle className="size-3" /> Event date cannot be in the past. Please select a current or future date.
                </p>
              )}
              {showValidation && !draft.targetDate && !isPastDate && (
                <p className="mt-1.5 flex items-center gap-1 text-[0.65rem] font-medium text-destructive">
                  <AlertTriangle className="size-3" /> Event date is required.
                </p>
              )}

              {showCalendar && (
                <EventCalendar
                  value={draft.targetDate}
                  events={events}
                  onSelect={(date) => {
                    set('targetDate', date)
                    setShowCalendar(false)
                  }}
                />
              )}
            </div>

            {/* Client Event Hours Section */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5 space-y-3">
              <div>
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-primary">
                  1. Client Event Hours (Program Execution Window)
                </p>
                <p className="text-[0.65rem] text-muted-foreground font-medium">
                  Actual time when the client’s main program/gala begins and ends (separate from logistics load-in/out).
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} htmlFor="ev-start">
                    Event Start Time
                  </label>
                  <input
                    id="ev-start"
                    type="time"
                    disabled={readOnly}
                    className={inputClass}
                    value={draft.installationStart}
                    onChange={(e) => set('installationStart', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="ev-end">
                    Event End Time
                  </label>
                  <input
                    id="ev-end"
                    type="time"
                    disabled={readOnly}
                    className={inputClass}
                    value={draft.installationEnd}
                    onChange={(e) => set('installationEnd', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Geographic Scope & Logistics Buffer Window */}
            <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-3">
              <div>
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-foreground">
                  2. Logistics Buffer Window (Site Load-In &amp; Venue Clearance)
                </p>
                <p className="text-[0.65rem] text-muted-foreground font-medium">
                  Operational buffer for truck ingress, stage setup, teardown, and final site clearance cutoff (Full Stop).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} htmlFor="ev-geo">
                    Geographic Scope
                  </label>
                  <select
                    id="ev-geo"
                    disabled={readOnly}
                    className={`${inputClass} appearance-none`}
                    value={draft.geoClass || 'Local'}
                    onChange={(e) => set('geoClass', e.target.value)}
                  >
                    <option value="Local">Local (NCR / Metro)</option>
                    <option value="National">National (Regional)</option>
                    <option value="International">International (Global / Destination)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="ev-ingress-date">
                    Ingress Date
                  </label>
                  <input
                    id="ev-ingress-date"
                    type="date"
                    min={todayIso}
                    disabled={readOnly}
                    className={inputClass}
                    value={draft.ingressDate || (draft.targetDate ? draft.targetDate : '')}
                    onChange={(e) => set('ingressDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} htmlFor="ev-ingress-time">
                    Ingress Time (Site Load-In)
                  </label>
                  <input
                    id="ev-ingress-time"
                    type="time"
                    disabled={readOnly}
                    className={inputClass}
                    value={draft.ingressTime || '08:00'}
                    onChange={(e) => set('ingressTime', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="ev-fullstop">
                    Full Stop (Clearance Cutoff)
                  </label>
                  <input
                    id="ev-fullstop"
                    type="time"
                    disabled={readOnly}
                    className={inputClass}
                    value={draft.fullStop || '23:30'}
                    onChange={(e) => set('fullStop', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Styling */}
          <div className="space-y-4">
            <SectionHeading icon={Palette}>Styling Essence</SectionHeading>
            <div>
              <label className={labelClass} htmlFor="ev-mood">
                Initial Creative Vision &amp; Design Mood Plan
              </label>
              <textarea
                id="ev-mood"
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder="Describe the atmosphere, textures, and sensory objectives..."
                value={draft.moodPlan}
                onChange={(e) => set('moodPlan', e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        {/* Footer */}
        <div className="space-y-3 border-t border-border px-6 py-4">
          {event && (event.status === 'Completed' || event.status === 'Settled') && (
            <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Event Settlement Status
                </span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider',
                    event.status === 'Settled'
                      ? 'bg-emerald-100 text-emerald-800'
                      : blockingDamageItems.length > 0
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800',
                  )}
                >
                  {event.status === 'Settled' ? 'Settled' : blockingDamageItems.length > 0 ? 'Settlement Blocked' : 'Ready to Settle'}
                </span>
              </div>

              {event.status === 'Completed' && blockingDamageItems.length > 0 && (
                <div className="flex items-center justify-between gap-2 rounded bg-rose-50 border border-rose-200 p-2 text-xs text-rose-800">
                  <span>
                    ⚠️ {blockingDamageItems.length} pending damage item(s) must be resolved first.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      close()
                      navigate('damage')
                    }}
                    className="shrink-0 rounded bg-rose-600 px-2 py-1 text-[0.6rem] font-bold uppercase text-white hover:bg-rose-700"
                  >
                    + Review
                  </button>
                </div>
              )}

              {event.status === 'Completed' && blockingDamageItems.length === 0 && (
                <p className="text-xs text-emerald-700 font-medium">
                  ✓ All damage exceptions resolved. Event financial settlement can proceed.
                </p>
              )}

              {event.status === 'Completed' && (
                <button
                  type="button"
                  disabled={blockingDamageItems.length > 0}
                  onClick={async () => {
                    const res = await settleEvent(event.id)
                    if (res.success) close()
                  }}
                  className="w-full rounded-md bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 transition"
                >
                  Settle Event
                </button>
              )}
            </div>
          )}

          {readOnly ? (
            <button
              type="button"
              onClick={close}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-card-foreground transition hover:bg-muted"
            >
              Close
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRequestOpen}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="size-3.5" />
              {mode === 'edit' ? 'Save Changes' : 'Initialize Event Registry'}
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        eyebrow={mode === 'edit' ? 'Registry Update' : 'Registry Initialization'}
        title={mode === 'edit' ? 'Confirm Event Changes' : 'Confirm New Event'}
        tone={dateAdvisories.length > 0 ? 'destructive' : 'default'}
        confirmLabel={mode === 'edit' ? 'Save Changes' : 'Initialize Registry'}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          submit(false)
        }}
        description={
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-sm font-semibold text-card-foreground">
                {draft.title || 'Untitled Event'}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {draft.client || 'No client'} · {draft.targetDate || 'No date set'} · {draft.venue || 'No venue'}
              </p>
            </div>
            {dateAdvisories.length > 0 ? (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                <div className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  <Info className="size-3.5" /> Date Advisory
                </div>
                <ul className="mt-1.5 space-y-1 text-[0.7rem] text-muted-foreground">
                  {dateAdvisories.map((a, i) => <li key={i}>{a.message}</li>)}
                </ul>
                <p className="mt-2 text-[0.65rem] text-muted-foreground">You can still proceed — this is not a booking conflict.</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">This will register the new event in the portfolio registry. Proceed?</p>
            )}
          </div>
        }
      />

      {serverConflict && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-rose-500/30 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-rose-500/10 p-2 text-rose-500 shrink-0">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-card-foreground">
                  Venue Schedule Conflict Warning
                </h3>
                <p className="text-[0.7rem] text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wider mt-0.5">
                  HTTP 409 Conflict — Duplicate / Overlapping Event
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {serverConflict.message}
            </p>

            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 max-h-48 overflow-y-auto">
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                Conflicting Active Event(s):
              </p>
              {serverConflict.conflictingEvents.length > 0 ? (
                serverConflict.conflictingEvents.map((ce: any, idx: number) => (
                  <div key={ce.id || idx} className="rounded border border-border/80 bg-background p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold text-foreground">
                      <span>{ce.name || ce.title || 'Conflicting Event'}</span>
                      <span className="text-[0.6rem] font-mono uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 px-1.5 py-0.5 rounded">
                        {ce.status || 'Active'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[0.7rem] text-muted-foreground">
                      <div><span className="font-medium text-foreground">Venue:</span> {ce.venue || ce.eventVenue}</div>
                      <div><span className="font-medium text-foreground">Date:</span> {ce.dateOfEvent ? ce.dateOfEvent.split('T')[0] : 'N/A'}</div>
                      <div className="col-span-2">
                        <span className="font-medium text-foreground">Schedule Window:</span> {ce.ingressDate ? ce.ingressDate.split('T')[0] : 'N/A'} to {ce.returnDate ? ce.returnDate.split('T')[0] : 'N/A'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">Overlapping venue schedule detected on server.</p>
              )}
            </div>

            <div className="rounded border border-amber-500/20 bg-amber-500/10 p-2 text-[0.7rem] text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <Info className="size-4 shrink-0" />
              <span>
                Proceeding will log a <code className="font-mono text-[0.65rem]">VENUE_CONFLICT_OVERRIDE</code> audit log entry.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setServerConflict(null)}
                className="rounded-md border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition"
              >
                Modify Venue / Dates
              </button>
              <button
                type="button"
                onClick={() => submit(true)}
                className="rounded-md bg-rose-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-rose-700 transition"
              >
                Proceed with Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
