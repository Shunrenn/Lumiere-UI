import { useState, useRef, useEffect, useMemo } from 'react'
import {
  User,
  Search,
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
  Link2,
  Trash2,
  Pencil,
  Sun,
  Moon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Shield,
  Monitor,
  Lock,
  PenTool,
  PackageSearch,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { useNav } from '@/lib/nav'
import { usePortal } from '@/lib/store'
import { fetchAssignedPlannerEventsApi, fetchEventsApi } from '@/features/events/api/eventsApi'
import { getJoinedEventIds, isMember, join, leave, listMembers } from '@/lib/eventMembership'
import { ExecutiveShell } from '@/components/executive/ExecutiveShell'
import { PLANNER_RAIL_DESTINATIONS, PLANNER_RAIL_IDENTITY } from '@/lib/executive-destinations'
import { useThemeMode } from '@/lib/theme'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ErrorFallback } from '@/components/ErrorFallback'
import { EmptyState } from '@/components/EmptyState'
import { DashboardCalendarCard } from '@/components/dashboard/DashboardCalendarCard'
import { UpcomingEventsPanel } from '@/components/dashboard/UpcomingEventsPanel'
import { DashboardRoleHeader } from '@/components/dashboard/DashboardRoleHeader'
import type { PortalEvent } from '@/lib/types'


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

type DesignStatus = string

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
  venue?: string
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

void REAL_10_SEEDED_EVENTS

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

function mapPortalEventsToCards(
  evList: any[],
  existingCards: ProjectCard[] = [],
  defaultDesigner = 'Lumière Creatives',
): ProjectCard[] {
  return evList.map((ev) => {
    const parts = parseIsoDateParts(ev.targetDate || ev.dateOfEvent)
    const dateStr = parts
      ? `${MONTH_NAMES[parts.month].slice(0, 3)} ${parts.day}, ${parts.year}`
      : 'TBD'
    const title = ev.title || ev.name || 'Untitled Event'
    const alias = makeEventAlias(title)
    const cardId = `pc-event-${ev.id}`
    const existing = existingCards.find((c) => c.id === cardId)

    // Canonical thumbnail from backend if available, or persisted user-designed canvas export, else neutral empty
    const canonicalCover =
      ev.coverUrl ||
      ev.thumbnail ||
      (typeof ev.eventPegs === 'string' && (ev.eventPegs.startsWith('http') || ev.eventPegs.startsWith('data:')) ? ev.eventPegs : '') ||
      ''
    const thumbnail = canonicalCover || existing?.thumbnail || ''

    const designer = ev.projectManagerName || defaultDesigner || 'Lumière Creatives'

    return {
      id: cardId,
      eventId: ev.id,
      title: `${title} — Main Layout`,
      type: 'Design',
      designer,
      collaborators: existing?.collaborators || [],
      eventAlias: alias,
      eventDate: dateStr,
      lastEdited: '',
      thumbnail,
      starred: existing?.starred ?? false,
      client: ev.client,
      venue: ev.venue,
      ingressDate: ev.installationStart || ev.ingressDate,
      egressDate: ev.installationEnd || ev.returnDate,
      status: ev.status,
    }
  })
}

const STATUS_LABEL_COLORS: Record<string, string> = {
  'Initialized':        'text-amber-400',
  'In Production':      'text-sky-400',
  'Reserved':           'text-primary',
  'Completed':          'text-emerald-400',
  'Settled':            'text-emerald-400',
  'On Hold':            'text-rose-400',
  'Cancelled':          'text-muted-foreground',
  'Planning':           'text-amber-400',
  'Active':             'text-emerald-400',
  'Unknown':            'text-muted-foreground',
}

/* ─── Profile Settings Sidebar ─── */
export function ProfileSettingsSidebar({ onClose, adminName, onLogout }: {
  onClose: () => void
  adminName: string
  onLogout: () => void
}) {
  const { mode: theme, setMode: applyTheme } = useThemeMode()
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
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/15 text-primary text-2xl font-bold">
                {adminName.charAt(0).toUpperCase()}
              </div>
              <p className="text-sm font-semibold text-foreground">{adminName || 'Event Planner'}</p>
              <p className="text-[0.65rem] text-muted-foreground">planner@lumiere.com</p>
            </div>
          </section>

          {/* Account & Security */}
          <section>
            <p className="mb-3 flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-muted-foreground"><Shield className="size-3" />Account & Security</p>
            <div className="rounded-xl border border-border bg-background p-3.5 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Authenticated Session</p>
              <p className="mt-1 text-[0.65rem]">Signed in as Event Planner. Managed via Lumière Central RBAC.</p>
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
  /** Canonical API event ID; present only for event-derived design cards. */
  eventId?: string
  /** Nullable for standalone mood boards. */
  linkedEventName?: string
  title: string
  type: 'Design' | 'Mood Board'
  designer: string
  /** Browser-stored account ID for personal and locally created projects. */
  creatorId?: string
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
  client?: string
  venue?: string
  ingressDate?: string
  egressDate?: string
  status?: string
}

// These are display-only previews for assigned events that do not yet have a
// saved canvas export or a backend-provided cover. They are deliberately not
// persisted as canvas data: an actual project cover always takes precedence.
const PROJECT_PREVIEW_IMAGES = [
  '/images/decor/chateau-ballroom.png',
  '/images/decor/garden-wedding.png',
  '/images/decor/crystal-chandelier.png',
  '/images/decor/floral-arch.png',
  '/images/decor/floorplan-banquet.png',
  '/images/decor/floorplan-cocktail.png',
]

function getProjectPreviewImage(card: ProjectCard): string {
  if (card.thumbnail) return card.thumbnail
  if (card.type === 'Mood Board') return ''

  const key = card.eventId || card.id || card.title
  const index = Array.from(key).reduce((total, character) => total + character.charCodeAt(0), 0) % PROJECT_PREVIEW_IMAGES.length
  return PROJECT_PREVIEW_IMAGES[index]
}

function MoodBoardDialog({ events, onClose, onCreate }: { events: ProjectCard[]; onClose: () => void; onCreate: (event?: ProjectCard) => void }) {
  const [eventId, setEventId] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl" role="dialog" aria-modal="true" aria-label="Create mood board">
        <h2 className="font-serif text-xl font-semibold text-foreground">New Mood Board</h2>
        <p className="mt-1 text-sm text-muted-foreground">Optionally link this board to one of your assigned events.</p>
        <label className="mt-5 block text-xs font-semibold text-foreground" htmlFor="mood-board-event">Link to event <span className="font-normal text-muted-foreground">(optional)</span></label>
        <select id="mood-board-event" value={eventId} onChange={(e) => setEventId(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
          <option value="">No event — standalone board</option>
          {events.map((event) => <option key={event.eventId} value={event.eventId}>{event.title}</option>)}
        </select>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-foreground">Cancel</button>
          <button type="button" onClick={() => onCreate(events.find((event) => event.eventId === eventId))} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Create Mood Board</button>
        </div>
      </div>
    </div>
  )
}

type CardAccess = 'designer' | 'collaborator' | 'none'

function ProjectDetailsModal({ card, onClose, assignedEvents, onSetMoodBoardLink }: { card: ProjectCard; onClose: () => void; assignedEvents: ProjectCard[]; onSetMoodBoardLink: (boardId: string, event?: ProjectCard) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [linkEventId, setLinkEventId] = useState(card.eventId || '')
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
          {card.type === 'Design' && (
            <>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-muted-foreground">Client</span>
                <span className="text-right font-medium text-foreground">{card.client || 'Not provided'}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-muted-foreground">Venue</span>
                <span className="text-right font-medium text-foreground">{card.venue || 'Not provided'}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-muted-foreground">Ingress / Egress</span>
                <span className="text-right font-medium text-foreground">{card.ingressDate || 'Not provided'} — {card.egressDate || 'Not provided'}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-muted-foreground">Status</span>
                <span className={cn('font-semibold', STATUS_LABEL_COLORS[card.status || 'Unknown'])}>{card.status || 'Unknown'}</span>
              </div>
            </>
          )}
          {card.type === 'Mood Board' && (
            <div className="py-2.5">
              <span className="text-muted-foreground">Event link</span>
              <div className="mt-2 flex gap-2">
                <select value={linkEventId} onChange={(e) => setLinkEventId(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground">
                  <option value="">Standalone — no event</option>
                  {assignedEvents.map((event) => <option key={event.eventId} value={event.eventId}>{event.title}</option>)}
                </select>
                <button type="button" onClick={() => onSetMoodBoardLink(card.id, assignedEvents.find((event) => event.eventId === linkEventId))} className="rounded-lg bg-primary px-2.5 py-1.5 text-[0.65rem] font-bold text-primary-foreground">Attach</button>
              </div>
              {card.eventId && <button type="button" onClick={() => onSetMoodBoardLink(card.id)} className="mt-2 text-[0.65rem] font-semibold text-destructive hover:underline">Detach from event</button>}
            </div>
          )}
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
  { icon: Info,         label: 'Details' },
  { icon: ExternalLink, label: 'Open in New Tab' },
  { icon: Maximize2,    label: 'Present Full Screen' },
  { icon: Link2,        label: 'Copy link' },
  { icon: Copy,         label: 'Make a copy' },
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
}: {
  card: ProjectCard
  onClose: () => void
  access: CardAccess
  onOpenDetails: () => void
  onStartRename: () => void
  onDuplicate: () => void
  onTrash: () => void
}) {
  const isDesigner = access === 'designer'
  const isApiEvent = card.id.startsWith('pc-event-')
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
        if (!isApiEvent) onDuplicate()
        break
      case 'Move to Trash':
        if (!isApiEvent) onTrash()
        break
      case 'Open in New Tab':
        window.open('/canvas-workspace', '_blank')
        break
      case 'Present Full Screen':
        if (typeof document !== 'undefined') {
          if (document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => {})
          } else {
            document.documentElement.requestFullscreen?.().catch(() => {})
          }
        }
        break
      case 'Copy link':
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(`${window.location.origin}/canvas-workspace?project=${encodeURIComponent(card.id)}`).catch(() => {})
        }
        break
      default:
        break
    }
  }

  // Filter items: API events are backend records and cannot be duplicated or trashed locally
  const visibleItems = ELLIPSIS_ITEMS.filter((item) => {
    if (isApiEvent && (item.label === 'Make a copy' || item.label === 'Move to Trash')) {
      return false
    }
    return true
  })

  return (
    <div
      ref={ref}
      className="absolute right-0 top-6 z-50 w-52 rounded-xl border border-border bg-popover shadow-2xl py-1"
      role="menu"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
        <span className="truncate font-serif text-xs text-popover-foreground">{card.title}</span>
        {!isApiEvent && (
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
        )}
      </div>
      {visibleItems.map((item) => {
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
  const previewImage = getProjectPreviewImage(card)

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
          />
        )}
      </div>

      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-lg bg-muted flex items-center justify-center">
        {previewImage ? (
          <img
            src={previewImage}
            alt={card.thumbnail ? '' : `${card.title} project preview`}
            className="size-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-card via-muted/40 to-card p-4 text-muted-foreground border-b border-border/40 select-none">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
              {card.type === 'Mood Board' ? (
                <Sparkles className="size-4.5" />
              ) : (
                <PenTool className="size-4.5" />
              )}
            </div>
            <div className="text-center">
              {card.eventAlias ? (
                <span className="font-mono text-[0.6rem] font-bold uppercase tracking-wider text-foreground block">
                  {card.eventAlias}
                </span>
              ) : null}
              <p className="text-[0.52rem] font-medium tracking-wide text-muted-foreground/80">
                Empty Mood Board
              </p>
            </div>
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

      <div className="flex min-h-[5.5rem] flex-col gap-1.5 px-4 py-3">
        <p title={card.title} className="line-clamp-2 min-h-10 font-serif text-base font-semibold leading-snug text-card-foreground">
          {card.title}
        </p>
        {card.type === 'Mood Board' && (
          card.eventId
            ? <p className="truncate text-center text-[0.52rem] font-medium text-primary">Linked: {card.linkedEventName || card.eventAlias}</p>
            : <span className="mx-auto rounded-full border border-muted-foreground/30 px-2 py-0.5 text-[0.48rem] font-bold uppercase tracking-wider text-muted-foreground">Unlinked</span>
        )}
        {card.type === 'Mood Board' && card.lastEdited && <p className="truncate text-[0.52rem] uppercase tracking-[0.08em] text-muted-foreground">{card.lastEdited}</p>}
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
  const previewImage = getProjectPreviewImage(card)

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

      <div className="size-10 shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center border border-border/50">
        {previewImage ? (
          <img src={previewImage} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center bg-muted/60 text-muted-foreground font-mono text-[0.6rem] font-bold text-foreground">
            {card.eventAlias ? card.eventAlias.slice(0, 4) : <PenTool className="size-4 opacity-50 text-primary" />}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <p title={card.title} className="truncate font-serif text-base font-semibold text-card-foreground">{card.title}</p>
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
        {card.type === 'Mood Board' && <p className="truncate text-[0.58rem] text-muted-foreground">{card.eventId ? `Linked: ${card.linkedEventName || card.eventAlias}` : 'Unlinked'}</p>}
      </div>
      <span className="shrink-0 text-[0.55rem] uppercase tracking-[0.1em] text-muted-foreground hidden sm:block">{card.eventDate}</span>
      {card.type === 'Mood Board' && card.lastEdited && <span className="shrink-0 text-[0.55rem] uppercase tracking-[0.08em] text-muted-foreground hidden md:block">{card.lastEdited}</span>}

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
  const { adminName, currentUser } = useAuth()
  const { navigate, route } = useNav()
  const { staff } = usePortal()

  void staff
  const [assignedEvents, setAssignedEvents] = useState<PortalEvent[]>([])
  const [allEvents, setAllEvents] = useState<PortalEvent[]>([])
  const [membershipRevision, setMembershipRevision] = useState(0)
  const [membershipNotice, setMembershipNotice] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setIsError(false)
    Promise.all([fetchAssignedPlannerEventsApi(), fetchEventsApi()])
      .then(([assigned, all]) => {
        if (active) { setAssignedEvents(assigned); setAllEvents(all) }
      })
      .catch(() => {
        if (active) setIsError(true)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const refresh = () => setMembershipRevision((revision) => revision + 1)
    window.addEventListener('lumiere-event-membership-change', refresh)
    return () => window.removeEventListener('lumiere-event-membership-change', refresh)
  }, [])

  const plannerId = currentUser?.id ?? ''
  const activeEvents = useMemo(() => {
    const source = allEvents.length ? allEvents : assignedEvents
    return source.filter((event) => !['Completed', 'Settled', 'Cancelled'].includes(event.status))
  }, [allEvents, assignedEvents])
  const joinedEventIds = useMemo(() => new Set(plannerId ? getJoinedEventIds(plannerId) : []), [plannerId, membershipRevision])
  const joinedEvents = useMemo(() => activeEvents.filter((event) => joinedEventIds.has(event.id)), [activeEvents, joinedEventIds])

  // Existing planner assignments remain available after this UI migration.
  // They are represented as an assigned membership rather than a second access path.
  useEffect(() => {
    if (!plannerId) return
    assignedEvents.forEach((event) => join(event.id, plannerId, 'assigned'))
  }, [assignedEvents, plannerId])


  /* ── Calendar state ── */
  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())

  // Map real backend events into calendar grid events for visible month/year
  const calEvents = useMemo(() => {
    const source = activeEvents
    const events: CalendarEvent[] = []

    source.forEach((ev, index) => {
      const parts = parseIsoDateParts(ev.targetDate || (ev as any).dateOfEvent)
      if (!parts) return
      if (parts.year !== calYear || parts.month !== calMonth) return

      const eventName = (ev as any).title || (ev as any).name || 'Untitled Event'
      const alias = makeEventAlias(eventName)
      const canonicalStatus = ev.status || 'Initialized'

      events.push({
        id: `cal-ev-${ev.id}`,
        day: parts.day,
        month: parts.month,
        year: parts.year,
        name: eventName,
        alias,
        status: canonicalStatus,
        kind: 'actual',
        colorIndex: index % EVENT_PALETTE.length,
        venue: ev.venue,
      })
    })

    return events
  }, [activeEvents, calYear, calMonth])

  const firstDow = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const calCells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
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
    return []
  })

  // Checkpoint refetch tracking for new events (window focus + 30s polling)
  const [newEventBannerEvent, setNewEventBannerEvent] = useState<any | null>(null)
  const knownEventIdsRef = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (!assignedEvents.length) return

    const currentIds = new Set(assignedEvents.map((e) => e.id))

    if (knownEventIdsRef.current === null) {
      knownEventIdsRef.current = currentIds
    } else {
      let newlyAddedEvent: any = null
      for (const ev of assignedEvents) {
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
  }, [assignedEvents])

  // Combine real events as project cards with local card state
  const effectiveCards = useMemo(() => {
    const source = joinedEvents.length > 0 ? joinedEvents : []
    const realCards = mapPortalEventsToCards(source, cards, adminName || 'Lumière Creatives')
    const userCards = cards.filter((card) => {
      if (card.eventId) return joinedEventIds.has(card.eventId)
      const ownerId = card.creatorId || (card.designer === adminName ? plannerId : undefined)
      return Boolean(ownerId && ownerId === plannerId)
    })
    return [...realCards, ...userCards]
  }, [joinedEvents, cards, adminName, joinedEventIds, plannerId])

  const [searchQuery, setSearchQuery] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('All')
  const [projectType, setProjectType] = useState('All Types')
  const [sortBy, setSortBy] = useState('Last Activity')
  const [view, setView] = useState<'grid' | 'row'>('grid')
  const [projectStatusFilter, setProjectStatusFilter] = useState('All')
  const [moodBoardFilter, setMoodBoardFilter] = useState<'All' | 'Linked to an event' | 'Standalone'>('All')
  const [moodBoardDialogOpen, setMoodBoardDialogOpen] = useState(false)
  const [newDesignDialogOpen, setNewDesignDialogOpen] = useState(false)

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
  if (ownerFilter === 'Created by me') filteredCards = filteredCards.filter((card) => card.creatorId === plannerId || card.designer === adminName)
  if (ownerFilter === 'Shared with me') filteredCards = filteredCards.filter((card) => Boolean(card.eventId) && card.creatorId !== plannerId && card.designer !== adminName)
  if (projectType === 'Mood Board') filteredCards = filteredCards.filter((c) => c.type === 'Mood Board')
  if (projectType === 'Design Projects') filteredCards = filteredCards.filter((c) => c.type === 'Design')
  if (route === 'design-projects') {
    filteredCards = filteredCards.filter((c) => c.type === 'Design')
    if (projectStatusFilter !== 'All') filteredCards = filteredCards.filter((c) => c.status === projectStatusFilter)
  }
  if (route === 'mood-boards') filteredCards = filteredCards.filter((c) => c.type === 'Mood Board')
  if (route === 'mood-boards' && moodBoardFilter === 'Linked to an event') filteredCards = filteredCards.filter((c) => Boolean(c.eventId))
  if (route === 'mood-boards' && moodBoardFilter === 'Standalone') filteredCards = filteredCards.filter((c) => !c.eventId)

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

  function handleCreateMoodBoard(linkedEvent?: ProjectCard) {
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
      designer: adminName || 'Event Planner',
      creatorId: plannerId,
      collaborators: [],
      eventId: linkedEvent?.eventId,
      linkedEventName: linkedEvent?.title,
      eventAlias: linkedEvent?.eventAlias || '',
      eventDate: todayFormatted,
      lastEdited: 'Just now',
      thumbnail: '',
      starred: false,
    }
    const updated = [newCard, ...cards]
    setCards(updated)
    localStorage.setItem('lumiere-recents-cards', JSON.stringify(updated))
    setMoodBoardDialogOpen(false)
  }

  function handleCreateDesignProject(eventId?: string) {
    const linkedEvent = joinedEvents.find((event) => event.id === eventId)
    const newCard: ProjectCard = {
      id: `pc-custom-${Date.now()}`,
      eventId: linkedEvent?.id,
      linkedEventName: linkedEvent?.title,
      title: linkedEvent ? `${linkedEvent.title} — New Design` : 'Untitled Design Project',
      type: 'Design',
      designer: adminName || 'Event Planner',
      creatorId: plannerId,
      collaborators: [],
      eventAlias: linkedEvent ? makeEventAlias(linkedEvent.title) : '',
      eventDate: linkedEvent?.targetDate || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      lastEdited: 'Just now', thumbnail: '', starred: false, status: linkedEvent?.status,
    }
    const updated = [newCard, ...cards]
    setCards(updated)
    localStorage.setItem('lumiere-recents-cards', JSON.stringify(updated))
    setNewDesignDialogOpen(false)
    handleOpenCard(newCard)
  }

  function handleUpdateMoodBoardLink(boardId: string, linkedEvent?: ProjectCard) {
    const updated = cards.map((card) => card.id === boardId ? {
      ...card,
      eventId: linkedEvent?.eventId,
      linkedEventName: linkedEvent?.title,
      eventAlias: linkedEvent?.eventAlias || '',
      lastEdited: 'Just now',
    } : card)
    setCards(updated)
    localStorage.setItem('lumiere-recents-cards', JSON.stringify(updated))
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
    const source = activeEvents
    const all: CalendarEvent[] = []

    source.forEach((ev, index) => {
      const parts = parseIsoDateParts(ev.targetDate || (ev as any).dateOfEvent)
      if (!parts) return
      const eventName = ev.title || (ev as any).name || 'Untitled Event'
      const alias = makeEventAlias(eventName)
      const canonicalStatus = ev.status || 'Initialized'

      all.push({
        id: `up-ev-${ev.id}`,
        day: parts.day,
        month: parts.month,
        year: parts.year,
        name: eventName,
        alias,
        status: canonicalStatus,
        kind: 'actual',
        colorIndex: index % EVENT_PALETTE.length,
        venue: ev.venue,
      })
    })

    return all.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      if (a.month !== b.month) return a.month - b.month
      return a.day - b.day
    })
  }, [activeEvents])

  const groupedUpcomingEvents = useMemo(() => {
    const groups: { monthLabel: string; events: CalendarEvent[] }[] = []
    for (const ev of upcomingEvents) {
      const label = `${MONTH_NAMES[ev.month]} ${ev.year}`
      let group = groups.find((g) => g.monthLabel === label)
      if (!group) {
        group = { monthLabel: label, events: [] }
        groups.push(group)
      }
      group.events.push(ev)
    }

    for (const group of groups) {
      group.events.sort((a, b) => a.day - b.day)
    }

    return groups
  }, [upcomingEvents])

  function handleOpenCalendarEvent(ev: CalendarEvent) {
    const matchingCard = effectiveCards.find((c) => c.eventAlias === ev.alias || c.title.includes(ev.name))
    if (matchingCard) {
      sessionStorage.setItem('lumiere-selected-design-project', JSON.stringify(matchingCard))
      navigate('design-projects')
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
    navigate('design-projects')
  }

  function eventForCalendarEvent(ev: CalendarEvent) {
    return activeEvents.find((event) => event.id === ev.id.replace('up-ev-', '').replace('cal-ev-', '') || event.title === ev.name)
  }

  function handleJoinEvent(event: PortalEvent) {
    if (!plannerId || ['Completed', 'Settled', 'Cancelled'].includes(event.status)) return
    join(event.id, plannerId, 'self_joined')
    setMembershipRevision((revision) => revision + 1)
    setMembershipNotice(`Joined ${event.title}`)
    window.setTimeout(() => setMembershipNotice(null), 3000)
  }

  function handleLeaveEvent(event: PortalEvent) {
    if (!plannerId || !window.confirm(`Leave ${event.title}? Its canvases remain available to the other planners.`)) return
    leave(event.id, plannerId)
    setMembershipRevision((revision) => revision + 1)
    setMembershipNotice(`Left ${event.title}`)
    window.setTimeout(() => setMembershipNotice(null), 3000)
  }

  const activeId = route === 'mood-boards' ? 'mood-boards' : route === 'design-projects' ? 'design-projects' : 'dashboard'
  const assignedDesignProjects = effectiveCards.filter((card) => card.type === 'Design' && Boolean(card.eventId))
  const selectedDesignProject = (() => {
    try { const raw = sessionStorage.getItem('lumiere-selected-design-project'); return raw ? JSON.parse(raw) as ProjectCard : null } catch { return null }
  })()
  const linkedMoodBoards = selectedDesignProject?.eventId ? effectiveCards.filter((card) => card.type === 'Mood Board' && card.eventId === selectedDesignProject.eventId) : []

  return (
    <ExecutiveShell
      activeId={activeId}
      onSelect={(id) => navigate(id as typeof route)}
      destinations={PLANNER_RAIL_DESTINATIONS}
      identityRoleLabel={PLANNER_RAIL_IDENTITY.roleLabel}
    >
      <main className="text-foreground font-sans">
        {isError ? (
          <ErrorFallback title="Design Canvas Hub Unavailable" message="Could not fetch design projects & calendar assignments." onRetry={() => setIsError(false)} />
        ) : isLoading ? (
          <LoadingSkeleton variant="cards" />
        ) : (
          <>
            {route === 'dashboard' && (
              <div className="mb-7">
                <DashboardRoleHeader roleLabel="Event Planner" name={adminName} />
              </div>
            )}
            {(route === 'design-projects' || route === 'mood-boards') && (
              <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
                    {route === 'design-projects' ? 'Design Projects' : 'Styling Templates'}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {route === 'design-projects'
                      ? 'Assigned event canvases. Select a project to enter its workspace.'
                      : 'Standalone creative concepts and visual direction.'}
                  </p>
                </div>
                <button type="button" onClick={() => route === 'design-projects' ? setNewDesignDialogOpen(true) : setMoodBoardDialogOpen(true)} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90">
                  {route === 'design-projects' ? '+ New Design Project' : '+ New Styling Template'}
                </button>
              </header>
            )}
            {/* ── Calendar + Upcoming Events ── */}
        {route === 'dashboard' && <section aria-label="Assigned event calendar" className="mb-7 grid items-stretch gap-6 min-[1100px]:grid-cols-[minmax(0,1.35fr)_minmax(380px,1fr)]">
          {/* Calendar (primary column) */}
          <DashboardCalendarCard icon={Calendar} title={`${MONTH_NAMES[calMonth]} ${calYear}`.toUpperCase()} subtitle="Monthly Assigned Event Roster" className="h-[35rem]" controls={<><button type="button" onClick={prevMonth} aria-label="Previous month" className="flex size-8.5 items-center justify-center rounded-lg border border-border bg-background/80 text-foreground transition-all duration-150 hover:border-primary/40 hover:bg-accent"><ChevronLeft className="size-4" /></button><button type="button" onClick={nextMonth} aria-label="Next month" className="flex size-8.5 items-center justify-center rounded-lg border border-border bg-background/80 text-foreground transition-all duration-150 hover:border-primary/40 hover:bg-accent"><ChevronRight className="size-4" /></button></>} legend={<div className="flex flex-wrap items-center gap-5 text-xs text-muted-foreground"><span className="text-[0.62rem] font-bold uppercase tracking-wider">Legend:</span><span className="flex items-center gap-1.5 text-[0.65rem] font-semibold text-card-foreground"><Star className="size-3.5 fill-amber-500 text-amber-500" /> Assigned Event</span></div>}>
            <div className="hidden">
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
            <div className="grid grid-cols-7 gap-1 text-center text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
              {DAY_LABELS.map((d, colIdx) => (
                <div key={d} className={cn('rounded-md py-1.5', (colIdx === 0 || colIdx === 6) && 'bg-muted/20 font-bold text-muted-foreground/75')}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="mt-1.5 grid min-h-0 flex-1 grid-cols-7 auto-rows-fr gap-1.5">
              {calCells.map((day, idx) => {
                const dayEvents = day ? calEvents.filter((e) => e.day === day) : []
                const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear()
                return (
                  <div
                    key={idx}
                    className={cn(
                      'group flex min-h-0 flex-col overflow-hidden rounded-lg border border-border/80 bg-background p-1.5 transition-all duration-150 hover:border-primary/50 hover:bg-accent/40',
                      !day && 'border-border/30 bg-muted/10',
                      isToday && 'border-primary/50 bg-primary/10 ring-1.5 ring-primary/40',
                    )}
                  >
                    {day && (
                      <>
                        <span
                          className={cn(
                            'mb-0.5 text-[0.65rem] font-bold leading-none',
                            isToday
                              ? 'flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs'
                              : 'text-muted-foreground group-hover:text-foreground',
                          )}
                        >
                          {day}
                        </span>
                        <div className="mt-1 flex max-h-[3.3rem] flex-col gap-1 overflow-y-auto">
                        {dayEvents.map((ev) => (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => handleOpenCalendarEvent(ev)}
                            title={`${ev.name} — ${ev.status}`}
                            aria-label={`Open design project for ${ev.name}, status ${ev.status}`}
                            className="flex w-full min-w-0 items-center gap-1 truncate rounded border border-border/60 bg-card px-1 py-0.5 text-left text-[0.55rem] font-semibold text-card-foreground shadow-xs transition hover:border-primary hover:bg-primary/10 hover:text-primary"
                          >
                            <Star className="size-2.5 shrink-0 fill-amber-500 text-amber-500" aria-hidden="true" />
                            <span className="truncate opacity-85">{ev.name}</span>
                          </button>
                        ))}</div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

          </DashboardCalendarCard>

          {/* Upcoming Events (sidebar column) */}
          <UpcomingEventsPanel title="Upcoming Events" count={groupedUpcomingEvents.reduce((total, group) => total + group.events.length, 0)} subtitle="Month-Grouped Roster" className="h-[35rem]">

              <div className="px-0.5 py-1">
                {groupedUpcomingEvents.length === 0 ? (
                  <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                    No upcoming assigned events found.
                  </p>
                ) : (
                  groupedUpcomingEvents.map((group) => (
                    <div key={group.monthLabel} className="relative mb-2">
                      {/* Sticky Month Header */}
                      <div className="sticky top-0 z-10 border-b border-border/80 bg-card/95 py-1.5 backdrop-blur-sm">
                        <span className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary">
                          {group.monthLabel}
                          <span className="ml-1.5 text-[0.6rem] font-normal tracking-normal text-muted-foreground">
                            ({group.events.length})
                          </span>
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {group.events.map((ev) => {
                          const event = eventForCalendarEvent(ev)
                          const joined = Boolean(event && plannerId && isMember(event.id, plannerId))
                          const memberCount = event ? listMembers(event.id).length : 0
                          return (
                            <div
                              key={ev.id}
                              className="group flex w-full flex-col gap-1.5 rounded-xl border border-border/80 bg-background/90 p-3.5 text-left shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-accent/40 hover:shadow-sm focus:outline-none"
                            >
                              <button type="button" onClick={() => joined && handleOpenCalendarEvent(ev)} className="flex items-start justify-between gap-2 text-left">
                                <p className="min-w-0 flex-1 truncate font-serif text-sm font-medium text-card-foreground transition-colors group-hover:text-primary">{ev.name}</p>
                                <span className={cn('shrink-0 rounded-full border px-2.5 py-0.5 text-[0.55rem] uppercase tracking-wider', STATUS_LABEL_COLORS[ev.status])}>{ev.status}</span>
                              </button>
                              <div className="flex items-center justify-between gap-2 text-[0.62rem] text-muted-foreground">
                                <span className="min-w-0 flex-1 truncate font-semibold text-card-foreground">{ev.venue || 'Venue TBD'}</span>
                                <span className="shrink-0 whitespace-nowrap font-medium text-muted-foreground">
                                  · {MONTH_NAMES[ev.month].slice(0, 3)} {ev.day}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2 pt-1">
                                <span className="text-[0.6rem] text-muted-foreground">{memberCount} {memberCount === 1 ? 'planner' : 'planners'}</span>
                                {joined ? <button type="button" onClick={() => event && handleLeaveEvent(event)} className="rounded-md border border-border px-2 py-1 text-[0.58rem] font-bold text-muted-foreground hover:text-foreground">Joined · Leave</button> : <button type="button" onClick={() => event && handleJoinEvent(event)} className="rounded-md bg-primary px-2 py-1 text-[0.58rem] font-bold text-primary-foreground">Join Event</button>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
          </UpcomingEventsPanel>
        </section>}

        {/* Design Projects and Mood Boards retain their dedicated browsing views. */}
        {route !== 'dashboard' && (
        <section aria-label={route === 'design-projects' ? 'Design projects' : 'Mood boards'}>
          {route === 'design-projects' && selectedDesignProject && (
            <div className="mb-6 rounded-xl border border-border bg-card p-4">
              <h2 className="font-serif text-lg font-semibold text-foreground">Mood Boards</h2>
              <p className="mt-1 text-xs text-muted-foreground">Linked to {selectedDesignProject.title}</p>
              {linkedMoodBoards.length ? <div className="mt-3 flex flex-wrap gap-2">{linkedMoodBoards.map((board) => <button key={board.id} type="button" onClick={() => handleOpenCard(board)} className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">{board.title}</button>)}</div> : <p className="mt-3 text-xs text-muted-foreground">No mood boards are linked to this event.</p>}
            </div>
          )}
          <div className="mb-5 flex flex-wrap items-center gap-3">

            {route === 'design-projects' && (
              <div className="relative min-w-52 flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search assigned projects"
                  aria-label="Search design projects"
                  className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
            )}
            {route === 'mood-boards' && (
              <Dropdown label="Boards" options={['All', 'Linked to an event', 'Standalone']} value={moodBoardFilter} onChange={(value) => setMoodBoardFilter(value as typeof moodBoardFilter)} />
            )}

            {/* Filters */}
            <Dropdown
              label="Owner"
              options={['All', 'Created by me', 'Shared with me']}
              value={ownerFilter}
              onChange={setOwnerFilter}
            />
            {route !== 'mood-boards' && <Dropdown
              label="Type"
              options={route === 'design-projects' ? ['All Types', 'Design Projects'] : ['All Types', 'Design Projects', 'Mood Board']}
              value={projectType}
              onChange={setProjectType}
            />}
            {route === 'design-projects' && (
              <Dropdown
                label="Event status"
                options={['All', ...Array.from(new Set(effectiveCards.filter((c) => c.type === 'Design').map((c) => c.status).filter(Boolean) as string[]))]}
                value={projectStatusFilter}
                onChange={setProjectStatusFilter}
              />
            )}
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
                  title={searchQuery ? 'No matching design projects' : 'No assigned design projects found'}
                  message={searchQuery ? `No items match "${searchQuery}". Try a different search term or clear your filter.` : route === 'design-projects' ? 'Projects appear here when an event is assigned to you.' : 'Create your first design project or mood board to get started.'}
                  icon={PackageSearch}
                  actionLabel={route === 'design-projects' ? (searchQuery ? 'Clear Search' : undefined) : (searchQuery ? 'Clear Search' : '+ Create Mood Board')}
                  onAction={() => {
                    if (searchQuery) setSearchQuery('')
                    else if (route === 'mood-boards') setMoodBoardDialogOpen(true)
                  }}
                  className="my-6 rounded-2xl border border-dashed border-border bg-card/40 py-12"
                />
              )
              : <div className="max-h-[46rem] overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
                  title={searchQuery ? 'No matching design projects' : 'No assigned design projects found'}
                  message={searchQuery ? `No items match "${searchQuery}". Try a different search term or clear your filter.` : route === 'design-projects' ? 'Projects appear here when an event is assigned to you.' : 'Create your first design project or mood board to get started.'}
                  icon={PackageSearch}
                  actionLabel={route === 'design-projects' ? (searchQuery ? 'Clear Search' : undefined) : (searchQuery ? 'Clear Search' : '+ Create Mood Board')}
                  onAction={() => {
                    if (searchQuery) setSearchQuery('')
                    else if (route === 'mood-boards') setMoodBoardDialogOpen(true)
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
        )}
        </>
        )}
      </main>

      {detailsCard && (
        <ProjectDetailsModal
          card={detailsCard}
          onClose={() => setDetailsCard(null)}
          assignedEvents={assignedDesignProjects}
          onSetMoodBoardLink={handleUpdateMoodBoardLink}
        />
      )}

      {moodBoardDialogOpen && <MoodBoardDialog events={assignedDesignProjects} onClose={() => setMoodBoardDialogOpen(false)} onCreate={handleCreateMoodBoard} />}

      {newDesignDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl" role="dialog" aria-modal="true" aria-label="Create design project">
            <h2 className="font-serif text-xl font-semibold text-foreground">New Design Project</h2>
            <p className="mt-1 text-sm text-muted-foreground">Choose a joined event or create a private personal project.</p>
            <div className="mt-5 flex flex-col gap-2">
              <button type="button" onClick={() => handleCreateDesignProject()} className="rounded-lg border border-border px-3 py-3 text-left text-sm font-semibold text-foreground hover:border-primary">Personal (no event)</button>
              {joinedEvents.map((event) => <button key={event.id} type="button" onClick={() => handleCreateDesignProject(event.id)} className="rounded-lg border border-border px-3 py-3 text-left text-sm font-semibold text-foreground hover:border-primary">{event.title}<span className="mt-0.5 block text-xs font-normal text-muted-foreground">{event.venue}</span></button>)}
            </div>
            {!joinedEvents.length && <p className="mt-3 text-xs text-muted-foreground">Join an event from the Dashboard to create an event design.</p>}
            <div className="mt-6 flex justify-end"><button type="button" onClick={() => setNewDesignDialogOpen(false)} className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-foreground">Cancel</button></div>
          </div>
        </div>
      )}

      {newDesignDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl" role="dialog" aria-modal="true" aria-label="Create design project">
            <h2 className="font-serif text-xl font-semibold text-foreground">New Design Project</h2>
            <p className="mt-1 text-sm text-muted-foreground">Choose a joined event or create a private personal project.</p>
            <div className="mt-5 flex flex-col gap-2">
              <button type="button" onClick={() => handleCreateDesignProject()} className="rounded-lg border border-border px-3 py-3 text-left text-sm font-semibold text-foreground hover:border-primary">Personal (no event)</button>
              {joinedEvents.map((event) => <button key={event.id} type="button" onClick={() => handleCreateDesignProject(event.id)} className="rounded-lg border border-border px-3 py-3 text-left text-sm font-semibold text-foreground hover:border-primary">{event.title}<span className="mt-0.5 block text-xs font-normal text-muted-foreground">{event.venue}</span></button>)}
            </div>
            {!joinedEvents.length && <p className="mt-3 text-xs text-muted-foreground">Join an event from the Dashboard to create an event design.</p>}
            <div className="mt-6 flex justify-end"><button type="button" onClick={() => setNewDesignDialogOpen(false)} className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-foreground">Cancel</button></div>
          </div>
        </div>
      )}

      {renameCard && (
        <RenameProjectModal
          card={renameCard}
          onClose={() => setRenameCard(null)}
          onSave={handleSaveRename}
        />
      )}

      {membershipNotice && <div role="status" className="fixed bottom-6 right-6 z-50 rounded-xl border border-primary/30 bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-xl">{membershipNotice}</div>}

      {membershipNotice && <div role="status" className="fixed bottom-6 right-6 z-50 rounded-xl border border-primary/30 bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-xl">{membershipNotice}</div>}

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
                      lastEdited: '',
                      thumbnail: '',
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
    </ExecutiveShell>
  )
}
