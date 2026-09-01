import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

// Shared 6-digit PIN field used everywhere a confirmation PIN is entered
// (RBAC create/delete confirmation, and Set/Change PIN in the profile menu).
// Masked by default, like every other password-style field in the app —
// digits are only revealed while the eye button is actively pressed/held,
// never toggled to a persistent "shown" state, so a PIN never sits exposed
// on screen after the admin lets go.
export function MaskedPinInput({
  id,
  label,
  value,
  onChange,
  onKeyDown,
  disabled,
  autoFocus,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
  disabled?: boolean
  autoFocus?: boolean
}) {
  const [revealed, setRevealed] = useState(false)

  const startReveal = () => setRevealed(true)
  const stopReveal = () => setRevealed(false)

  return (
    <label className="block text-[0.6rem] font-bold uppercase tracking-[0.14em] text-muted-foreground" htmlFor={id}>
      {label}
      <div className="relative mt-1.5">
        <input
          id={id}
          autoFocus={autoFocus}
          inputMode="numeric"
          maxLength={6}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={onKeyDown}
          type={revealed ? 'text' : 'password'}
          placeholder="••••••"
          className="w-full rounded-md border border-input bg-background px-3 py-2.5 pr-10 text-center font-mono text-lg tracking-[0.5em] text-foreground outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="button"
          disabled={disabled || value.length === 0}
          aria-label={revealed ? 'Release to hide PIN' : 'Hold to reveal PIN'}
          onMouseDown={startReveal}
          onMouseUp={stopReveal}
          onMouseLeave={stopReveal}
          onTouchStart={startReveal}
          onTouchEnd={stopReveal}
          className={cn(
            'absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          {revealed ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </div>
    </label>
  )
}
