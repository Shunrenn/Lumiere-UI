import { useMemo, useState } from 'react'
import { AlertOctagon, CalendarDays, FileWarning, Lock, Mail, MapPin, Plus, ShieldCheck, UserRound, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import {
  createIncident,
  fetchIncidentPin,
  resolveIncident,
  reviewIncident,
  useIncidentData,
  type IncidentCategory,
  type IncidentReport,
  type IncidentSeverity,
} from '@/lib/manning'

type Tab = 'report' | 'queue'

const CATEGORIES: IncidentCategory[] = ['General', 'Safety', 'Equipment', 'Personnel', 'Security', 'Logistics']
const SEVERITIES: IncidentSeverity[] = ['Low', 'Medium', 'High', 'Critical']

interface IncidentReportingModuleProps {
  onClose: () => void
}

export function IncidentReportingModule({ onClose }: IncidentReportingModuleProps) {
  const { adminName, adminEmail } = useAuth()
  const actor = adminName || adminEmail || 'WOM'
  const { incidents, loading, error, reload } = useIncidentData()
  const [tab, setTab] = useState<Tab>('report')
  const [newIncidents, setNewIncidents] = useState<IncidentReport[]>([])
  const visibleIncidents = useMemo(() => {
    const existingIds = new Set(incidents.map((incident) => incident.id))
    return [...newIncidents.filter((incident) => !existingIds.has(incident.id)), ...incidents]
  }, [incidents, newIncidents])

  // PIN gate for the WOM review queue (default 246810, stored in manning_settings).
  const [unlocked, setUnlocked] = useState(false)

  const stats = useMemo(
    () => ({
      open: visibleIncidents.filter((i) => i.status === 'Submitted').length,
      reviewing: incidents.filter((i) => i.status === 'Under Review').length,
      critical: incidents.filter((i) => i.severity === 'Critical' && i.status !== 'Resolved' && i.status !== 'Dismissed').length,
      resolved: incidents.filter((i) => i.status === 'Resolved').length,
    }),
    [visibleIncidents],
  )

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:px-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.24em] text-primary">Warehouse module</p>
            <h1 className="mt-1 font-serif text-2xl font-medium text-foreground">Incident Reporting</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Crews file incidents; the WOM reviews and resolves them behind a PIN-gated queue.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close and return to dashboard"
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Open', value: stats.open, border: 'border-l-primary' },
            { label: 'Under Review', value: stats.reviewing, border: 'border-l-foreground/30' },
            { label: 'Critical', value: stats.critical, border: 'border-l-destructive' },
            { label: 'Resolved', value: stats.resolved, border: 'border-l-foreground/30' },
          ].map((stat) => (
            <div
              key={stat.label}
              className={cn('rounded-lg border border-border bg-card px-4 py-3.5 border-l-4', stat.border)}
            >
              <p className="font-sans text-2xl font-bold leading-none text-card-foreground">{stat.value}</p>
              <p className="mt-2 text-[0.6rem] font-semibold uppercase leading-tight tracking-[0.1em] text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="inline-flex rounded-md border border-border bg-background p-1">
          {(
            [
              { id: 'report', label: 'File Report', icon: Plus },
              { id: 'queue', label: 'WOM Review Queue', icon: ShieldCheck },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={cn(
                'flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition',
                tab === t.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-6 py-6 sm:px-10">
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {tab === 'report' ? (
          <ReportForm actor={actor} onFiled={(created) => {
            setNewIncidents((current) => [created, ...current.filter((incident) => incident.id !== created.id)])
            setTab('queue')
          }} />
        ) : !unlocked ? (
          <div className="relative">
            <div className="pointer-events-none opacity-40 blur-xs">
              <ReviewQueue incidents={visibleIncidents} actor={actor} onReload={reload} />
            </div>
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
            >
              <PinGate onUnlock={() => setUnlocked(true)} onCancel={() => setTab('report')} />
            </div>
          </div>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Loading review queue…</p>
        ) : (
          <ReviewQueue incidents={visibleIncidents} actor={actor} onReload={reload} />
        )}
      </div>
    </div>
  )
}

// ---- File report -----------------------------------------------------

function ReportForm({ actor, onFiled }: { actor: string; onFiled: (created: IncidentReport) => void }) {
  const getDateTimeLocal = () => {
    const date = new Date()
    const offset = date.getTimezoneOffset()
    return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
  }
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<IncidentCategory | ''>('')
  const [severity, setSeverity] = useState<IncidentSeverity | ''>('')
  const [location, setLocation] = useState('')
  const [occurredAt, setOccurredAt] = useState(getDateTimeLocal)
  const [description, setDescription] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [reporter, setReporter] = useState(actor || '')
  const [saving, setSaving] = useState(false)
  const [filed, setFiled] = useState<string | null>(null)

  async function submit() {
    if (!title.trim() || !category || !severity || !location.trim() || !description.trim() || !reporter.trim() || !occurredAt) return
    setSaving(true)
    try {
      const created = await createIncident({
        title: title.trim(),
        category: category as IncidentCategory,
        severity: severity as IncidentSeverity,
        location: location.trim() || null,
        description: description.trim(),
        reported_by_name: reporter.trim(),
        occurred_at: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
      })
      const evidenceImage = imagePreview
      setFiled(created.reference)
      setTitle('')
      setLocation('')
      setOccurredAt('')
      setDescription('')
      setImage(null)
      setImagePreview(null)
      setCategory('')
      setSeverity('')
      onFiled({ ...created, image_url: evidenceImage })
    } catch (err) {
      console.error('[v0] file incident failed', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl">
      {filed && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary">
          <ShieldCheck className="size-4 shrink-0" />
          <span>
            Incident <strong>{filed}</strong> filed and routed to the WOM review queue.
          </span>
        </div>
      )}
      <div className="space-y-4 rounded-xl border border-border bg-card px-5 py-5 sm:px-6 sm:py-6">
        <div>
          <label className={labelClass}>Incident title *</label>
          <input required className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Category *</label>
            <select required className={fieldClass} value={category} onChange={(e) => setCategory(e.target.value as IncidentCategory | '')}>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Severity *</label>
            <select required className={fieldClass} value={severity} onChange={(e) => setSeverity(e.target.value as IncidentSeverity | '')}>
              <option value="">Select severity</option>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Location *</label>
            <input required className={fieldClass} value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Reported by *</label>
            <input required className={fieldClass} value={reporter} onChange={(e) => setReporter(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Date and time occurred *</label>
          <input
            type="datetime-local"
            className={fieldClass}
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>What happened? *</label>
          <textarea
            className={cn(fieldClass, 'min-h-28 resize-y')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label className={labelClass} htmlFor="incident-image">Evidence image</label>
          <label htmlFor="incident-image" className="flex cursor-pointer items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 transition hover:border-primary hover:bg-muted/60">
            <span className="min-w-0 text-sm text-muted-foreground">{image ? image.name : 'Upload an image related to this incident'}</span>
            <span className="shrink-0 rounded-md border border-border bg-card px-3 py-1.5 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-card-foreground">Choose image</span>
          </label>
          <input
            id="incident-image"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              setImage(file)
              setImagePreview(file ? URL.createObjectURL(file) : null)
            }}
          />
          {imagePreview && (
            <div className="relative overflow-hidden rounded-lg border border-border bg-muted">
              <img src={imagePreview} alt="Selected incident evidence preview" className="max-h-48 w-full object-contain" />
              <button type="button" onClick={() => { setImage(null); setImagePreview(null) }} className="absolute right-2 top-2 rounded-md bg-background/90 px-2 py-1 text-xs text-foreground shadow">Remove</button>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={saving || !title.trim() || !description.trim() || !reporter.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            <FileWarning className="size-3.5" />
            {saving ? 'Filing…' : 'File incident'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- PIN gate --------------------------------------------------------

function PinGate({ onUnlock, onCancel }: { onUnlock: () => void; onCancel?: () => void }) {
  const [pin, setPin] = useState('')
  const [checking, setChecking] = useState(false)
  const [err, setErr] = useState(false)

  async function check() {
    setChecking(true)
    setErr(false)
    try {
      const real = await fetchIncidentPin()
      if (pin.trim() === real.trim()) onUnlock()
      else setErr(true)
    } catch (e) {
      console.error('[v0] pin check failed', e)
      setErr(true)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="relative max-w-sm rounded-xl border border-border bg-card px-6 py-8 text-center shadow-2xl">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
        >
          <X className="size-4" />
        </button>
      )}
      <span className="mx-auto flex size-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Lock className="size-6" aria-hidden="true" />
      </span>
      <p className="mt-4 text-sm font-semibold text-card-foreground">WOM review queue locked</p>
      <p className="mt-1 text-sm text-muted-foreground">Enter the manning review PIN to view and action reports.</p>
      <input
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) check()
        }}
        inputMode="numeric"
        type="password"
        placeholder="PIN"
        className={cn(fieldClass, 'mt-5 text-center tracking-[0.5em]')}
      />
      {err && <p className="mt-2 text-xs text-destructive">Incorrect PIN.</p>}
      <button
        type="button"
        onClick={check}
        disabled={checking || !pin}
        className="mt-4 w-full rounded-md bg-primary px-4 py-2.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {checking ? 'Checking…' : 'Unlock'}
      </button>
    </div>
  )
}

// ---- Review queue ----------------------------------------------------

function ReviewQueue({
  incidents,
  actor,
  onReload,
}: {
  incidents: IncidentReport[]
  actor: string
  onReload: () => Promise<void>
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<IncidentReport | null>(null)
  const [resolveFor, setResolveFor] = useState<{ incident: IncidentReport; outcome: 'Resolved' | 'Dismissed' } | null>(null)

  async function markReview(i: IncidentReport) {
    setBusy(i.id)
    try {
      await reviewIncident(i.id)
      setReviewedIds((current) => new Set(current).add(i.id))
    } catch (err) {
      console.error('[v0] review incident failed', err)
    } finally {
      setBusy(null)
    }
  }

  if (incidents.length === 0) {
    return (
      <div className="max-w-md rounded-xl border border-dashed border-border bg-card/60 px-6 py-10 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <ShieldCheck className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-4 text-sm font-semibold text-card-foreground">Queue is clear</p>
        <p className="mt-1 text-sm text-muted-foreground">No incidents have been filed.</p>
      </div>
    )
  }

  const sevTone: Record<IncidentSeverity, string> = {
    Low: 'bg-muted text-muted-foreground',
    Medium: 'bg-primary/15 text-primary',
    High: 'bg-destructive/15 text-destructive',
    Critical: 'bg-destructive text-destructive-foreground',
  }
  const statusTone: Record<IncidentReport['status'], string> = {
    Submitted: 'bg-primary/15 text-primary',
    'Under Review': 'bg-foreground/10 text-foreground',
    Resolved: 'bg-muted text-muted-foreground',
    Dismissed: 'bg-muted text-muted-foreground',
  }

  return (
    <>
      <ul className="space-y-3">
        {incidents.map((i) => {
          const status = reviewedIds.has(i.id) && i.status === 'Submitted' ? 'Under Review' : i.status
          const closed = status === 'Resolved' || status === 'Dismissed'
          return (
            <li
              key={i.id}
              onClick={() => setSelected({ ...i, status })}
              className={cn(
                'cursor-pointer rounded-xl border bg-card px-5 py-4 transition hover:border-primary/50',
                i.severity === 'Critical' && !closed ? 'border-destructive/50' : 'border-border',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{i.reference}</span>
                    <h3 className="font-serif text-lg font-medium text-card-foreground">{i.title}</h3>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Pill className={sevTone[i.severity]}>{i.severity}</Pill>
                    <Pill className="bg-muted text-muted-foreground">{i.category}</Pill>
                    <Pill className={statusTone[status]}>{status}</Pill>
                  </div>
                  {status === 'Under Review' && (
                    <>
                      <p className="mt-2 text-sm leading-6 text-card-foreground">{i.description}</p>
                      {i.image_url && <img src={i.image_url} alt={`Evidence for ${i.title}`} className="mt-3 h-24 w-40 rounded-md border border-border object-cover" />}
                    </>
                  )}
                  <p className="mt-2 text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">
                    {i.reported_by_name}
                    {i.location ? ` · ${i.location}` : ''} · {new Date(i.created_at).toLocaleString()}
                  </p>
                  {i.resolution_notes && (
                    <p className="mt-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                      <strong>{i.status} by {i.resolved_by}:</strong> {i.resolution_notes}
                    </p>
                  )}
                </div>
              </div>

              {!closed && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {status === 'Submitted' && (
                    <button
                      type="button"
                      onClick={(event) => { event.stopPropagation(); setSelected({ ...i, status }) }}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:bg-primary/90"
                    >
                      Start review
                    </button>
                  )}
                  {status === 'Under Review' && (
                    <>
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); setResolveFor({ incident: i, outcome: 'Resolved' }) }}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-card-foreground transition hover:bg-muted"
                      >
                        <ShieldCheck className="size-3.5" />
                        Resolve
                      </button>
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); setResolveFor({ incident: i, outcome: 'Dismissed' }) }}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-card-foreground transition hover:bg-muted"
                      >
                        <AlertOctagon className="size-3.5" />
                        Dismiss
                      </button>
                    </>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {selected && (
        <IncidentDetailModal
          incident={selected}
          actor={actor}
          busy={busy === selected.id}
          onClose={() => setSelected(null)}
          onStartReview={async () => {
            setSelected((current) => current ? { ...current, status: 'Under Review' } : current)
            setReviewedIds((current) => new Set(current).add(selected.id))
            await markReview(selected)
          }}
          onResolve={(outcome) => setResolveFor({ incident: selected, outcome })}
        />
      )}

      {resolveFor && (
        <ResolveModal
          incident={resolveFor.incident}
          outcome={resolveFor.outcome}
          actor={actor}
          onClose={() => setResolveFor(null)}
          onSaved={async () => {
            setResolveFor(null)
            setSelected(null)
            await onReload()
          }}
        />
      )}
    </>
  )
}

function IncidentDetailModal({
  incident,
  actor,
  busy,
  onClose,
  onStartReview,
  onResolve,
}: {
  incident: IncidentReport
  actor: string
  busy: boolean
  onClose: () => void
  onStartReview: () => void
  onResolve: (outcome: 'Resolved' | 'Dismissed') => void
}) {
  const closed = incident.status === 'Resolved' || incident.status === 'Dismissed'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="font-mono text-xs text-muted-foreground">{incident.reference}</p>
            <h2 className="mt-1 font-serif text-2xl font-medium text-card-foreground">{incident.title}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill className="bg-primary/15 text-primary">{incident.severity}</Pill>
              <Pill className="bg-muted text-muted-foreground">{incident.category}</Pill>
              <Pill className="bg-foreground/10 text-foreground">{incident.status}</Pill>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close incident details" className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1fr_240px]">
          <div>
            <p className={labelClass}>Full report</p>
            <p className="whitespace-pre-wrap text-sm leading-6 text-card-foreground">{incident.description}</p>
            {incident.image_url && (
              <div className="mt-5 space-y-2">
                <p className={labelClass}>Evidence image</p>
                <img src={incident.image_url} alt={`Evidence for ${incident.title}`} className="max-h-72 w-full rounded-lg border border-border object-contain" />
              </div>
            )}
            {incident.resolution_notes && (
              <div className="mt-6 rounded-lg bg-muted px-4 py-3 text-sm text-card-foreground">
                <p className={labelClass}>{incident.status} by {incident.resolved_by || actor}</p>
                <p>{incident.resolution_notes}</p>
              </div>
            )}
          </div>
          <div className="space-y-4 rounded-lg border border-border bg-background p-4 text-sm">
            <DetailLine icon={UserRound} label="Reported by" value={incident.reported_by_name} />
            {incident.reported_by_email && <DetailLine icon={Mail} label="Contact" value={incident.reported_by_email} />}
            {incident.location && <DetailLine icon={MapPin} label="Location" value={incident.location} />}
            <DetailLine icon={CalendarDays} label="Occurred" value={formatDate(incident.occurred_at)} />
            <DetailLine icon={CalendarDays} label="Filed" value={formatDate(incident.created_at)} />
            {incident.resolved_at && <DetailLine icon={CalendarDays} label="Closed" value={formatDate(incident.resolved_at)} />}
          </div>
        </div>

        {!closed && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-border px-6 py-4">
            {incident.status === 'Submitted' ? (
              <button type="button" onClick={onStartReview} disabled={busy} className="rounded-md bg-primary px-4 py-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary-foreground disabled:opacity-50">
                {busy ? 'Starting…' : 'Start review'}
              </button>
            ) : incident.status === 'Under Review' ? (
              <>
                <button type="button" onClick={() => onResolve('Resolved')} className="rounded-md border border-border px-4 py-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-card-foreground hover:bg-muted">Resolve</button>
                <button type="button" onClick={() => onResolve('Dismissed')} className="rounded-md border border-border px-4 py-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-card-foreground hover:bg-muted">Dismiss</button>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

function DetailLine({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className={labelClass}>{label}</p>
        <p className="break-words text-card-foreground">{value}</p>
      </div>
    </div>
  )
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : 'Not recorded'
}

function ResolveModal({
  incident,
  outcome,
  actor,
  onClose,
  onSaved,
}: {
  incident: IncidentReport
  outcome: 'Resolved' | 'Dismissed'
  actor: string
  onClose: () => void
  onSaved: () => void
}) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!notes.trim()) return
    setSaving(true)
    try {
      await resolveIncident(incident.id, outcome, notes.trim(), actor)
      onSaved()
    } catch (err) {
      console.error('[v0] resolve incident failed', err)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-serif text-lg font-medium text-card-foreground">
            {outcome === 'Resolved' ? 'Resolve' : 'Dismiss'} {incident.reference}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="px-6 py-5">
          <label className={labelClass}>{outcome === 'Resolved' ? 'Resolution notes' : 'Reason for dismissal'} *</label>
          <textarea className={cn(fieldClass, 'min-h-28 resize-y')} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-card-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || !notes.trim()}
              className="rounded-md bg-primary px-4 py-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : `Confirm ${outcome.toLowerCase()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.1em]', className)}>
      {children}
    </span>
  )
}

const fieldClass =
  'w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30'
const labelClass = 'block text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1.5'
