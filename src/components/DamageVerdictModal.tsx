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
    confirmTitle: 'Confirm Sign-off · Repair',
    confirmBody:
      'This records your sign-off recommending Repair. The asset status will transition to In Maintenance in the Asset Registry and an audit entry will be logged.',
    tone: 'text-sky-700',
    Icon: Wrench,
  },
  'Write-off': {
    label: 'Sign Off · Write-off',
    confirmTitle: 'Confirm Sign-off · Write-off',
    confirmBody:
      'This records your sign-off recommending Write-off. Asset stock will be decremented and a loss ledger entry will be logged.',
    tone: 'text-destructive',
    Icon: Ban,
  },
}

interface Props {
  exception: DamageException | null
  onClose: () => void
  onResolve: (
    id: string,
    verdict: Exclude<DamageVerdict, 'Pending Verdict'>,
    note: string,
    unblockMetadata?: any,
    selfValRecord?: any,
  ) => void
  editable?: boolean
  currentExecutiveEmail?: string
  currentExecutiveName?: string
  activeExecutiveCount?: number
  allowSelfValidation?: boolean
  permanentlyEnabledViaEmergency?: boolean
  womSubRoleName?: string
  onPermanentUnblockSubRole?: (subRoleName: string, metadata: any) => void
}

const currency = (n: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n)

export function DamageVerdictModal({
  exception,
  onClose,
  onResolve,
  editable = false,
  currentExecutiveEmail = '',
  currentExecutiveName = '',
  activeExecutiveCount = 2,
  allowSelfValidation = true,
  permanentlyEnabledViaEmergency = false,
  womSubRoleName = 'Warehouse Manager',
  onPermanentUnblockSubRole,
}: Props) {
  if (!exception) return null

  const [note, setNote] = useState('')
  const [pendingVerdict, setPendingVerdict] = useState<ResolvableVerdict | null>(null)

  // Self-validation fields
  const [selfValJustification, setSelfValJustification] = useState('')

  // Emergency Unblock Modal fields
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [adminPin, setAdminPin] = useState('')
  const [adminReason, setAdminReason] = useState('')
  const [unblockMode, setUnblockMode] = useState<'ONE_TIME' | 'PERMANENT'>('ONE_TIME')
  const [showHighFrictionWarning, setShowHighFrictionWarning] = useState(false)
  const [ackChecked, setAckChecked] = useState(false)

  useEffect(() => {
    setNote('')
    setPendingVerdict(null)
    setSelfValJustification('')
    setShowEmergencyModal(false)
    setShowHighFrictionWarning(false)
    setAckChecked(false)
  }, [exception])

  const showControls = editable
  const isHeldForAudit = exception.status === 'Held for Audit'
  const isPendingSecondSignOff = exception.status === 'Pending Second Sign-off'
  const isFinalAuditVerdict = exception.status === 'Repair' || exception.status === 'Write-off'

  // Dual custody checks
  const isStrictBlock = !allowSelfValidation && activeExecutiveCount < 2 && (isHeldForAudit || isPendingSecondSignOff)

  const selfValJustificationValid = selfValJustification.trim().length >= 20

  const confirm = (overrideUnblockMeta?: any) => {
    if (!pendingVerdict) return

    let selfRecord = undefined
    if (allowSelfValidation && (isHeldForAudit || isPendingSecondSignOff)) {
      selfRecord = {
        validatedByEmail: currentExecutiveEmail || 'wom@lumiere.com',
        validatedByName: currentExecutiveName || 'Warehouse Ops Officer',
        womRole: womSubRoleName,
        pinVerified: true,
        justification: selfValJustification.trim(),
        timestamp: new Date().toISOString(),
        custodyMode: (overrideUnblockMeta ? 'admin-enabled-override' : 'standing-self-validation') as any,
        convertedViaEmergency: permanentlyEnabledViaEmergency,
      }
    }

    const effectiveNote = note.trim() || selfValJustification.trim()
    onResolve(
      exception.id,
      pendingVerdict,
      effectiveNote,
      overrideUnblockMeta,
      selfRecord
    )
    setNote('')
    setPendingVerdict(null)
    setSelfValJustification('')
  }

  const handleExecuteEmergencyUnblock = () => {
    if (!adminPin || !adminReason.trim()) return
    const meta = {
      originatedFromEmergency: true,
      emergencyReason: adminReason.trim(),
      unblockedByAdminEmail: 'admin@lumiere.com',
      unblockScope: unblockMode === 'PERMANENT' ? ('permanent' as const) : ('instance' as const),
    }

    if (unblockMode === 'PERMANENT') {
      setShowHighFrictionWarning(true)
    } else {
      setShowEmergencyModal(false)
      confirm(meta)
    }
  }

  const handleConfirmPermanentUnblock = () => {
    if (!ackChecked) return
    const meta = {
      originatedFromEmergency: true,
      emergencyReason: adminReason.trim(),
      unblockedByAdminEmail: 'admin@lumiere.com',
      unblockScope: 'permanent' as const,
      madePermanentAt: new Date().toISOString(),
      permanentAcknowledged: true,
    }
    onPermanentUnblockSubRole?.(womSubRoleName, meta)
    setShowHighFrictionWarning(false)
    setShowEmergencyModal(false)
    confirm(meta)
  }

  const closeAll = () => {
    setPendingVerdict(null)
    setShowEmergencyModal(false)
    setShowHighFrictionWarning(false)
    onClose()
  }

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
                Audit Sign-off Trail
              </p>
              {exception.firstSignOff && (
                <div className="flex items-start gap-2 text-xs text-card-foreground">
                  <UserCheck2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <p>
                    <span className="font-semibold">{exception.firstSignOff.staffName}</span> signed off{' '}
                    <span className="font-semibold">{exception.firstSignOff.verdict}</span> ·{' '}
                    {exception.firstSignOff.timestamp}
                  </p>
                </div>
              )}
              {exception.secondSignOff && (
                <div className="flex items-start gap-2 text-xs text-card-foreground">
                  <UserCheck2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <p>
                    <span className="font-semibold">{exception.secondSignOff.staffName}</span> confirmed{' '}
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

          {isStrictBlock && (
            <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-xs">
              <div className="flex items-center gap-2 font-semibold uppercase tracking-wider text-destructive">
                <AlertTriangle className="size-4" />
                Strict Block — Dual-Custody Deadlock
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Self-validation is disabled for the <strong>{womSubRoleName}</strong> sub-role, but only 1 active account exists in Workforce Management. Dual-custody sign-off cannot be completed.
              </p>
              <button
                type="button"
                onClick={() => setShowEmergencyModal(true)}
                className="mt-1 self-start rounded bg-destructive px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-destructive-foreground hover:opacity-90"
              >
                Admin Emergency Unblock
              </button>
            </div>
          )}

          {!editable && exception.status === 'Pending Verdict' && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              <Scale className="size-4" />
              Awaiting WOM verdict · read-only
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
          ) : showControls && (isHeldForAudit || isPendingSecondSignOff) && !isStrictBlock ? (
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
            {allowSelfValidation && (isHeldForAudit || isPendingSecondSignOff) && (
              <div className="mt-4 space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-left">
                <p className="text-[0.62rem] font-bold uppercase tracking-wider text-card-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-primary" /> Standing Self-Validation Justification
                </p>
                <div>
                  <label className="block text-[0.58rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    Written Rationale (≥20 Characters Required)
                  </label>
                  <textarea
                    rows={2}
                    value={selfValJustification}
                    onChange={(e) => setSelfValJustification(e.target.value)}
                    placeholder="Provide mandatory rationale bypassing dual custody..."
                    className="mt-1 w-full rounded border border-input bg-card p-2 text-xs text-foreground outline-none focus:border-primary"
                  />
                  <div className="mt-1 flex items-center justify-between text-[0.58rem]">
                    <span className={selfValJustificationValid ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                      {selfValJustification.trim().length} / 20 characters minimum
                    </span>
                    {selfValJustificationValid && <span className="text-emerald-600 font-bold">✓ Valid</span>}
                  </div>
                </div>
              </div>
            )}
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
                disabled={allowSelfValidation && (isHeldForAudit || isPendingSecondSignOff) && !selfValJustificationValid}
                onClick={() => confirm()}
                className={cn(
                  'inline-flex items-center gap-2 rounded-md px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-white transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed',
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

      {/* Admin Emergency Unblock Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="font-serif text-xl font-medium text-card-foreground">Admin Emergency Unblock</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Resolve dual-custody deadlock for exception <strong className="text-foreground">{exception.logId}</strong>. Requires Admin confirmation PIN + rationale.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Admin Confirmation PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="Enter 6-digit PIN"
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Emergency Reason / Justification</label>
                <textarea
                  rows={2}
                  value={adminReason}
                  onChange={(e) => setAdminReason(e.target.value)}
                  placeholder="Explain why emergency unblock is required..."
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground mb-2">Unblock Scope Mode</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 rounded border border-border p-2.5 cursor-pointer hover:bg-muted/30">
                    <input
                      type="radio"
                      name="unblockMode"
                      checked={unblockMode === 'ONE_TIME'}
                      onChange={() => setUnblockMode('ONE_TIME')}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-xs font-semibold text-card-foreground">Option 1: One-Time Emergency Override</p>
                      <p className="text-[0.65rem] text-muted-foreground">Bypasses dual-custody for this current exception only. Sub-role RBAC settings remain unchanged.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 rounded border border-border p-2.5 cursor-pointer hover:bg-muted/30">
                    <input
                      type="radio"
                      name="unblockMode"
                      checked={unblockMode === 'PERMANENT'}
                      onChange={() => setUnblockMode('PERMANENT')}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-xs font-semibold text-destructive">Option 2: Permanent Sub-Role Re-configuration</p>
                      <p className="text-[0.65rem] text-muted-foreground">Permanently sets allowSelfValidation = true for {womSubRoleName} in RBAC.</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEmergencyModal(false)}
                className="rounded-md border border-border px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteEmergencyUnblock}
                disabled={!adminPin || !adminReason.trim()}
                className="rounded-md bg-destructive px-4 py-2 text-xs font-semibold uppercase tracking-wider text-destructive-foreground hover:opacity-90 disabled:opacity-50"
              >
                {unblockMode === 'PERMANENT' ? 'Proceed to Warning' : 'Execute Emergency Unblock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-Friction Confirmation Warning Modal */}
      {showHighFrictionWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
          <div className="w-full max-w-lg rounded-xl border border-destructive bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="size-6 shrink-0" />
              <h3 className="font-serif text-xl font-bold">WARNING: Permanent Sub-Role Policy Change</h3>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              This action <strong className="text-destructive">permanently overwrites the dual-custody policy</strong> for the <strong className="text-foreground">{womSubRoleName}</strong> sub-role across the platform.
              Going forward, officers in this sub-role will be permitted to self-validate audit holds standing alone.
              This emergency conversion will be permanently traced in security logs and sub-role audit records.
            </p>

            <div className="mt-5 rounded-lg border border-border bg-muted/40 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ackChecked}
                  onChange={(e) => setAckChecked(e.target.checked)}
                  className="mt-1 size-4 rounded border-input"
                />
                <span className="text-xs font-semibold text-card-foreground leading-snug">
                  I understand and accept this permanent policy change for the {womSubRoleName} sub-role.
                </span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowHighFrictionWarning(false)}
                className="rounded-md border border-border px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!ackChecked}
                onClick={handleConfirmPermanentUnblock}
                className="rounded-md bg-destructive px-5 py-2 text-xs font-bold uppercase tracking-wider text-destructive-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Permanent Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
