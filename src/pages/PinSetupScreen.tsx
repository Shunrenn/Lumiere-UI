import { useState } from 'react'
import { ShieldCheck, LogOut, Check, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { MaskedPinInput } from '@/components/admin/MaskedPinInput'
import { PwaCard, PwaButton } from '@/components/pwa'

export function PinSetupScreen() {
  const { adminName, adminRole, setConfirmationPin, logout } = useAuth()
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')

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
    const ok = await setConfirmationPin(newPin)
    if (!ok) {
      setError('Failed to set PIN on server. Please try again.')
    }
  }

  const firstName = adminName ? adminName.trim().split(' ')[0] : 'User'
  const formattedRole = (adminRole || 'user').toLowerCase()
  const article = /^[aeiou]/i.test(formattedRole) ? 'an' : 'a'

  return (
    <div className="flex min-h-dvh w-full justify-center bg-background">
      <div className="flex w-full max-w-md flex-col">

        {/* Shared PWA-style hero header */}
        <header
          className="relative overflow-hidden bg-sidebar px-5 pb-6 text-sidebar-foreground"
          style={{ paddingTop: 'calc(0.875rem + env(safe-area-inset-top))' }}
        >
          {/* Wordmark + role */}
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent/40">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-serif text-xl font-medium tracking-[0.22em]">LUMIÈRE</p>
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/70">
                Security Setup
              </p>
            </div>
          </div>

          {/* Headline */}
          <h1 className="mt-5 text-balance font-serif text-2xl font-medium leading-tight">
            Set Your Verification PIN
          </h1>
          <p className="mt-1.5 text-pretty text-sm leading-relaxed text-sidebar-foreground/75">
            Welcome, {firstName}. You are registered as {article}{' '}
            <span className="font-semibold text-sidebar-foreground">{formattedRole}</span>.
          </p>
        </header>

        {/* Main content */}
        <main className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-5"
          style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
        >
          {/* Context card */}
          <PwaCard>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Your 6-digit PIN protects sensitive actions — approvals, incident access, and
                confirmation gates — across your Lumière console. It is stored securely and
                never shared with other staff members.
              </p>
            </div>
          </PwaCard>

          {/* PIN form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <PwaCard title="Create PIN" subtitle="Enter a 6-digit numeric code">
              <div className="flex flex-col gap-4 pt-1">
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

                {/* Match/mismatch indicator */}
                {newPin.length > 0 && confirmPin.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    {isMatch ? (
                      <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                        <Check className="size-3.5" aria-hidden="true" />
                        PINs match
                      </span>
                    ) : isMismatch ? (
                      <span className="flex items-center gap-1.5 font-semibold text-destructive">
                        <AlertCircle className="size-3.5" aria-hidden="true" />
                        PINs do not match
                      </span>
                    ) : null}
                  </div>
                )}

                {/* Inline error */}
                {error && (
                  <p
                    role="alert"
                    className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs font-medium text-destructive"
                  >
                    {error}
                  </p>
                )}
              </div>
            </PwaCard>

            {/* Primary CTA */}
            <PwaButton
              type="submit"
              variant="primary"
              size="lg"
              disabled={!isMatch}
              className="w-full"
              icon={<ShieldCheck className="size-4" aria-hidden="true" />}
            >
              Save PIN &amp; Continue
            </PwaButton>

            {/* Secondary skip action */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => void setConfirmationPin('000000')}
                className="text-xs text-muted-foreground underline underline-offset-4 decoration-muted-foreground/30 transition hover:text-foreground hover:decoration-foreground"
              >
                Skip for now
              </button>
            </div>
          </form>

          {/* Sign out */}
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
