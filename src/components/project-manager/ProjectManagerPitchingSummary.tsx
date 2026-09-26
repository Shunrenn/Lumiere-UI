import { useState, useMemo } from 'react'
import {
  Sparkles,
  Plus,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react'
import type { ProjectPitch, PitchStatus } from '@/lib/project-pitch'
import { cn } from '@/lib/utils'

interface ProjectManagerPitchingSummaryProps {
  pitches: ProjectPitch[]
  onNewPitch: () => void
  onOpenPitch: (pitch: ProjectPitch) => void
  onConvertToEvent: (pitch: ProjectPitch) => void
}

function getPitchStatusBadge(status: PitchStatus) {
  switch (status) {
    case 'Approved':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
    case 'Converted to Event':
      return 'bg-primary/10 text-primary border-primary/30 font-bold'
    case 'For Revision':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
    case 'Presented':
      return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20'
    case 'For Presentation':
      return 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20'
    case 'Draft':
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

export function ProjectManagerPitchingSummary({
  pitches,
  onNewPitch,
  onOpenPitch,
  onConvertToEvent,
}: ProjectManagerPitchingSummaryProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  const counts = useMemo(() => {
    return {
      all: pitches.length,
      draft: pitches.filter((p) => p.status === 'Draft').length,
      forPresentation: pitches.filter((p) => p.status === 'For Presentation').length,
      presented: pitches.filter((p) => p.status === 'Presented').length,
      revision: pitches.filter((p) => p.status === 'For Revision').length,
      approved: pitches.filter((p) => p.status === 'Approved').length,
      converted: pitches.filter((p) => p.status === 'Converted to Event').length,
    }
  }, [pitches])

  const filteredPitches = useMemo(() => {
    if (selectedStatus === 'all') return pitches
    return pitches.filter((p) => p.status === selectedStatus)
  }, [pitches, selectedStatus])

  return (
    <div className="flex flex-col gap-4">
      {/* Section Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-lg font-semibold text-foreground">
              Client Pitching & Concept Briefs
            </h2>
            <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
              {pitches.length} Total
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Early-stage proposal pipeline before official event registration
          </p>
        </div>

        <button
          type="button"
          onClick={onNewPitch}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg bg-primary/10 border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
        >
          <Plus className="size-3.5" />
          Create New Brief
        </button>
      </div>

      {/* Stage Breakdown Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'Draft' ? 'all' : 'Draft')}
          className={cn(
            'flex flex-col rounded-xl border p-3 cursor-pointer transition',
            selectedStatus === 'Draft' ? 'border-primary bg-primary/10' : 'border-border/70 bg-card/60 hover:bg-accent/40',
          )}
        >
          <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Drafts</span>
          <span className="text-lg font-bold text-foreground mt-0.5">{counts.draft}</span>
        </div>

        <div
          onClick={() => setSelectedStatus(selectedStatus === 'For Presentation' ? 'all' : 'For Presentation')}
          className={cn(
            'flex flex-col rounded-xl border p-3 cursor-pointer transition',
            selectedStatus === 'For Presentation' ? 'border-primary bg-primary/10' : 'border-border/70 bg-card/60 hover:bg-accent/40',
          )}
        >
          <span className="text-[0.65rem] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">For Presentation</span>
          <span className="text-lg font-bold text-foreground mt-0.5">{counts.forPresentation}</span>
        </div>

        <div
          onClick={() => setSelectedStatus(selectedStatus === 'Presented' ? 'all' : 'Presented')}
          className={cn(
            'flex flex-col rounded-xl border p-3 cursor-pointer transition',
            selectedStatus === 'Presented' ? 'border-primary bg-primary/10' : 'border-border/70 bg-card/60 hover:bg-accent/40',
          )}
        >
          <span className="text-[0.65rem] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Presented</span>
          <span className="text-lg font-bold text-foreground mt-0.5">{counts.presented}</span>
        </div>

        <div
          onClick={() => setSelectedStatus(selectedStatus === 'For Revision' ? 'all' : 'For Revision')}
          className={cn(
            'flex flex-col rounded-xl border p-3 cursor-pointer transition',
            selectedStatus === 'For Revision' ? 'border-primary bg-primary/10' : 'border-border/70 bg-card/60 hover:bg-accent/40',
          )}
        >
          <span className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">For Revision</span>
          <span className="text-lg font-bold text-foreground mt-0.5">{counts.revision}</span>
        </div>

        <div
          onClick={() => setSelectedStatus(selectedStatus === 'Approved' ? 'all' : 'Approved')}
          className={cn(
            'flex flex-col rounded-xl border p-3 cursor-pointer transition',
            selectedStatus === 'Approved' ? 'border-primary bg-primary/10' : 'border-border/70 bg-card/60 hover:bg-accent/40',
          )}
        >
          <span className="text-[0.65rem] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Approved</span>
          <span className="text-lg font-bold text-foreground mt-0.5">{counts.approved}</span>
        </div>

        <div
          onClick={() => setSelectedStatus(selectedStatus === 'Converted to Event' ? 'all' : 'Converted to Event')}
          className={cn(
            'flex flex-col rounded-xl border p-3 cursor-pointer transition',
            selectedStatus === 'Converted to Event' ? 'border-primary bg-primary/10' : 'border-border/70 bg-card/60 hover:bg-accent/40',
          )}
        >
          <span className="text-[0.65rem] font-bold uppercase tracking-wider text-primary">Converted</span>
          <span className="text-lg font-bold text-foreground mt-0.5">{counts.converted}</span>
        </div>
      </div>

      {/* Pitches List or Honest Empty State */}
      {filteredPitches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPitches.map((pitch) => (
            <div
              key={pitch.id}
              className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card/70 p-5 shadow-sm backdrop-blur-sm transition hover:border-primary/50"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      'rounded-md px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider border',
                      getPitchStatusBadge(pitch.status),
                    )}
                  >
                    {pitch.status}
                  </span>
                  <span className="text-[0.65rem] text-muted-foreground">
                    Target: {pitch.brief.proposedDate || 'TBD'}
                  </span>
                </div>

                <h3 className="font-serif text-base font-semibold text-foreground mt-2 line-clamp-1">
                  {pitch.brief.clientName}
                </h3>
                <p className="text-xs text-primary font-medium line-clamp-1">
                  {pitch.proposal.conceptTitle || 'Event Concept Proposal'}
                </p>

                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {pitch.proposal.conceptSummary || pitch.brief.requirements || 'No concept summary documented yet.'}
                </p>

                <div className="mt-3 flex flex-col gap-1 text-[0.68rem] text-muted-foreground border-t border-border/40 pt-2.5">
                  <div className="flex items-center justify-between">
                    <span>Contact: {pitch.brief.contactPerson || 'Not provided'}</span>
                    <span>Guests: {pitch.brief.estimatedGuests || 'TBD'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Budget Range: {pitch.brief.budgetRange || 'Under Assessment'}</span>
                    <span>Venue: {pitch.brief.proposedVenue || 'Pending Selection'}</span>
                  </div>
                </div>
              </div>

              {/* Action Strip */}
              <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onOpenPitch(pitch)}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground transition"
                >
                  Manage Brief & Proposal
                </button>

                {pitch.status === 'Approved' ? (
                  <button
                    type="button"
                    onClick={() => onConvertToEvent(pitch)}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    Convert to Event
                    <ArrowRight className="size-3" />
                  </button>
                ) : pitch.status === 'Converted to Event' ? (
                  <span className="text-[0.68rem] font-bold text-primary flex items-center gap-1">
                    <CheckCircle2 className="size-3" />
                    In Event Registry
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenPitch(pitch)}
                    className="text-xs font-semibold text-primary inline-flex items-center gap-1"
                  >
                    Review
                    <ChevronRight className="size-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Honest Empty State */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/40 p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
            <Sparkles className="size-6" />
          </div>
          <h3 className="font-serif text-base font-medium text-foreground">
            No active client pitches in this stage
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mt-1 mb-4">
            Client pitching captures client briefs, proposal concepts, and feedback before official conversion into registered events.
          </p>
          <button
            type="button"
            onClick={onNewPitch}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow transition hover:opacity-90"
          >
            <Plus className="size-3.5" />
            Create First Client Pitch Brief
          </button>
        </div>
      )}
    </div>
  )
}
