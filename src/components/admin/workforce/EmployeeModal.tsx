import { useEffect, useState } from 'react'
import { X, Copy, Check, ShieldAlert } from 'lucide-react'
import { SELECTABLE_STAFF_ROLES, type NewStaffDraft, type StaffRole } from '@/lib/types'
import { usePortal } from '@/lib/store'

interface Props {
  open: boolean
  onClose: () => void
  prefillEmail?: string
  actionId?: string
}

const emptyDraft: NewStaffDraft = {
  employeeId: '',
  surname: '',
  firstName: '',
  middleName: '',
  email: '',
  contact: '',
  role: '',
  employmentType: 'Full Time',
  subRole: '',
}

const labelClass =
  'block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground'
const inputClass =
  'mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-ring/30'

export function EmployeeModal({ open, onClose, prefillEmail, actionId }: Props) {
  const { addStaff, staff, resolveUserAction, userActions } = usePortal()
  const [step, setStep] = useState<'form' | 'verify' | 'created'>('form')
  const [draft, setDraft] = useState<NewStaffDraft>(emptyDraft)
  const [createdPassword, setCreatedPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate auto employee ID based on current staff count
  const generateEmployeeId = () => {
    const nextId = ((staff?.length || 0) + 1).toString().padStart(4, '0')
    return `LM-${nextId}`
  }

  const set = (key: keyof NewStaffDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const close = () => {
    setError(null)
    setIsSubmitting(false)
    setStep('form')
    setDraft(emptyDraft)
    setCreatedPassword(null)
    setCopied(false)
    onClose()
  }

  useEffect(() => {
    if (open) {
      setStep('form')
      setCreatedPassword(null)
      setCopied(false)
      setIsSubmitting(false)
      setError(null)
      setDraft({
        ...emptyDraft,
        employeeId: generateEmployeeId(),
            email: prefillEmail ? prefillEmail.replace(/@lumiere\.com$/i, '') : '',
      })
    }
  }, [open, prefillEmail, staff?.length])

  if (!open) return null

  const normalizedEmail = (() => {
    const value = draft.email.trim().toLowerCase()
    if (!value) return ''
    const localPart = value.replace(/@lumiere\.com$/i, '').trim()
    return localPart ? `${localPart}@lumiere.com` : ''
  })()
  const isValidEmail = /^[a-z0-9._%+-]+@lumiere\.com$/.test(normalizedEmail)
  const isValidContact = /^09\d{9}$/.test(draft.contact)

  const canProceed =
    draft.employeeId &&
    draft.surname &&
    draft.firstName &&
    draft.email &&
    isValidEmail &&
    draft.contact &&
    isValidContact &&
    draft.role

  const commit = async () => {
    try {
      setIsSubmitting(true)
      setError(null)
      const submission = { ...draft, email: normalizedEmail, contact: draft.contact.replace(/\D/g, '').slice(0, 11) }
      const res = await addStaff(submission)
      if (actionId) {
        resolveUserAction(actionId)
      } else if (draft.email) {
        const match = (userActions || []).find(
          (a: any) => (a.email === draft.email || a.user === draft.email) && a.status === 'pending'
        )
        if (match) resolveUserAction(match.id)
      }

      if (res?.tempPassword) {
        setCreatedPassword(res.tempPassword)
        setStep('created')
      } else {
        close()
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create employee profile. Please check the details and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = async () => {
    if (!createdPassword) return
    try {
      await navigator.clipboard.writeText(createdPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-700/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="New employee profile"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-lg bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-primary px-6 py-3.5">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground">
            {step === 'form' ? 'New Employee Profile' : 'Verify Employee Information'}
          </h2>
          <button
            type="button"
            onClick={close}
            className="text-primary-foreground/80 transition hover:text-primary-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {step === 'form' ? (
          <div className="px-6 py-6">
            <div>
              <label className={labelClass} htmlFor="employeeId">
                Employee ID (Auto-generated):
              </label>
              <input
                id="employeeId"
                className={inputClass}
                placeholder="LM-0001"
                value={draft.employeeId || generateEmployeeId()}
                readOnly
              />
              <p className="mt-1.5 text-[0.65rem] italic text-muted-foreground">
                Automatically generated based on current staff count.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass} htmlFor="surname">
                  <span className="text-destructive mr-0.5">*</span>Surname:
                </label>
                <input
                  id="surname"
                  className={inputClass}
                  placeholder="e.g. Dela Cruz"
                  value={draft.surname}
                  onChange={(e) => set('surname', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="firstName">
                  <span className="text-destructive mr-0.5">*</span>First Name:
                </label>
                <input
                  id="firstName"
                  className={inputClass}
                  placeholder="e.g. Juan"
                  value={draft.firstName}
                  onChange={(e) => set('firstName', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="middleName">
                  Middle Name:
                </label>
                <input
                  id="middleName"
                  className={inputClass}
                  placeholder="Optional"
                  value={draft.middleName}
                  onChange={(e) => set('middleName', e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="email">
                  <span className="text-destructive mr-0.5">*</span>Email:
                </label>
                <input
                  id="email"
                  type="email"
                  className={inputClass}
                  placeholder="e.g. juandelacruz"
                  value={draft.email}
                  onChange={(e) => set('email', e.target.value.replace(/\s/g, ''))}
                />
                {draft.email && !isValidEmail && (
                  <p className="mt-1 text-[0.65rem] text-rose-600">
                    Enter a Lumière email local part (for example, juandelacruz).
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass} htmlFor="contact">
                  <span className="text-destructive mr-0.5">*</span>Contact:
                </label>
                <input
                  id="contact"
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  className={inputClass}
                  placeholder="09123456789"
                  value={draft.contact}
                  onChange={(e) => set('contact', e.target.value.replace(/\D/g, '').slice(0, 11))}
                />
                {draft.contact && !isValidContact && (
                  <p className="mt-1 text-[0.65rem] text-rose-600">
                    Enter an 11-digit mobile number beginning with 09.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className={labelClass} htmlFor="role">
                <span className="text-destructive mr-0.5">*</span>Role:
              </label>
              <select
                id="role"
                className={`${inputClass} appearance-none`}
                value={draft.role}
                onChange={(e) => setDraft((prev) => ({ ...prev, role: e.target.value as StaffRole, subRole: '' }))}
              >
                <option value="">Select Staff Role</option>
                {SELECTABLE_STAFF_ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div className="mt-4 rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Secure Credentials:</span> A 14-character CSPRNG temporary password will be generated automatically by the server upon profile creation and displayed once for distribution.
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={!canProceed}
                onClick={() => setStep('verify')}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue to Verification →
              </button>
            </div>
          </div>
        ) : step === 'verify' ? (
          <VerifyStep
            draft={draft}
            onReturn={() => {
              setError(null)
              setStep('form')
            }}
            onConfirm={commit}
            error={error}
            isSubmitting={isSubmitting}
          />
        ) : (
          <CreatedStep
            draft={draft}
            tempPassword={createdPassword ?? ''}
            copied={copied}
            onCopy={copyToClipboard}
            onClose={close}
          />
        )}
      </div>
    </div>
  )
}

function VerifyStep({
  draft,
  onReturn,
  onConfirm,
  error,
  isSubmitting,
}: {
  draft: NewStaffDraft
  onReturn: () => void
  onConfirm: () => void
  error: string | null
  isSubmitting: boolean
}) {
  const Row = ({ label, value }: { label: string; value: string }) => (
    <div>
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{value || 'N/A'}</p>
    </div>
  )

  return (
    <div className="px-6 py-6">
      {error && (
        <div className="mb-5 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}
      <div className="space-y-5">
        <Row label="Employee ID:" value={draft.employeeId} />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Row label="Surname:" value={draft.surname} />
          <Row label="First Name:" value={draft.firstName} />
          <Row label="Middle Name:" value={draft.middleName} />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Row label="Email:" value={draft.email} />
          <Row label="Contact:" value={draft.contact} />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Row label="Role:" value={draft.role} />
          <Row label="Employment Type:" value={draft.employmentType} />
        </div>
        <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Next Step:</p>
          <p className="mt-1">The server will provision this account, generate a secure temporary password, and display it once for secure handoff.</p>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onReturn}
          disabled={isSubmitting}
          className="rounded-md border border-input bg-background px-8 py-3 text-xs font-bold uppercase tracking-[0.15em] text-foreground transition hover:bg-muted disabled:opacity-50"
        >
          Return
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Creating Profile...' : 'Confirm & Create Account →'}
        </button>
      </div>
    </div>
  )
}

function CreatedStep({
  draft,
  tempPassword,
  copied,
  onCopy,
  onClose,
}: {
  draft: NewStaffDraft
  tempPassword: string
  copied: boolean
  onCopy: () => void
  onClose: () => void
}) {
  return (
    <div className="px-6 py-6">
      <div className="mb-5 flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="space-y-1">
          <p className="font-bold uppercase tracking-wider">Authoritative Temporary Credential</p>
          <p>
            This server-generated password will only be displayed <strong>once</strong>. Copy and securely provide it to the employee. It will not be stored in plaintext or redisplayed.
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-md border border-border/60 bg-muted/20 p-4">
        <div>
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">
            Account Name:
          </span>
          <p className="mt-0.5 text-sm font-medium text-foreground">
            {draft.firstName} {draft.surname} ({draft.role})
          </p>
        </div>
        <div>
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">
            Login Email:
          </span>
          <p className="mt-0.5 text-sm font-medium text-foreground">{draft.email}</p>
        </div>
        <div>
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">
            Temporary Password:
          </span>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm font-bold tracking-wide text-foreground">
              {tempPassword}
            </code>
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
            >
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      <p className="mt-4 text-[0.7rem] text-muted-foreground">
        Upon first login, the employee will be required to configure their permanent password.
      </p>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md bg-primary px-6 py-2.5 text-xs font-bold uppercase tracking-[0.15em] text-primary-foreground transition hover:opacity-90"
        >
          Dismiss & Complete
        </button>
      </div>
    </div>
  )
}
