import { useState } from 'react'
import { KeyRound, LogOut, Check, AlertCircle, Eye, EyeOff } from 'lucide-react'
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

  const isMatch = newPassword.length >= 6 && confirmPassword.length >= 6 && newPassword === confirmPassword
  const isMismatch = confirmPassword.length >= 6 && newPassword.length >= 6 && newPassword !== confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!currentPassword) {
      setError('Please enter your current temporary password.')
      return
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.')
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
              Current Temporary Password
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
              New Permanent Password
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
                placeholder="Minimum 6 characters"
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
          </div>

          <div className="space-y-1.5">
            <label className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Confirm New Password
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
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Updating Password...' : 'Save New Password & Continue'}
          </button>
        </form>
      </div>
    </main>
  )
}
