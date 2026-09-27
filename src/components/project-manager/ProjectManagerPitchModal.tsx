import { useState } from 'react'
import {
  X,
  Sparkles,
  CheckCircle2,
  MessageSquare,
  Trash2,
} from 'lucide-react'
import type { ProjectPitch, PitchStatus, ClientBrief, ProposalDetails } from '@/lib/project-pitch'
import { cn } from '@/lib/utils'

interface ProjectManagerPitchModalProps {
  open: boolean
  onClose: () => void
  pitch: ProjectPitch | null
  onSave: (pitch: ProjectPitch) => Promise<void> | void
  onAddFeedback?: (pitchId: string, notes: string, author?: string, newStatus?: PitchStatus) => Promise<void> | void
  onDelete?: (pitchId: string) => void
  onConvertToEvent: (pitch: ProjectPitch) => void
  currentUserEmail: string
  currentUserName: string
}

type TabKey = 'brief' | 'proposal' | 'feedback'

export function ProjectManagerPitchModal({
  open,
  onClose,
  pitch,
  onSave,
  onAddFeedback,
  onDelete,
  onConvertToEvent,
  currentUserEmail,
  currentUserName,
}: ProjectManagerPitchModalProps) {
  if (!open) return null

  const isNew = !pitch
  const [activeTab, setActiveTab] = useState<TabKey>('brief')
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [status, setStatus] = useState<PitchStatus>(pitch?.status || 'Draft')
  const [brief, setBrief] = useState<ClientBrief>(
    pitch?.brief || {
      clientName: '',
      contactPerson: '',
      contactEmail: '',
      contactPhone: '',
      eventType: 'Corporate Gala',
      proposedDate: '',
      proposedVenue: '',
      estimatedGuests: 150,
      budgetRange: '₱2,000,000 – ₱4,000,000',
      requirements: '',
      notes: '',
    },
  )

  const [proposal, setProposal] = useState<ProposalDetails>(
    pitch?.proposal || {
      conceptTitle: '',
      conceptSummary: '',
      scopeOfWork: '',
      deliverables: ['Custom Stage Rigging', 'Atmospheric Lighting', 'VIP Lounge Seating'],
      estimatedBudget: 3500000,
      proposedTimeline: '6 Weeks Production & Build',
      notes: '',
    },
  )

  const [newFeedbackNote, setNewFeedbackNote] = useState('')
  const [feedbackAuthor, setFeedbackAuthor] = useState(currentUserName || 'Sofia Del Rosario')
  const [feedbackStatusUpdate, setFeedbackStatusUpdate] = useState<PitchStatus | ''>('')

  const handleSave = async () => {
    if (!brief.clientName.trim()) {
      alert('Client Name is required')
      return
    }

    setSubmitting(true)
    try {
      const updated: ProjectPitch = {
        id: pitch?.id || '',
        createdAt: pitch?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assignedPmName: pitch?.assignedPmName || currentUserName || 'Project Manager',
        assignedPmEmail: pitch?.assignedPmEmail || currentUserEmail || '',
        status,
        brief,
        proposal,
        feedback: pitch?.feedback || [],
        convertedEventId: pitch?.convertedEventId,
      }

      await onSave(updated)
      onClose()
    } catch (err: any) {
      alert(`Failed to save pitch: ${err?.message || 'Unknown error'}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddFeedback = async () => {
    if (!newFeedbackNote.trim() || !pitch) return

    setSubmitting(true)
    try {
      const newStatus = (feedbackStatusUpdate || status) as PitchStatus
      if (onAddFeedback) {
        await onAddFeedback(pitch.id, newFeedbackNote.trim(), feedbackAuthor, newStatus)
      } else {
        const updated: ProjectPitch = {
          ...pitch,
          status: newStatus,
          brief,
          proposal,
        }
        await onSave(updated)
      }

      setStatus(newStatus)
      setNewFeedbackNote('')
      setFeedbackStatusUpdate('')
    } catch (err: any) {
      alert(`Failed to add feedback: ${err?.message || 'Unknown error'}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-3xl max-h-[90vh] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-semibold text-foreground">
                {isNew ? 'New Client Pitch Brief' : `${brief.clientName || 'Client Pitch'}`}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isNew ? 'Draft proposal brief and requirements' : `Status: ${status} · PM: ${pitch?.assignedPmName}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Selector */}
            {status === 'Converted to Event' ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 text-xs font-semibold border border-emerald-500/20">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                Converted
              </span>
            ) : (
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PitchStatus)}
                className="rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-semibold text-foreground outline-none focus:border-primary"
              >
                <option value="Draft">Draft</option>
                <option value="For Presentation">For Presentation</option>
                <option value="Presented">Presented</option>
                <option value="For Revision">For Revision</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-border px-6 bg-muted/20">
          <button
            type="button"
            onClick={() => setActiveTab('brief')}
            className={cn(
              'px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition',
              activeTab === 'brief'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            1. Client Brief
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('proposal')}
            className={cn(
              'px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition',
              activeTab === 'proposal'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            2. Concept & Proposal
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            className={cn(
              'px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5',
              activeTab === 'feedback'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            3. Client Feedback
            {pitch?.feedback && pitch.feedback.length > 0 && (
              <span className="rounded-full bg-primary/20 px-1.5 py-0.2 text-[0.6rem] text-primary">
                {pitch.feedback.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'brief' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Client / Organization Name *
                </label>
                <input
                  type="text"
                  value={brief.clientName}
                  onChange={(e) => setBrief({ ...brief, clientName: e.target.value })}
                  placeholder="e.g. Apex Global Forum"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={brief.contactPerson}
                  onChange={(e) => setBrief({ ...brief, contactPerson: e.target.value })}
                  placeholder="e.g. Michelle Tan"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={brief.contactEmail}
                  onChange={(e) => setBrief({ ...brief, contactEmail: e.target.value })}
                  placeholder="e.g. contact@client.com"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={brief.contactPhone}
                  onChange={(e) => setBrief({ ...brief, contactPhone: e.target.value })}
                  placeholder="e.g. +63 917 123 4567"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Proposed Target Date
                </label>
                <input
                  type="date"
                  value={brief.proposedDate}
                  onChange={(e) => setBrief({ ...brief, proposedDate: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Proposed Venue
                </label>
                <input
                  type="text"
                  value={brief.proposedVenue}
                  onChange={(e) => setBrief({ ...brief, proposedVenue: e.target.value })}
                  placeholder="e.g. Shangri-La Grand Ballroom"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Estimated Guest Count
                </label>
                <input
                  type="number"
                  value={brief.estimatedGuests}
                  onChange={(e) => setBrief({ ...brief, estimatedGuests: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Budget Range
                </label>
                <input
                  type="text"
                  value={brief.budgetRange}
                  onChange={(e) => setBrief({ ...brief, budgetRange: e.target.value })}
                  placeholder="e.g. ₱3M – ₱5M"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Key Client Requirements & Aesthetic Direction
                </label>
                <textarea
                  rows={3}
                  value={brief.requirements}
                  onChange={(e) => setBrief({ ...brief, requirements: e.target.value })}
                  placeholder="e.g. Black-tie elegance, emerald velvet drapes, warm ambient crystal lighting..."
                  className="mt-1 w-full rounded-lg border border-input bg-background p-3 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
            </div>
          )}

          {activeTab === 'proposal' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Concept Title
                </label>
                <input
                  type="text"
                  value={proposal.conceptTitle}
                  onChange={(e) => setProposal({ ...proposal, conceptTitle: e.target.value })}
                  placeholder="e.g. Celestial Horizon Presidential Gala"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Concept Summary & Creative Narrative
                </label>
                <textarea
                  rows={3}
                  value={proposal.conceptSummary}
                  onChange={(e) => setProposal({ ...proposal, conceptSummary: e.target.value })}
                  placeholder="Narrative summary pitched to the client..."
                  className="mt-1 w-full rounded-lg border border-input bg-background p-3 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                    Estimated Budget (PHP)
                  </label>
                  <input
                    type="number"
                    value={proposal.estimatedBudget}
                    onChange={(e) => setProposal({ ...proposal, estimatedBudget: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                    Proposed Build / Lead Timeline
                  </label>
                  <input
                    type="text"
                    value={proposal.proposedTimeline}
                    onChange={(e) => setProposal({ ...proposal, proposedTimeline: e.target.value })}
                    placeholder="e.g. 4 Weeks Fabrication & Logistics"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Scope of Work & Deliverables
                </label>
                <textarea
                  rows={3}
                  value={proposal.scopeOfWork}
                  onChange={(e) => setProposal({ ...proposal, scopeOfWork: e.target.value })}
                  placeholder="Key deliverables agreed upon..."
                  className="mt-1 w-full rounded-lg border border-input bg-background p-3 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="flex flex-col gap-6">
              {/* Add Feedback Input Box */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 flex flex-col gap-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <MessageSquare className="size-3.5 text-primary" />
                  Log Client Feedback or Meeting Notes
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={feedbackAuthor}
                    onChange={(e) => setFeedbackAuthor(e.target.value)}
                    placeholder="Feedback Author / PM"
                    className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                  />

                  <select
                    value={feedbackStatusUpdate}
                    onChange={(e) => setFeedbackStatusUpdate(e.target.value as PitchStatus)}
                    className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                  >
                    <option value="">Update Status (Optional)</option>
                    <option value="For Revision">Set to: For Revision</option>
                    <option value="Approved">Set to: Approved</option>
                    <option value="Presented">Set to: Presented</option>
                    <option value="Rejected">Set to: Rejected</option>
                  </select>
                </div>

                <textarea
                  rows={2}
                  value={newFeedbackNote}
                  onChange={(e) => setNewFeedbackNote(e.target.value)}
                  placeholder="Enter notes from the pitch presentation or client call..."
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground outline-none focus:border-primary"
                />

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddFeedback}
                    disabled={!newFeedbackNote.trim()}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
                  >
                    Log Feedback Entry
                  </button>
                </div>
              </div>

              {/* Revision History List */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Feedback History ({pitch?.feedback?.length || 0})
                </h4>

                {pitch?.feedback && pitch.feedback.length > 0 ? (
                  pitch.feedback.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border bg-background p-3.5 flex flex-col gap-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between text-[0.68rem] text-muted-foreground">
                        <span className="font-semibold text-foreground">{item.author}</span>
                        <span>{new Date(item.date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-foreground">{item.notes}</p>
                      {item.stageChangedTo && (
                        <span className="self-start rounded bg-primary/10 px-2 py-0.5 text-[0.62rem] font-bold text-primary mt-1">
                          Stage updated to: {item.stageChangedTo}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No client feedback logged yet. Use the box above to log pitch notes.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-muted/40">
          <div>
            {!isNew && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Delete this client pitch?')) {
                    onDelete(pitch.id)
                    onClose()
                  }
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-destructive hover:underline"
              >
                <Trash2 className="size-3.5" />
                Delete Pitch
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>

            {pitch?.convertedEventId ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 text-xs font-semibold border border-emerald-500/20">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                Converted
              </span>
            ) : status === 'Approved' ? (
              <button
                type="button"
                disabled={submitting}
                onClick={async () => {
                  await handleSave()
                  if (pitch) {
                    onConvertToEvent(pitch)
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 className="size-3.5" />
                {submitting ? 'Converting...' : 'Convert to Event'}
              </button>
            ) : null}

            <button
              type="button"
              disabled={submitting}
              onClick={handleSave}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow transition hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Brief'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
