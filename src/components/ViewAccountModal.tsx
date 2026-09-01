import { useEffect, useState } from 'react'
import { X, Eye, EyeOff } from 'lucide-react'
import { STAFF_ROLES, type Staff } from '@/lib/types'

interface Props {
  open: boolean
  staff: Staff | null
  tempPassword: string
  onTempPasswordChange: (value: string) => void
  onClose: () => void
  // When true, every field is editable (used by the "Edit" action).
  editable?: boolean
  onSave?: (staff: Staff) => void
}

const inputClass =
  'mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-ring/30'

export function ViewAccountModal({
  open,
  staff,
  tempPassword,
  onTempPasswordChange,
  onClose,
  editable = false,
  onSave,
}: Props) {
  const [showPwd, setShowPwd] = useState(false)
  const [draft, setDraft] = useState<Staff | null>(staff)

  // Reset the editable draft whenever a different account is opened.
  useEffect(() => {
    setDraft(staff)
  }, [staff])

  if (!open || !staff || !draft) return null

  const set = <K extends keyof Staff>(key: K, value: Staff[K]) =>
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev))

  const readField = (value: string) => (
    <p className="mt-1.5 text-sm text-muted-foreground">{value}</p>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-700/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={editable ? 'Edit account details' : 'View account details'}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-lg bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-primary px-6 py-3.5">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground">
              {editable ? 'Edit Account' : 'Account Details'}
            </h2>
            <p className="mt-1 text-[0.65rem] text-primary-foreground/80">
              {staff.firstName} {staff.surname}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-primary-foreground/80 transition hover:text-primary-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
          <div className="space-y-4">
            {/* Employee ID (always read-only) */}
            <div>
              <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">
                Employee ID:
              </label>
              {readField(staff.employeeId)}
            </div>

            {/* Full Name */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">
                  First Name:
                </label>
                {editable ? (
                  <input
                    type="text"
                    value={draft.firstName}
                    onChange={(e) => set('firstName', e.target.value)}
                    className={inputClass}
                  />
                ) : (
                  readField(staff.firstName)
                )}
              </div>
              <div>
                <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">
                  Surname:
                </label>
                {editable ? (
                  <input
                    type="text"
                    value={draft.surname}
                    onChange={(e) => set('surname', e.target.value)}
                    className={inputClass}
                  />
                ) : (
                  readField(staff.surname)
                )}
              </div>
            </div>

            {/* Contact Number */}
            <div>
              <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">
                Contact Number:
              </label>
              {editable ? (
                <input
                  type="text"
                  value={draft.contact}
                  onChange={(e) => set('contact', e.target.value)}
                  className={inputClass}
                  placeholder="09123456789"
                />
              ) : (
                readField(staff.contact)
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">
                Email:
              </label>
              {editable ? (
                <input
                  type="email"
                  value={draft.email}
                  onChange={(e) => set('email', e.target.value)}
                  className={inputClass}
                />
              ) : (
                readField(staff.email)
              )}
            </div>

            {/* Role */}
            <div>
              <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">
                Role:
              </label>
              {editable ? (
                <select
                  value={draft.role}
                  onChange={(e) => set('role', e.target.value as Staff['role'])}
                  className={`${inputClass} appearance-none`}
                >
                  {STAFF_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              ) : (
                readField(staff.role)
              )}
            </div>

            {/* Session Status */}
            <div>
              <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">
                Session Status:
              </label>
              {readField(staff.sessionStatus)}
            </div>

            {/* Last Access */}
            <div>
              <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">
                Last Access:
              </label>
              {readField(staff.lastAccess)}
            </div>

            {/* Password */}
            <div>
              <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">
                Temporary Password:
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={tempPassword}
                  onChange={(e) => onTempPasswordChange(e.target.value)}
                  className={inputClass}
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
          </div>

          {/* Footer */}
          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-input bg-background px-5 py-2.5 text-xs font-bold uppercase tracking-[0.15em] text-foreground transition hover:bg-muted"
            >
              {editable ? 'Cancel' : 'Close'}
            </button>
            {editable && (
              <button
                type="button"
                onClick={() => {
                  onSave?.(draft)
                  onClose()
                }}
                className="rounded-md bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-[0.15em] text-primary-foreground transition hover:opacity-90"
              >
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
