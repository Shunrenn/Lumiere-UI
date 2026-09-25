import { useEffect, useState } from 'react'
import { X, Eye, EyeOff } from 'lucide-react'
import { SELECTABLE_STAFF_ROLES, type NewStaffDraft, type StaffRole } from '@/lib/types'
import { usePortal } from '@/lib/store'
import { generateRandomPassword } from '@/lib/utils'

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
  subRole: '',
  tempPassword: '',
}

const WOM_SUBROLES = [
  'Manning Officer',
  'Warehouse Manager',
  'Production Manager',
  'Inventory Officer',
  'Purchasing Officer',
] as const

const GROUND_CREW_SUBROLES = [
  'Event Field',
  'Warehouse Field',
  'Lead Logistics',
  'Field Ops',
  'Production Crew',
  'Stage & Rigging',
  'Fabrication',
] as const

const labelClass =
  'block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground'
const inputClass =
  'mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-ring/30'

export function EmployeeModal({ open, onClose, prefillEmail, actionId }: Props) {
  const { addStaff, staff, resolveUserAction, userActions } = usePortal()
  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [draft, setDraft] = useState<NewStaffDraft>(emptyDraft)
  const [showPwd, setShowPwd] = useState(false)

  useEffect(() => {
    if (open && prefillEmail && !draft.email) {
      setDraft((prev) => ({
        ...prev,
        email: prefillEmail,
      }))
    }
  }, [open, prefillEmail, draft.email])

  if (!open) return null

  // Generate auto employee ID based on current staff count
  const generateEmployeeId = () => {
    const nextId = (staff.length + 1).toString().padStart(4, '0')
    return `LM-${nextId}`
  }

  const set = (key: keyof NewStaffDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const close = () => {
    setStep('form')
    setDraft(emptyDraft)
    setShowPwd(false)
    onClose()
  }

  // Initialize with an auto-generated employee ID and a generated 8-char temp password.
  if (draft.employeeId === '' && draft.firstName === '') {
    setDraft((prev) => ({
      ...prev,
      employeeId: generateEmployeeId(),
      tempPassword: prev.tempPassword || generateRandomPassword(8),
    }))
  }

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())
  const isValidContact = draft.contact.length === 11

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
    await addStaff(draft)
    if (actionId) {
      resolveUserAction(actionId)
    } else if (draft.email) {
      const match = (userActions || []).find(
        (a: any) => (a.email === draft.email || a.user === draft.email) && a.status === 'pending'
      )
      if (match) resolveUserAction(match.id)
    }
    close()
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
                  placeholder="e.g. juandelacruz@gmail.com"
                  value={draft.email}
                  onChange={(e) => set('email', e.target.value)}
                />
                {draft.email && !isValidEmail && (
                  <p className="mt-1 text-[0.65rem] text-rose-600">
                    Please enter a valid email address (e.g. name@gmail.com)
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass} htmlFor="contact">
                  <span className="text-destructive mr-0.5">*</span>Contact:
                </label>
                <input
                  id="contact"
                  className={inputClass}
                  placeholder="09123456789"
                  value={draft.contact}
                  onChange={(e) => set('contact', e.target.value)}
                />
                {draft.contact && !isValidContact && (
                  <p className="mt-1 text-[0.65rem] text-rose-600">
                    Contact number must be exactly 11 digits
                  </p>
                )}
              </div>
            </div>

            {(() => {
              const isSubroleAllowed =
                draft.role === 'Warehouse Manager' ||
                draft.role === 'Ground Crew' ||
                draft.role === 'Field & Production Crew'
              return (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="role">
                      <span className="text-destructive mr-0.5">*</span>Role:
                    </label>
                    <select
                      id="role"
                      className={`${inputClass} appearance-none`}
                      value={draft.role}
                      onChange={(e) => {
                        const newRole = e.target.value as StaffRole
                        const isNextSubroleAllowed =
                          newRole === 'Warehouse Manager' ||
                          newRole === 'Ground Crew' ||
                          newRole === 'Field & Production Crew'
                        setDraft((prev) => ({
                          ...prev,
                          role: newRole,
                          subRole: !isNextSubroleAllowed
                            ? ''
                            : newRole === 'Warehouse Manager'
                            ? WOM_SUBROLES[0]
                            : GROUND_CREW_SUBROLES[0],
                        }))
                      }}
                    >
                      <option value="">Select Staff Role</option>
                      {SELECTABLE_STAFF_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="subRole">
                      Subrole: {!isSubroleAllowed && <span className="normal-case text-muted-foreground font-normal">(Blocked for this role)</span>}
                    </label>
                    <select
                      id="subRole"
                      disabled={!isSubroleAllowed}
                      className={`${inputClass} appearance-none disabled:cursor-not-allowed disabled:opacity-50`}
                      value={isSubroleAllowed ? draft.subRole : ''}
                      onChange={(e) => set('subRole', e.target.value)}
                    >
                      {!isSubroleAllowed ? (
                        <option value="">N/A — Not applicable</option>
                      ) : draft.role === 'Warehouse Manager' ? (
                        WOM_SUBROLES.map((sr) => (
                          <option key={sr} value={sr}>
                            {sr}
                          </option>
                        ))
                      ) : (
                        GROUND_CREW_SUBROLES.map((sr) => (
                          <option key={sr} value={sr}>
                            {sr}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              )
            })()}

            <div className="mt-4">
              <label className={labelClass} htmlFor="tempPassword">
                <span className="text-destructive mr-0.5">*</span>Temporary Password:
              </label>
              <div className="relative">
                <input
                  id="tempPassword"
                  type={showPwd ? 'text' : 'password'}
                  className={inputClass}
                  value={draft.tempPassword}
                  onChange={(e) => set('tempPassword', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-[0.65rem] italic text-muted-foreground">
                User will be prompted to change password upon first login.
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={!canProceed}
                onClick={() => setStep('verify')}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add New Employee →
              </button>
            </div>
          </div>
        ) : (
          <VerifyStep draft={draft} onReturn={() => setStep('form')} onConfirm={commit} />
        )}
      </div>
    </div>
  )
}

function VerifyStep({
  draft,
  onReturn,
  onConfirm,
}: {
  draft: NewStaffDraft
  onReturn: () => void
  onConfirm: () => void
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
        <Row label="Role:" value={draft.role} />
        <div>
          <Row label="Temporary Password:" value={draft.tempPassword} />
          <p className="mt-1.5 text-[0.65rem] italic text-muted-foreground">
            User will be prompted to change password upon first login.
          </p>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onReturn}
          className="rounded-md border border-input bg-background px-8 py-3 text-xs font-bold uppercase tracking-[0.15em] text-foreground transition hover:bg-muted"
        >
          Return
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-primary-foreground transition hover:opacity-90"
        >
          Add New Employee →
        </button>
      </div>
    </div>
  )
}
