import { useState, useEffect, useMemo } from 'react'
import { X, FileText, Building2, Palette, CalendarDays, Plus } from 'lucide-react'
import { usePortal } from '@/lib/store'
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
        installationStart: normalizeTimeFormat(event.installationStart),
        installationEnd: normalizeTimeFormat(event.installationEnd),
        moodPlan: event.moodPlan ?? '',
      })
    } else {
      setDraft(emptyDraft)
    }
  }, [open, event])

  const venues = [...baseVenues, ...customVenues]

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
    onClose()
  }

  const submit = () => {
    // Client is now optional — only the title is required.
    if (!draft.title) return
    if (mode === 'edit' && event) {
      updateEvent(event.id, draft, adminRole || 'Executive')
    } else {
      addEvent(draft, adminRole || 'Executive')
    }
    close()
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

  // Flag a date conflict when the chosen target date matches an existing event
  const dateConflict = draft.targetDate
    ? events.some((ev) => {
        const a = new Date(ev.targetDate).getTime()
        const b = new Date(draft.targetDate).getTime()
        return !Number.isNaN(a) && !Number.isNaN(b) && a === b
      })
    : false

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
          {/* Core */}
          <div className="space-y-4">
            <SectionHeading icon={FileText}>Core Portfolio Characteristics</SectionHeading>
            <div>
              <label className={labelClass} htmlFor="ev-title">
                Event Concept / Title
              </label>
              <input
                id="ev-title"
                className={inputClass}
                placeholder="e.g. La Nuit Dorée..."
                value={draft.title}
                onChange={(e) => set('title', e.target.value)}
              />
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
                  <option value={ADD_VENUE}>+ Add New Venue</option>
                </select>
              )}
            </div>

            <div>
              <label className={labelClass} htmlFor="ev-date">
                Event Date
              </label>
              <button
                id="ev-date"
                type="button"
                onClick={() => setShowCalendar((v) => !v)}
                className={`${inputClass} flex items-center justify-between text-left`}
              >
                <span className={draft.targetDate ? 'text-foreground' : 'text-muted-foreground/60'}>
                  {draft.targetDate || 'Select a date'}
                </span>
                <CalendarDays className="size-4 text-muted-foreground" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="ev-start">
                  Event Start Time
                </label>
                <input
                  id="ev-start"
                  type="time"
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
                  className={inputClass}
                  value={draft.installationEnd}
                  onChange={(e) => set('installationEnd', e.target.value)}
                />
              </div>
            </div>

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
                  onClick={() => {
                    const res = settleEvent(event.id)
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
              onClick={() => setConfirmOpen(true)}
              disabled={!draft.title}
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
        tone={dateConflict ? 'destructive' : 'default'}
        confirmLabel={mode === 'edit' ? 'Save Changes' : 'Initialize Registry'}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          submit()
        }}
        description={
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-sm font-semibold text-card-foreground">
                {draft.title || 'Untitled Event'}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {draft.client || 'No client'} · {draft.targetDate || 'No date set'}
              </p>
            </div>
            <p>
              {dateConflict
                ? 'Warning: the selected date already has a booked event. Are you sure you want to register this event on the same day?'
                : 'This will register the new event in the portfolio registry. Proceed?'}
            </p>
          </div>
        }
      />
    </div>
  )
}
