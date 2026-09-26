import { Search, Plus, Sparkles, LogOut, Sun, Moon } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useThemeMode } from '@/lib/theme'

interface ProjectManagerHeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onNewPitch: () => void
  onRegisterEvent: () => void
}

export function ProjectManagerHeader({
  searchQuery,
  onSearchChange,
  onNewPitch,
  onRegisterEvent,
}: ProjectManagerHeaderProps) {
  const { adminName, adminEmail, setConfirmLogout } = useAuth()
  const { mode, setMode } = useThemeMode()

  const displayName = adminName || 'Project Manager'
  const displayEmail = adminEmail || 'projectmanager@lumiere.com'
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PM'

  return (
    <header className="flex flex-col gap-4 border-b border-border/80 bg-card/60 backdrop-blur-md px-6 py-4 transition-colors lg:flex-row lg:items-center lg:justify-between">
      {/* Brand & Station Identity */}
      <div className="flex items-center gap-4">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground font-serif text-xl font-bold shadow-md shadow-primary/20">
          L
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-xl font-medium tracking-[0.2em] text-foreground">
              LUMIÈRE
            </h1>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-primary">
              Project Command
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Strategic Event Lifecycle, Client Pitching & Scheduling
          </p>
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search events, clients, venues, pitches..."
          className="w-full rounded-xl border border-input bg-background/80 py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.65rem] font-bold text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {/* Right Actions & PM Identity */}
      <div className="flex items-center gap-3">
        {/* Quick Actions */}
        <button
          type="button"
          onClick={onNewPitch}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/20"
        >
          <Sparkles className="size-3.5" />
          <span className="hidden sm:inline">New Client Pitch</span>
          <span className="sm:hidden">Pitch</span>
        </button>

        <button
          type="button"
          onClick={onRegisterEvent}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow transition hover:opacity-90"
        >
          <Plus className="size-3.5" />
          <span className="hidden sm:inline">Register Event</span>
          <span className="sm:hidden">Event</span>
        </button>

        <div className="h-6 w-px bg-border hidden sm:block" />

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
          className="flex size-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:text-foreground hover:bg-accent"
        >
          {mode === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        {/* PM Profile & Logout */}
        <div className="flex items-center gap-2 pl-1">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
            {initials}
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-foreground leading-tight">
              {displayName}
            </span>
            <span className="text-[0.65rem] text-muted-foreground">
              {displayEmail}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            title="Sign Out"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
