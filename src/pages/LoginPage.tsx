import { useState, type FormEvent, type ReactNode } from 'react'
import { User, Lock, Eye, EyeOff, HardHat, Sun, Moon, Monitor } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useThemeMode, type ThemeMode } from '@/lib/theme'

type View = 'signin' | 'request' | 'sent'
type RequestType = 'forgot-password' | 'request-password'

export function LoginPage({ onCrewPortal }: { onCrewPortal: () => void }) {
  const { login } = useAuth()
  const { mode: themeMode, setMode: setThemeMode } = useThemeMode()
  const [view, setView] = useState<View>('signin')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')

  const [requestEmail, setRequestEmail] = useState('')
  const [requestType, setRequestType] = useState<RequestType>('request-password')
  const [requestError, setRequestError] = useState('')
  const [submittingRequest, setSubmittingRequest] = useState(false)
  const [signingIn, setSigningIn] = useState(false)

  async function handleSignIn(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSigningIn(true)
    try {
      const result = await login(email, password, 'web')
      if (!result.ok) setError(result.reason === 'wrong-portal' ? 'This account belongs to the Lumière PWA. Use the PWA login to continue.' : 'Invalid credentials. Please verify your email and password.')
    } finally {
      setSigningIn(false)
    }
  }

  async function handleRequest(e: FormEvent) {
    e.preventDefault()
    setRequestError('')
    const normalized = requestEmail.trim().toLowerCase()
    if (!normalized.endsWith('@lumiere.com')) {
      setRequestError('Access is restricted to @lumiere.com email addresses.')
      return
    }
    setSubmittingRequest(true)
    try {
      const { error: insertError } = await supabase
        .from('access_requests')
        .insert({ email: normalized, type: requestType, status: 'pending' })
      if (insertError) {
        console.error('[v0] Failed to submit access request:', insertError)
        setRequestError('Could not submit your request. Please try again.')
        return
      }
      setRequestEmail('')
      setView('sent')
    } finally {
      setSubmittingRequest(false)
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Left brand panel */}
      <div className="relative hidden w-[32%] shrink-0 lg:block">
        <img
          src="/images/lumiere-auth-bg.png"
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-foreground/5" />
        <h1 className="absolute left-12 top-36 font-serif text-4xl font-medium tracking-[0.3em] text-white drop-shadow-sm">
          LUMIÈRE
        </h1>
      </div>

      {/* Right content panel — scrolls internally so the form and full demo
          account list stay reachable on short viewports. min-h-full on the
          inner wrapper keeps the card vertically centered when it fits, while
          still allowing the top to scroll into view when it doesn't. */}
      <div className="relative flex-1 overflow-y-auto">
        <div className="absolute right-6 top-6 z-10">
          <ThemeToggle mode={themeMode} onChange={setThemeMode} />
        </div>
        <div className="flex min-h-full items-center justify-center px-6 py-10">
          <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-muted/60 px-10 py-14 lg:px-16 lg:py-16">
          {view === 'signin' && (
            <SignInView
              email={email}
              password={password}
              showPassword={showPassword}
              remember={remember}
              error={error}
              signingIn={signingIn}
              onEmail={setEmail}
              onPassword={setPassword}
              onToggleShow={() => setShowPassword((s) => !s)}
              onRemember={() => setRemember((r) => !r)}
              onSubmit={handleSignIn}
              onForgot={() => {
                setRequestError('')
                setRequestType('forgot-password')
                setView('request')
              }}
              onRequest={() => {
                setError('')
                setRequestError('')
                setRequestType('request-password')
                setView('request')
              }}
              onCrewPortal={onCrewPortal}
            />
          )}

          {view === 'request' && (
            <RequestView
              email={requestEmail}
              type={requestType}
              error={requestError}
              submitting={submittingRequest}
              onEmail={setRequestEmail}
              onSubmit={handleRequest}
              onBack={() => setView('signin')}
            />
          )}

          {view === 'sent' && <SentView onReturn={() => setView('signin')} />}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------- Sign In ----------------------------- */

function SignInView(props: {
  email: string
  password: string
  showPassword: boolean
  remember: boolean
  error: string
  signingIn: boolean
  onEmail: (v: string) => void
  onPassword: (v: string) => void
  onToggleShow: () => void
  onRemember: () => void
  onSubmit: (e: FormEvent) => void
  onForgot: () => void
  onRequest: () => void
  onCrewPortal: () => void
}) {
  return (
    <form onSubmit={props.onSubmit} className="flex flex-col">
      <h2 className="text-center font-serif text-4xl font-medium tracking-[0.25em] text-foreground">
        WELCOME BACK
      </h2>
      <p className="mt-4 text-center text-base text-muted-foreground">
        Sign in to illuminate your event vision.
      </p>

      <div className="mt-12 flex flex-col gap-6">
        <Field label="EMAIL">
          <InputWrap>
            <User className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              type="email"
              value={props.email}
              onChange={(e) => props.onEmail(e.target.value)}
              placeholder="Enter your credentials"
              autoComplete="email"
              className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground/70"
            />
          </InputWrap>
        </Field>

        <Field label="PASSWORD">
          <InputWrap>
            <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              type={props.showPassword ? 'text' : 'password'}
              value={props.password}
              onChange={(e) => props.onPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground/70"
            />
            <button
              type="button"
              onClick={props.onToggleShow}
              aria-label={props.showPassword ? 'Hide password' : 'Show password'}
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            >
              {props.showPassword ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          </InputWrap>
        </Field>
      </div>

      {props.error && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {props.error}
        </p>
      )}

      <div className="mt-7 flex items-center justify-between text-sm">
        <label className="flex cursor-pointer items-center gap-2.5 text-foreground/80">
          <input
            type="checkbox"
            checked={props.remember}
            onChange={props.onRemember}
            className="size-4 accent-sidebar"
          />
          Remember me
        </label>
        <div className="flex items-center gap-4 text-foreground/80">
          <button
            type="button"
            onClick={props.onForgot}
            className="transition-colors hover:text-foreground"
          >
            Forgot Password?
          </button>
          <span className="text-border">|</span>
          <button
            type="button"
            onClick={props.onRequest}
            className="transition-colors hover:text-foreground"
          >
            Request Access
          </button>
        </div>
      </div>

      <SubmitButton className="mt-10" disabled={props.signingIn}>
        {props.signingIn ? 'SIGNING IN...' : 'ENTER PORTAL'}
      </SubmitButton>

      <button
        type="button"
        onClick={props.onCrewPortal}
        className="mt-6 inline-flex items-center justify-center gap-2 self-center text-sm font-medium uppercase tracking-[0.15em] text-foreground/70 transition-colors hover:text-foreground"
      >
        <HardHat className="size-4" aria-hidden="true" />
        Ground Crew? Field Login
      </button>

      <div className="mt-6 space-y-1 text-center text-xs text-muted-foreground/70">
        <p>Demo admin · admin@lumiere.com · lumiere2026</p>
        <p>Executive · executive@lumiere.com · lumiere2026</p>
        <p>Executive (second sign-off) · executive2@lumiere.com · lumiere2026</p>
        <p>Event planner · planner@lumiere.com · lumiere2026</p>
        <p>Ground crew · crew@lumiere.com · lumiere2026</p>
        <p className="pt-2 font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
          Warehouse Ops
        </p>
        <p>Full access · Warehouse Ops Manager · warehouseops@lumiere.com · lumiere2026 · 246810</p>
        <p>Sub-role · Manning Officer · manning@lumiere.com · lumiere2026</p>
        <p>Sub-role · Warehouse Manager · warehouse@lumiere.com · lumiere2026</p>
        <p>Sub-role · Production Manager · production@lumiere.com · lumiere2026</p>
        <p>Sub-role · Inventory Officer · inventory@lumiere.com · lumiere2026</p>
        <p>Sub-role · Purchasing Officer · purchasing@lumiere.com · lumiere2026</p>
      </div>
    </form>
  )
}

/* ----------------------------- Request Access ----------------------------- */

function RequestView(props: {
  email: string
  type: RequestType
  error: string
  submitting: boolean
  onEmail: (v: string) => void
  onSubmit: (e: FormEvent) => void
  onBack: () => void
}) {
  const isForgot = props.type === 'forgot-password'
  return (
    <form onSubmit={props.onSubmit} className="flex flex-col">
      <h2 className="text-center font-serif text-4xl font-medium tracking-[0.2em] text-foreground">
        {isForgot ? 'FORGOT PASSWORD' : 'REQUEST LOG-IN ACCESS'}
      </h2>
      <p className="mx-auto mt-4 max-w-md text-center text-base text-muted-foreground text-pretty">
        {isForgot
          ? 'Enter your @lumiere.com email below. An administrator will review your request and issue a new temporary password.'
          : 'Enter your @lumiere.com email below. An administrator will verify your account and provide a temporary password.'}
      </p>

      <div className="mt-12">
        <Field label="EMAIL">
          <InputWrap>
            <User className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              type="email"
              required
              value={props.email}
              onChange={(e) => props.onEmail(e.target.value)}
              placeholder="name@lumiere.com"
              autoComplete="email"
              className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground/70"
            />
          </InputWrap>
        </Field>
      </div>

      {props.error && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {props.error}
        </p>
      )}

      <SubmitButton className="mt-10" disabled={props.submitting}>
        {props.submitting ? 'SENDING...' : 'SEND REQUEST'}
      </SubmitButton>

      <button
        type="button"
        onClick={props.onBack}
        className="mt-10 self-start text-base text-foreground/80 transition-colors hover:text-foreground"
      >
        {'< Back to Sign-In'}
      </button>
    </form>
  )
}

/* ----------------------------- Request Sent ----------------------------- */

function SentView(props: { onReturn: () => void }) {
  return (
    <div className="flex flex-col">
      <h2 className="text-center font-serif text-4xl font-medium tracking-[0.25em] text-foreground">
        REQUEST SENT
      </h2>
      <p className="mx-auto mt-4 max-w-md text-center text-base text-muted-foreground text-pretty">
        Your access request has been sent to the system administrator.
      </p>
      <p className="mx-auto mt-10 max-w-md text-center text-base text-muted-foreground text-pretty">
        Please check your direct messages or corporate email for your temporary password. Once
        received, return to the portal to log in.
      </p>

      <SubmitButton className="mt-12" onClick={props.onReturn}>
        RETURN TO PORTAL
      </SubmitButton>
    </div>
  )
}

/* ----------------------------- Theme Toggle ----------------------------- */

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: 'light', label: 'Light theme', icon: Sun },
  { mode: 'dark', label: 'Dark theme', icon: Moon },
  { mode: 'system', label: 'System theme', icon: Monitor },
]

function ThemeToggle({ mode, onChange }: { mode: ThemeMode; onChange: (mode: ThemeMode) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex items-center gap-0.5 rounded-full border border-border bg-card/80 p-1 shadow-sm backdrop-blur"
    >
      {THEME_OPTIONS.map(({ mode: optionMode, label, icon: Icon }) => (
        <button
          key={optionMode}
          type="button"
          role="radio"
          aria-checked={mode === optionMode}
          aria-label={label}
          title={label}
          onClick={() => onChange(optionMode)}
          className={`flex size-8 items-center justify-center rounded-full transition-colors ${
            mode === optionMode
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <Icon className="size-3.5" aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}

/* ----------------------------- Primitives ----------------------------- */

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground/70">
        {label}
      </span>
      {children}
    </div>
  )
}

function InputWrap({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-card px-5 py-4 shadow-sm focus-within:border-sidebar">
      {children}
    </div>
  )
}

function SubmitButton({
  children,
  className = '',
  onClick,
  disabled = false,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-md border-2 border-foreground bg-transparent py-5 text-center text-base font-medium uppercase tracking-[0.3em] text-foreground transition-colors hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  )
}
