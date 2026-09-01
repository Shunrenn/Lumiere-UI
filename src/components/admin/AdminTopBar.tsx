import { useEffect, useRef, useState } from 'react'
import { LogOut, Moon, Sun, User, ShieldAlert, UserPlus, Activity, KeyRound, Check, X as XIcon } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { useDarkMode } from '@/lib/theme'
import { NotificationsBell, type NotificationEntry } from '@/components/NotificationsBell'
import { SECURITY_EVENTS, type SecurityEvent } from '@/lib/security-events'
import { MaskedPinInput } from '@/components/admin/MaskedPinInput'

const ADMIN_NOTIFICATIONS: NotificationEntry[] = [
  { id: 'admin-1', icon: ShieldAlert, color: 'text-destructive', text: 'A privileged account was locked after repeated sign-in failures.', time: '12 minutes ago', unread: true },
  { id: 'admin-2', icon: UserPlus, color: 'text-primary', text: 'A new workforce account is waiting for activation.', time: '1 hour ago', unread: true },
  { id: 'admin-3', icon: Activity, color: 'text-muted-foreground', text: 'System health review completed successfully.', time: 'Yesterday', unread: false },
]

// Constant top bar for the Admin console: live date/time, notification bell,
// and a profile menu. Sits alongside the rail outside the scroll container so
// it never scrolls with page content.
export function AdminTopBar() {
  const { adminName, adminRole, setConfirmLogout, hasConfirmationPin } = useAuth()
  const { dark, toggle } = useDarkMode()
  const [menuOpen, setMenuOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Tick the clock every minute so the top-bar time stays live.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const dateLabel = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  })
  const timeLabel = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-5 sm:px-8">
      <p className="text-[0.65rem] font-medium uppercase tracking-[0.12em] text-muted-foreground sm:text-xs sm:tracking-[0.15em]">
        {dateLabel} <span className="mx-1 text-border">|</span> {timeLabel}
      </p>

      <div className="flex items-center gap-2">
        <NotificationsBell notifications={ADMIN_NOTIFICATIONS} size="md" />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
            className="flex size-10 items-center justify-center rounded-full border border-border bg-primary/15 text-primary transition-colors hover:bg-primary/25"
          >
            <User className="size-4" aria-hidden="true" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-card shadow-xl"
            >
              <div className="px-4 py-3">
                <p className="truncate text-sm font-semibold text-card-foreground">{adminName}</p>
                <p className="truncate text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground">
                  {adminRole}
                </p>
              </div>
              <div className="border-t border-border">
                <button
                  type="button"
                  role="menuitem"
                  onClick={toggle}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium text-card-foreground transition-colors hover:bg-accent"
                >
                  {dark ? (
                    <Sun className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Moon className="size-3.5" aria-hidden="true" />
                  )}
                  {dark ? 'Switch to light mode' : 'Switch to dark mode'}
                </button>
              </div>
              <div className="border-t border-border">
                <p className="px-4 pt-2.5 pb-1 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Security
                </p>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    setPinModalOpen(true)
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium text-card-foreground transition-colors hover:bg-accent"
                >
                  <KeyRound className="size-3.5" aria-hidden="true" />
                  {hasConfirmationPin ? 'Change PIN' : 'Set confirmation PIN'}
                </button>
              </div>
              <div className="border-t border-border">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    setConfirmLogout(true)
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium text-destructive transition-colors hover:bg-accent"
                >
                  <LogOut className="size-3.5" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {pinModalOpen && <ChangePinModal onClose={() => setPinModalOpen(false)} />}
    </header>
  )
}

/* ----------------------------- Change / set PIN modal ----------------------------- */

type PinModalStep = 'current' | 'set' | 'forgot-password' | 'set-after-reset'

// Inline live match indicator shown once both the new PIN and its
// confirmation are fully entered — so the admin gets immediate feedback
// instead of only finding out on submit.
function PinMatchIndicator({ newPin, confirmPin }: { newPin: string; confirmPin: string }) {
  if (newPin.length !== 6 || confirmPin.length !== 6) return null
  const matches = newPin === confirmPin
  return (
    <p
      className={cn(
        'flex items-center gap-1.5 text-xs font-medium',
        matches ? 'text-emerald-500' : 'text-destructive',
      )}
    >
      {matches ? <Check className="size-3.5" aria-hidden="true" /> : <XIcon className="size-3.5" aria-hidden="true" />}
      {matches ? 'PINs match.' : "PINs don't match yet."}
    </p>
  )
}

// Logs a failed "Forgot PIN?" password re-entry to Security Audit Logs as
// 'Failed' (not 'Blocked') — reusing the existing Success/Failed/Blocked/
// Warning taxonomy. Deliberately not 'Blocked': nothing is actually locked
// out here, per the no-lockout decision for this password re-entry step.
function logFailedPinResetAttempt() {
  const now = new Date()
  const entry: SecurityEvent = {
    id: `sec-pin-reset-${Date.now()}`,
    timestamp: now.toLocaleTimeString('en-GB'),
    date: 'May 14, 2026',
    logId: `SEC-${Math.floor(90000 + Math.random() * 9000)}`,
    employeeId: 'SYS-ROOT',
    role: 'Admin',
    action: 'Incorrect password entered while resetting confirmation PIN',
    status: 'Failed',
    ip: '10.0.0.1',
    terminal: 'CONSOLE',
    token: 'SYS-KEY',
    note: 'Password re-verification failed during the "Forgot PIN?" flow. No lockout applied to this step.',
    dotColor: 'bg-amber-400',
  }
  SECURITY_EVENTS.unshift(entry)
}

function ChangePinModal({ onClose }: { onClose: () => void }) {
  const { hasConfirmationPin, verifyConfirmationPin, setConfirmationPin, verifyPassword } = useAuth()

  // First-time setup has no "current PIN" to check — go straight to 'set'.
  const [step, setStep] = useState<PinModalStep>(hasConfirmationPin ? 'current' : 'set')

  const [currentPin, setCurrentPin] = useState('')
  const [currentError, setCurrentError] = useState('')

  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [setError, setSetError] = useState('')

  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const [successMessage, setSuccessMessage] = useState('')

  const submitCurrent = () => {
    if (currentPin.length !== 6) return
    if (verifyConfirmationPin(currentPin)) {
      setCurrentError('')
      setStep('set')
    } else {
      setCurrentError('Incorrect PIN.')
    }
  }

  const submitNewPin = () => {
    if (newPin.length !== 6 || confirmPin.length !== 6) return
    if (newPin !== confirmPin) {
      setSetError('PINs do not match.')
      return
    }
    setConfirmationPin(newPin)
    setSuccessMessage(hasConfirmationPin ? 'Your PIN has been updated.' : 'Your confirmation PIN has been set.')
  }

  const submitForgotPassword = async () => {
    if (!password) return
    const ok = await verifyPassword(password)
    if (ok) {
      setPasswordError('')
      setPassword('')
      setStep('set-after-reset')
    } else {
      // No lockout here by design: this password already has no
      // rate-limiting at the login screen, so adding one only on this
      // re-entry point would add friction without real security benefit.
      // Still logged for visibility, but as 'Failed', not 'Blocked'.
      logFailedPinResetAttempt()
      setPasswordError('Incorrect password.')
    }
  }

  if (successMessage) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 p-4"
        role="dialog"
        aria-modal="true"
        aria-label="PIN updated"
      >
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-2xl">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">Success</p>
          <p className="mt-3 text-sm leading-relaxed text-card-foreground">{successMessage}</p>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={hasConfirmationPin ? 'Change confirmation PIN' : 'Set confirmation PIN'}
    >
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-2xl">
        {step === 'current' && (
          <>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Change confirmation PIN
            </p>
            <p className="mt-3 text-sm leading-relaxed text-card-foreground">
              Enter your current 6-digit PIN to continue.
            </p>
            <div className="mt-5">
              <MaskedPinInput
                id="current-pin-input"
                label="Current PIN"
                value={currentPin}
                onChange={(v) => {
                  setCurrentPin(v)
                  setCurrentError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && currentPin.length === 6) submitCurrent()
                }}
                autoFocus
              />
            </div>
            {currentError && <p className="mt-2 text-xs text-destructive">{currentError}</p>}
            <button
              type="button"
              onClick={() => setStep('forgot-password')}
              className="mt-3 text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              Forgot PIN?
            </button>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-border px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={currentPin.length !== 6}
                onClick={submitCurrent}
                className={cn(
                  'rounded-md px-4 py-2 text-xs font-semibold transition',
                  currentPin.length === 6
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'cursor-not-allowed bg-muted text-muted-foreground/50',
                )}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === 'set' && (
          <>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {hasConfirmationPin ? 'Set new PIN' : 'Set your confirmation PIN'}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-card-foreground">
              {hasConfirmationPin
                ? 'Choose a new 6-digit PIN.'
                : 'This PIN confirms high-stakes actions like creating or deleting a sub-role. Choose 6 digits.'}
            </p>
            <div className="mt-5 flex flex-col gap-4">
              <MaskedPinInput
                id="new-pin-input"
                label="New PIN"
                value={newPin}
                onChange={(v) => {
                  setNewPin(v)
                  setSetError('')
                }}
                autoFocus
              />
              <MaskedPinInput
                id="confirm-pin-input"
                label="Confirm new PIN"
                value={confirmPin}
                onChange={(v) => {
                  setConfirmPin(v)
                  setSetError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPin.length === 6 && confirmPin.length === 6) submitNewPin()
                }}
              />
              <PinMatchIndicator newPin={newPin} confirmPin={confirmPin} />
            </div>
            {setError && <p className="mt-2 text-xs text-destructive">{setError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-border px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={newPin.length !== 6 || confirmPin.length !== 6}
                onClick={submitNewPin}
                className={cn(
                  'rounded-md px-4 py-2 text-xs font-semibold transition',
                  newPin.length === 6 && confirmPin.length === 6
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'cursor-not-allowed bg-muted text-muted-foreground/50',
                )}
              >
                Save
              </button>
            </div>
          </>
        )}

        {step === 'forgot-password' && (
          <>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Verify your password
            </p>
            <p className="mt-3 text-sm leading-relaxed text-card-foreground">
              Enter your account password to reset your confirmation PIN.
            </p>
            <label
              className="mt-5 block text-[0.6rem] font-bold uppercase tracking-[0.14em] text-muted-foreground"
              htmlFor="forgot-pin-password"
            >
              Password
              <input
                id="forgot-pin-password"
                autoFocus
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setPasswordError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && password) submitForgotPassword()
                }}
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
              />
            </label>
            {passwordError && <p className="mt-2 text-xs text-destructive">{passwordError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-border px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!password}
                onClick={submitForgotPassword}
                className={cn(
                  'rounded-md px-4 py-2 text-xs font-semibold transition',
                  password
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'cursor-not-allowed bg-muted text-muted-foreground/50',
                )}
              >
                Verify
              </button>
            </div>
          </>
        )}

        {step === 'set-after-reset' && (
          <>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Set new PIN
            </p>
            <p className="mt-3 text-sm leading-relaxed text-card-foreground">
              Password verified. Choose a new 6-digit PIN.
            </p>
            <div className="mt-5 flex flex-col gap-4">
              <MaskedPinInput
                id="reset-new-pin-input"
                label="New PIN"
                value={newPin}
                onChange={(v) => {
                  setNewPin(v)
                  setSetError('')
                }}
                autoFocus
              />
              <MaskedPinInput
                id="reset-confirm-pin-input"
                label="Confirm new PIN"
                value={confirmPin}
                onChange={(v) => {
                  setConfirmPin(v)
                  setSetError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPin.length === 6 && confirmPin.length === 6) submitNewPin()
                }}
              />
              <PinMatchIndicator newPin={newPin} confirmPin={confirmPin} />
            </div>
            {setError && <p className="mt-2 text-xs text-destructive">{setError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-border px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={newPin.length !== 6 || confirmPin.length !== 6}
                onClick={submitNewPin}
                className={cn(
                  'rounded-md px-4 py-2 text-xs font-semibold transition',
                  newPin.length === 6 && confirmPin.length === 6
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'cursor-not-allowed bg-muted text-muted-foreground/50',
                )}
              >
                Save
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
