import { useState, type ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConsoleSidebar } from '@/components/ConsoleSidebar'

interface Props {
  children: ReactNode
}

export function ConsoleLayout({ children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  })
  const timeLabel = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div className="flex min-h-screen bg-background">
      <ConsoleSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col overflow-hidden transition-[margin] duration-300 ease-in-out ml-0',
          collapsed ? 'lg:ml-20' : 'lg:ml-64',
        )}
      >
        {/* Mobile top bar */}
        <header className="flex shrink-0 items-center justify-between border-b border-border bg-sidebar px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            className="flex size-9 items-center justify-center rounded-md text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2">
            <span
              className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary font-serif text-lg font-medium leading-none text-sidebar-primary-foreground"
              aria-hidden="true"
            >
              L
            </span>
            <span className="font-serif text-base font-medium tracking-[0.25em] text-sidebar-primary">
              LUMIÈRE
            </span>
          </div>
          <span className="size-9" aria-hidden="true" />
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-12 lg:py-10">
          <div className="flex justify-end">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.12em] text-muted-foreground sm:text-xs sm:tracking-[0.15em]">
              {dateLabel} <span className="mx-1 text-border">|</span> {timeLabel}
            </p>
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
