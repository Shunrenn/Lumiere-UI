import { useEffect, useState } from 'react'
import {
  X,
  MapPin,
  CalendarClock,
  ShieldCheck,
  ShieldAlert,
  UserRound,
  Banknote,
  Camera,
  CheckCircle2,
  XCircle,
  Scale,
  AlertTriangle,
  Wrench,
  Ban,
  UserCheck2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DamageException, DamageVerdict } from '@/lib/types'

type ResolvableVerdict = Exclude<DamageVerdict, 'Pending Verdict'>
type AuditVerdict = 'Repair' | 'Write-off'

// Copy + styling for the revalidation confirmation step, keyed by verdict.
const verdictConfig: Record<
  ResolvableVerdict,
  { label: string; confirmTitle: string; confirmBody: string; tone: string; Icon: typeof Scale }
> = {
  Validated: {
    label: 'Validate Damage',
    confirmTitle: 'Confirm Damage Validation',
    confirmBody:
      'This will validate the exception and post the estimated liability against the inventory ledger. This action is logged to the audit trail.',
    tone: 'text-emerald-700',
    Icon: CheckCircle2,
  },
  Dismissed: {
    label: 'Dismiss Claim',
    confirmTitle: 'Confirm Claim Dismissal',
    confirmBody:
      'This will dismiss the exception with no financial impact. The asset will be returned to available stock.',
    tone: 'text-destructive',
    Icon: XCircle,
  },
  'Held for Audit': {
    label: 'Hold for Audit',
    confirmTitle: 'Hold Exception for Audit',
    confirmBody:
      'This places the exception on a formal audit hold. The asset is frozen and liability remains open pending review.',
    tone: 'text-amber-700',
    Icon: Scale,
  },
  'Pending Second Sign-off': {
    label: 'Sign Off',
    confirmTitle: 'Confirm Sign-off',
    confirmBody: 'This records your Executive sign-off on this audit-held exception.',
    tone: 'text-amber-700',
    Icon: UserCheck2,
  },
  Repair: {
    label: 'Sign Off · Repair',
    confirmTitle: 'Confirm Executive Sign-off · Repair',
    confirmBody:
      'This records your Executive sign-off on this audit-held exception, recommending Repair. A second, different Executive is required to finalize the verdict.',
    tone: 'text-sky-700',
    Icon: Wrench,
  },
  'Write-off': {
    label: 'Sign Off · Write-off',
    confirmTitle: 'Confirm Executive Sign-off · Write-off',
    confirmBody:
      'This records your Executive sign-off on this audit-held exception, recommending Write-off. A second, different Executive is required to finalize the verdict.',
    tone: 'text-destructive',
    Icon: Ban,
  },
}

interface Props {
  exception: DamageException | null
  onClose: () => void
  onResolve: (id: string, verdict: Exclude<DamageVerdict, 'Pending Verdict'>, note: string) => void
  // When true, the modal is editable (Executive can record verdict + supervisory note).
  // When false, view-only (Admin oversight).
  editable?: boolean
  // The signed-in Executive's identity, used to (a) attribute sign-offs and
  // (b) block the same Executive from providing both the first and second
  // sign-off on an audit-held exception.
  currentExecutiveEmail?: string
  currentExecutiveName?: string
  // Count of Executive login accounts currently active (not Suspended) in
  // Workforce Management. Below 2, a second, different Executive can never
  // complete the sign-off — the modal surfaces a blocker note instead.
  activeExecutiveCount?: number
}

const currency = (n: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n)

export function DamageVerdictModal({
  exception,
  onClose,
  onResolve,
  editable = false,
  currentExecutiveEmail = '',
  currentExecutiveName: _currentExecutiveName = '',
  activeExecutiveCount = 2,
}: Props) {
  if (!exception) return null

  const [note, setNote] = useState('')
  // Holds the verdict awaiting confirmation in the revalidation step.
  const [pendingVerdict, setPendingVerdict] = useState<ResolvableVerdict | null>(null)

  // Sync supervisory note when exception changes
  useEffect(() => {
    // The supervisory note field may be stored separately in the exception
    // For now, start with empty note when opening — user can fill it in
    setNote('')
    setPendingVerdict(null)
  }, [exception])

  const showControls = editable
  const isHeldForAudit = exception.status === 'Held for Audit'
  const isPendingSecondSignOff = exception.status === 'Pending Second Sign-off'
  const isFinalAuditVerdict = exception.status === 'Repair' || exception.status === 'Write-off'

  // Whether the signed-in Executive is the same one who provided the first
  // sign-off — they cannot also provide the second, confirming sign-off.
  const isSameExecutiveAsFirstSignOff =
    isPendingSecondSignOff &&
    !!exception.firstSignOff &&
    !!currentExecutiveEmail &&
    exception.firstSignOff.executiveEmail === currentExecutiveEmail

  // A second, different Executive account must be active to complete the
  // sign-off. This is independent of who is currently signed in.
  const secondSignOffBlockedByRoster = isPendingSecondSignOff && activeExecutiveCount < 2

  const confirm = () => {
    if (!pendingVerdict) return
    onResolve(exception.id, pendingVerdict, note.trim())
    setNote('')
    setPendingVerdict(null)
  }

  const closeAll = () => {
    setPendingVerdict(null)
    onClose()
  }

  const otherAuditVerdict = (verdict: AuditVerdict): AuditVerdict =>
    verdict === 'Repair' ? 'Write-off' : 'Repair'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Damage verdict for ${exception.assetName}`}
      onClick={closeAll}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between bg-sidebar px-6 py-5 text-sidebar-foreground">
          <div className="min-w-0">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/60">
              Exception {exception.logId} · Visual Verdict
            </p>
            <h2 className="mt-1 font-serif text-2xl font-medium leading-tight text-sidebar-primary text-balance">
              {exception.assetName}
            </h2>
            <p className="mt-1 text-[0.65rem] uppercase tracking-[0.15em] text-sidebar-foreground/60">
              SKU: {exception.assetSku}
            </p>
          </div>
          <button
            type="button"
            onClick={closeAll}
            className="text-sidebar-foreground/70 transition hover:text-sidebar-primary"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          {/* Field-captured evidence photo uploaded by ground crew */}
          {exception.noPhotographicEvidence ? (
            <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
              <AlertTriangle className="size-4 shrink-0" />
              <p className="text-xs font-semibold uppercase tracking-[0.1em]">
                No photographic evidence captured on site
              </p>
            </div>
          ) : (
            <figure className="overflow-hidden rounded-lg border border-border bg-muted/40">
              <div className="relative">
                <img
                  src={exception.imageUrl || '/placeholder.svg'}
                  alt={`Field-captured damage evidence for ${exception.assetName}`}
                  className="aspect-video w-full object-cover"
                />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-foreground/70 px-3 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em] text-background backdrop-blur-sm">
                  <Camera className="size-3" />
                  Field Capture
                </span>
              </div>
              <figcaption className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground">
                <span>Uploaded by {exception.reportingOfficer} · {exception.officerRole}</span>
                <span className="font-mono normal-case tracking-normal">{exception.capturedAt}</span>
              </figcaption>
            </figure>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <UserRound className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Reporting Officer
                </p>
                <p className="mt-0.5 text-sm text-card-foreground">{exception.reportingOfficer}</p>
                <p className="text-[0.65rem] text-muted-foreground">{exception.officerRole}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Bound Event
                </p>
                <p className="mt-0.5 text-sm text-card-foreground">{exception.boundEvent}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  GPS Telemetry
                </p>
                <p className="mt-0.5 font-mono text-xs text-card-foreground">{exception.gps}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Captured At
                </p>
                <p className="mt-0.5 font-mono text-xs text-card-foreground">{exception.capturedAt}</p>
              </div>
            </div>
          </div>

          {/* Damage + EXIF banner */}
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Reported Damage
                </p>
                <p className="mt-1 text-sm font-semibold text-card-foreground">{exception.damageType}</p>
              </div>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em]',
                  exception.exifVerified
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-800',
                )}
              >
                <ShieldCheck className="size-3" />
                {exception.exifVerified ? 'EXIF Authenticated' : 'EXIF Unverified'}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3">
              <Banknote className="size-4 text-primary" />
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Estimated Liability ·{' '}
                <span className="text-card-foreground">{currency(exception.estimatedCost)}</span>
              </p>
            </div>
          </div>

          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Field Notes
            </p>
            <p className="mt-1 text-sm italic leading-relaxed text-muted-foreground">
              {exception.notes}
            </p>
          </div>

          {/* Sign-off trail for audit-held exceptions */}
          {(exception.firstSignOff || exception.secondSignOff) && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Executive Sign-off Trail
              </p>
              {exception.firstSignOff && (
                <div className="flex items-start gap-2 text-xs text-card-foreground">
                  <UserCheck2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <p>
                    <span className="font-semibold">{exception.firstSignOff.executiveName}</span> signed off{' '}
                    <span className="font-semibold">{exception.firstSignOff.verdict}</span> ·{' '}
                    {exception.firstSignOff.timestamp}
                  </p>
                </div>
              )}
              {exception.secondSignOff && (
                <div className="flex items-start gap-2 text-xs text-card-foreground">
                  <UserCheck2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <p>
                    <span className="font-semibold">{exception.secondSignOff.executiveName}</span> confirmed{' '}
                    <span className="font-semibold">{exception.secondSignOff.verdict}</span> · finalized ·{' '}
                    {exception.secondSignOff.timestamp}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Supervisory note — editable when in edit mode for pending reports */}
          <div>
            <label
              htmlFor="verdict-note"
              className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
            >
              Supervisory Note
            </label>
            <textarea
              id="verdict-note"
              value={note}
              onChange={(e) => showControls && setNote(e.target.value)}
              readOnly={!showControls}
              rows={3}
              placeholder={showControls ? "Document the rationale for this verdict or sign-off..." : ""}
              className={cn(
                "mt-2 w-full resize-none rounded-md border px-3 py-2 text-xs outline-none",
                showControls
                  ? "border-input bg-card text-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
                  : "border-input bg-muted text-muted-foreground"
              )}
            />
          </div>

          {exception.status === 'Validated' || exception.status === 'Dismissed' ? (
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg border px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em]',
                exception.status === 'Validated' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                exception.status === 'Dismissed' && 'border-border bg-muted/50 text-muted-foreground',
              )}
            >
              {exception.status === 'Validated' && <CheckCircle2 className="size-4" />}
              {exception.status === 'Dismissed' && <XCircle className="size-4" />}
              {`Verdict recorded · ${exception.status}`}
            </div>
          ) : null}

          {isFinalAuditVerdict && (
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg border px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em]',
                exception.status === 'Repair' && 'border-sky-200 bg-sky-50 text-sky-700',
                exception.status === 'Write-off' && 'border-border bg-muted/50 text-muted-foreground',
              )}
            >
              {exception.status === 'Repair' && <Wrench className="size-4" />}
              {exception.status === 'Write-off' && <Ban className="size-4" />}
              {`Audit resolved · ${exception.status} · two Executive sign-offs recorded`}
            </div>
          )}

          {isHeldForAudit && !showControls && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-amber-800">
              <Scale className="size-4" />
              On audit hold · awaiting first Executive sign-off
            </div>
          )}

          {isPendingSecondSignOff && !showControls && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-amber-800">
              <UserCheck2 className="size-4" />
              Pending a second, different Executive sign-off
            </div>
          )}

          {isPendingSecondSignOff && showControls && secondSignOffBlockedByRoster && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-destructive">
              <AlertTriangle className="size-4" />
              Only one Executive account is currently active — a second, different Executive must be
              active in Workforce Management to complete this sign-off.
            </div>
          )}

          {isPendingSecondSignOff && showControls && !secondSignOffBlockedByRoster && isSameExecutiveAsFirstSignOff && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-amber-800">
              <AlertTriangle className="size-4" />
              You provided the first sign-off on this exception — a different Executive is required to
              confirm or override it.
            </div>
          )}

          {!editable && exception.status === 'Pending Verdict' && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              <Scale className="size-4" />
              Awaiting Executive verdict · read-only
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col items-stretch gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-end shrink-0">
          {showControls && exception.status === 'Pending Verdict' ? (
            <>
              <button
                type="button"
                onClick={() => setPendingVerdict('Dismissed')}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
              >
                <XCircle className="size-3.5" />
                Dismiss Claim
              </button>
              <button
                type="button"
                onClick={() => setPendingVerdict('Held for Audit')}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-amber-800 transition hover:bg-amber-100"
              >
                <Scale className="size-3.5" />
                Hold for Audit
              </button>
              <button
                type="button"
                onClick={() => setPendingVerdict('Validated')}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90"
              >
                <CheckCircle2 className="size-3.5" />
                Validate Damage
              </button>
            </>
          ) : showControls && isHeldForAudit ? (
            <>
              <button
                type="button"
                onClick={() => setPendingVerdict('Write-off')}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
              >
                <Ban className="size-3.5" />
                Sign Off · Write-off
              </button>
              <button
                type="button"
                onClick={() => setPendingVerdict('Repair')}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-sky-300 bg-sky-50 px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-sky-700 transition hover:bg-sky-100"
              >
                <Wrench className="size-3.5" />
                Sign Off · Repair
              </button>
            </>
          ) : showControls &&
            isPendingSecondSignOff &&
            !secondSignOffBlockedByRoster &&
            !isSameExecutiveAsFirstSignOff &&
            exception.firstSignOff ? (
            <>
              <button
                type="button"
                onClick={() => setPendingVerdict(otherAuditVerdict(exception.firstSignOff!.verdict as AuditVerdict))}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
              >
                <AlertTriangle className="size-3.5" />
                Override to {otherAuditVerdict(exception.firstSignOff.verdict as AuditVerdict)}
              </button>
              <button
                type="button"
                onClick={() => setPendingVerdict(exception.firstSignOff!.verdict as AuditVerdict)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90"
              >
                <UserCheck2 className="size-3.5" />
                Confirm as {exception.firstSignOff.verdict}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={closeAll}
              className="rounded-md bg-primary px-6 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Revalidation confirmation step */}
      {pendingVerdict && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation()
            setPendingVerdict(null)
          }}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={cn(
                'flex size-11 items-center justify-center rounded-full',
                pendingVerdict === 'Validated' && 'bg-emerald-100',
                pendingVerdict === 'Held for Audit' && 'bg-amber-100',
                pendingVerdict === 'Dismissed' && 'bg-muted',
                pendingVerdict === 'Repair' && 'bg-sky-100',
                pendingVerdict === 'Write-off' && 'bg-muted',
              )}
            >
              <AlertTriangle className={cn('size-5', verdictConfig[pendingVerdict].tone)} />
            </div>
            <h3 className="mt-4 font-serif text-lg font-medium text-card-foreground">
              {verdictConfig[pendingVerdict].confirmTitle}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {verdictConfig[pendingVerdict].confirmBody}
            </p>
            <p className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground">
              {exception.logId} · {exception.assetName}
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingVerdict(null)}
                className="rounded-md border border-border bg-card px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                className={cn(
                  'inline-flex items-center gap-2 rounded-md px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-white transition hover:opacity-90',
                  pendingVerdict === 'Validated' && 'bg-emerald-600',
                  pendingVerdict === 'Held for Audit' && 'bg-amber-600',
                  pendingVerdict === 'Dismissed' && 'bg-neutral-900',
                  pendingVerdict === 'Repair' && 'bg-sky-600',
                  pendingVerdict === 'Write-off' && 'bg-neutral-900',
                )}
              >
                {(() => {
                  const Icon = verdictConfig[pendingVerdict].Icon
                  return <Icon className="size-3.5" />
                })()}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
