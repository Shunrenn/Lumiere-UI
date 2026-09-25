import { useState } from 'react'
import { KeyRound, LogOut, Check, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth'

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
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 text-foreground">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-6 shadow-2xl sm:p-8">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyRound className="size-5" />
            </div>
            <div>
              <p className="eyebrow">First-Run Security</p>
              <h1 className="font-serif text-xl font-bold tracking-tight">Change Password</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
            title="Sign out"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>

        <div className="rounded-lg bg-primary/5 border border-primary/10 p-4 text-xs text-muted-foreground">
          <p className="text-base font-semibold text-foreground">
            Welcome, {firstName}! 🎉
          </p>
          <p className="mt-1.5 leading-relaxed text-xs">
            You are registered in {article} <span className="font-semibold text-foreground">{formattedRole}</span> account. We're excited to have you onboard! Please create your new permanent password below to secure your account and get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <span className="text-destructive mr-0.5">*</span>Current Temporary Password
            </label>
            <div className="relative flex items-center">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value)
                  setError('')
                }}
                placeholder="Enter temporary password"
                className="w-full rounded-md border border-input bg-background py-2 pl-3 pr-10 text-xs text-foreground outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((s) => !s)}
                className="absolute right-3 text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <span className="text-destructive mr-0.5">*</span>New Permanent Password
            </label>
            <div className="relative flex items-center">
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  setError('')
                }}
                placeholder="Combine uppercase, lowercase, numbers & symbols"
                className="w-full rounded-md border border-input bg-background py-2 pl-3 pr-10 text-xs text-foreground outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowNew((s) => !s)}
                className="absolute right-3 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>

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

            <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center justify-between">
                <span>Password Requirements</span>
                {allCriteriaMet && (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold normal-case">
                    <ShieldCheck className="size-3.5" /> Requirements Met
                  </span>
                )}
              </p>
              <div className="space-y-1.5 text-xs">
                {criteria.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center gap-2 transition-colors ${
                      c.met ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    {c.met ? (
                      <Check className="size-3.5 shrink-0 text-emerald-500" />
                    ) : (
                      <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/40 ml-1 mr-1" />
                    )}
                    <span className="text-[0.75rem]">{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <span className="text-destructive mr-0.5">*</span>Confirm New Password
            </label>
            <div className="relative flex items-center">
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setError('')
                }}
                placeholder="Re-enter new password"
                className="w-full rounded-md border border-input bg-background py-2 pl-3 pr-10 text-xs text-foreground outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                className="absolute right-3 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>

          {newPassword.length > 0 && confirmPassword.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              {isMatch ? (
                <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                  <Check className="size-3.5" /> Passwords match
                </span>
              ) : isMismatch ? (
                <span className="flex items-center gap-1 font-medium text-destructive">
                  <AlertCircle className="size-3.5" /> Passwords do not match
                </span>
              ) : null}
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !allCriteriaMet || !isMatch || !currentPassword}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Updating Password...' : 'Save New Password & Continue'}
          </button>
        </form>
      </div>
    </main>
  )
}

