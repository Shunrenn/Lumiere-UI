import { useEffect, useState } from 'react'
import { X, KeyRound, Copy, Check, ShieldAlert } from 'lucide-react'
import { SELECTABLE_STAFF_ROLES, type Staff } from '@/lib/types'
import { usePortal } from '@/lib/store'

interface Props {
  open: boolean
  staff: Staff | null
  onClose: () => void
  // When true, every field is editable (used by the "Edit" action).
  editable?: boolean
  onSave?: (staff: Staff) => Promise<void> | void
}

const inputClass =
  'mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-ring/30'

export function ViewAccountModal({
  open,
  staff,
  onClose,
  editable = false,
  onSave,
}: Props) {
  const { resetStaffPassword } = usePortal()
  const [draft, setDraft] = useState<Staff | null>(staff)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Dedicated credential reset states
  const [isResetting, setIsResetting] = useState(false)
  const [showConfirmReset, setShowConfirmReset] = useState(false)
  const [resetResult, setResetResult] = useState<{ tempPassword: string } | null>(null)
  const [copied, setCopied] = useState(false)

  // Reset the editable draft whenever a different account is opened.
  useEffect(() => {
    setDraft(staff)
    setError(null)
    setIsSaving(false)
    setIsResetting(false)
    setShowConfirmReset(false)
    setResetResult(null)
    setCopied(false)
  }, [staff, open])

  const handleResetPassword = async () => {
    if (!staff?.id) return
    setIsResetting(true)
    setError(null)
    try {
      const res = await resetStaffPassword(staff.id)
      setShowConfirmReset(false)
      setResetResult({ tempPassword: res.tempPassword })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setIsResetting(false)
    }
  }

  const copyToClipboard = async () => {
    if (!resetResult?.tempPassword) return
    try {
      await navigator.clipboard.writeText(resetResult.tempPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

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
              {staff.fullName || `${staff.firstName} ${staff.surname}`.trim() || staff.email}
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
          {resetResult ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1">
                  <p className="font-bold uppercase tracking-wider">New Temporary Password Generated</p>
                  <p>
                    All existing sessions for <strong>{staff.fullName || staff.email}</strong> have been invalidated. Provide this password securely to the user. It is displayed once and will not be stored in plaintext.
                  </p>
                </div>
              </div>

              <div className="rounded-md border border-border/60 bg-muted/20 p-4">
                <span className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">
                  Temporary Password:
                </span>
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm font-bold tracking-wide text-foreground">
                    {resetResult.tempPassword}
                  </code>
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setResetResult(null)}
                  className="rounded-md bg-primary px-6 py-2.5 text-xs font-bold uppercase tracking-[0.15em] text-primary-foreground transition hover:opacity-90"
                >
                  Done
                </button>
              </div>
            </div>
          ) : showConfirmReset ? (
            <div className="space-y-4">
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
                <p className="font-bold uppercase tracking-wider">Confirm Password Reset</p>
                <p className="mt-1 text-foreground">
                  Are you sure you want to generate a new temporary password for <strong>{staff.fullName || staff.email}</strong>?
                </p>
                <p className="mt-1 text-muted-foreground">
                  This will immediately terminate any active sessions and require the user to configure a new password upon their next login.
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmReset(false)}
                  disabled={isResetting}
                  className="rounded-md border border-input bg-background px-4 py-2 text-xs font-semibold uppercase tracking-wider text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={isResetting}
                  className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-5 py-2 text-xs font-bold uppercase tracking-wider text-destructive-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {isResetting ? 'Resetting...' : 'Confirm Reset'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {/* Employee ID (always read-only) */}
                <div>
                  <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">
                    Employee ID:
                  </label>
              {readField(staff.employeeId || '—')}
            </div>

            {/* Full Name */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">
                  {editable && <span className="text-destructive mr-0.5">*</span>}First Name:
                </label>
                {editable ? (
                  <input
                    type="text"
                    value={draft.firstName}
                    onChange={(e) => set('firstName', e.target.value)}
                    className={inputClass}
                  />
                ) : (
                  readField(staff.firstName || staff.fullName || '—')
                )}
              </div>
              <div>
                <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">
                  {editable && <span className="text-destructive mr-0.5">*</span>}Surname:
                </label>
                {editable ? (
                  <input
                    type="text"
                    value={draft.surname}
                    onChange={(e) => set('surname', e.target.value)}
                    className={inputClass}
                  />
                ) : (
                  readField(staff.surname || '—')
                )}
              </div>
            </div>

            {/* Contact Number */}
            <div>
              <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">
                {editable && <span className="text-destructive mr-0.5">*</span>}Contact Number:
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
                {editable && <span className="text-destructive mr-0.5">*</span>}Email:
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
                {editable && <span className="text-destructive mr-0.5">*</span>}Role:
              </label>
              {editable ? (
                <select
                  value={draft.role}
                  onChange={(e) => {
                    const newRole = e.target.value as Staff['role']
                    const isNextSubroleAllowed =
                      newRole === 'Warehouse Manager' ||
                      newRole === ('Ground Crew' as any) ||
                      newRole === ('Ground Crew' as any)
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            role: newRole,
                            subRole: !isNextSubroleAllowed
                              ? ''
                              : newRole === 'Warehouse Manager'
                              ? 'Manning Officer'
                              : 'Field',
                          }
                        : prev,
                    )
                  }}
                  className={`${inputClass} appearance-none`}
                >
                  {!SELECTABLE_STAFF_ROLES.includes(draft.role as any) && (
                    <option key={draft.role} value={draft.role}>
                      {draft.role}
                    </option>
                  )}
                  {SELECTABLE_STAFF_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              ) : (
                readField(staff.role)
              )}
            </div>

            {/* Account Status (read-only in View Details) */}
            <div>
              <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">
                Status:
              </label>
              {readField(staff.accountStatus || '—')}
            </div>

            {/* Reason / Description is only shown when the existing account model provides one. */}
            <div>
              <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">
                Reason / Description:
              </label>
              <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                {'—'}
              </p>
            </div>

            {/* Subrole */}
            {(() => {
              const isSubroleAllowed =
                draft.role === 'Warehouse Manager' ||
                draft.role === ('Ground Crew' as any) ||
                draft.role === ('Ground Crew' as any)
              const womSubroles = ['Manning Officer', 'Warehouse Manager', 'Production Manager', 'Inventory Officer', 'Purchasing Officer']
              const groundSubroles = ['Warehouse', 'Field', 'Inventory', 'Production', 'EventAdmin']
              
              if (!editable && !staff.subRole && !isSubroleAllowed) return null

              return (
                <div>
                  <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">
                    Subrole: {editable && !isSubroleAllowed && <span className="normal-case text-muted-foreground font-normal">(Blocked for this role)</span>}
                  </label>
                  {editable ? (
                    <select
                      disabled={!isSubroleAllowed}
                      value={isSubroleAllowed ? (draft.subRole || (draft.role === 'Warehouse Manager' ? 'Manning Officer' : 'Field')) : ''}
                      onChange={(e) => set('subRole', e.target.value)}
                      className={`${inputClass} appearance-none disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {!isSubroleAllowed ? (
                        <option value="">N/A — Not applicable</option>
                      ) : draft.role === 'Warehouse Manager' ? (
                        womSubroles.map((sr) => (
                          <option key={sr} value={sr}>
                            {sr}
                          </option>
                        ))
                      ) : (
                        groundSubroles.map((sr) => (
                          <option key={sr} value={sr}>
                            {sr}
                          </option>
                        ))
                      )}
                    </select>
                  ) : (
                    readField(staff.subRole || 'N/A')
                  )}
                </div>
              )
            })()}

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

            {editable && (
              <div className="rounded-md border border-border/70 bg-muted/20 p-3.5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">
                      Account Credentials
                    </span>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Passwords are not stored in plaintext. Issue a new temporary password when access needs to be restored.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConfirmReset(true)}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
                  >
                    <KeyRound className="size-3.5" />
                    Reset Temporary Password
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

              {/* Footer */}
              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="rounded-md border border-input bg-background px-5 py-2.5 text-xs font-bold uppercase tracking-[0.15em] text-foreground transition hover:bg-muted disabled:opacity-50"
                >
                  {editable ? 'Cancel' : 'Close'}
                </button>
                {editable && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={async () => {
                      if (!draft) return
                      setError(null)
                      setIsSaving(true)
                      try {
                        const updatedFullName = `${draft.firstName} ${draft.middleName ? draft.middleName + ' ' : ''}${draft.surname}`.trim()
                        await onSave?.({
                          ...draft,
                          fullName: updatedFullName || draft.fullName,
                        })
                        onClose()
                      } catch (err: any) {
                        setError(err?.message || 'Failed to update employee details. Please try again.')
                      } finally {
                        setIsSaving(false)
                      }
                    }}
                    className="rounded-md bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-[0.15em] text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
