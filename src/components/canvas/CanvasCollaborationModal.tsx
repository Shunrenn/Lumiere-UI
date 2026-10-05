import { useEffect, useMemo, useState } from 'react'
import { X, Users, UserPlus, Shield, Check, AlertCircle, RefreshCw, Trash2 } from 'lucide-react'
import {
  fetchCanvasAccessApi,
  fetchCollaboratorCandidatesApi,
  grantCanvasAccessApi,
  updateCanvasAccessApi,
  revokeCanvasAccessApi,
  type CanvasAccessLevel,
  type CanvasCollaboratorDto,
  type CollaboratorCandidateDto,
} from '@/features/canvas/api/canvasApi'
import { cn } from '@/shared/utils'

interface CanvasCollaborationModalProps {
  eventId: string
  eventTitle?: string
  onClose: () => void
}

const ACCESS_LEVEL_META: Record<
  CanvasAccessLevel,
  { label: string; badge: string; description: string }
> = {
  CO_EDIT: {
    label: 'Can edit',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    description: 'Can add and edit items on the canvas.',
  },
  COMMENT: {
    label: 'Can comment',
    badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
    description: 'Can view the canvas and leave comments, but cannot edit it.',
  },
  VIEW: {
    label: 'Can view',
    badge: 'bg-muted text-muted-foreground border-border',
    description: 'Can view the canvas without making changes.',
  },
}

export function CanvasCollaborationModal({
  eventId,
  eventTitle,
  onClose,
}: CanvasCollaborationModalProps) {
  const [collaborators, setCollaborators] = useState<CanvasCollaboratorDto[]>([])
  const [candidates, setCandidates] = useState<CollaboratorCandidateDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Candidate selection & add form
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('')
  const [selectedAccessLevel, setSelectedAccessLevel] = useState<CanvasAccessLevel>('CO_EDIT')
  const [candidateSearch, setCandidateSearch] = useState('')
  const [isGranting, setIsGranting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // In-line update / revoke state
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [revokingUserId, setRevokingUserId] = useState<string | null>(null)

  const loadAccessData = async () => {
    setIsLoading(true)
    setLoadError(null)
    setActionError(null)
    try {
      const [collabs, cands] = await Promise.all([
        fetchCanvasAccessApi(eventId),
        fetchCollaboratorCandidatesApi(eventId),
      ])
      setCollaborators(collabs)
      setCandidates(cands)
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load canvas access records.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAccessData()
  }, [eventId])

  // Filter candidates who are already collaborators and apply search query
  const eligibleCandidates = useMemo(() => {
    const existingIds = new Set(collaborators.map((c) => c.userId))
    const filtered = candidates.filter((c) => !existingIds.has(c.userId))

    const q = candidateSearch.trim().toLowerCase()
    const matching = q
      ? filtered.filter(
          (c) =>
            c.displayName.toLowerCase().includes(q) ||
            c.role.toLowerCase().includes(q) ||
            (c.email && c.email.toLowerCase().includes(q))
        )
      : filtered

    // Prioritize Event Planner candidates at the top of the list
    return [...matching].sort((a, b) => {
      const aIsPlanner = a.isEventPlanner || a.role.toLowerCase().includes('planner') ? 1 : 0
      const bIsPlanner = b.isEventPlanner || b.role.toLowerCase().includes('planner') ? 1 : 0
      if (aIsPlanner !== bIsPlanner) return bIsPlanner - aIsPlanner
      return a.displayName.localeCompare(b.displayName)
    })
  }, [candidates, collaborators, candidateSearch])

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCandidateId || isGranting) return

    setIsGranting(true)
    setActionError(null)
    setActionSuccess(null)

    const target = candidates.find((c) => c.userId === selectedCandidateId)
    const result = await grantCanvasAccessApi(eventId, selectedCandidateId, selectedAccessLevel)

    setIsGranting(false)
    if (result.ok) {
      setActionSuccess(`Access successfully granted to ${target?.displayName || 'user'}.`)
      setSelectedCandidateId('')
      setCandidateSearch('')
      // Refetch canonical access records
      const updated = await fetchCanvasAccessApi(eventId)
      setCollaborators(updated)
    } else {
      setActionError(result.error || 'Failed to grant canvas access.')
    }
  }

  const handleUpdateAccess = async (targetUserId: string, newLevel: CanvasAccessLevel) => {
    setUpdatingUserId(targetUserId)
    setActionError(null)
    setActionSuccess(null)

    const result = await updateCanvasAccessApi(eventId, targetUserId, newLevel)
    setUpdatingUserId(null)
    if (result.ok) {
      setActionSuccess('Access level updated.')
      setCollaborators((prev) =>
        prev.map((c) => (c.userId === targetUserId ? { ...c, accessLevel: newLevel } : c))
      )
    } else {
      setActionError(result.error || 'Failed to update access level.')
    }
  }

  const handleRevokeAccess = async (targetUserId: string) => {
    setUpdatingUserId(targetUserId)
    setActionError(null)
    setActionSuccess(null)

    const result = await revokeCanvasAccessApi(eventId, targetUserId)
    setUpdatingUserId(null)
    setRevokingUserId(null)
    if (result.ok) {
      setActionSuccess('Collaborator access revoked.')
      setCollaborators((prev) => prev.filter((c) => c.userId !== targetUserId))
    } else {
      setActionError(result.error || 'Failed to revoke canvas access.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="collaboration-title"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/40 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Users className="size-4.5" />
            </span>
            <div>
              <h2 id="collaboration-title" className="font-serif text-sm font-semibold text-foreground">
                Share canvas
              </h2>
              <p className="text-[0.62rem] text-muted-foreground">
                {eventTitle ? `Invite people to "${eventTitle}"` : 'Invite people and choose what they can do.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Feedback banners */}
        {actionError && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span className="flex-1">{actionError}</span>
            <button type="button" onClick={() => setActionError(null)}>
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {actionSuccess && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-800 dark:text-emerald-300">
            <Check className="size-4 shrink-0 text-emerald-600" />
            <span className="flex-1">{actionSuccess}</span>
            <button type="button" onClick={() => setActionSuccess(null)}>
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Grant Access Section */}
          <section className="rounded-xl border border-border bg-muted/30 p-4">
            <h3 className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-foreground mb-3">
              <UserPlus className="size-3.5 text-primary" />
              Invite people
            </h3>

            <form onSubmit={handleGrantAccess} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Candidate Selector */}
                <div>
                  <label className="block text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Add people
                  </label>
                  <select
                    value={selectedCandidateId}
                    onChange={(e) => setSelectedCandidateId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring/30"
                  >
                    <option value="">Choose a person...</option>
                    {eligibleCandidates.map((c) => (
                      <option key={c.userId} value={c.userId}>
                        {c.displayName} ({c.role}){c.isEventPlanner ? ' ★ Event Planner' : ''}
                      </option>
                    ))}
                  </select>
                  {eligibleCandidates.length === 0 && !isLoading && (
                    <p className="mt-1 text-[0.58rem] text-muted-foreground">
                      No additional eligible candidate accounts available.
                    </p>
                  )}
                </div>

                {/* Access Level Selector */}
                <div>
                  <label className="block text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Permission
                  </label>
                  <select
                    value={selectedAccessLevel}
                    onChange={(e) => setSelectedAccessLevel(e.target.value as CanvasAccessLevel)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring/30"
                  >
                    <option value="CO_EDIT">Can edit</option>
                    <option value="COMMENT">Can comment</option>
                    <option value="VIEW">Can view</option>
                  </select>
                </div>
              </div>

              {/* Helper text for chosen level */}
              <p className="text-[0.62rem] text-muted-foreground bg-background/60 rounded-md p-2 border border-border">
                {ACCESS_LEVEL_META[selectedAccessLevel].description}
              </p>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={!selectedCandidateId || isGranting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:opacity-90 disabled:opacity-40 cursor-pointer"
                >
                  <UserPlus className="size-3.5" />
                  {isGranting ? 'Sharing...' : 'Share'}
                </button>
              </div>
            </form>
          </section>

          {/* Current Collaborators List */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-foreground">
                <Shield className="size-3.5 text-primary" />
                People with access ({collaborators.length})
              </h3>
              <button
                type="button"
                onClick={loadAccessData}
                disabled={isLoading}
                aria-label="Refresh list"
                className="text-[0.58rem] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <RefreshCw className={cn('size-3', isLoading && 'animate-spin')} />
                Refresh
              </button>
            </div>

            {isLoading && collaborators.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                <RefreshCw className="size-5 text-primary animate-spin" />
                <p className="text-xs text-muted-foreground">Loading active collaborator list...</p>
              </div>
            ) : loadError && collaborators.length === 0 ? (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-center text-xs text-destructive">
                <AlertCircle className="size-5 mx-auto mb-1.5" />
                <p className="font-semibold">{loadError}</p>
                <button
                  type="button"
                  onClick={loadAccessData}
                  className="mt-2 text-[0.6rem] font-bold uppercase tracking-wider text-destructive underline"
                >
                  Retry
                </button>
              </div>
            ) : collaborators.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                <Users className="size-6 mx-auto mb-2 text-muted-foreground/60" />
                <p className="font-medium text-foreground/80">No additional collaborators</p>
                <p className="text-[0.62rem] mt-0.5">
                  Only you have access right now.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
                {collaborators.map((c) => {
                  const meta = ACCESS_LEVEL_META[c.accessLevel]
                  const isUpdating = updatingUserId === c.userId
                  const isConfirmingRevoke = revokingUserId === c.userId

                  return (
                    <div
                      key={c.userId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-muted/20 transition"
                    >
                      {/* User details */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold uppercase tracking-wide text-primary">
                          {c.displayName.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {c.displayName}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            {c.role && (
                              <span className="rounded border border-border bg-muted px-1.5 py-0.2 text-[0.55rem] font-medium uppercase tracking-wider text-muted-foreground">
                                {c.role}
                              </span>
                            )}
                            {c.email && (
                              <span className="text-[0.6rem] text-muted-foreground truncate">
                                · {c.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Access level control & actions */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        {isConfirmingRevoke ? (
                          <div className="flex items-center gap-1.5 bg-destructive/10 border border-destructive/20 rounded-lg p-1">
                            <span className="text-[0.58rem] font-semibold text-destructive px-1">
                              Revoke?
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRevokeAccess(c.userId)}
                              disabled={isUpdating}
                              className="rounded bg-destructive px-2 py-1 text-[0.55rem] font-bold uppercase text-destructive-foreground hover:bg-destructive/90"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setRevokingUserId(null)}
                              className="rounded border border-border bg-card px-2 py-1 text-[0.55rem] font-bold uppercase text-muted-foreground hover:bg-muted"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <>
                            <select
                              value={c.accessLevel}
                              disabled={isUpdating}
                              onChange={(e) =>
                                handleUpdateAccess(c.userId, e.target.value as CanvasAccessLevel)
                              }
                              className={cn(
                                'rounded-lg border px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-wider outline-none focus:ring-1 focus:ring-ring/30 cursor-pointer',
                                meta.badge,
                              )}
                            >
                              <option value="CO_EDIT">Can edit</option>
                              <option value="COMMENT">Can comment</option>
                              <option value="VIEW">Can view</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => setRevokingUserId(c.userId)}
                              disabled={isUpdating}
                              title="Revoke access"
                              aria-label={`Revoke access for ${c.displayName}`}
                              className="inline-flex size-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive transition cursor-pointer"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-border bg-muted/40 px-6 py-3 text-muted-foreground">
          <p className="text-[0.58rem]">
            Permissions update as soon as you share or change them.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-card px-4 py-1.5 text-[0.62rem] font-bold uppercase tracking-wider text-foreground hover:bg-muted transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
