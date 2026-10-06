import { useEffect, useState } from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Download, FileText, X } from 'lucide-react'
import type { PortalEvent } from '@/lib/types'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const dateKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const formatDate = (value?: string) => {
  if (!value) return 'Not available'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])
}

interface CalendarProps {
  month: Date
  selectedDate: string | null
  bookedDates: Set<string>
  onMonthChange: (amount: number) => void
  onCurrentMonth: () => void
  onSelect: (date: string) => void
  onClose: () => void
}

export function ExecutiveDashboardCalendarModal({ month, selectedDate, bookedDates, onMonthChange, onCurrentMonth, onSelect, onClose }: CalendarProps) {
  useEscape(onClose)
  const label = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(month)
  const first = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const days = [...Array(first).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="booking-calendar-title" onClick={onClose}>
      <section className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between border-b border-border px-5 py-4 sm:px-7">
          <div><p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Executive Dashboard</p><h2 id="booking-calendar-title" className="mt-1 font-serif text-2xl font-medium">Booking Calendar</h2></div>
          <button type="button" onClick={onClose} className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close booking calendar"><X /></button>
        </header>
        <div className="p-5 sm:p-7">
          <div className="flex items-center justify-between"><button type="button" onClick={() => onMonthChange(-1)} className="flex size-10 items-center justify-center rounded-lg border border-border hover:bg-muted" aria-label="Previous month"><ChevronLeft /></button><h3 className="font-serif text-xl font-medium uppercase">{label}</h3><button type="button" onClick={() => onMonthChange(1)} className="flex size-10 items-center justify-center rounded-lg border border-border hover:bg-muted" aria-label="Next month"><ChevronRight /></button></div>
          <div className="mt-7 grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">{WEEKDAYS.map((day) => <span key={day}>{day}</span>)}</div>
          <div className="mt-3 grid grid-cols-7 gap-2">{days.map((day, index) => { if (!day) return <span key={`empty-${index}`} />; const date = new Date(month.getFullYear(), month.getMonth(), day); const key = dateKey(date); const selected = selectedDate === key; const booked = bookedDates.has(key); return <button key={key} type="button" onClick={() => onSelect(isoDate(date))} aria-label={`${label} ${day}${booked ? ', booked' : ''}`} className={cn('relative flex aspect-square items-center justify-center rounded-lg text-sm hover:bg-muted', selected && 'bg-primary text-primary-foreground', !selected && booked && 'bg-primary/15 text-primary')}>{day}{booked && <span className={cn('absolute bottom-2 size-1.5 rounded-full bg-primary', selected && 'bg-primary-foreground')} />}</button> })}</div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><div className="flex gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-primary" />Booked</span><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-foreground" />Selected</span></div><button type="button" onClick={onCurrentMonth} className="rounded-md border border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-muted">Current Month</button></div>
        </div>
      </section>
    </div>
  )
}

function ReadOnlyField({ label, value, wide = false }: { label: string; value?: string; wide?: boolean }) {
  return <div className={wide ? 'sm:col-span-2' : ''}><dt className="mb-1.5 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</dt><dd className="rounded-md border border-border bg-muted/30 px-3 py-2.5 text-xs text-foreground">{value || 'Not available'}</dd></div>
}

export function ExecutiveEventDetailsModal({ event, onClose }: { event: PortalEvent | null; onClose: () => void }) {
  const [tab, setTab] = useState<'details' | 'assets'>('details')
  useEscape(onClose)
  useEffect(() => { if (event) setTab('details') }, [event])
  if (!event) return null

  const downloadPdf = async () => {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'pt', format: 'letter' })
    const lines = [
      'LUMIÈRE PLANNING — EVENT VIEW',
      `Reference ID: ${event.refId}`,
      `Event: ${event.title}`,
      `Client / Organizer: ${event.client}`,
      `Venue: ${event.venue}`,
      `Event Date: ${formatDate(event.targetDate)}`,
      `Installation: ${formatDate(event.installationStart)} — ${formatDate(event.installationEnd)}`,
      `Event Time: ${event.eventStart || 'Not available'} — ${event.eventEnd || 'Not available'}`,
      `Ingress: ${formatDate(event.ingressDate)} ${event.ingressTime || ''}`,
      `Egress / Return: ${formatDate(event.returnDate)}`,
      `Geographic Scope: ${event.geoClass || 'Not available'}`,
      `Styling Essence: ${event.moodPlan || 'Not available'}`,
    ]
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text(lines[0], 40, 52)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); lines.slice(1).forEach((line, index) => doc.text(line, 40, 84 + index * 20))
    doc.save(`${event.refId || event.id}-event-view.pdf`)
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-2 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-labelledby="executive-event-title" onClick={onClose}>
    <section className="flex max-h-[calc(100vh-16px)] w-full max-w-[540px] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-2xl sm:max-h-[calc(100vh-32px)]" onClick={(click) => click.stopPropagation()}>
      <header className="shrink-0 border-b border-border px-4 py-4 sm:px-6"><div className="flex items-start justify-between gap-3"><div><p className="text-[0.52rem] font-semibold uppercase tracking-[0.19em] text-muted-foreground">Planning · Read-only view</p><h2 id="executive-event-title" className="mt-1 font-serif text-2xl font-medium">{event.title}</h2><p className="mt-1 font-mono text-[0.58rem] text-muted-foreground">{event.refId}</p></div><button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" aria-label="Close event details"><X className="size-4" /></button></div></header>
      <div className="grid shrink-0 grid-cols-2 border-b border-border" role="tablist" aria-label="Event view sections"><button type="button" role="tab" aria-selected={tab === 'details'} onClick={() => setTab('details')} className={cn('border-b-2 px-4 py-2.5 text-[0.58rem] font-bold uppercase tracking-[0.12em]', tab === 'details' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}>Event Details</button><button type="button" role="tab" aria-selected={tab === 'assets'} onClick={() => setTab('assets')} className={cn('border-b-2 px-4 py-2.5 text-[0.58rem] font-bold uppercase tracking-[0.12em]', tab === 'assets' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}>Assets</button></div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {tab === 'details' ? <div className="space-y-5"><section><h3 className="border-b border-border pb-2 text-[0.58rem] font-bold uppercase tracking-[0.15em] text-muted-foreground">Portfolio Characteristics</h3><dl className="mt-3 grid gap-3 sm:grid-cols-2"><ReadOnlyField label="Event Concept / Title" value={event.title} wide /><ReadOnlyField label="Client / Organizer" value={event.client} wide /><ReadOnlyField label="Venue" value={event.venue} wide /><ReadOnlyField label="Event Date" value={formatDate(event.targetDate)} /><ReadOnlyField label="Geographic Scope" value={event.geoClass} /><ReadOnlyField label="Ingress" value={`${formatDate(event.ingressDate)} ${event.ingressTime || ''}`} /><ReadOnlyField label="Egress / Return" value={formatDate(event.returnDate)} /></dl></section><section><h3 className="border-b border-border pb-2 text-[0.58rem] font-bold uppercase tracking-[0.15em] text-muted-foreground">Styling Essence</h3><dl className="mt-3"><ReadOnlyField label="Creative Vision & Design Mood Plan" value={event.moodPlan} wide /></dl></section></div> : <section><h3 className="text-sm font-semibold">Assigned event assets</h3><p className="mt-1 text-xs text-muted-foreground">Assets currently planned or reserved for this event.</p><div className="mt-4 rounded-md border border-dashed border-border px-4 py-8 text-center"><FileText className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 text-xs text-muted-foreground">No itemized assets are available in this event record.</p></div></section>}
      </div>
      <footer className="shrink-0 border-t border-border p-3 sm:px-4"><button type="button" onClick={downloadPdf} className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-primary-foreground hover:bg-primary/90"><Download className="size-3.5" />Download PDF</button></footer>
    </section>
  </div>
}

export function downloadExecutiveEventReport(event: PortalEvent) {
  void import('jspdf').then(({ default: jsPDF }) => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' })
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text('LUMIÈRE PLANNING — EVENT REPORT', 40, 52)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
    ;[`Reference ID: ${event.refId}`, `Event: ${event.title}`, `Client / Organizer: ${event.client}`, `Venue: ${event.venue}`, `Event Date: ${formatDate(event.targetDate)}`, `Lifecycle: ${event.status}`, `Project Valuation: ${event.budget.toLocaleString('en-US', { style: 'currency', currency: 'PHP' })}`].forEach((line, index) => doc.text(line, 40, 84 + index * 20))
    doc.save(`${event.refId || event.id}-event-report.pdf`)
  })
}

export function ExecutiveSettlementReviewModal({ event, onClose }: { event: PortalEvent | null; onClose: () => void }) {
  useEscape(onClose)
  if (!event) return null
  const lifecycleComplete = event.status === 'Completed'
  const assetSettlementAvailable = Boolean(event.eventPegs)
  const ready = lifecycleComplete && assetSettlementAvailable
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/60 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="settlement-review-title" onClick={onClose}>
    <section className="flex max-h-[calc(100vh-24px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl" onClick={(click) => click.stopPropagation()}>
      <header className="flex items-start justify-between border-b border-border px-5 py-4"><div><p className="text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Executive settlement review</p><h2 id="settlement-review-title" className="mt-1 font-serif text-2xl font-medium">Settle Completed Event Record</h2></div><button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" aria-label="Close settlement review"><X className="size-4" /></button></header>
      <div className="min-h-0 space-y-5 overflow-y-auto p-5"><div className="grid gap-3 sm:grid-cols-2"><div><p className="meta-label">Event</p><p className="mt-1 text-sm font-medium">{event.title}</p></div><div><p className="meta-label">Reference</p><p className="mt-1 font-mono text-xs text-muted-foreground">{event.refId}</p></div></div>
        <section className="border-t border-border pt-4"><h3 className="section-label">1. Event Lifecycle</h3><div className="mt-3 flex items-center gap-2 text-sm">{lifecycleComplete ? <CheckCircle2 className="size-4 text-emerald-600" /> : <CircleAlert className="size-4 text-amber-600" />}<span>Completion Status: <strong>{event.status}</strong></span></div><p className="mt-2 text-xs text-muted-foreground">Event date: {formatDate(event.targetDate)} · Venue: {event.venue}</p></section>
        <section className="border-t border-border pt-4"><h3 className="section-label">2. Asset Settlement</h3><div className="mt-3 flex items-center gap-2 text-sm">{assetSettlementAvailable ? <CheckCircle2 className="size-4 text-emerald-600" /> : <CircleAlert className="size-4 text-amber-600" />}<span>Settlement Status: <strong>{assetSettlementAvailable ? 'Settled' : 'Data unavailable'}</strong></span></div><p className="mt-2 text-xs text-muted-foreground">{assetSettlementAvailable ? 'Asset peg data is present on this event record.' : 'Asset settlement cannot be verified from the current event record.'}</p></section>
        <section className="border-t border-border pt-4"><h3 className="section-label">3. Project Valuation</h3><p className="mt-3 font-serif text-lg text-primary">{event.budget.toLocaleString('en-US', { style: 'currency', currency: 'PHP' })}</p></section>
        <div className={cn('rounded-lg border px-3 py-3 text-sm', ready ? 'border-emerald-600/30 bg-emerald-600/5' : 'border-amber-600/30 bg-amber-600/5')}><strong>Event Record Status</strong><p className="mt-1 text-xs">{ready ? 'Ready for Settlement' : 'Not Ready — required settlement verification is incomplete.'}</p></div>
      </div>
      <footer className="flex flex-col gap-2 border-t border-border p-4 sm:flex-row"><button type="button" onClick={() => downloadExecutiveEventReport(event)} className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] hover:bg-muted"><Download className="size-3.5" />Download Report</button><button type="button" disabled className="flex flex-1 items-center justify-center rounded-md bg-primary px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-primary-foreground opacity-50" title="Settlement integration is not available">Settle Event Record</button></footer>
    </section>
  </div>
}

export function ExecutiveSettlementQueueModal({ events, onReview, onClose }: { events: PortalEvent[]; onReview: (id: string) => void; onClose: () => void }) {
  useEscape(onClose)
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="settlement-queue-title" onClick={onClose}><section className="max-h-[calc(100vh-24px)] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card shadow-2xl" onClick={(click) => click.stopPropagation()}><header className="flex items-start justify-between border-b border-border px-5 py-4"><div><p className="text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Executive work queue</p><h2 id="settlement-queue-title" className="mt-1 font-serif text-2xl font-medium">Completed Events Awaiting Settlement</h2></div><button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" aria-label="Close settlement queue"><X className="size-4" /></button></header><div className="space-y-2 p-5">{events.map((event) => <button key={event.id} type="button" onClick={() => onReview(event.id)} className="flex w-full flex-col gap-2 rounded-lg border border-border p-3 text-left hover:bg-muted sm:flex-row sm:items-center sm:justify-between"><span><span className="block font-mono text-[0.6rem] text-muted-foreground">{event.refId}</span><span className="mt-1 block font-serif text-base">{event.title}</span></span><span className="text-[0.62rem] font-bold uppercase tracking-wider text-primary">Review</span></button>)}</div></section></div>
}
