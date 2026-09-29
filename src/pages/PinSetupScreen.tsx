import { useState } from 'react'
import { ShieldCheck, LogOut, Check, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { MaskedPinInput } from '@/components/admin/MaskedPinInput'
import { getClientRoleDisplayName } from '@/lib/role-display'

export function PinSetupScreen() {
  const { adminName, adminRole, setConfirmationPin, logout } = useAuth()
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isMatch = newPin.length === 6 && confirmPin.length === 6 && newPin === confirmPin
  const isMismatch = confirmPin.length === 6 && newPin.length === 6 && newPin !== confirmPin

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPin.length !== 6) {
      setError('PIN must be exactly 6 numeric digits.')
      return
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match. Please re-enter.')
      return
    }
    setIsSubmitting(true)
    try {
      const ok = await setConfirmationPin(newPin)
      if (!ok) {
        setError('Failed to set PIN on server. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const firstName = adminName ? adminName.trim().split(' ')[0] : 'User'
  const displayRole = getClientRoleDisplayName(adminRole)
  const article = /^[aeiou]/i.test(displayRole) ? 'an' : 'a'

  return (
    <div className="flex min-h-screen w-full flex-col justify-between bg-[#FAF7F2] dark:bg-background px-4 py-8 sm:py-12">
      {/* Top Branding Bar */}
      <div className="flex flex-col items-center justify-center text-center">
        <p className="font-serif text-2xl font-normal tracking-[0.25em] text-neutral-900 dark:text-foreground">
          LUMIÈRE
        </p>
        <span className="mt-1 inline-flex items-center gap-1.5 rounded px-2.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.2em] bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/25">
          SECURITY VERIFICATION · ONBOARDING
        </span>
      </div>

      {/* Main Card Container */}
      <main className="my-auto flex w-full justify-center">
        <div className="w-full max-w-lg rounded-2xl border border-[#E6DFD5] dark:border-border/70 bg-[#FDFCFA] dark:bg-card/90 p-6 sm:p-10 shadow-xs space-y-6">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-normal tracking-tight text-neutral-900 dark:text-foreground">
              Set Your Verification PIN
            </h1>

            <p className="text-sm leading-relaxed text-neutral-600 dark:text-muted-foreground">
              Welcome, {firstName}. Your account is registered as {article}{' '}
              <span className="font-semibold text-neutral-900 dark:text-foreground">{displayRole}</span>.
            </p>

            <div className="rounded-lg border border-[#E6DFD5]/80 bg-[#FAF7F2]/80 dark:bg-muted/30 dark:border-border/60 p-3.5 text-xs leading-relaxed text-neutral-600 dark:text-muted-foreground">
              Your 6-digit PIN authorizes sensitive actions — approvals, security gates, and confirmation checkpoints — across your Lumière console. It is stored securely and never shared with other staff.
            </div>
          </div>

          {/* PIN Setup Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <MaskedPinInput
                id="first-run-new-pin"
                label="6-Digit Verification PIN"
                value={newPin}
                onChange={(v) => {
                  setNewPin(v)
                  setError('')
                }}
                autoFocus
              />

              <MaskedPinInput
                id="first-run-confirm-pin"
                label="Confirm 6-Digit PIN"
                value={confirmPin}
                onChange={(v) => {
                  setConfirmPin(v)
                  setError('')
                }}
              />

              {/* Match/Mismatch Indicator */}
              {newPin.length > 0 && confirmPin.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs pt-1">
                  {isMatch ? (
                    <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      <Check className="size-3.5" aria-hidden="true" />
                      PINs match
                    </span>
                  ) : isMismatch ? (
                    <span className="flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400">
                      <AlertCircle className="size-3.5" aria-hidden="true" />
                      PINs do not match
                    </span>
                  ) : null}
                </div>
              )}

              {/* Inline Error */}
              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs font-medium text-destructive"
                >
                  {error}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={!isMatch || isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1A1A1A] hover:bg-black text-white dark:bg-neutral-100 dark:text-neutral-950 px-5 py-3 text-xs font-bold uppercase tracking-widest shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ShieldCheck className="size-4" aria-hidden="true" />
                {isSubmitting ? 'Saving PIN...' : 'Save PIN & Continue'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => void setConfirmationPin('000000')}
                  className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-foreground underline underline-offset-4 decoration-neutral-300 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* Footer / Sign Out */}
      <footer className="flex justify-center pt-4 text-center">
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-foreground transition-colors"
          title="Sign out"
        >
          <LogOut className="size-3.5" aria-hidden="true" />
          <span>Sign out</span>
        </button>
      </footer>
    </div>
  )
}
