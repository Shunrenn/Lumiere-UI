import { useState, useRef, useEffect, useMemo } from 'react'
import {
  Bell,
  User,
  Search,
  Plus,
  LayoutGrid,
  List,
  ChevronDown,
  Star,
  Sparkles,
  MoreHorizontal,
  ExternalLink,
  Info,
  Maximize2,
  Copy,
  Download,
  WifiOff,
  Share2,
  Link2,
  Trash2,
  Pencil,
  Sun,
  Moon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Camera,
  Shield,
  HardDrive,
  Monitor,
  Lock,
  MessageSquare,
  UserPlus,
  UserMinus,
  PenTool,
  PackageSearch,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { useNav } from '@/lib/nav'
import { usePortal } from '@/lib/store'
import { fetchEventsApi } from '@/lib/eventsApi'
import { NotificationsBell, type NotificationEntry } from '@/components/NotificationsBell'
import { useDarkMode, useThemeMode } from '@/lib/theme'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ErrorFallback } from '@/components/ErrorFallback'
import { EmptyState } from '@/components/EmptyState'


/* ─── Calendar helpers ─── */
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

// 10-color sequential palette per month (cycling)
const EVENT_PALETTE = [
  '#C5A27D','#A07855','#D4B896','#8C7A5E','#E8D5C0',
  '#6B4F3A','#F2E6D9','#B8916A','#7A5C42','#DEC9A8',
]

type DesignStatus =
  | 'Initial Draft'
  | 'Final Draft'
  | 'Subject to Review'
  | 'Ready to Present'
  | 'Subject to Revision'

type ShapeKind = 'ingress' | 'egress' | 'actual'

interface CalendarEvent {
  id: string
  day: number
  month: number
  year: number
  name: string
  alias: string
  status: DesignStatus
  kind: ShapeKind
  colorIndex: number
}

// Fallback seed events matching backend DbInitializer.cs exactly (used if API connection is offline/loading)
const REAL_10_SEEDED_EVENTS: any[] = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    refId: 'PRT-2026-1000',
    title: 'Aura Luxe Autumn Gala 2026',
    client: 'Lumière Executive Board',
    tier: 'Tier-1 VIP (Bespoke Logistics)',
    venue: 'The Grand Ballroom, Shangri-La Fort',
    targetDate: '2026-09-20',
    installationStart: '2026-09-19',
    installationEnd: '2026-09-20',
    budget: 3400000,
    status: 'Active',
    moodPlan: 'Crystal sconces and emerald velvet draping.',
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    refId: 'PRT-2026-1000',
    title: 'Vanguard Tech Keynote & Product Launch',
    client: 'Vanguard Dynamics',
    tier: 'Tier-2 Premium',
    venue: 'SMX Convention Center Hall 3, Pasay',
    targetDate: '2026-09-28',
    installationStart: '2026-09-27',
    installationEnd: '2026-09-28',
    budget: 1950000,
    status: 'Active',
    moodPlan: 'Modern minimalist LED panels and obsidian podiums.',
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    refId: 'PRT-2026-1000',
    title: 'Celestial Horizon Presidential Wedding',
    client: 'Celestial Trust',
    tier: 'Tier-1 VIP (Bespoke Logistics)',
    venue: 'Solaire Resort Grand Pavilion, Parañaque',
    targetDate: '2026-10-08',
    installationStart: '2026-10-07',
    installationEnd: '2026-10-08',
    budget: 5200000,
    status: 'Active',
    moodPlan: 'White silk canopy, gold candelabras, floral arbors.',
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    refId: 'PRT-2026-1000',
    title: 'Solstice Motors Electric SUV Reveal',
    client: 'Solstice Motors',
    tier: 'Tier-2 Premium',
    venue: 'Okada Manila Glass Dome Auditorium',
    targetDate: '2026-09-16',
    installationStart: '2026-09-15',
    installationEnd: '2026-09-16',
    budget: 2800000,
    status: 'Active',
    moodPlan: 'Sleek brushed aluminum stages and laser lighting.',
  },
  {
    id: '10000000-0000-0000-0000-000000000005',
    refId: 'PRT-2026-1000',
    title: 'Apex Global Financial Leaders Summit',
    client: 'Apex Global Forum',
    tier: 'Tier-1 VIP (Bespoke Logistics)',
    venue: 'Marriott Grand Ballroom, Pasay',
    targetDate: '2026-09-24',
    installationStart: '2026-09-23',
    installationEnd: '2026-09-24',
    budget: 3900000,
    status: 'Active',
    moodPlan: 'Mahogany banquet tables with refined brass table lamps.',
  },
  {
    id: '10000000-0000-0000-0000-000000000006',
    refId: 'PRT-2026-1000',
    title: 'Haute Couture Resort Collection Showcase',
    client: 'Maison Couture Paris',
    tier: 'Tier-1 VIP (Bespoke Logistics)',
    venue: 'City of Dreams Nüwa Ballroom, Parañaque',
    targetDate: '2026-10-03',
    installationStart: '2026-10-02',
    installationEnd: '2026-10-03',
    budget: 4850000,
    status: 'Planning',
    moodPlan: 'Mirror catwalk with rose gold accents and velvet seating.',
  },
  {
    id: '10000000-0000-0000-0000-000000000007',
    refId: 'PRT-2026-1000',
    title: 'Luminary Sustainability & Innovation Awards',
    client: 'Global Eco Initiative',
    tier: 'Tier-2 Premium',
    venue: 'BGC Amphitheater Outdoor Arena, Taguig',
    targetDate: '2026-10-14',
    installationStart: '2026-10-13',
    installationEnd: '2026-10-14',
    budget: 2300000,
    status: 'Active',
    moodPlan: 'Living green walls and recycled timber centerpieces.',
  },
  {
    id: '10000000-0000-0000-0000-000000000008',
    refId: 'PRT-2026-1000',
    title: 'Horizon Gaming & Esports Championship Final',
    client: 'Horizon Interactive',
    tier: 'Tier-1 VIP (Bespoke Logistics)',
    venue: 'Mall of Asia Arena Main Stage, Pasay',
    targetDate: '2026-10-20',
    installationStart: '2026-10-18',
    installationEnd: '2026-10-20',
    budget: 6500000,
    status: 'Active',
    moodPlan: 'Neon blue trusses and immersive arena seating layout.',
  },
  {
    id: '10000000-0000-0000-0000-000000000009',
    refId: 'PRT-2026-1000',
    title: 'Empress Fine Jewelry Private Exhibition',
    client: 'Empress House of Jewels',
    tier: 'Tier-1 VIP (Bespoke Logistics)',
    venue: 'The Peninsula Manila Conservatory',
    targetDate: '2026-10-25',
    installationStart: '2026-10-24',
    installationEnd: '2026-10-25',
    budget: 7120000,
    status: 'Active',
    moodPlan: 'Bulletproof glass pedestals with pinpoint spotlighting.',
  },
  {
    id: '10000000-0000-0000-0000-000000000010',
    refId: 'PRT-2026-1000',
    title: 'AeroSpace Defense Systems Expo 2026',
    client: 'Global Aerospace Consortium',
    tier: 'Tier-2 Premium',
    venue: 'World Trade Center Metro Manila Hall A',
    targetDate: '2026-10-29',
    installationStart: '2026-10-27',
    installationEnd: '2026-10-29',
    budget: 3100000,
    status: 'Completed',
    moodPlan: 'High-tech modular displays and aviation-grade flooring.',
  },
]

function parseIsoDateParts(isoStr: string): { year: number; month: number; day: number } | null {
  if (!isoStr) return null
  const clean = isoStr.split('T')[0]
  const parts = clean.split('-')
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10) - 1
    const d = parseInt(parts[2], 10)
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return { year: y, month: m, day: d }
    }
  }
  return null
}

function makeEventAlias(title: string): string {
  const words = title.trim().split(/\s+/)
  const letters = words.map((w) => w[0]).join('').replace(/[^A-Z]/gi, '').slice(0, 4).toUpperCase()
  return `${letters || 'EVT'}-26`
}

function mapPortalEventsToCards(evList: any[], designerNames?: string[]): ProjectCard[] {
  const designers = (designerNames && designerNames.length > 0) ? designerNames : DEMO_DESIGNERS
  const thumbnails = [
    '/images/decor/chateau-ballroom.png',
    '/images/decor/garden-wedding.png',
    '/images/decor/floral-arch.png',
    '/images/decor/minimalist-table.png',
    '/images/decor/candelabra.png',
    '/images/decor/string-lights.png',
    '/images/decor/velvet-sofa.png',
    '/images/decor/dance-floor.png',
    '/images/decor/silk-runner.png',
    '/images/decor/gold-charger.png',
  ]

  return evList.map((ev, i) => {
    const parts = parseIsoDateParts(ev.targetDate)
    const dateStr = parts
      ? `${MONTH_NAMES[parts.month].slice(0, 3)} ${parts.day}, ${parts.year}`
      : 'TBD'
    const title = ev.title || ev.name || 'Untitled Event'
    const alias = makeEventAlias(title)
    const designer = designers[i % designers.length]

    return {
      id: `pc-event-${ev.id}`,
      title: `${title} — Main Layout`,
      type: 'Design',
      designer,
      collaborators: i % 2 === 0 ? [{ name: 'Marc Delacroix', role: 'Asset Planner' }] : [],
      eventAlias: alias,
      eventDate: dateStr,
      lastEdited: 'Synced from API',
      thumbnail: thumbnails[i % thumbnails.length],
      starred: i < 3,
    }
  })
}

const STATUS_LABEL_COLORS: Record<DesignStatus, string> = {
  'Initial Draft':      'text-muted-foreground',
  'Final Draft':        'text-primary',
  'Subject to Review':  'text-amber-400',
  'Ready to Present':   'text-emerald-400',
  'Subject to Revision':'text-rose-400',
}

function ShapeIndicator({ kind, color }: { kind: ShapeKind; color: string }) {
  if (kind === 'actual') {
    return (
      <Star
        style={{ color }}
        className="size-2.5 shrink-0 fill-current"
        aria-hidden="true"
      />
    )
  }
  return (
    <span
      style={{ backgroundColor: color }}
      className="inline-block size-2 rounded-full shrink-0"
      aria-hidden="true"
    />
  )
}

/* ─── Notifications ─── */
type NotificationKind = 'share' | 'access-request' | 'access-removed' | 'comment' | 'design-collab' | 'asset-collab'

interface DemoNotification {
  id: string
  kind: NotificationKind
  text: string
  time: string
  unread: boolean
}

const NOTIFICATION_META: Record<NotificationKind, { icon: typeof Bell; color: string }> = {
  'share':          { icon: Share2,        color: 'text-primary' },
  'access-request': { icon: UserPlus,      color: 'text-emerald-500' },
  'access-removed':  { icon: UserMinus,     color: 'text-destructive' },
  'comment':        { icon: MessageSquare, color: 'text-primary' },
  'design-collab':  { icon: PenTool,       color: 'text-muted-foreground' },
  'asset-collab':   { icon: PackageSearch, color: 'text-muted-foreground' },
}

const DEMO_NOTIFICATIONS: DemoNotification[] = [
  { id: 'n1', kind: 'share',          text: 'Marc Delacroix shared "Garden Ceremony Moodboard" with you.', time: '5 minutes ago', unread: true },
  { id: 'n2', kind: 'access-request', text: 'Sophie Laurent requested Asset Planner access to "Château Floral Arch Concept."', time: '1 hour ago', unread: true },
  { id: 'n3', kind: 'comment',        text: 'Julien Morel commented on "Minimalist Table Proposal."', time: '3 hours ago', unread: true },
  { id: 'n4', kind: 'access-removed', text: 'Your Viewer access to "Ivory Gala Tablescapes" was removed.', time: 'Yesterday', unread: false },
  { id: 'n5', kind: 'design-collab',  text: 'Elena Vasseur added you as a design collaborator on "Baroque Grandeur Banquet."', time: '2 days ago', unread: false },
  { id: 'n6', kind: 'asset-collab',   text: 'Pierre Faure added you as an asset planning collaborator on "Tent Lighting Moodboard."', time: '3 days ago', unread: false },
]



/* ─── Profile Settings Sidebar ─── */
function ProfileSettingsSidebar({ onClose, adminName, onLogout }: {
  onClose: () => void
  adminName: string
  onLogout: () => void
}) {
  const [displayName, setDisplayName] = useState(adminName)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(adminName)
  const { mode: theme, setMode: applyTheme } = useThemeMode()
  const [offlineToggle, setOfflineToggle] = useState(false)
  const [logoutPrompt, setLogoutPrompt] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1" onClick={onClose} aria-hidden="true" />
      {/* Sidebar */}
      <aside ref={ref} className="flex h-full w-80 flex-col overflow-y-auto border-l border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <span className="font-display text-sm uppercase tracking-[0.2em] text-foreground">Your Account & Settings</span>
          <button type="button" onClick={onClose} aria-label="Close settings" className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"><X className="size-4" /></button>
        </div>

        <div className="flex flex-col gap-6 px-5 py-5">

          {/* Profile */}
          <section>
            <p className="mb-3 flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-muted-foreground"><User className="size-3" />Profile</p>
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-background p-4">
              <div className="relative">
                <div className="flex size-16 items-center justify-center rounded-full bg-primary/15 text-primary text-2xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <button type="button" aria-label="Upload photo" className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow transition hover:opacity-90">
                  <Camera className="size-3" />
                </button>
              </div>
              {editingName ? (
                <div className="flex w-full items-center gap-1.5">
                  <input autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={() => { setDisplayName(nameDraft.trim() || displayName); setEditingName(false) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { setDisplayName(nameDraft.trim() || displayName); setEditingName(false) } if (e.key === 'Escape') setEditingName(false) }}
                    className="flex-1 rounded-lg border border-input bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-primary" />
                  <button type="button" onClick={() => { setDisplayName(nameDraft.trim() || displayName); setEditingName(false) }} className="flex size-6 items-center justify-center rounded text-primary"><Check className="size-3.5" /></button>
                </div>
              ) : (
                <button type="button" onClick={() => { setNameDraft(displayName); setEditingName(true) }} className="group flex items-center gap-1.5 rounded px-2 py-1 text-sm font-semibold text-foreground transition hover:bg-accent">
                  {displayName}
                  <Pencil className="size-3 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                </button>
              )}
              <p className="text-[0.65rem] text-muted-foreground">planner@lumiere.com</p>
            </div>
          </section>

          {/* Account & Security */}
          <section>
            <p className="mb-3 flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-muted-foreground"><Shield className="size-3" />Account & Security</p>
            <div className="flex flex-col gap-2">
              {['Update Password', 'Update Passkey'].map((label) => (
                <button key={label} type="button" className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-2.5 text-left text-xs font-medium text-foreground transition hover:border-primary/50 hover:bg-accent">
                  {label}<ChevronDown className="size-3 -rotate-90 text-muted-foreground" />
                </button>
              ))}
            </div>
          </section>

          {/* Data & Storage */}
          <section>
            <p className="mb-3 flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-muted-foreground"><HardDrive className="size-3" />Data & Storage</p>
            <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-2.5">
              <span className="text-xs text-foreground">Remove offline designs on logout</span>
              <button type="button" role="switch" aria-checked={offlineToggle} onClick={() => setOfflineToggle((v) => !v)}
                className={cn('relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors', offlineToggle ? 'bg-primary' : 'bg-muted')}>
                <span className={cn('pointer-events-none inline-block size-4 rounded-full bg-white shadow transition-transform', offlineToggle ? 'translate-x-4' : 'translate-x-0')} />
              </button>
            </div>
          </section>

          {/* Theme */}
          <section>
            <p className="mb-3 flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-muted-foreground"><Monitor className="size-3" />Theme</p>
            <div className="flex gap-2">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button key={t} type="button" onClick={() => applyTheme(t)}
                  className={cn('flex flex-1 flex-col items-center gap-1.5 rounded-xl border py-3 text-[0.62rem] font-semibold uppercase tracking-[0.1em] transition',
                    theme === t ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground')}>
                  {t === 'light' ? <Sun className="size-4" /> : t === 'dark' ? <Moon className="size-4" /> : <Monitor className="size-4" />}
                  {t}
                </button>
              ))}
            </div>
          </section>

          {/* Logout */}
          <section className="mt-auto pt-2 border-t border-border">
            {logoutPrompt ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex flex-col gap-3">
                <p className="text-[0.72rem] font-semibold text-foreground text-center">You&apos;re about going to log out?</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setLogoutPrompt(false)}
                    className="flex-1 rounded-xl border border-border py-2 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-muted-foreground transition hover:bg-accent">No</button>
                  <button type="button" onClick={onLogout}
                    className="flex-1 rounded-xl bg-destructive py-2 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-white transition hover:opacity-90">Yes</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setLogoutPrompt(true)}
                className="flex w-full items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-xs font-medium text-destructive transition hover:border-destructive/40 hover:bg-destructive/5">
                <LogOut className="size-3.5" />Log Out
              </button>
            )}
          </section>
        </div>
      </aside>
    </div>
  )
}

/* ─── Project Card ─── */
type CollaboratorRole = 'Designer' | 'Asset Planner' | 'Commenter' | 'Viewer'

interface Collaborator {
  name: string
  role: CollaboratorRole
}

interface ProjectCard {
  id: string
  title: string
  type: 'Design' | 'Mood Board'
  designer: string
  collaborators: Collaborator[]
  // Demo-only escape hatch: this seed data uses decorative French designer/collaborator
  // names that never literally match a logged-in demo account, so "restricted" is how we
  // mark the couple of cards that should exercise the true "no access" state — everything
  // else falls back to the "collaborator" tier (has access, just isn't the designer).
  restricted?: boolean
  eventAlias: string
  eventDate: string
  lastEdited: string
  thumbnail: string
  starred: boolean
}

const DEMO_DESIGNERS = ['Elena Vasseur', 'Marc Delacroix', 'Sophie Laurent', 'Julien Morel', 'Isabelle Renard', 'Pierre Faure']

const DEMO_CARDS: ProjectCard[] = mapPortalEventsToCards(REAL_10_SEEDED_EVENTS)

const SEED_MOOD_BOARD_CARD: ProjectCard = {
  id: 'mb-seed-concept-01',
  title: 'Maison Lumine Aesthetic Conceptualization',
  type: 'Mood Board',
  designer: 'Elena Vasseur',
  collaborators: [],
  eventAlias: '',
  eventDate: 'Sep 18, 2026',
  lastEdited: '3 hours ago',
  thumbnail: '/images/decor/garden-wedding.png',
  starred: true,
}

type CardAccess = 'designer' | 'collaborator' | 'none'

function ProjectDetailsModal({ card, onClose }: { card: ProjectCard; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div ref={ref} className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95">
        <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
          <div>
            <span className="inline-block rounded-full bg-primary/15 px-2.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-primary">
              {card.type}
            </span>
            <h3 className="mt-2 font-serif text-lg font-bold text-foreground leading-snug">{card.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="divide-y divide-border/60 py-2 text-xs">
          {card.eventAlias ? (
            <div className="flex items-center justify-between py-2.5">
              <span className="text-muted-foreground">Event Alias</span>
              <span className="font-semibold text-foreground">{card.eventAlias}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between py-2.5">
              <span className="text-muted-foreground">Project Scope</span>
              <span className="font-semibold text-muted-foreground italic">Standalone Mood Board</span>
            </div>
          )}
          <div className="flex items-center justify-between py-2.5">
            <span className="text-muted-foreground">Event / Creation Date</span>
            <span className="font-medium text-foreground">{card.eventDate}</span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-muted-foreground">Lead Designer</span>
            <span className="font-medium text-foreground">{card.designer}</span>
          </div>
          <div className="flex items-start justify-between py-2.5 gap-4">
            <span className="text-muted-foreground shrink-0">Collaborators</span>
            <span className="font-medium text-foreground text-right">
              {card.collaborators && card.collaborators.length > 0 ? (
                <span className="flex flex-col gap-1">
                  {card.collaborators.map((c) => (
                    <span key={c.name} className="text-[0.7rem]">
                      {c.name} <span className="text-muted-foreground">({c.role})</span>
                    </span>
                  ))}
                </span>
              ) : (
                <span className="text-muted-foreground italic">None assigned</span>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-muted-foreground">Last Edited</span>
            <span className="italic text-muted-foreground">{card.lastEdited}</span>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-foreground hover:bg-accent transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function RenameProjectModal({
  card,
  onClose,
  onSave,
}: {
  card: ProjectCard
  onClose: () => void
  onSave: (newTitle: string) => void
}) {
  const [title, setTitle] = useState(card.title)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div ref={ref} className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95">
        <h3 className="font-serif text-base font-bold text-foreground">Rename {card.type}</h3>
        <p className="mt-1 text-xs text-muted-foreground">Enter a new name for this project.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (title.trim()) onSave(title.trim())
          }}
          className="mt-4 space-y-4"
        >
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring/30"
            placeholder="Project title..."
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const ELLIPSIS_ITEMS = [
  { icon: ExternalLink, label: 'Open in New Tab' },
  { icon: Info,         label: 'Details' },
  { icon: Maximize2,    label: 'Present Full Screen' },
  { icon: Copy,         label: 'Make a copy' },
  { icon: Download,     label: 'Download' },
  { icon: WifiOff,      label: 'Make available offline' },
  { icon: Share2,       label: 'Share' },
  { icon: Link2,        label: 'Copy link' },
  { icon: Trash2,       label: 'Move to Trash', danger: true },
] as const

function EllipsisMenu({
  card,
  onClose,
  access,
  onOpenDetails,
  onStartRename,
  onDuplicate,
  onTrash,
  onOpenCard,
}: {
  card: ProjectCard
  onClose: () => void
  access: CardAccess
  onOpenDetails: () => void
  onStartRename: () => void
  onDuplicate: () => void
  onTrash: () => void
  onOpenCard: () => void
}) {
  const isDesigner = access === 'designer'
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  function handleItemClick(label: string) {
    onClose()
    switch (label) {
      case 'Details':
        onOpenDetails()
        break
      case 'Make a copy':
        onDuplicate()
        break
      case 'Move to Trash':
        onTrash()
        break
      case 'Open in New Tab':
      case 'Present Full Screen':
        onOpenCard()
        break
      case 'Copy link':
        navigator.clipboard?.writeText(window.location.href)
        break
      default:
        break
    }
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-6 z-50 w-52 rounded-xl border border-border bg-popover shadow-2xl py-1"
      role="menu"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
        <span className="truncate font-serif text-xs text-popover-foreground">{card.title}</span>
        <button
          type="button"
          aria-label="Rename"
          onClick={() => {
            if (isDesigner) {
              onClose()
              onStartRename()
            }
          }}
          className={cn(
            'flex size-5 items-center justify-center rounded transition-colors',
            isDesigner
              ? 'text-muted-foreground hover:text-foreground cursor-pointer'
              : 'text-border cursor-not-allowed',
          )}
          disabled={!isDesigner}
        >
          <Pencil className="size-3" aria-hidden="true" />
        </button>
      </div>
      {ELLIPSIS_ITEMS.map((item) => {
        const Icon = item.icon
        const danger = 'danger' in item && item.danger
        const label = item.label
        return (
          <button
            key={label}
            type="button"
            role="menuitem"
            onClick={() => handleItemClick(label)}
            className={cn(
              'flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium tracking-wide transition-colors hover:bg-accent cursor-pointer',
              (danger as boolean | undefined) ? 'text-destructive' : 'text-popover-foreground',
            )}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden="true" />
            {label}
          </button>
        )
      })}
    </div>
  )
}

function ProjectCardItem({
  card,
  access,
  onOpen,
  onToggleStar,
  onOpenDetails,
  onStartRename,
  onDuplicate,
  onTrash,
}: {
  card: ProjectCard
  access: CardAccess
  onOpen: (card: ProjectCard) => void
  onToggleStar: (cardId: string) => void
  onOpenDetails: (card: ProjectCard) => void
  onStartRename: (card: ProjectCard) => void
  onDuplicate: (card: ProjectCard) => void
  onTrash: (card: ProjectCard) => void
}) {
  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const isDesigner = access === 'designer'
  const noAccess = access === 'none'
  const showAffordances = hovered && isDesigner

  return (
    <div
      role="button"
      tabIndex={noAccess ? -1 : 0}
      aria-disabled={noAccess}
      aria-label={noAccess ? `${card.title} — no access` : `Open ${card.title}`}
      onClick={() => { if (!noAccess) onOpen(card) }}
      onKeyDown={(e) => { if (!noAccess && e.key === 'Enter') onOpen(card) }}
      className={cn(
        'group relative flex flex-col overflow-visible rounded-xl border border-border bg-card transition',
        noAccess ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-primary/50 hover:shadow-lg',
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false) }}
    >
      {noAccess && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-background/80 px-1.5 py-0.5 text-muted-foreground backdrop-blur-sm">
          <Lock className="size-2.5" aria-hidden="true" />
          <span className="text-[0.5rem] font-semibold uppercase tracking-[0.08em]">No Access</span>
        </div>
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'absolute top-2 left-2 z-10 flex items-center gap-1.5 transition-opacity',
          showAffordances ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      >
        <input
          type="checkbox"
          aria-label={`Select ${card.title}`}
          className="size-3.5 rounded border-border accent-primary cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleStar(card.id)
          }}
          aria-label={card.starred ? 'Unstar' : 'Star'}
          className="flex size-5 items-center justify-center rounded transition-colors hover:text-primary cursor-pointer"
        >
          <Star
            className={cn('size-3', card.starred ? 'fill-primary text-primary' : 'text-muted-foreground')}
            aria-hidden="true"
          />
        </button>
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className={cn('absolute top-2 right-2 z-20 transition-opacity', showAffordances ? 'opacity-100' : 'opacity-0 pointer-events-none')}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o) }}
          aria-label="More options"
          className="flex size-6 items-center justify-center rounded-md bg-background/70 text-foreground backdrop-blur-sm transition hover:bg-card cursor-pointer"
        >
          <MoreHorizontal className="size-3.5" aria-hidden="true" />
        </button>
        {menuOpen && (
          <EllipsisMenu
            card={card}
            onClose={() => setMenuOpen(false)}
            access={access}
            onOpenDetails={() => onOpenDetails(card)}
            onStartRename={() => onStartRename(card)}
            onDuplicate={() => onDuplicate(card)}
            onTrash={() => onTrash(card)}
            onOpenCard={() => onOpen(card)}
          />
        )}
      </div>

      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-t-lg bg-muted flex items-center justify-center">
        {card.thumbnail ? (
          <img
            src={card.thumbnail}
            alt=""
            className="size-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
            <LayoutGrid className="size-6 opacity-30" />
            <span className="text-[0.52rem] font-bold uppercase tracking-[0.1em] opacity-50">Mood Board</span>
          </div>
        )}
        <div className="absolute bottom-2 left-2 z-10">
          {card.type === 'Mood Board' ? (
            <span className="rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/40 px-2 py-0.5 text-[0.52rem] font-bold uppercase tracking-wider backdrop-blur-md">
              MOOD BOARD
            </span>
          ) : (
            <span className="rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 text-[0.52rem] font-bold uppercase tracking-wider backdrop-blur-md">
              DESIGN PROJECT
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 px-3 py-2.5">
        <p className="truncate text-center font-serif text-sm font-semibold text-card-foreground leading-snug">
          {card.title}
        </p>
        <p className="truncate text-center text-[0.52rem] uppercase tracking-[0.08em] text-muted-foreground">
          {card.lastEdited}
        </p>
      </div>
    </div>
  )
}

function ProjectRowItem({
  card,
  access,
  onOpen,
  onToggleStar,
  onOpenDetails,
  onStartRename,
  onDuplicate,
  onTrash,
}: {
  card: ProjectCard
  access: CardAccess
  onOpen: (card: ProjectCard) => void
  onToggleStar: (cardId: string) => void
  onOpenDetails: (card: ProjectCard) => void
  onStartRename: (card: ProjectCard) => void
  onDuplicate: (card: ProjectCard) => void
  onTrash: (card: ProjectCard) => void
}) {
  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const isDesigner = access === 'designer'
  const noAccess = access === 'none'
  const showAffordances = hovered && isDesigner

  return (
    <div
      role="button"
      tabIndex={noAccess ? -1 : 0}
      aria-disabled={noAccess}
      aria-label={noAccess ? `${card.title} — no access` : `Open ${card.title}`}
      onClick={() => { if (!noAccess) onOpen(card) }}
      onKeyDown={(e) => { if (!noAccess && e.key === 'Enter') onOpen(card) }}
      className={cn(
        'group relative flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 transition',
        noAccess ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-primary/50 hover:shadow-md',
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false) }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn('flex items-center gap-2 transition-opacity', showAffordances ? 'opacity-100' : 'opacity-0 pointer-events-none')}
      >
        <input type="checkbox" aria-label={`Select ${card.title}`} className="size-3.5 rounded border-border accent-primary cursor-pointer" />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleStar(card.id)
          }}
          aria-label={card.starred ? 'Unstar' : 'Star'}
          className="flex size-5 items-center justify-center cursor-pointer"
        >
          <Star className={cn('size-3', card.starred ? 'fill-primary text-primary' : 'text-muted-foreground')} aria-hidden="true" />
        </button>
      </div>

      {noAccess && (
        <div className="flex shrink-0 items-center gap-1 text-muted-foreground" aria-hidden="true">
          <Lock className="size-3.5" />
        </div>
      )}

      <div className="size-10 shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center">
        {card.thumbnail ? (
          <img src={card.thumbnail} alt="" className="size-full object-cover" />
        ) : (
          <LayoutGrid className="size-4 text-muted-foreground opacity-40" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <p className="truncate font-serif text-base font-semibold text-card-foreground">{card.title}</p>
          {card.type === 'Mood Board' ? (
            <span className="shrink-0 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 px-2 py-0.5 text-[0.52rem] font-bold uppercase tracking-wider">
              MOOD BOARD
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[0.52rem] font-bold uppercase tracking-wider">
              DESIGN PROJECT
            </span>
          )}
        </div>
        <p className="text-[0.58rem] uppercase tracking-[0.1em] text-muted-foreground">
          {card.eventAlias ? `${card.eventAlias} · ` : ''}{card.designer}{noAccess ? ' · No Access' : ''}
        </p>
      </div>
      <span className="shrink-0 text-[0.55rem] uppercase tracking-[0.1em] text-muted-foreground hidden sm:block">{card.eventDate}</span>
      <span className="shrink-0 text-[0.55rem] uppercase tracking-[0.08em] text-muted-foreground hidden md:block">{card.lastEdited}</span>

      <div
        onClick={(e) => e.stopPropagation()}
        className={cn('relative ml-auto transition-opacity', showAffordances ? 'opacity-100' : 'opacity-0 pointer-events-none')}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o) }}
          aria-label="More options"
          className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground cursor-pointer"
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </button>
        {menuOpen && (
          <EllipsisMenu
            card={card}
            onClose={() => setMenuOpen(false)}
            access={access}
            onOpenDetails={() => onOpenDetails(card)}
            onStartRename={() => onStartRename(card)}
            onDuplicate={() => onDuplicate(card)}
            onTrash={() => onTrash(card)}
            onOpenCard={() => onOpen(card)}
          />
        )}
      </div>
    </div>
  )
}

/* ─── Dropdown ─── */
function Dropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-foreground transition hover:border-primary/50"
      >
        <span className="text-muted-foreground">{label}:</span>
        <span>{value}</span>
        <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[10rem] rounded-xl border border-border bg-popover shadow-xl py-1">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false) }}
              className={cn(
                'flex w-full items-center px-3 py-2 text-left text-xs font-medium tracking-wide transition-colors hover:bg-accent',
                value === opt ? 'text-primary' : 'text-popover-foreground',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════ */
export function DesignCanvasHubPage() {
  const { adminName, setConfirmLogout } = useAuth()
  const { navigate } = useNav()
  const { dark, toggle: toggleDark } = useDarkMode()
  const [profileOpen, setProfileOpen] = useState(false)
  const { events: portalEvents, staff } = usePortal()

  const dbDesigners = useMemo(() => {
    const designerStaff = (staff || []).filter((s) => {
      const r = (s.role || '').toLowerCase()
      return r === 'event planner' || r === 'designer' || r === 'event admin' || r.includes('planner') || r.includes('designer')
    })
    const names = designerStaff.map((s) => `${s.firstName || ''} ${s.surname || ''}`.trim()).filter(Boolean)
    return Array.from(new Set(names))
  }, [staff])
  const [isLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    fetchEventsApi().catch(() => {})
  }, [])

  const plannerNotifications: NotificationEntry[] = useMemo(() => {
    const items: NotificationEntry[] = []

    if (portalEvents && portalEvents.length > 0) {
      portalEvents.slice(0, 4).forEach((ev, idx) => {
        const eventName = (ev as any).title || (ev as any).name || 'New Event'
        items.push({
          id: `portal-ev-notif-${ev.id || idx}`,
          text: `New event in pipeline: "${eventName}" (${ev.client || 'Corporate Client'}).`,
          time: ev.targetDate || 'Recent',
          unread: idx === 0,
          icon: Share2,
          color: 'text-primary',
        })
      })
    }

    DEMO_NOTIFICATIONS.forEach((n) => {
      items.push({
        id: n.id,
        text: n.text,
        time: n.time,
        unread: n.unread,
        ...NOTIFICATION_META[n.kind],
      })
    })

    return items
  }, [portalEvents])

  /* ── Calendar state ── */
  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())

  // Map real backend events into calendar grid events for visible month/year
  const calEvents = useMemo(() => {
    const source = (portalEvents && portalEvents.length > 0) ? portalEvents : REAL_10_SEEDED_EVENTS
    const events: CalendarEvent[] = []

    source.forEach((ev, index) => {
      const parts = parseIsoDateParts(ev.targetDate)
      if (!parts) return
      if (parts.year !== calYear || parts.month !== calMonth) return

      const eventName = (ev as any).title || (ev as any).name || 'Untitled Event'
      const alias = makeEventAlias(eventName)
      const statuses: DesignStatus[] = ['Final Draft', 'Ready to Present', 'Subject to Review', 'Initial Draft']

      events.push({
        id: `cal-ev-${ev.id}`,
        day: parts.day,
        month: parts.month,
        year: parts.year,
        name: eventName,
        alias,
        status: statuses[index % statuses.length],
        kind: 'actual',
        colorIndex: index % EVENT_PALETTE.length,
      })
    })

    return events
  }, [portalEvents, calYear, calMonth])

  const firstDow = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const totalCells = firstDow + daysInMonth
  const padEndLength = Math.max(0, 42 - totalCells)
  const calCells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ...Array(padEndLength).fill(null),
  ]

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1) }
    else setCalMonth((m) => m - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1) }
    else setCalMonth((m) => m + 1)
  }

  /* ── Recents state ── */
  const [cards, setCards] = useState<ProjectCard[]>(() => {
    try {
      const saved = localStorage.getItem('lumiere-recents-cards')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch { /* use default */ }
    return DEMO_CARDS
  })

  // Checkpoint refetch tracking for new events (window focus + 30s polling)
  const [newEventBannerEvent, setNewEventBannerEvent] = useState<any | null>(null)
  const knownEventIdsRef = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (!portalEvents || portalEvents.length === 0) return

    const currentIds = new Set(portalEvents.map((e) => e.id))

    if (knownEventIdsRef.current === null) {
      knownEventIdsRef.current = currentIds
    } else {
      let newlyAddedEvent: any = null
      for (const ev of portalEvents) {
        if (!knownEventIdsRef.current.has(ev.id)) {
          newlyAddedEvent = ev
          break
        }
      }

      if (newlyAddedEvent) {
        setNewEventBannerEvent(newlyAddedEvent)
      }

      knownEventIdsRef.current = currentIds
    }
  }, [portalEvents])

  // Combine real events as project cards with local card state
  const effectiveCards = useMemo(() => {
    const source = (portalEvents && portalEvents.length > 0) ? portalEvents : REAL_10_SEEDED_EVENTS
    const realCards = mapPortalEventsToCards(source, dbDesigners)
    const userCards = cards.filter((c) => c.id.startsWith('mb-') || c.id.startsWith('pc-custom-'))
    const hasSeedMb = userCards.some((c) => c.id === SEED_MOOD_BOARD_CARD.id)
    const mbSeeds = hasSeedMb ? [] : [SEED_MOOD_BOARD_CARD]
    return [...mbSeeds, ...realCards, ...userCards]
  }, [portalEvents, cards, dbDesigners])

  const [searchQuery, setSearchQuery] = useState('')
  const [designer, setDesigner] = useState('All Designers')
  const [projectType, setProjectType] = useState('All Types')
  const [sortBy, setSortBy] = useState('Last Activity')
  const [view, setView] = useState<'grid' | 'row'>('grid')
  const [statusFilter, setStatusFilter] = useState('All')

  /* ── Ellipsis & Card actions state ── */
  const [detailsCard, setDetailsCard] = useState<ProjectCard | null>(null)
  const [renameCard, setRenameCard] = useState<ProjectCard | null>(null)
  const [trashUndo, setTrashUndo] = useState<{ card: ProjectCard; timeoutId: any } | null>(null)

  // Filter cards
  let filteredCards = [...effectiveCards]
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim()
    filteredCards = filteredCards.filter((c) =>
      c.title.toLowerCase().includes(q) ||
      c.eventAlias.toLowerCase().includes(q) ||
      c.designer.toLowerCase().includes(q)
    )
  }
  if (designer !== 'All Designers') filteredCards = filteredCards.filter((c) => c.designer === designer)
  if (projectType === 'Mood Board') filteredCards = filteredCards.filter((c) => c.type === 'Mood Board')
  if (projectType === 'Design Projects') filteredCards = filteredCards.filter((c) => c.type === 'Design')

  // Starred cards pin to the front of the list, followed by the chosen sort order
  filteredCards.sort((a, b) => {
    if (a.starred !== b.starred) {
      return a.starred ? -1 : 1
    }
    if (sortBy === 'A-Z') return a.title.localeCompare(b.title)
    if (sortBy === 'Z-A') return b.title.localeCompare(a.title)
    return 0
  })

  function handleToggleStar(cardId: string) {
    const updated = cards.map((c) => (c.id === cardId ? { ...c, starred: !c.starred } : c))
    setCards(updated)
    localStorage.setItem('lumiere-recents-cards', JSON.stringify(updated))
  }

  function handleDuplicateCard(card: ProjectCard) {
    const newId = `pc-${Date.now()}`
    const copyCard: ProjectCard = {
      ...card,
      id: newId,
      title: `${card.title} (Copy)`,
      lastEdited: 'Just now',
      starred: false,
    }
    try {
      const assets = localStorage.getItem(`lumiere-canvas-assets-${card.id}`)
      if (assets) localStorage.setItem(`lumiere-canvas-assets-${newId}`, assets)
      const pages = localStorage.getItem(`lumiere-pages-${card.id}`)
      if (pages) localStorage.setItem(`lumiere-pages-${newId}`, pages)
      const navMode = localStorage.getItem(`lumiere-page-nav-mode-${card.id}`)
      if (navMode) localStorage.setItem(`lumiere-page-nav-mode-${newId}`, navMode)
    } catch { /* ignore */ }

    const updated = [copyCard, ...cards]
    setCards(updated)
    localStorage.setItem('lumiere-recents-cards', JSON.stringify(updated))
  }

  function handleTrashCard(card: ProjectCard) {
    const updated = cards.filter((c) => c.id !== card.id)
    setCards(updated)
    localStorage.setItem('lumiere-recents-cards', JSON.stringify(updated))
    if (trashUndo?.timeoutId) clearTimeout(trashUndo.timeoutId)
    const tid = setTimeout(() => setTrashUndo(null), 5000)
    setTrashUndo({ card, timeoutId: tid })
  }

  function handleUndoTrash() {
    if (!trashUndo) return
    if (trashUndo.timeoutId) clearTimeout(trashUndo.timeoutId)
    const restored = [trashUndo.card, ...cards]
    setCards(restored)
    localStorage.setItem('lumiere-recents-cards', JSON.stringify(restored))
    setTrashUndo(null)
  }

  function handleSaveRename(newTitle: string) {
    if (!renameCard || !newTitle.trim()) return
    const updated = cards.map((c) => (c.id === renameCard.id ? { ...c, title: newTitle.trim(), lastEdited: 'Just now' } : c))
    setCards(updated)
    localStorage.setItem('lumiere-recents-cards', JSON.stringify(updated))
    setRenameCard(null)
  }

  function handleCreateMoodBoard() {
    const newId = `mb-${Date.now()}`
    const todayFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    const newCard: ProjectCard = {
      id: newId,
      title: 'Untitled Mood Board',
      type: 'Mood Board',
      designer: adminName || 'Elena Vasseur',
      collaborators: [],
      eventAlias: '',
      eventDate: todayFormatted,
      lastEdited: 'Just now',
      thumbnail: '',
      starred: false,
    }
    const updated = [newCard, ...cards]
    setCards(updated)
    localStorage.setItem('lumiere-recents-cards', JSON.stringify(updated))
    sessionStorage.setItem('lumiere-workspace-card', JSON.stringify(newCard))
    navigate('canvas-workspace')
  }

  // Three-tier access model: full designer affordances (star, ellipsis menu, rename, duplicate, trash),
  // view-only collaborator access, or restricted no-access state.
  function getCardAccess(card: ProjectCard): CardAccess {
    if (card.restricted) return 'none'
    return 'designer'
  }

  function handleOpenCard(card: ProjectCard) {
    if (getCardAccess(card) === 'none') return
    sessionStorage.setItem('lumiere-workspace-card', JSON.stringify(card))
    navigate('canvas-workspace')
  }

  // Events across upcoming months, sorted chronologically (soonest first)
  const upcomingEvents = useMemo(() => {
    const source = (portalEvents && portalEvents.length > 0) ? portalEvents : REAL_10_SEEDED_EVENTS
    const all: CalendarEvent[] = []

    source.forEach((ev, index) => {
      const parts = parseIsoDateParts(ev.targetDate)
      if (!parts) return
      const eventName = ev.title || ev.name || 'Untitled Event'
      const alias = makeEventAlias(eventName)
      const statuses: DesignStatus[] = ['Final Draft', 'Ready to Present', 'Subject to Review', 'Initial Draft']

      all.push({
        id: `up-ev-${ev.id}`,
        day: parts.day,
        month: parts.month,
        year: parts.year,
        name: eventName,
        alias,
        status: statuses[index % statuses.length],
        kind: 'actual',
        colorIndex: index % EVENT_PALETTE.length,
      })
    })

    return all.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      if (a.month !== b.month) return a.month - b.month
      return a.day - b.day
    })
  }, [portalEvents])

  const groupedUpcomingEvents = useMemo(() => {
    const filtered = statusFilter === 'All'
      ? upcomingEvents
      : upcomingEvents.filter((e) => e.status === statusFilter)

    const groups: { monthLabel: string; events: CalendarEvent[] }[] = []
    for (const ev of filtered) {
      const label = `${MONTH_NAMES[ev.month]} ${ev.year}`
      let group = groups.find((g) => g.monthLabel === label)
      if (!group) {
        group = { monthLabel: label, events: [] }
        groups.push(group)
      }
      group.events.push(ev)
    }

    // When 'All' is selected: Two-tier sort within each month group:
    // Tier 1: status !== 'Ready to Present' (chronological ascending)
    // Tier 2: status === 'Ready to Present' (chronological ascending, placed below Tier 1)
    // When specific status is selected: pure chronological ascending sort
    for (const group of groups) {
      if (statusFilter === 'All') {
        const tier1 = group.events
          .filter((e) => e.status !== 'Ready to Present')
          .sort((a, b) => a.day - b.day)
        const tier2 = group.events
          .filter((e) => e.status === 'Ready to Present')
          .sort((a, b) => a.day - b.day)
        group.events = [...tier1, ...tier2]
      } else {
        group.events.sort((a, b) => a.day - b.day)
      }
    }

    return groups
  }, [upcomingEvents, statusFilter])

  function handleOpenCalendarEvent(ev: CalendarEvent) {
    const matchingCard = effectiveCards.find((c) => c.eventAlias === ev.alias || c.title.includes(ev.name))
    if (matchingCard) {
      handleOpenCard(matchingCard)
      return
    }
    sessionStorage.setItem(
      'lumiere-workspace-card',
      JSON.stringify({
        id: `cal-${ev.id}`,
        title: ev.name,
        type: 'Design',
        designer: adminName,
        collaborators: [],
        eventAlias: ev.alias,
        eventDate: `${MONTH_NAMES[ev.month]} ${ev.day}, ${ev.year}`,
        lastEdited: 'Not yet opened',
        thumbnail: '',
        starred: false,
      }),
    )
    navigate('canvas-workspace')
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-border bg-background/95 px-6 py-3 backdrop-blur-sm lg:px-10">
        {/* Search (Left column) */}
        <div className="flex items-center justify-start">
          <div className="relative w-full max-w-[18rem] lg:max-w-[22rem]">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search designs, mood boards..."
              className="w-full rounded-lg border border-border bg-card pl-9 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Motto (Mathematically Centered column) */}
        <div className="text-center">
          <p className="font-display text-[0.65rem] font-bold uppercase tracking-[0.35em] text-primary whitespace-nowrap">
            Lumière Creatives
          </p>
        </div>

        {/* Actions (Right column) */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleCreateMoodBoard}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-foreground transition hover:border-primary/50 cursor-pointer"
          >
            <Plus className="size-3" aria-hidden="true" />
            Mood Board
          </button>

          {/* Bell */}
          <NotificationsBell notifications={plannerNotifications} size="sm" />

          {/* Dark mode */}
          <button
            type="button"
            onClick={toggleDark}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
          >
            {dark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
          </button>

          {/* Profile */}
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            aria-label="Account & Settings"
            className="flex size-8 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary transition hover:bg-primary/20"
          >
            <User className="size-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-5 lg:px-10">
        {isError ? (
          <ErrorFallback title="Design Canvas Hub Unavailable" message="Could not fetch design projects & calendar assignments." onRetry={() => setIsError(false)} />
        ) : isLoading ? (
          <LoadingSkeleton variant="cards" />
        ) : (
          <>
            {/* ── Calendar + Needs Editing ── */}
        <section aria-label="Design calendar" className="mb-5 grid grid-cols-1 gap-6 lg:grid-cols-[7fr_3fr]">
          {/* Calendar (primary column) */}
          <div className="w-full h-[32rem] flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h2 className="font-display text-lg tracking-[0.15em] text-foreground">
                {MONTH_NAMES[calMonth]} {calYear}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  aria-label="Previous month"
                  className="flex size-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                >
                  <ChevronLeft className="size-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  aria-label="Next month"
                  className="flex size-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                >
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 mb-1 shrink-0">
              {DAY_LABELS.map((d) => (
                <div key={d} className="py-1 text-center text-[0.58rem] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 grid-rows-6 border-l border-t border-border flex-1">
              {calCells.map((day, idx) => {
                const dayEvents = day ? calEvents.filter((e) => e.day === day) : []
                const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear()
                return (
                  <div
                    key={idx}
                    className={cn(
                      'border-b border-r border-border p-1 flex flex-col gap-0.5 h-full overflow-hidden',
                      !day && 'bg-muted/30',
                    )}
                  >
                    {day && (
                      <>
                        <span
                          className={cn(
                            'self-end text-[0.65rem] font-semibold leading-none mb-0.5',
                            isToday
                              ? 'flex size-4.5 items-center justify-center rounded-full bg-primary text-primary-foreground'
                              : 'text-muted-foreground',
                          )}
                        >
                          {day}
                        </span>
                        {dayEvents.slice(0, 6).map((ev) => (
                          <div key={ev.id} className="flex items-center gap-1 overflow-hidden">
                            {/* 75% left: shape + name */}
                            <div className="flex min-w-0 flex-[3] items-center gap-0.5 overflow-hidden">
                              <ShapeIndicator kind={ev.kind} color={EVENT_PALETTE[ev.colorIndex]} />
                              <span className="truncate text-[0.5rem] leading-none text-foreground">
                                {ev.alias}
                              </span>
                            </div>
                            {/* 25% right: status */}
                            <div className="flex-1 min-w-0 text-right">
                              <span className={cn('block truncate text-[0.42rem] leading-none font-semibold', STATUS_LABEL_COLORS[ev.status])}>
                                {ev.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Color palette legend */}
            <div className="mt-3 flex flex-wrap items-center gap-3 shrink-0">
              <span className="text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Legend:</span>
              <span className="flex items-center gap-1 text-[0.58rem] text-muted-foreground">
                <span className="inline-block size-2 rounded-full bg-primary shrink-0" /> Ingress / Egress
              </span>
              <span className="flex items-center gap-1 text-[0.58rem] text-muted-foreground">
                <Star className="size-2.5 shrink-0 fill-primary text-primary" /> Actual Event
              </span>
            </div>
          </div>

          {/* Upcoming Events (sidebar column) */}
          <aside aria-label="Upcoming events" className="w-full h-[32rem]">
            <div className="flex h-full flex-col rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5 shrink-0 bg-card gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Pencil className="size-3.5 text-primary shrink-0" aria-hidden="true" />
                  <h2 className="font-display text-sm tracking-[0.12em] text-foreground truncate">Upcoming Events</h2>
                </div>

                {/* Status filter dropdown */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter events by status"
                  className="h-7 rounded-md border border-border bg-background px-2 text-[0.65rem] font-medium text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 shrink-0 cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Initial Draft">Initial Draft</option>
                  <option value="Subject to Review">Subject to Review</option>
                  <option value="Subject to Revision">Subject to Revision</option>
                  <option value="Final Draft">Final Draft</option>
                  <option value="Ready to Present">Ready to Present</option>
                </select>
              </div>

              <div className="flex-1 overflow-y-auto px-2.5 py-1">
                {groupedUpcomingEvents.length === 0 ? (
                  <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                    No events found with status &ldquo;{statusFilter}&rdquo;.
                  </p>
                ) : (
                  groupedUpcomingEvents.map((group) => (
                    <div key={group.monthLabel} className="relative mb-2">
                      {/* Sticky Month Header */}
                      <div className="sticky top-0 z-10 rounded-md border-b border-t first:border-t-0 border-border/60 bg-muted/95 px-3.5 py-1.5 backdrop-blur-sm my-1">
                        <span className="font-display text-[0.65rem] font-bold uppercase tracking-[0.15em] text-foreground">
                          {group.monthLabel}
                          <span className="ml-1.5 text-[0.6rem] font-normal tracking-normal text-muted-foreground">
                            ({group.events.length})
                          </span>
                        </span>
                      </div>

                      {/* List of events with dividers and generous breathing room */}
                      <div className="divide-y divide-border/40 pt-0.5">
                        {group.events.map((ev) => {
                          const isReadyToPresent = ev.status === 'Ready to Present'
                          const showFade = statusFilter === 'All' && isReadyToPresent
                          return (
                            <button
                              key={ev.id}
                              type="button"
                              onClick={() => handleOpenCalendarEvent(ev)}
                              className={cn(
                                'flex w-full items-center gap-3 px-3.5 py-2.5 text-left rounded-lg transition hover:bg-accent/60 focus:bg-accent/60 focus:outline-none my-0.5',
                                showFade && 'opacity-50 hover:opacity-80',
                              )}
                            >
                              <ShapeIndicator kind={ev.kind} color={EVENT_PALETTE[ev.colorIndex]} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-foreground">{ev.name}</p>
                                <p className="truncate text-[0.68rem] text-muted-foreground mt-0.5">
                                  {MONTH_NAMES[ev.month].slice(0, 3)} {ev.day}
                                </p>
                              </div>
                              <span className={cn('shrink-0 text-[0.6rem] font-semibold uppercase tracking-[0.05em]', STATUS_LABEL_COLORS[ev.status])}>
                                {ev.status}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </section>

        {/* ── Recents ── */}
        <section aria-label="Recent projects">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <h2 className="font-display text-lg font-bold tracking-[0.15em] text-foreground mr-2">Recents</h2>

            {/* Filters */}
            <Dropdown
              label="Designer"
              options={['All Designers', ...dbDesigners]}
              value={designer}
              onChange={setDesigner}
            />
            <Dropdown
              label="Type"
              options={['All Types', 'Design Projects', 'Mood Board']}
              value={projectType}
              onChange={setProjectType}
            />
            <Dropdown
              label="Sort"
              options={['Last Activity', 'A-Z', 'Z-A']}
              value={sortBy}
              onChange={setSortBy}
            />

            {/* View toggle */}
            <div className="ml-auto flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
              <button
                type="button"
                onClick={() => setView('grid')}
                aria-label="Grid view"
                className={cn(
                  'flex size-7 items-center justify-center rounded-md transition-colors',
                  view === 'grid' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <LayoutGrid className="size-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setView('row')}
                aria-label="Row view"
                className={cn(
                  'flex size-7 items-center justify-center rounded-md transition-colors',
                  view === 'row' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <List className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Grid view — capped slice, internal scroll past the first row */}
          {view === 'grid' && (
            filteredCards.length === 0
              ? (
                <EmptyState
                  title={searchQuery ? 'No matching designs or mood boards' : 'No design projects found'}
                  message={searchQuery ? `No items match "${searchQuery}". Try a different search term or clear your filter.` : 'Create your first design project or mood board to get started.'}
                  icon={PackageSearch}
                  actionLabel={searchQuery ? 'Clear Search' : '+ Create Mood Board'}
                  onAction={() => {
                    if (searchQuery) setSearchQuery('')
                    else handleCreateMoodBoard()
                  }}
                  className="my-6 rounded-2xl border border-dashed border-border bg-card/40 py-12"
                />
              )
              : <div className="max-h-[46rem] overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {filteredCards.slice(0, 18).map((card) => (
                      <ProjectCardItem
                        key={card.id}
                        card={card}
                        access={getCardAccess(card)}
                        onOpen={handleOpenCard}
                        onToggleStar={handleToggleStar}
                        onOpenDetails={(c) => setDetailsCard(c)}
                        onStartRename={(c) => setRenameCard(c)}
                        onDuplicate={handleDuplicateCard}
                        onTrash={handleTrashCard}
                      />
                    ))}
                  </div>
                </div>
          )}

          {/* Row view — capped slice, internal scroll past the first two rows */}
          {view === 'row' && (
            filteredCards.length === 0
              ? (
                <EmptyState
                  title={searchQuery ? 'No matching designs or mood boards' : 'No design projects found'}
                  message={searchQuery ? `No items match "${searchQuery}". Try a different search term or clear your filter.` : 'Create your first design project or mood board to get started.'}
                  icon={PackageSearch}
                  actionLabel={searchQuery ? 'Clear Search' : '+ Create Mood Board'}
                  onAction={() => {
                    if (searchQuery) setSearchQuery('')
                    else handleCreateMoodBoard()
                  }}
                  className="my-6 rounded-2xl border border-dashed border-border bg-card/40 py-12"
                />
              )
              : <div className="max-h-40 overflow-y-auto pr-1">
                  <div className="flex flex-col gap-2">
                    {filteredCards.slice(0, 8).map((card) => (
                      <ProjectRowItem
                        key={card.id}
                        card={card}
                        access={getCardAccess(card)}
                        onOpen={handleOpenCard}
                        onToggleStar={handleToggleStar}
                        onOpenDetails={(c) => setDetailsCard(c)}
                        onStartRename={(c) => setRenameCard(c)}
                        onDuplicate={handleDuplicateCard}
                        onTrash={handleTrashCard}
                      />
                    ))}
                  </div>
                </div>
          )}
        </section>
        </>
        )}
      </main>

      {profileOpen && (
        <ProfileSettingsSidebar
          onClose={() => setProfileOpen(false)}
          adminName={adminName}
          onLogout={() => { setProfileOpen(false); setConfirmLogout(true) }}
        />
      )}

      {detailsCard && (
        <ProjectDetailsModal
          card={detailsCard}
          onClose={() => setDetailsCard(null)}
        />
      )}

      {renameCard && (
        <RenameProjectModal
          card={renameCard}
          onClose={() => setRenameCard(null)}
          onSave={handleSaveRename}
        />
      )}

      {/* Floating Cross-Role New Event Checkpoint Banner */}
      {newEventBannerEvent && (
        <div
          role="alert"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3.5 rounded-2xl border border-primary/40 bg-card/95 p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 max-w-md"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-foreground">A new event was created. Check it out!</p>
            </div>
            <p className="text-[0.68rem] text-muted-foreground mt-0.5 truncate">
              {newEventBannerEvent.title || newEventBannerEvent.name || 'New Event'} ·{' '}
              <span className="text-primary font-medium">Reflecting the latest checkpoint state.</span>
            </p>
            <button
              type="button"
              onClick={() => {
                const targetEv = newEventBannerEvent
                setNewEventBannerEvent(null)
                const matchingCard = effectiveCards.find((c) => c.id.includes(targetEv.id) || (targetEv.title && c.title.includes(targetEv.title)))
                if (matchingCard) {
                  handleOpenCard(matchingCard)
                } else {
                  const eventName = targetEv.title || targetEv.name || 'New Event'
                  sessionStorage.setItem(
                    'lumiere-workspace-card',
                    JSON.stringify({
                      id: `pc-event-${targetEv.id}`,
                      title: `${eventName} — Main Layout`,
                      type: 'Design',
                      designer: adminName || 'Executive Team',
                      collaborators: [],
                      eventAlias: makeEventAlias(eventName),
                      eventDate: targetEv.targetDate || 'Upcoming',
                      lastEdited: 'Synced from API checkpoint',
                      thumbnail: '/images/decor/chateau-ballroom.png',
                      starred: false,
                    })
                  )
                  navigate('canvas-workspace')
                }
              }}
              className="mt-1.5 inline-flex items-center gap-1 text-[0.7rem] font-bold text-primary hover:underline cursor-pointer"
            >
              View in Dashboard &rarr;
            </button>
          </div>
          <button
            type="button"
            onClick={() => setNewEventBannerEvent(null)}
            aria-label="Dismiss banner"
            className="size-6 text-muted-foreground hover:text-foreground shrink-0 flex items-center justify-center rounded-lg hover:bg-accent cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {trashUndo && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-border bg-popover px-4 py-3 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <Trash2 className="size-4 text-destructive shrink-0" />
          <span className="text-xs text-popover-foreground">
            Moved &ldquo;<strong className="font-semibold text-foreground">{trashUndo.card.title}</strong>&rdquo; to Trash.
          </span>
          <button
            type="button"
            onClick={handleUndoTrash}
            className="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90 transition cursor-pointer"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => setTrashUndo(null)}
            className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
            aria-label="Dismiss toast"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
