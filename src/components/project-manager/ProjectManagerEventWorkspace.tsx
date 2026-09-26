import { useState, useMemo } from 'react'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Clock,
  Building2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
  Layers,
  Package,
  Users,
  Hammer,
  ShieldCheck,
  ExternalLink,
  Edit3,
} from 'lucide-react'
import type { PortalEvent, ProcurementItem, Staff, DamageException } from '@/lib/types'
import { getEventDetailSnapshot, computeProductionBanner } from '@/lib/event-detail'
import { useProductionItems } from '@/lib/warehouse-production'
import { usePlanner } from '@/lib/planner'
import type { ProjectPitch } from '@/lib/project-pitch'
import { cn } from '@/lib/utils'

interface ProjectManagerEventWorkspaceProps {
  event: PortalEvent
  staff: Staff[]
  procurement: ProcurementItem[]
  damageExceptions: DamageException[]
  pitches: ProjectPitch[]
  assignedPmName?: string
  onBack: () => void
  onEditRecord: (event: PortalEvent) => void
  onOpenCanvas?: () => void
}

export type WorkspaceSection =
  | 'overview'
  | 'client-pitch'
  | 'registry'
  | 'schedule'
  | 'planning'
  | 'assets'
  | 'manning'
  | 'production'
  | 'oversight'

export function ProjectManagerEventWorkspace({
  event,
  staff,
  procurement,
  damageExceptions,
  pitches,
  assignedPmName = 'Project Manager',
  onBack,
  onEditRecord,
  onOpenCanvas,
}: ProjectManagerEventWorkspaceProps) {
  const [section, setSection] = useState<WorkspaceSection>('overview')

  // Operational snapshots
  const snapshot = useMemo(
    () => getEventDetailSnapshot(event, staff, procurement),
    [event, staff, procurement],
  )

  // Production items
  const allProduction = useProductionItems([event], staff)
  const eventProductionItems = useMemo(
    () => allProduction.filter((item) => item.eventId === event.id),
    [allProduction, event.id],
  )
  const productionBanner = useMemo(
    () => computeProductionBanner(eventProductionItems),
    [eventProductionItems],
  )

  // Planner designs linked to this event
  const { designs } = usePlanner()
  const linkedCanvasDesigns = useMemo(
    () => designs.filter((d) => d.eventId === event.id),
    [designs, event.id],
  )

  // Relevant damage exceptions for this event
  const eventDamages = useMemo(
    () =>
      damageExceptions.filter(
        (d) =>
          d.boundEvent === event.title ||
          d.boundEvent === event.refId ||
          d.boundEvent === event.id,
      ),
    [damageExceptions, event.title, event.refId, event.id],
  )

  // Linked Client Pitch
  const linkedPitch = useMemo(
    () =>
      pitches.find(
        (p) =>
          p.convertedEventId === event.id ||
          p.brief.clientName.toLowerCase() === event.client.toLowerCase(),
      ),
    [pitches, event.id, event.client],
  )

  const pmDisplay = event.projectManagerName || assignedPmName

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-16">
      {/* Top Context Bar: Single-Event Command Header */}
      <div className="border-b border-border/80 bg-card/80 backdrop-blur-md px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 max-w-7xl mx-auto">
          {/* Back & Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition group"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
              <span>Back to Command Center</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="rounded-md border border-border/80 bg-background px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                {event.refId || 'PRT-2026'}
              </span>

              <span
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider border',
                  event.tier?.includes('Tier-1')
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                    : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
                )}
              >
                {event.tier || 'Tier-1 VIP'}
              </span>

              <span
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider border',
                  event.status === 'Completed'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                    : event.status === 'In Production'
                    ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20'
                    : 'bg-muted text-muted-foreground border-border',
                )}
              >
                {event.status}
              </span>
            </div>
          </div>

          {/* Event Master Identity Title & Meta Strip */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {event.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 text-foreground font-semibold">
                  <Building2 className="size-3.5 text-primary" />
                  {event.client}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-primary" />
                  {event.venue}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-primary" />
                  {event.targetDate}
                </span>
                <span className="flex items-center gap-1.5 text-primary font-medium">
                  <User className="size-3.5" />
                  PM: {pmDisplay}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 self-start lg:self-auto">
              <button
                type="button"
                onClick={() => onEditRecord(event)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-accent transition shadow-sm"
              >
                <Edit3 className="size-3.5" />
                Edit Event Record
              </button>
            </div>
          </div>

          {/* Compact Contextual Event Navigation Toolbar (Segmented Tabs) */}
          <div className="flex items-center gap-1 overflow-x-auto border-t border-border/60 pt-3 text-xs scrollbar-none">
            {[
              { id: 'overview', label: 'Overview', icon: Layers },
              { id: 'client-pitch', label: 'Client & Pitch', icon: Sparkles },
              { id: 'registry', label: 'Event Registry', icon: FileText },
              { id: 'schedule', label: 'Schedule', icon: Clock },
              { id: 'planning', label: 'Planning', icon: Edit3 },
              { id: 'assets', label: 'Assets', icon: Package, badge: snapshot.items.length },
              { id: 'manning', label: 'Manning', icon: Users, badge: snapshot.crew.length },
              { id: 'production', label: 'Production', icon: Hammer, badge: eventProductionItems.length },
              { id: 'oversight', label: 'Project Oversight', icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon
              const active = section === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSection(tab.id as WorkspaceSection)}
                  className={cn(
                    'flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 font-semibold transition',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                  )}
                >
                  <Icon className="size-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={cn(
                        'flex size-4 items-center justify-center rounded-full text-[0.6rem] font-bold',
                        active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* 1. OVERVIEW SECTION */}
        {section === 'overview' && (
          <div className="flex flex-col gap-6">
            {/* Strategic KPI & Health Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm backdrop-blur-sm">
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Event Health
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={cn(
                      'text-lg font-bold',
                      snapshot.overallStatus === 'On Track'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400',
                    )}
                  >
                    {snapshot.overallStatus}
                  </span>
                  {snapshot.overallStatus === 'On Track' ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="size-4 text-amber-500" />
                  )}
                </div>
                <p className="text-[0.68rem] text-muted-foreground mt-0.5">
                  Synchronized across cross-team logistics checkpoints
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm backdrop-blur-sm">
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Budget Authorization
                </span>
                <div className="mt-1 text-lg font-bold text-foreground">
                  ₱{event.budget ? event.budget.toLocaleString() : '3,400,000'}
                </div>
                <p className="text-[0.68rem] text-muted-foreground mt-0.5">
                  Approved project expenditure ceiling
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm backdrop-blur-sm">
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Field Manning
                </span>
                <div className="mt-1 text-lg font-bold text-foreground">
                  {snapshot.crew.length} Crew Deployed
                </div>
                <p className="text-[0.68rem] text-muted-foreground mt-0.5">
                  Manning leads & field technicians
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm backdrop-blur-sm">
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Production / Build
                </span>
                <div className="mt-1 text-lg font-bold text-foreground">
                  {productionBanner}
                </div>
                <p className="text-[0.68rem] text-muted-foreground mt-0.5">
                  {eventProductionItems.length} custom fabrication orders
                </p>
              </div>
            </div>

            {/* Department Readiness Matrix */}
            <div className="rounded-2xl border border-border bg-card/60 p-6 shadow-sm">
              <h3 className="font-serif text-base font-semibold text-foreground mb-4">
                Cross-Department Execution Matrix
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Planning */}
                <div className="rounded-xl border border-border/70 bg-background/80 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-muted-foreground">Design & Planning</span>
                      <span className="text-primary font-bold">
                        {linkedCanvasDesigns.length > 0 ? 'Canvas Active' : 'Concept Ready'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {event.moodPlan || 'Concept styling and material specifications approved.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSection('planning')}
                    className="mt-3 text-xs font-semibold text-primary hover:underline text-left"
                  >
                    View Planning Details →
                  </button>
                </div>

                {/* Assets */}
                <div className="rounded-xl border border-border/70 bg-background/80 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-muted-foreground">Asset Fulfillment</span>
                      <span className="text-emerald-600 font-bold">
                        {snapshot.items.length} Items Reserved
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Inventory stock allocated and staged for warehouse packing.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSection('assets')}
                    className="mt-3 text-xs font-semibold text-primary hover:underline text-left"
                  >
                    View Asset Manifest →
                  </button>
                </div>

                {/* Manning */}
                <div className="rounded-xl border border-border/70 bg-background/80 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-muted-foreground">Manning Coverage</span>
                      <span className="text-sky-600 font-bold">
                        {snapshot.crew.filter((c) => c.status === 'Confirmed').length} Confirmed
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Field logistics crew allocated per event shift requirements.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSection('manning')}
                    className="mt-3 text-xs font-semibold text-primary hover:underline text-left"
                  >
                    View Staffing Roster →
                  </button>
                </div>

                {/* Production */}
                <div className="rounded-xl border border-border/70 bg-background/80 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-muted-foreground">Fabrication Floor</span>
                      <span className="text-indigo-600 font-bold">{productionBanner}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Custom scenic and bespoke decorative builds in progress.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSection('production')}
                    className="mt-3 text-xs font-semibold text-primary hover:underline text-left"
                  >
                    View Production Tracking →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. CLIENT & PITCH SECTION */}
        {section === 'client-pitch' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-semibold text-foreground">
                  Client Brief & Proposal Record
                </h3>
                <p className="text-xs text-muted-foreground">
                  Originating concept pitch and client communication logs
                </p>
              </div>

              {linkedPitch && (
                <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary">
                  Linked Pitch: {linkedPitch.status}
                </span>
              )}
            </div>

            {linkedPitch ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Brief */}
                <div className="rounded-2xl border border-border bg-card/60 p-6 flex flex-col gap-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-2">
                    Client & Project Brief
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Client:</span>
                      <p className="font-semibold text-foreground">{linkedPitch.brief.clientName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Contact:</span>
                      <p className="font-semibold text-foreground">{linkedPitch.brief.contactPerson}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Target Date:</span>
                      <p className="font-semibold text-foreground">{linkedPitch.brief.proposedDate}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Venue:</span>
                      <p className="font-semibold text-foreground">{linkedPitch.brief.proposedVenue}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Guest Count:</span>
                      <p className="font-semibold text-foreground">{linkedPitch.brief.estimatedGuests}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Budget Range:</span>
                      <p className="font-semibold text-foreground">{linkedPitch.brief.budgetRange}</p>
                    </div>
                  </div>

                  <div className="text-xs border-t border-border/40 pt-3">
                    <span className="text-muted-foreground font-semibold">Requirements:</span>
                    <p className="mt-1 text-foreground">{linkedPitch.brief.requirements}</p>
                  </div>
                </div>

                {/* Proposal & Feedback */}
                <div className="rounded-2xl border border-border bg-card/60 p-6 flex flex-col gap-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-2">
                    Approved Proposal Concept
                  </h4>

                  <div className="text-xs">
                    <span className="text-muted-foreground">Concept Title:</span>
                    <h5 className="text-sm font-serif font-bold text-foreground mt-0.5">
                      {linkedPitch.proposal.conceptTitle}
                    </h5>
                    <p className="text-muted-foreground mt-2">
                      {linkedPitch.proposal.conceptSummary}
                    </p>
                  </div>

                  <div className="text-xs border-t border-border/40 pt-3">
                    <span className="text-muted-foreground font-semibold">Deliverables:</span>
                    <ul className="list-disc list-inside mt-1 space-y-1 text-foreground">
                      {linkedPitch.proposal.deliverables.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  {linkedPitch.feedback.length > 0 && (
                    <div className="text-xs border-t border-border/40 pt-3">
                      <span className="text-muted-foreground font-semibold">Latest Client Feedback:</span>
                      <p className="mt-1 italic text-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50">
                        &quot;{linkedPitch.feedback[0].notes}&quot;
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
                <Sparkles className="size-8 text-muted-foreground/50 mx-auto mb-2" />
                <h4 className="font-serif text-base font-medium text-foreground">
                  Direct Registry Event
                </h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                  This event was initialized directly via the Event Registry. Client Brief parameters are inherited from the official registry record.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 3. EVENT REGISTRY SECTION */}
        {section === 'registry' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-semibold text-foreground">
                  Official Event Registry Record
                </h3>
                <p className="text-xs text-muted-foreground">
                  Authoritative operational specifications & logistics bounds
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEditRecord(event)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow hover:opacity-90"
              >
                <Edit3 className="size-3.5" />
                Edit Registry Fields
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-border bg-card/60 p-6 flex flex-col gap-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-2">
                  Identification & Logistics
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Reference ID:</span>
                    <p className="font-semibold text-foreground">{event.refId}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Experience Tier:</span>
                    <p className="font-semibold text-foreground">{event.tier}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Assigned Client:</span>
                    <p className="font-semibold text-foreground">{event.client}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Geo Classification:</span>
                    <p className="font-semibold text-foreground">{event.geoClass || 'Local'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Official Venue:</span>
                    <p className="font-semibold text-foreground">{event.venue}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card/60 p-6 flex flex-col gap-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-2">
                  Timing & Site Schedule
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Ingress Date:</span>
                    <p className="font-semibold text-foreground">{event.ingressDate || event.installationStart}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ingress Time Call:</span>
                    <p className="font-semibold text-foreground">{event.ingressTime || '08:00 AM'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Target Execution Date:</span>
                    <p className="font-semibold text-foreground">{event.targetDate}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Full Stop Site Clearance:</span>
                    <p className="font-semibold text-foreground">{event.fullStop || '11:00 PM'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Approved Budget:</span>
                    <p className="font-semibold text-foreground">₱{event.budget ? event.budget.toLocaleString() : '3,400,000'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Current Status:</span>
                    <p className="font-semibold text-foreground">{event.status}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. SCHEDULE SECTION */}
        {section === 'schedule' && (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="font-serif text-lg font-semibold text-foreground">
                Master Project Schedule
              </h3>
              <p className="text-xs text-muted-foreground">
                Critical chronological milestones from build staging to site handover
              </p>
            </div>

            <div className="relative border-l-2 border-primary/30 ml-4 pl-6 space-y-8">
              {/* Ingress */}
              <div className="relative">
                <span className="absolute -left-[31px] top-0 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[0.6rem] font-bold">
                  1
                </span>
                <div>
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-primary">
                    Stage 1 · Site Ingress & Dispatch
                  </span>
                  <h4 className="text-sm font-semibold text-foreground mt-0.5">
                    Fleet Dispatch & Venue Arrival Call
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Date: {event.ingressDate || event.installationStart} at {event.ingressTime || '08:00 AM'} · Venue: {event.venue}
                  </p>
                </div>
              </div>

              {/* Staging & Setup */}
              <div className="relative">
                <span className="absolute -left-[31px] top-0 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[0.6rem] font-bold">
                  2
                </span>
                <div>
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-primary">
                    Stage 2 · Installation & Rigging
                  </span>
                  <h4 className="text-sm font-semibold text-foreground mt-0.5">
                    Scenic Build & Technical Calibration
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Installation window: {event.installationStart} through {event.installationEnd}
                  </p>
                </div>
              </div>

              {/* Execution */}
              <div className="relative">
                <span className="absolute -left-[31px] top-0 flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[0.6rem] font-bold">
                  3
                </span>
                <div>
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-emerald-600">
                    Stage 3 · Event Execution
                  </span>
                  <h4 className="text-sm font-semibold text-foreground mt-0.5">
                    Official Event Showtime
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Date: {event.targetDate} · Full operations & standby manning on-site
                  </p>
                </div>
              </div>

              {/* Full Stop & Egress */}
              <div className="relative">
                <span className="absolute -left-[31px] top-0 flex size-5 items-center justify-center rounded-full bg-muted-foreground text-background text-[0.6rem] font-bold">
                  4
                </span>
                <div>
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                    Stage 4 · Site Clearance
                  </span>
                  <h4 className="text-sm font-semibold text-foreground mt-0.5">
                    Full Stop & Egress Chain of Custody
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Full stop deadline: {event.fullStop || '11:00 PM'} · Return batch reconciliation
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. PLANNING SECTION */}
        {section === 'planning' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-semibold text-foreground">
                  Creative Design & Floor Plan Concepts
                </h3>
                <p className="text-xs text-muted-foreground">
                  Linked 2D/3D Design Canvases and aesthetic mood plan
                </p>
              </div>

              {onOpenCanvas && (
                <button
                  type="button"
                  onClick={onOpenCanvas}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
                >
                  <ExternalLink className="size-3.5" />
                  Open Canvas Workspace
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card/60 p-6 flex flex-col gap-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-2">
                Creative Direction & Aesthetic Mood
              </h4>
              <p className="text-sm text-foreground leading-relaxed">
                {event.moodPlan || 'Emerald velvet draping with gold candelabras and tailored ambient pinpoint lighting.'}
              </p>
            </div>

            {linkedCanvasDesigns.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {linkedCanvasDesigns.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-xl border border-border bg-card/60 p-4 flex flex-col gap-2"
                  >
                    <span className="text-xs font-semibold text-foreground">{d.title}</span>
                    <span className="text-[0.68rem] text-muted-foreground">Created: {d.created}</span>
                    <span className="self-start rounded bg-primary/10 px-2 py-0.5 text-[0.62rem] font-bold text-primary">
                      {d.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-xs text-muted-foreground">
                No custom visual canvas attached yet. Planners can draft a layout in the Design Canvas hub.
              </div>
            )}
          </div>
        )}

        {/* 6. ASSETS SECTION */}
        {section === 'assets' && (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="font-serif text-lg font-semibold text-foreground">
                Allocated Asset Manifest ({snapshot.items.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Warehouse inventory items reserved and staged for this event
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card/60 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/40 font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3.5">Asset Item</th>
                      <th className="px-5 py-3.5">Quantity</th>
                      <th className="px-5 py-3.5">Unit</th>
                      <th className="px-5 py-3.5">Fulfillment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {snapshot.items.map((item) => (
                      <tr key={item.id} className="hover:bg-accent/30 transition">
                        <td className="px-5 py-3 font-semibold text-foreground">{item.name}</td>
                        <td className="px-5 py-3">{item.quantity}</td>
                        <td className="px-5 py-3 text-muted-foreground">{item.unit}</td>
                        <td className="px-5 py-3">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider',
                              item.status === 'Packed'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                : 'bg-primary/10 text-primary',
                            )}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 7. MANNING SECTION */}
        {section === 'manning' && (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="font-serif text-lg font-semibold text-foreground">
                Crew Allocation & Manning ({snapshot.crew.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Assigned workforce leads and field operations staff
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {snapshot.crew.map((member) => (
                <div
                  key={member.id}
                  className="rounded-xl border border-border bg-card/60 p-4 flex flex-col justify-between shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">{member.name}</h4>
                      <p className="text-[0.68rem] text-muted-foreground mt-0.5">{member.role}</p>
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[0.62rem] font-bold',
                        member.status === 'Confirmed'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-amber-500/10 text-amber-600',
                      )}
                    >
                      {member.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. PRODUCTION SECTION */}
        {section === 'production' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-semibold text-foreground">
                  Fabrication & Bespoke Production
                </h3>
                <p className="text-xs text-muted-foreground">
                  Floor fabrication items assigned to Warehouse Production Manager
                </p>
              </div>
              <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary">
                Overall: {productionBanner}
              </span>
            </div>

            {eventProductionItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {eventProductionItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border bg-card/60 p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="text-xs font-semibold text-foreground">{item.itemName}</h4>
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-[0.62rem] font-bold text-primary">
                        {item.stage}
                      </span>
                    </div>
                    <div className="text-[0.68rem] text-muted-foreground">
                      <span>Category: {item.subCategory || 'Bespoke Build'}</span> · <span>Start Date: {item.startDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-xs text-muted-foreground">
                No bespoke fabrication orders pending for this event. Standard catalog assets only.
              </div>
            )}
          </div>
        )}

        {/* 9. PROJECT OVERSIGHT SECTION */}
        {section === 'oversight' && (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="font-serif text-lg font-semibold text-foreground">
                Project Oversight & Risk Assessment
              </h3>
              <p className="text-xs text-muted-foreground">
                Financial, operational and logistical exception monitor
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-card/60 p-5">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Damage Exception Holds
                </span>
                <div className="text-xl font-bold text-foreground mt-2">
                  {eventDamages.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {eventDamages.length === 0
                    ? 'No transit or returned asset damage recorded.'
                    : 'Damage reports flagged during logistics check.'}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card/60 p-5">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Replenishment Critical Deficits
                </span>
                <div className="text-xl font-bold text-foreground mt-2">
                  {snapshot.replenishment.critical}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Items requiring PO requisition to avoid stockout.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card/60 p-5">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Final Sign-off Status
                </span>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                  Pre-Execution Ready
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  All foundational gates confirmed by Project Manager.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
