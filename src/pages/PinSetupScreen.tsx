import { useState } from 'react'
import { ShieldCheck, LogOut, Check, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { MaskedPinInput } from '@/components/admin/MaskedPinInput'
import { cn } from '@/lib/utils'

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
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 text-foreground">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-6 shadow-2xl sm:p-8">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="eyebrow">First-Run Security</p>
              <h1 className="font-serif text-xl font-bold tracking-tight">Set Verification PIN</h1>
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
            You are registered in {article} <span className="font-semibold text-foreground">{formattedRole}</span> account. Please configure a 6-digit confirmation PIN to protect sensitive actions, or skip to set it up later.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {newPin.length > 0 && confirmPin.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              {isMatch ? (
                <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                  <Check className="size-3.5" /> PINs match
                </span>
              ) : isMismatch ? (
                <span className="flex items-center gap-1 font-medium text-destructive">
                  <AlertCircle className="size-3.5" /> PINs do not match
                </span>
              ) : null}
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={!isMatch}
            className={cn(
              'button-primary w-full py-2.5 font-semibold transition',
              !isMatch && 'cursor-not-allowed opacity-50',
            )}
          >
            Save PIN &amp; Continue
          </button>

          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => void setConfirmationPin('000000')}
              className="text-xs text-muted-foreground transition hover:text-foreground underline underline-offset-4 decoration-muted-foreground/30 hover:decoration-foreground"
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
