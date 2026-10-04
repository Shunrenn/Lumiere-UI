import { useState } from 'react'
import { BriefcaseBusiness, ChevronLeft, ChevronRight, Layers3, LayoutDashboard, LogOut, Moon, PanelLeft, Sun, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { useDarkMode } from '@/lib/theme'

export type ProjectManagerSection = 'dashboard' | 'projects' | 'pitches'

const sections = [
  { id: 'dashboard' as const, label: 'Project Manager Dashboard', icon: LayoutDashboard },
  { id: 'projects' as const, label: 'Projects', icon: BriefcaseBusiness },
  { id: 'pitches' as const, label: 'Pitches & Briefs', icon: Layers3 },
]

interface ProjectManagerSidebarProps {
  activeSection: ProjectManagerSection
  onSelect: (section: ProjectManagerSection) => void
}

export function ProjectManagerSidebar({ activeSection, onSelect }: ProjectManagerSidebarProps) {
  const { adminName, adminRole, setConfirmLogout } = useAuth()
  const { dark, toggle: toggleTheme } = useDarkMode()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={cn('hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex', collapsed ? 'w-16 px-2' : 'w-64 px-3')} aria-label="Project Manager Navigation Sidebar">
      <div className={cn('flex items-center py-4', collapsed ? 'justify-center' : 'justify-between px-2')}>
        {!collapsed && <div className="flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary/10 font-serif text-lg text-sidebar-primary">L</span><span className="font-serif text-sm font-semibold tracking-[0.2em] text-sidebar-primary">LUMIÈRE</span></div>}
        {collapsed && <span className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary/10 font-serif text-xl font-bold text-sidebar-primary">L</span>}
        <button type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      </div>
      <div className="h-px bg-sidebar-border" />
      <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto py-4" aria-label="Project Manager destinations">
        {sections.map(({ id, label, icon: Icon }) => {
          const active = activeSection === id
          return <button key={id} type="button" onClick={() => onSelect(id)} aria-current={active ? 'page' : undefined} aria-label={label} title={label} className={cn('flex items-center rounded-lg text-left text-xs transition-colors', collapsed ? 'size-10 justify-center self-center' : 'w-full gap-3 px-3 py-2.5', active ? 'bg-sidebar-primary font-semibold text-sidebar-primary-foreground shadow-sm' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground')}><Icon className="size-4 shrink-0" aria-hidden="true" />{!collapsed && <span className="truncate">{label}</span>}</button>
        })}
      </nav>
      <div className={cn('flex flex-col gap-1 border-t border-sidebar-border py-3', collapsed ? 'items-center' : '')}>
        {!collapsed && <div className="mb-1 flex items-center gap-2.5 rounded-lg bg-sidebar-accent/40 px-2 py-2"><div className="flex size-7 items-center justify-center rounded-full bg-sidebar-primary/15 text-sidebar-primary"><User className="size-3.5" /></div><div className="min-w-0"><p className="truncate text-xs font-semibold text-sidebar-foreground">{adminName || 'Project Manager'}</p><p className="truncate text-[0.62rem] uppercase tracking-wider text-sidebar-foreground/60">{adminRole || 'Project Manager'}</p></div></div>}
        <button type="button" onClick={toggleTheme} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'} className={cn('flex items-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', collapsed ? 'size-10 justify-center' : 'w-full gap-3 px-3 py-2 text-xs font-medium')}>{dark ? <Sun className="size-4" /> : <Moon className="size-4" />}{!collapsed && <span>{dark ? 'Light mode' : 'Dark mode'}</span>}</button>
        <button type="button" onClick={() => setConfirmLogout(true)} aria-label="Sign Out" title="Sign Out" className={cn('flex items-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-destructive', collapsed ? 'size-10 justify-center' : 'w-full gap-3 px-3 py-2 text-xs font-medium')}><LogOut className="size-4" />{!collapsed && <span>Sign Out</span>}</button>
      </div>
    </aside>
  )
}

export function ProjectManagerMobileNav({ activeSection, onSelect }: ProjectManagerSidebarProps) {
  return <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card/70 px-4 py-2 lg:hidden" aria-label="Project Manager destinations">{sections.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => onSelect(id)} aria-current={activeSection === id ? 'page' : undefined} className={cn('flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium', activeSection === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}><Icon className="size-3.5" />{label}</button>)}</nav>
}

export const projectManagerSectionMeta: Record<ProjectManagerSection, { title: string; description: string }> = {
  dashboard: { title: 'Project Manager Dashboard', description: 'Overview of your projects, priorities, and upcoming work.' },
  projects: { title: 'Projects', description: 'Manage the projects assigned to you.' },
  pitches: { title: 'Pitches & Briefs', description: 'Manage client proposals and planning briefs.' },
}

export function ProjectManagerSectionIcon({ section }: { section: ProjectManagerSection }) {
  const item = sections.find(({ id }) => id === section)
  const Icon = item?.icon || PanelLeft
  return <Icon className="size-4" aria-hidden="true" />
}
