import { useState, type FormEvent, type ReactNode } from 'react'
import {
  Lock,
  IdCard,
  Eye,
  EyeOff,
  WifiOff,
  ShieldCheck,
  ArrowRight,
  HardHat,
  ChevronLeft,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'

export function GroundCrewLoginPage({ onStaffPortal }: { onStaffPortal: () => void }) {
  const { login } = useAuth()
  const [crewId, setCrewId] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSigningIn(true)
    try {
      const result = await login(crewId, pin, 'pwa')
      if (!result.ok) setError(result.reason === 'wrong-portal' ? 'This account belongs to the Lumière web app. Use the Web login to continue.' : 'Credentials not recognized. Check your Crew ID and access code.')
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <div className="flex min-h-dvh w-full justify-center bg-background">
      <div className="flex w-full max-w-md flex-col">
        {/* Hero */}
        <header
          className="relative overflow-hidden bg-sidebar px-5 pb-6 text-sidebar-foreground"
          style={{ paddingTop: 'calc(0.875rem + env(safe-area-inset-top))' }}
        >
          <button
            type="button"
            onClick={onStaffPortal}
            className="mb-4 inline-flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground"
          >
            <ChevronLeft className="size-3.5" aria-hidden="true" />
            Staff Portal
          </button>

          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent/40">
              <HardHat className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-serif text-xl font-medium tracking-[0.22em]">LUMIÈRE</p>
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/70">
                Field Operations
              </p>
            </div>
          </div>

          <h1 className="mt-5 text-balance font-serif text-2xl font-medium leading-tight">
            Ground Crew Console
          </h1>
          <p className="mt-1.5 text-pretty text-sm leading-relaxed text-sidebar-foreground/75">
            Clock in to run your on-site chain of custody.
          </p>

          {/* Status strip */}
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusPill icon={WifiOff} label="Offline-ready" />
            <StatusPill icon={ShieldCheck} label="Secured device" />
          </div>
        </header>

        {/* Form */}
        <main className="flex flex-col px-5 pb-6 pt-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Crew ID">
              <InputWrap>
                <IdCard className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <input
                  type="email"
                  inputMode="email"
                  value={crewId}
                  onChange={(e) => setCrewId(e.target.value)}
                  placeholder="crew@lumiere.com"
                  autoComplete="username"
                  className="w-full min-w-0 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/60"
                />
              </InputWrap>
            </Field>

            <Field label="Access Code">
              <InputWrap>
                <Lock className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter access code"
                  autoComplete="current-password"
                  className="w-full min-w-0 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/60"
                />
                <button
                  type="button"
                  onClick={() => setShowPin((s) => !s)}
                  aria-label={showPin ? 'Hide access code' : 'Show access code'}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPin ? (
                    <EyeOff className="size-5" aria-hidden="true" />
                  ) : (
                    <Eye className="size-5" aria-hidden="true" />
                  )}
                </button>
              </InputWrap>
            </Field>

            {error && (
              <p
                className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={signingIn}
              className="mt-1 inline-flex h-13 w-full items-center justify-center gap-2.5 rounded-xl bg-primary text-sm font-bold uppercase tracking-[0.18em] text-primary-foreground shadow-sm transition-opacity hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ height: '3.25rem' }}
            >
              {signingIn ? 'CLOCKING IN...' : 'Clock In'}
              {!signingIn && <ArrowRight className="size-4" aria-hidden="true" />}
            </button>
          </form>

          <p
            className="pt-6 text-center text-xs text-muted-foreground/70"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            Ground crew · crew@lumiere.com · lumiere2026
          </p>
        </main>
      </div>
    </div>
  )
}

/* ----------------------------- Primitives ----------------------------- */

function StatusPill({ icon: Icon, label }: { icon: typeof WifiOff; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-sidebar-border bg-sidebar-accent/30 px-3 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em]">
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-foreground/70">
        {label}
      </span>
      {children}
    </label>
  )
}

function InputWrap({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-4 shadow-sm focus-within:border-sidebar">
      {children}
    </div>
  )
}
