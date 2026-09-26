import { useState } from 'react'
import { KeyRound, LogOut, Check, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { PwaHeader, PwaCard, PwaButton } from '@/components/pwa'

export function TempPasswordResetScreen() {
  const { adminName, adminRole, changePassword, logout } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Password requirement criteria
  const criteria = [
    { id: 'length', label: 'Use at least 8 characters', met: newPassword.length >= 8 },
    { id: 'upper', label: 'At least 1 uppercase letter (A-Z)', met: /[A-Z]/.test(newPassword) },
    { id: 'lower', label: 'At least 1 lowercase letter (a-z)', met: /[a-z]/.test(newPassword) },
    { id: 'number', label: 'At least 1 number (0-9)', met: /[0-9]/.test(newPassword) },
    { id: 'symbol', label: 'At least 1 special symbol (!@#$%...)', met: /[^A-Za-z0-9]/.test(newPassword) },
  ]

  const metCount = criteria.filter((c) => c.met).length
  const allCriteriaMet = metCount === criteria.length

  const isMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword
  const isMismatch = confirmPassword.length > 0 && newPassword.length > 0 && newPassword !== confirmPassword

  const getStrengthInfo = () => {
    if (!newPassword) return { label: 'Empty', color: 'bg-muted', text: 'text-muted-foreground', percent: 0 }
    if (metCount <= 2) return { label: 'Weak', color: 'bg-destructive', text: 'text-destructive', percent: 30 }
    if (metCount <= 3) return { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-500', percent: 60 }
    if (metCount === 4) return { label: 'Good', color: 'bg-sky-500', text: 'text-sky-500', percent: 80 }
    return { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-500', percent: 100 }
  }

  const strength = getStrengthInfo()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!currentPassword) {
      setError('Please enter your current temporary password.')
      return
    }
    if (!allCriteriaMet) {
      setError('Please fulfill all password security requirements before saving.')
      return
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from your temporary password.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const ok = await changePassword(currentPassword, newPassword)
      if (!ok) {
        setError('Could not update password. Please verify your current temporary password.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const firstName = adminName ? adminName.trim().split(' ')[0] : 'User'
  const formattedRole = (adminRole || 'user').toLowerCase()
  const article = /^[aeiou]/i.test(formattedRole) ? 'an' : 'a'

  return (
    <div className="flex min-h-dvh w-full justify-center bg-background text-foreground">
      <div className="flex w-full max-w-md flex-col">
        {/* PWA-style Hero Header */}
        <PwaHeader
          title="Change Password"
          subtitle={`Welcome, ${firstName}. Create a permanent password to secure your account.`}
          roleName="First-Run Security"
          icon={<KeyRound className="size-5" aria-hidden="true" />}
          actions={
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 text-xs text-sidebar-foreground/75 transition hover:text-sidebar-foreground"
              title="Sign out"
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          }
        />

        {/* Main Content */}
        <main
          className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-5"
          style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
        >
          {/* Account Context Notice */}
          <PwaCard>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                You are registered in {article}{' '}
                <span className="font-semibold text-foreground">{formattedRole}</span> account. We're excited to have you onboard! Please create your new permanent password below to secure your account and get started.
              </p>
            </div>
          </PwaCard>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <PwaCard title="Security Credentials" subtitle="Update your temporary password">
              <div className="flex flex-col gap-4 pt-1">
                {/* Current Password Field */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="current-temp-password"
                    className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1"
                  >
                    <span className="text-destructive">*</span> Current Temporary Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="current-temp-password"
                      type={showCurrent ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value)
                        setError('')
                      }}
                      placeholder="Enter temporary password"
                      className="w-full min-h-[44px] rounded-xl border border-input bg-background py-2.5 pl-3.5 pr-11 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((s) => !s)}
                      className="absolute right-3 p-1.5 text-muted-foreground transition hover:text-foreground focus-visible:outline-none"
                      aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
                    >
                      {showCurrent ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                {/* New Password Field */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="new-permanent-password"
                    className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1"
                  >
                    <span className="text-destructive">*</span> New Permanent Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="new-permanent-password"
                      type={showNew ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value)
                        setError('')
                      }}
                      placeholder="Combine uppercase, lowercase, numbers & symbols"
                      className="w-full min-h-[44px] rounded-xl border border-input bg-background py-2.5 pl-3.5 pr-11 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((s) => !s)}
                      className="absolute right-3 p-1.5 text-muted-foreground transition hover:text-foreground focus-visible:outline-none"
                      aria-label={showNew ? 'Hide new password' : 'Show new password'}
                    >
                      {showNew ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {newPassword.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[0.7rem]">
                        <span className="text-muted-foreground">Password strength:</span>
                        <span className={`font-semibold ${strength.text}`}>{strength.label}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full transition-all duration-300 ${strength.color}`}
                          style={{ width: `${strength.percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Password Security Requirements Checklist */}
                  <div className="mt-3 rounded-xl border border-border/80 bg-muted/40 p-3 space-y-2">
                    <div className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center justify-between">
                      <span>Password Requirements</span>
                      {allCriteriaMet && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold normal-case">
                          <ShieldCheck className="size-3.5" aria-hidden="true" /> Requirements Met
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {criteria.map((c) => (
                        <div
                          key={c.id}
                          className={`flex items-center gap-2 transition-colors ${
                            c.met ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'
                          }`}
                        >
                          {c.met ? (
                            <Check className="size-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                          ) : (
                            <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/40 ml-1 mr-1" aria-hidden="true" />
                          )}
                          <span className="text-[0.75rem]">{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="confirm-permanent-password"
                    className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1"
                  >
                    <span className="text-destructive">*</span> Confirm New Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="confirm-permanent-password"
                      type={showConfirm ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        setError('')
                      }}
                      placeholder="Re-enter new password"
                      className="w-full min-h-[44px] rounded-xl border border-input bg-background py-2.5 pl-3.5 pr-11 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((s) => !s)}
                      className="absolute right-3 p-1.5 text-muted-foreground transition hover:text-foreground focus-visible:outline-none"
                      aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirm ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                {/* Password Match Status */}
                {newPassword.length > 0 && confirmPassword.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    {isMatch ? (
                      <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                        <Check className="size-3.5" aria-hidden="true" /> Passwords match
                      </span>
                    ) : isMismatch ? (
                      <span className="flex items-center gap-1.5 font-semibold text-destructive">
                        <AlertCircle className="size-3.5" aria-hidden="true" /> Passwords do not match
                      </span>
                    ) : null}
                  </div>
                )}

                {/* Inline Error Display */}
                {error && (
                  <p
                    role="alert"
                    className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs font-medium text-destructive"
                  >
                    {error}
                  </p>
                )}
              </div>
            </PwaCard>

            {/* Submit Action Button */}
            <PwaButton
              type="submit"
              variant="primary"
              size="lg"
              disabled={submitting || !allCriteriaMet || !isMatch || !currentPassword}
              className="w-full"
              icon={<KeyRound className="size-4" aria-hidden="true" />}
            >
              {submitting ? 'Updating Password...' : 'Save New Password & Continue'}
            </PwaButton>
          </form>

          {/* Bottom Sign out Action */}
          <div className="mt-auto pt-4 text-center">
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
              title="Sign out"
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}
