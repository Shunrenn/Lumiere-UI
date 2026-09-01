import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Home, Pencil, ChevronDown, Ruler, Grid3x3, AlignJustify,
  MessageSquare, CloudOff, Star, Copy, Download, Trash2, Cloud,
  User, Share2, Maximize2, Monitor, Search, Info, X, Check,
  Lock, ChevronRight, Eye, Type, Upload, Wrench, FolderOpen,
  ImageIcon, MousePointer2, Pen, Square, Minus, StickyNote,
  Bold, Italic, Underline, AlignLeft, Palette, Plus, ChevronLeft,
  Package, AlertTriangle, RefreshCw, Boxes,   Maximize,
  Minimize,
  PanelRightOpen,
  PanelRightClose,
  ZoomIn, ZoomOut, LayoutGrid, Fullscreen, RotateCw,
  FlipHorizontal, FlipVertical, Layers, MoveUp, MoveDown,
  AlignCenter, AlignVerticalJustifyCenter, AlignHorizontalJustifyCenter,
  Crop, Sliders, Contrast, Sun, Droplets, Sparkles,
  MoveHorizontal, MoveVertical, ArrowUp, ArrowDown,
  MessageCircle, EyeOff, MoreHorizontal, ChevronUp,
  GalleryVerticalEnd, GalleryVertical, Grid2X2,
} from 'lucide-react'
import { useNav } from '@/lib/nav'
  import { cn } from '@/lib/utils'
  import { useAuth } from '@/lib/auth'
  import { usePlanner } from '@/lib/planner'
  import { EventPipelinePanel } from '@/components/EventPipelinePanel'
  import { KonvaInfiniteCanvas, type KonvaInfiniteCanvasHandle, type CanvasTool, ARTBOARD_W, ARTBOARD_H } from '@/components/canvas/KonvaInfiniteCanvas'


/* ─── Types ─── */
interface WorkspaceCard {
  id: string
  title: string
  type: 'Design' | 'Mood Board'
  designer: string
  eventAlias: string
  eventDate: string
  lastEdited: string
  thumbnail: string
  starred: boolean
}

type WorkspaceMode = 'Viewing' | 'Commenting' | 'Planning' | 'Designing' | 'Asset Planning'
type PanelTab = 'elements' | 'text' | 'uploads' | 'tools' | 'projects' | 'background'
type RightPanelTab = 'allocated' | 'pending'
type EditToolbar = 'adjust' | 'crop' | 'flip' | 'transparency' | 'position' | null
type PositionTab = 'arrange' | 'layers'

// Per PDF: Commenting does NOT require PIN — only Planning, Designing, Asset Planning do
const LOCKED_MODES: WorkspaceMode[] = ['Planning', 'Designing', 'Asset Planning']

/* ─── Dragged-from-panel asset ─── */
interface DroppedAsset {
  id: string       // matches the ASSET_CATEGORIES item id
  name: string
  src: string
  defaultUnit: string
}

const DRAG_MIME = 'application/lumiere-asset'

/* ─── Demo canvas asset (the thing you click/select) ─── */
interface CanvasAsset {
  id: string
  label: string
  src: string
  x: number
  y: number
  w: number
  h: number
  rotation: number
  opacity: number
  locked: boolean
  hidden: boolean
  zIndex: number
  pageId?: string
}

interface CanvasPage {
  id: string
  title: string
  hidden?: boolean
}



/* ─── Demo data ─── */
const DEMO_COLLABORATORS = [
  { id: 'c1', name: 'Elena Vasseur',  email: 'elena@lumiere.com',  access: 'Designer' },
  { id: 'c2', name: 'Marc Delacroix', email: 'marc@lumiere.com',   access: 'Viewer' },
  { id: 'c3', name: 'Sophie Laurent', email: 'sophie@lumiere.com', access: 'Commenter' },
  { id: 'c4', name: 'Julien Morel',   email: 'julien@lumiere.com', access: 'Asset Planner' },
]
const ACCESS_OPTIONS = ['Planner', 'Designer', 'Asset Planner', 'Commenter', 'Viewer']
const ROLE_DESCRIPTIONS = [
  { role: 'Planner',       desc: 'Full access — can edit, share, and manage all workspace settings.' },
  { role: 'Designer',      desc: 'Design access — can edit canvas. Read-only on asset planning.' },
  { role: 'Asset Planner', desc: 'Asset planning access — can manage inventory allocations. Read-only on design.' },
  { role: 'Commenter',     desc: 'Read-only on both Design and Allocation Planning, with comment privilege.' },
  { role: 'Viewer',        desc: 'Read-only on both Design and Allocation Planning.' },
]

const ASSET_CATEGORIES = [
  {
    id: 'centerpieces', label: 'Centerpieces',
    items: [
      { id: 'cp1', src: '/images/elements/floral-tall.png', label: 'Floral Tall' },
      { id: 'cp2', src: '/images/elements/candle-ring.png', label: 'Candle Ring' },
      { id: 'cp3', src: '/images/elements/low-garden.png', label: 'Low Garden' },
      { id: 'cp4', src: '/images/elements/crystal-vase.png', label: 'Crystal Vase' },
      { id: 'cp5', src: '/images/elements/orchid-cascade.png', label: 'Orchid Cascade' },
      { id: 'cp6', src: '/images/elements/wildflower.png', label: 'Wildflower' },
    ],
  },
  {
    id: 'ceiling', label: 'Ceiling',
    items: [
      { id: 'cl1', src: '/images/elements/drape-canopy.png', label: 'Drape Canopy' },
      { id: 'cl2', src: '/images/elements/chandelier.png', label: 'Chandelier' },
      { id: 'cl3', src: '/images/elements/string-lights.png', label: 'String Lights' },
      { id: 'cl4', src: '/images/elements/balloon-arc.png', label: 'Balloon Arc' },
    ],
  },
  {
    id: 'fabrics', label: 'Fabrics',
    items: [
      { id: 'fb1', src: '/images/elements/ivory-satin.png', label: 'Ivory Satin' },
      { id: 'fb2', src: '/images/elements/blush-chiffon.png', label: 'Blush Chiffon' },
      { id: 'fb3', src: '/images/elements/gold-lame.png', label: 'Gold Lame' },
      { id: 'fb4', src: '/images/elements/navy-velvet.png', label: 'Navy Velvet' },
      { id: 'fb5', src: '/images/elements/sage-linen.png', label: 'Sage Linen' },
    ],
  },
  {
    id: 'artificials', label: 'Artificials',
    items: [
      { id: 'ar1', src: '/images/elements/artificial-flower-stems.png', label: 'Silk Flower Stems' },
      { id: 'ar2', src: '/images/elements/faux-greenery-garland.png', label: 'Faux Greenery Garland' },
      { id: 'ar3', src: '/images/elements/foliage-pick.png', label: 'Foliage Pick' },
      { id: 'ar4', src: '/images/elements/faux-topiary-ball.png', label: 'Faux Topiary Ball' },
      { id: 'ar5', src: '/images/elements/silk-rose-bundle.png', label: 'Silk Rose Bundle' },
    ],
  },
  {
    id: 'wirings', label: 'Wirings',
    items: [
      { id: 'wr1', src: '/images/elements/fairy-light-strand.png', label: 'Fairy Light Strand' },
      { id: 'wr2', src: '/images/elements/festoon-string-wiring.png', label: 'Festoon Wiring' },
      { id: 'wr3', src: '/images/elements/led-strip-roll.png', label: 'LED Strip Roll' },
      { id: 'wr4', src: '/images/elements/cable-ties-clips.png', label: 'Cable Ties & Clips' },
    ],
  },
]

const FONT_STYLES = [
  { label: 'Header',     size: 'text-2xl', weight: 'font-bold',     sample: 'Add a heading' },
  { label: 'Subheading', size: 'text-lg',  weight: 'font-semibold', sample: 'Add a subheading' },
  { label: 'Body',       size: 'text-sm',  weight: 'font-normal',   sample: 'Add a little bit of body text' },
  { label: 'Caption',    size: 'text-xs',  weight: 'font-medium',   sample: 'Add a caption' },
]

const DEMO_TOOLS = [
  { id: 'select',  icon: MousePointer2, label: 'Select',      textOk: false },
  { id: 'draw',    icon: Pen,           label: 'Draw',        textOk: false },
  { id: 'shapes',  icon: Square,        label: 'Shapes',      textOk: true  },
  { id: 'lines',   icon: Minus,         label: 'Lines',       textOk: false },
  { id: 'sticky',  icon: StickyNote,    label: 'Sticky Note', textOk: true  },
  { id: 'text',    icon: Type,          label: 'Text',        textOk: true  },
]

const DEMO_UPLOADS = [
  { id: 'u1', src: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=160&q=80&auto=format&fit=crop', label: 'Ref 1' },
  { id: 'u2', src: 'https://images.unsplash.com/photo-1478145046317-39f10e56b5e9?w=160&q=80&auto=format&fit=crop', label: 'Ref 2' },
  { id: 'u3', src: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=160&q=80&auto=format&fit=crop', label: 'Ref 3' },
  { id: 'u4', src: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=160&q=80&auto=format&fit=crop', label: 'Ref 4' },
  { id: 'u5', src: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=160&q=80&auto=format&fit=crop', label: 'Ref 5' },
  { id: 'u6', src: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=160&q=80&auto=format&fit=crop', label: 'Ref 6' },
]

const DEMO_PROJECTS = [
  { id: 'p1', title: 'The Delacroix Wedding', pages: ['Overview', 'Floral Map', 'Lighting Plan'] },
  { id: 'p2', title: 'Gala 2025 — Azure',     pages: ['Stage Setup', 'Table Layout', 'Mood Board'] },
  { id: 'p3', title: 'Baptism — Bautista',    pages: ['Welcome Board', 'Dessert Table'] },
]

const BACKGROUND_COLORS = [
  '#ffffff', '#fafaf9', '#1c1917', '#0f172a', '#1e293b',
  '#fef9c3', '#fce7f3', '#ede9fe', '#d1fae5', '#fee2e2',
  '#f3e8ff', '#e0f2fe', '#ecfdf5', '#fff7ed', '#f1f5f9',
]

/* ─── Logistics demo data ─── */
interface AllocatedAsset {
  id: string; name: string; dragCount: number; quantity: number | null
  unit: string; allocated: boolean; availableStock: number
  existingAllocations: { event: string; allocated: number; total: number }[]
}
interface PendingReplenishment {
  id: string; name: string; requestedQty: number; unit: string; event: string
}

const DEMO_ALLOCATED: AllocatedAsset[] = [
  {
    id: 'a1', name: 'Floral Tall Centerpiece', dragCount: 12, quantity: 12, unit: 'pcs', allocated: true,
    availableStock: 18,
    existingAllocations: [
      { event: 'The Delacroix Wedding', allocated: 8, total: 20 },
      { event: 'Gala 2025 — Azure',     allocated: 5, total: 10 },
    ],
  },
  {
    id: 'a2', name: 'Drape Canopy', dragCount: 3, quantity: null, unit: 'sets', allocated: false,
    availableStock: 4,
    existingAllocations: [{ event: 'Baptism — Bautista', allocated: 1, total: 2 }],
  },
  {
    id: 'a3', name: 'String Lights', dragCount: 6, quantity: 6, unit: 'rolls', allocated: true,
    availableStock: 10,
    existingAllocations: [{ event: 'Gala 2025 — Azure', allocated: 4, total: 15 }],
  },
  {
    id: 'a4', name: 'Up-lighting', dragCount: 8, quantity: null, unit: 'units', allocated: false,
    availableStock: 5,
    existingAllocations: [],
  },
]



// Default availableStock (for the current event's window) assumed for any Elements-panel
// catalog item that hasn't been given an explicit stock entry below.
const DEFAULT_ELEMENT_STOCK = 12

// Seeds the shared stock-tracking store (the same AllocatedAsset[] model that powers
// asset.availableStock inside AllocationModal) with real-time availability for Elements
// panel catalog items, keyed by the same item id used in ASSET_CATEGORIES/DroppedAsset.
// A couple are seeded at 0 so the Zero-Stock system has something to demo out of the box.
const CATALOG_STOCK_SEED: AllocatedAsset[] = [
  { id: 'cp2', name: 'Candle Ring',    dragCount: 0, quantity: null, unit: 'pcs', allocated: false, availableStock: 0, existingAllocations: [] },
  { id: 'wr3', name: 'LED Strip Roll', dragCount: 0, quantity: null, unit: 'pcs', allocated: false, availableStock: 0, existingAllocations: [] },
]

const UNIT_OPTIONS = ['pcs', 'sets', 'rolls', 'units', 'yds', 'm', 'boxes', 'pairs']

const UNIT_FACTORS: Record<string, number> = { pcs: 1, sets: 1, rolls: 1, units: 1, yds: 1, m: 1.094, boxes: 12, pairs: 2 }
function convertToBase(quantity: number, unit: string) { return quantity * (UNIT_FACTORS[unit] ?? 1) }
function formatStock(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1) }

const PRIOR_EVENTS = [
  { id: 'ev1', name: 'Spring Gala 2024', fullStop: 'Apr 12, 2025 10:00 PM' },
  { id: 'ev2', name: 'Luna Wedding',     fullStop: 'Mar 28, 2025 11:30 PM' },
]

/* ─── Event Reference demo data (self-contained, keyed by eventAlias) ─── */
interface EventReference {
  eventPegs: { label: string; date: string }[]
  colorPalette: { hex: string; label: string }[]
  brandingAndTextures: string[]
}

const EVENT_REFERENCE_DATA: Record<string, EventReference> = {
  'LND-26': {
    eventPegs: [
      { label: 'Ingress',  date: 'May 14, 2026 · 8:00 AM' },
      { label: 'Actual',   date: 'May 15, 2026 · 6:00 PM' },
      { label: 'Egress',   date: 'May 16, 2026 · 11:00 AM' },
    ],
    colorPalette: [
      { hex: '#d4af37', label: 'Antique Gold' },
      { hex: '#faf7f0', label: 'Ivory' },
      { hex: '#2f2a24', label: 'Espresso' },
    ],
    brandingAndTextures: ['Velvet drape backdrop', 'Gold foil monogram', 'Château crest motif'],
  },
  'EGS-26': {
    eventPegs: [
      { label: 'Ingress',  date: 'Jun 13, 2026 · 9:00 AM' },
      { label: 'Actual',   date: 'Jun 14, 2026 · 4:00 PM' },
      { label: 'Egress',   date: 'Jun 14, 2026 · 10:00 PM' },
    ],
    colorPalette: [
      { hex: '#8fae8b', label: 'Garden Sage' },
      { hex: '#f6efe3', label: 'Linen' },
      { hex: '#c9a66b', label: 'Honey Wood' },
    ],
    brandingAndTextures: ['Pressed-botanical menu cards', 'Woven rattan accents', 'Hand-lettered signage'],
  },
  'GHG-26': {
    eventPegs: [
      { label: 'Ingress',  date: 'Jun 19, 2026 · 7:30 AM' },
      { label: 'Actual',   date: 'Jun 20, 2026 · 5:00 PM' },
      { label: 'Egress',   date: 'Jun 21, 2026 · 9:00 AM' },
    ],
    colorPalette: [
      { hex: '#e6c9d0', label: 'Blush' },
      { hex: '#ffffff', label: 'Pure White' },
      { hex: '#6b7c59', label: 'Moss' },
    ],
    brandingAndTextures: ['Floral arch cutout backdrop', 'Watercolor invitation suite', 'Sheer organza ribbon'],
  },
  'DJB-26': {
    eventPegs: [
      { label: 'Ingress',  date: 'Jun 25, 2026 · 8:00 AM' },
      { label: 'Actual',   date: 'Jun 26, 2026 · 7:00 PM' },
      { label: 'Egress',   date: 'Jun 27, 2026 · 10:00 AM' },
    ],
    colorPalette: [
      { hex: '#b9d3ee', label: 'Crystal Blue' },
      { hex: '#f5f5f5', label: 'Frost White' },
      { hex: '#8892a6', label: 'Slate' },
    ],
    brandingAndTextures: ['Diamond-pleat linens', 'Crystal candelabra centerpieces', 'Mirror-top tables'],
  },
}

/* ─── Helpers ─── */
function useOutsideClick(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) cb()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, cb])
}

function Slider({ label, value, onChange, min = 0, max = 100 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between">
        <span className="text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
        <span className="text-[0.58rem] tabular-nums text-muted-foreground">{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer accent-primary" />
    </div>
  )
}

/* ══════════════════��═══════════════��═══════
   LEFT PANEL TABS
   ══════════════════════════════════════════ */

function ElementsTab({ onDropAsset, assets, onRouteToDeficit }: {
  onDropAsset: (asset: DroppedAsset) => void
  assets: AllocatedAsset[]
  onRouteToDeficit: (item: { id: string; name: string; unit: string }) => void
}) {
  const [query, setQuery] = useState('')
  const [tooltip, setTooltip] = useState<{ id: string; label: string; src: string } | null>(null)
  const [blocked, setBlocked] = useState<{ id: string; label: string; unit: string } | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const blockedRef = useRef<HTMLDivElement>(null)
  useOutsideClick(tooltipRef, () => setTooltip(null))
  useOutsideClick(blockedRef, () => setBlocked(null))

  const filtered = query
    ? ASSET_CATEGORIES.map((cat) => ({ ...cat, items: cat.items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase())) })).filter((cat) => cat.items.length > 0)
    : ASSET_CATEGORIES

  // Same source of truth as AllocationModal's asset.availableStock — the shared
  // AllocatedAsset[] store lifted to the workspace root, keyed by catalog item id.
  function getStock(itemId: string) {
    return assets.find((a) => a.id === itemId)?.availableStock ?? DEFAULT_ELEMENT_STOCK
  }

  function handleDragStart(e: React.DragEvent, item: { id: string; label: string; src: string }, stock: number) {
    if (stock === 0) { e.preventDefault(); return }
    const payload: DroppedAsset = { id: item.id, name: item.label, src: item.src, defaultUnit: 'pcs' }
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload))
    e.dataTransfer.effectAllowed = 'copy'
  }

  function addToCanvas(item: { id: string; label: string; src: string }) {
    onDropAsset({ id: item.id, name: item.label, src: item.src, defaultUnit: 'pcs' })
    setTooltip(null)
  }

  function handleTileClick(item: { id: string; label: string }, stock: number) {
    if (stock === 0) setBlocked({ id: item.id, label: item.label, unit: 'pcs' })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search assets…" value={query} onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-7 pr-3 text-[0.65rem] text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-5 scrollbar-thin">
        {filtered.map((cat) => (
          <div key={cat.id}>
            <p className="mb-2 text-[0.58rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">{cat.label}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {cat.items.map((item) => {
                const stock = getStock(item.id)
                const outOfStock = stock === 0
                return (
                  <div key={item.id} className={cn('relative group', outOfStock ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing')}
                    draggable={!outOfStock}
                    onDragStart={(e) => handleDragStart(e, item, stock)}
                    onClick={() => handleTileClick(item, stock)}>
                    <div className={cn('relative aspect-square overflow-hidden rounded-lg transition-all', outOfStock ? 'opacity-40' : 'group-active:scale-95 group-active:opacity-70')}>
                      <img src={item.src} alt={item.label} draggable={false} className={cn('size-full object-cover mix-blend-multiply dark:mix-blend-normal pointer-events-none', outOfStock && 'grayscale')} />
                    </div>
                    <p className="mt-0.5 truncate text-center text-[0.5rem] text-muted-foreground">{item.label}</p>
                    {outOfStock ? (
                      <span className="mt-0.5 flex w-full items-center justify-center rounded-full bg-muted px-1 py-0.5 text-center text-[0.45rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                        Not Available
                      </span>
                    ) : (
                      <span className="mt-0.5 block text-center text-[0.45rem] font-medium text-muted-foreground/70">{stock} in stock</span>
                    )}
                    <button type="button" onClick={(e) => { e.stopPropagation(); setTooltip(item) }} aria-label={`Info for ${item.label}`}
                      className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-background/80 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-foreground">
                      <Info className="size-2.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      {blocked && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div ref={blockedRef} className="w-60 rounded-2xl border border-border bg-card p-4 shadow-2xl">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-destructive/15"><AlertTriangle className="size-3.5 text-destructive" /></div>
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">Not Available</span>
            </div>
            <p className="mb-3 text-[0.62rem] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">{blocked.label}</span> has no available stock for this event window right now.
            </p>
            <div className="flex flex-col gap-1.5">
              <button type="button" onClick={() => { onRouteToDeficit({ id: blocked.id, name: blocked.label, unit: blocked.unit }); setBlocked(null) }}
                className="w-full rounded-xl bg-primary py-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary-foreground hover:opacity-90 transition">
                Route to Deficit Queue
              </button>
              <button type="button" onClick={() => setBlocked(null)}
                className="w-full rounded-xl border border-border py-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground hover:bg-accent hover:text-foreground transition">
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
      {tooltip && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div ref={tooltipRef} className="w-56 rounded-2xl border border-border bg-card p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground">{tooltip.label}</span>
              <button type="button" onClick={() => setTooltip(null)} className="text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
            </div>
            <img src={tooltip.src} alt={tooltip.label} className="mb-3 w-full rounded-lg object-cover aspect-square" />
            <div className="space-y-1">
              <div className="flex justify-between text-[0.6rem]">
                <span className="text-muted-foreground">Category</span>
                <span className="text-foreground font-medium">{ASSET_CATEGORIES.find((c) => c.items.some((i) => i.id === tooltip.id))?.label}</span>
              </div>
              <div className="flex justify-between text-[0.6rem]">
                <span className="text-muted-foreground">Asset ID</span>
                <span className="font-mono text-foreground">{tooltip.id.toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-[0.6rem]">
                <span className="text-muted-foreground">Status</span>
                <span className="text-emerald-400 font-medium">Available</span>
              </div>
            </div>
            <button type="button" onClick={() => addToCanvas(tooltip)}
              className="mt-3 w-full rounded-lg bg-primary py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary-foreground hover:opacity-90 transition">
              Add to Canvas
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function TextTab() {
  return (
    <div className="flex flex-col gap-3 p-3 overflow-y-auto flex-1">
      <p className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">Click to add text</p>
      <button type="button" className="w-full rounded-xl border border-dashed border-border bg-background py-3 text-[0.65rem] font-medium text-muted-foreground transition hover:border-primary/50 hover:text-foreground">
        + Add a paragraph text
      </button>
      <p className="mt-1 text-[0.58rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">Text styles</p>
      <div className="flex flex-col gap-1.5">
        {FONT_STYLES.map((s) => (
          <button key={s.label} type="button" className="group flex w-full flex-col gap-0.5 rounded-xl border border-border bg-background px-3 py-2.5 text-left transition hover:border-primary/50 hover:bg-accent">
            <span className={cn('text-foreground leading-tight font-sans', s.size, s.weight)}>{s.sample}</span>
            <span className="text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{s.label}</span>
          </button>
        ))}
      </div>
      <p className="mt-1 text-[0.58rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">Quick formatting</p>
      <div className="grid grid-cols-4 gap-1">
        {[{ icon: Bold, label: 'Bold' }, { icon: Italic, label: 'Italic' }, { icon: Underline, label: 'Underline' }, { icon: AlignLeft, label: 'Align' }].map(({ icon: Icon, label }) => (
          <button key={label} type="button" aria-label={label} className="flex flex-col items-center gap-1 rounded-lg border border-border bg-background py-2 text-muted-foreground transition hover:border-primary/50 hover:text-foreground">
            <Icon className="size-3.5" />
            <span className="text-[0.5rem] uppercase tracking-wide">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function UploadsTab({ onDropAsset }: { onDropAsset: (asset: DroppedAsset) => void }) {
  const [uploads, setUploads] = useState(DEMO_UPLOADS)
  const fileRef = useRef<HTMLInputElement>(null)
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    files.forEach((file, i) => {
      const reader = new FileReader()
      reader.onload = (loadEvent) => {
        const result = loadEvent.target?.result as string
        if (!result) return
        setUploads((u) => [{ id: `upload-${Date.now()}-${i}`, src: result, label: file.name.replace(/\.[^.]+$/, '') }, ...u])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }
  function handleDragStart(e: React.DragEvent, item: { id: string; label: string; src: string }) {
    const payload: DroppedAsset = { id: item.id, name: item.label, src: item.src, defaultUnit: 'pcs' }
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload))
    e.dataTransfer.effectAllowed = 'copy'
  }
  function addToCanvas(item: { id: string; label: string; src: string }) {
    onDropAsset({ id: item.id, name: item.label, src: item.src, defaultUnit: 'pcs' })
  }
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 pt-3 pb-2 shrink-0">
        <button type="button" onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background py-2.5 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition hover:border-primary/50 hover:text-foreground">
          <Upload className="size-3.5" />Upload image
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <p className="mb-2 text-[0.58rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">Your uploads</p>
        <div className="grid grid-cols-2 gap-1.5">
          {uploads.map((u) => (
            <div
              key={u.id}
              draggable
              onDragStart={(e) => handleDragStart(e, u)}
              onClick={() => addToCanvas(u)}
              className="group relative aspect-square overflow-hidden rounded-lg border border-border cursor-grab active:cursor-grabbing hover:border-primary/50 transition active:scale-95 active:opacity-70"
            >
              <img src={u.src} alt={u.label} draggable={false} className="size-full object-cover pointer-events-none" />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition">
                <span className="text-[0.55rem] font-medium text-white truncate">{u.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const TOOL_DESCRIPTIONS: Record<CanvasTool, string> = {
  select: 'Click or drag to select and move elements.',
  draw: 'Click and drag to draw a freehand line.',
  shapes: 'Click the canvas to place a rectangle.',
  lines: 'Click and drag to draw a straight line.',
  sticky: 'Click the canvas to place a sticky note. Double-tap to edit text.',
  text: 'Click the canvas to place a text element.',
}

function ToolsTab({ activeTool, onToolChange }: { activeTool: CanvasTool; onToolChange: (tool: CanvasTool) => void }) {
  return (
    <div className="flex flex-col gap-3 p-3 overflow-y-auto flex-1">
      <p className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">Canvas tools</p>
      <div className="grid grid-cols-2 gap-2">
        {DEMO_TOOLS.map((tool) => {
          const Icon = tool.icon
          const isActive = activeTool === tool.id
          return (
            <button key={tool.id} type="button" onClick={() => onToolChange(tool.id as CanvasTool)}
              className={cn('flex flex-col items-center gap-2 rounded-xl border py-3 transition',
                isActive ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground')}>
              <Icon className="size-4" />
              <span className="text-[0.58rem] font-semibold uppercase tracking-[0.1em]">{tool.label}</span>
            </button>
          )
        })}
      </div>
      {activeTool && (
        <div className="rounded-xl border border-border bg-background p-3 text-[0.62rem] text-muted-foreground space-y-1">
          <p className="font-bold uppercase tracking-[0.1em] text-foreground">{DEMO_TOOLS.find((t) => t.id === activeTool)?.label}</p>
          <p>{TOOL_DESCRIPTIONS[activeTool]}</p>
        </div>
      )}
    </div>
  )
}

function ProjectsTab() {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const filtered = DEMO_PROJECTS.filter((p) => !query || p.title.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search projects…" value={query} onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-7 pr-3 text-[0.65rem] text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5">
        {filtered.map((proj) => (
          <div key={proj.id} className="rounded-xl border border-border bg-background overflow-hidden">
            <button type="button" onClick={() => setExpanded((e) => (e === proj.id ? null : proj.id))}
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-accent">
              <div className="flex items-center gap-2 min-w-0">
                <FolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate text-[0.65rem] font-semibold text-foreground">{proj.title}</span>
              </div>
              <ChevronDown className={cn('size-3 shrink-0 text-muted-foreground transition-transform', expanded === proj.id && 'rotate-180')} />
            </button>
            {expanded === proj.id && (
              <div className="border-t border-border px-3 py-2 flex flex-col gap-1">
                {proj.pages.map((page) => (
                  <button key={page} type="button" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[0.62rem] text-muted-foreground transition hover:bg-accent hover:text-foreground">
                    <ChevronRight className="size-2.5 shrink-0" />{page}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function BackgroundTab({ onApply }: { onApply: (color: string | null, photoDataUrl: string | null) => void }) {
  const [activeColor, setActiveColor] = useState<string | null>(null)
  const [bgMode, setBgMode] = useState<'color' | 'photo'>('color')
  const fileRef = useRef<HTMLInputElement>(null)
  const [bgPhoto, setBgPhoto] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)

  function apply() {
    if (bgMode === 'color' && activeColor) {
      onApply(activeColor, null)
    } else if (bgMode === 'photo' && bgPhoto) {
      onApply(null, bgPhoto)
    }
    setApplied(true)
    setTimeout(() => setApplied(false), 1500)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setBgPhoto(dataUrl)
    }
    reader.readAsDataURL(f)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-4 p-3 overflow-y-auto flex-1">
      <div className="flex rounded-lg border border-border overflow-hidden">
        {(['color', 'photo'] as const).map((m) => (
          <button key={m} type="button" onClick={() => setBgMode(m)}
            className={cn('flex-1 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] transition',
              bgMode === m ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground')}>
            {m === 'color' ? 'Color Fill' : 'Photo'}
          </button>
        ))}
      </div>
      {bgMode === 'color' ? (
        <>
          <div>
            <p className="mb-2 text-[0.58rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">Preset colors</p>
            <div className="grid grid-cols-5 gap-2">
              {BACKGROUND_COLORS.map((color) => (
                <button key={color} type="button" onClick={() => setActiveColor(color)} aria-label={color} style={{ backgroundColor: color }}
                  className={cn('aspect-square rounded-lg border-2 transition hover:scale-110', activeColor === color ? 'border-primary shadow-lg scale-110' : 'border-border')} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Palette className="size-3.5 text-muted-foreground shrink-0" />
            <input type="color" value={activeColor ?? '#ffffff'} onChange={(e) => setActiveColor(e.target.value)}
              className="h-7 w-full rounded-lg border border-border bg-background cursor-pointer" />
          </div>
        </>
      ) : (
        <>
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background py-5 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition hover:border-primary/50 hover:text-foreground">
            <ImageIcon className="size-4" />Choose photo
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          {bgPhoto && (
            <div className="relative aspect-video overflow-hidden rounded-xl border border-border">
              <img src={bgPhoto} alt="Background preview" className="size-full object-cover" />
            </div>
          )}
        </>
      )}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2">
        <p className="text-[0.58rem] text-amber-400/80 leading-relaxed">
          Background applies to <span className="font-bold text-amber-400">all pages</span> by default.
        </p>
      </div>
      <button type="button" onClick={apply} disabled={bgMode === 'color' ? !activeColor : !bgPhoto}
        className={cn('w-full rounded-xl py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] transition',
          applied ? 'bg-emerald-600 text-white' : 'bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed')}>
        {applied ? 'Applied to all pages!' : 'Apply background'}
      </button>
    </div>
  )
}

/* ════════════════════����═════════════════════
   LEFT PANEL SHELL
   ═════════════════════���═════���══════════════ */
const PANEL_TABS: { id: PanelTab; icon: React.ElementType; label: string }[] = [
  { id: 'elements',   icon: ImageIcon,  label: 'Elements' },
  { id: 'text',       icon: Type,       label: 'Text' },
  { id: 'uploads',    icon: Upload,     label: 'Uploads' },
  { id: 'tools',      icon: Wrench,     label: 'Tools' },
  { id: 'projects',   icon: FolderOpen, label: 'Projects' },
  { id: 'background', icon: Palette,    label: 'Background' },
]

// Compact, read-only "Event Reference" block — pinned above the tab content,
// only shown when the open canvas is tied to a real event (has an eventAlias
// with matching demo reference data). Deliberately non-editable: lock icon +
// muted styling distinguish it from the fully-editable tabs below it.
function EventReferencePanel({ eventAlias }: { eventAlias: string }) {
  const ref = EVENT_REFERENCE_DATA[eventAlias]
  const [open, setOpen] = useState(true)
  if (!ref) return null
  return (
    <div className="border-b border-border bg-muted/40 shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2"
      >
        <span className="flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          <Lock className="size-2.5 shrink-0" aria-hidden="true" />
          Event Reference
        </span>
        <ChevronDown className={cn('size-3 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        <div className="flex flex-col gap-3 px-3 pb-3 text-[0.6rem]">
          <div className="flex flex-col gap-1">
            <span className="font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">Event Pegs</span>
            {ref.eventPegs.map((peg) => (
              <div key={peg.label} className="flex items-center justify-between gap-2 text-foreground/80">
                <span className="shrink-0 text-muted-foreground">{peg.label}</span>
                <span className="truncate text-right">{peg.date}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">Color Palette</span>
            <div className="flex items-center gap-1.5">
              {ref.colorPalette.map((c) => (
                <span key={c.hex} className="flex flex-col items-center gap-0.5" title={c.label}>
                  <span
                    style={{ backgroundColor: c.hex }}
                    className="size-5 rounded-full border border-border/60"
                    aria-hidden="true"
                  />
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">Branding & Textures</span>
            <ul className="flex flex-col gap-0.5 text-foreground/80">
              {ref.brandingAndTextures.map((item) => (
                <li key={item} className="truncate">· {item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

function LeftPanel({ onDropAsset, eventAlias, assets, onRouteToDeficit, onApplyBackground, activeTool, onToolChange }: {
  onDropAsset: (asset: DroppedAsset) => void
  eventAlias?: string
  assets: AllocatedAsset[]
  onRouteToDeficit: (item: { id: string; name: string; unit: string }) => void
  onApplyBackground: (color: string | null, photoDataUrl: string | null) => void
  activeTool: CanvasTool
  onToolChange: (tool: CanvasTool) => void
}) {
  const [activeTab, setActiveTab] = useState<PanelTab>('elements')
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className={cn('flex shrink-0 overflow-hidden border-r border-border bg-card transition-all duration-200', collapsed ? 'w-11' : 'w-64')}>
      <div className="flex w-11 shrink-0 flex-col items-center border-r border-border py-2 gap-0.5">
        {PANEL_TABS.map(({ id, icon: Icon, label }) => (
          <button key={id} type="button" aria-label={label}
            onClick={() => { setActiveTab(id); setCollapsed(false) }}
            className={cn('flex flex-col items-center gap-0.5 w-full px-1 py-2 rounded-none transition',
              activeTab === id && !collapsed ? 'bg-primary/10 text-primary border-r-2 border-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
            <Icon className="size-4" />
            <span className="text-[0.4rem] font-bold uppercase tracking-wide leading-tight">{label}</span>
          </button>
        ))}
        <div className="flex-1" />
        <button type="button" aria-label={collapsed ? 'Expand panel' : 'Collapse panel'} onClick={() => setCollapsed((c) => !c)}
          className="flex size-9 items-center justify-center text-muted-foreground transition hover:bg-accent hover:text-foreground">
          {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
        </button>
      </div>
      {!collapsed && (
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          {eventAlias && <EventReferencePanel eventAlias={eventAlias} />}
          <div className="flex items-center justify-between border-b border-border px-3 py-2 shrink-0">
            <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-foreground">
              {PANEL_TABS.find((t) => t.id === activeTab)?.label}
            </span>
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
            {activeTab === 'elements'   && <ElementsTab onDropAsset={onDropAsset} assets={assets} onRouteToDeficit={onRouteToDeficit} />}
            {activeTab === 'text'       && <TextTab />}
            {activeTab === 'uploads'    && <UploadsTab onDropAsset={onDropAsset} />}
            {activeTab === 'tools'      && <ToolsTab activeTool={activeTool} onToolChange={onToolChange} />}
            {activeTab === 'projects'   && <ProjectsTab />}
            {activeTab === 'background' && <BackgroundTab onApply={onApplyBackground} />}
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════
   CONTEXTUAL EDITING TOOLBAR PANELS
   ══════════════════════════════════════════ */

function AdjustPanel({ onClose }: { onClose: () => void }) {
  const [vals, setVals] = useState({
    temp: 50, tint: 50, brightness: 50, contrast: 50, highlights: 50,
    shadows: 50, whites: 50, blacks: 50, vibrance: 50, saturation: 50,
    sharpness: 50, clarity: 50,
  })
  type AdjKey = keyof typeof vals
  function set(k: AdjKey) { return (v: number) => setVals((s) => ({ ...s, [k]: v })) }
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, onClose)

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center pt-14 pointer-events-none">
      <div ref={ref} className="pointer-events-auto w-72 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5 sticky top-0 bg-card z-10">
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-foreground flex items-center gap-1.5"><Sliders className="size-3.5 text-primary" />Edit / Adjust Image</span>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
        </div>
        <div className="px-4 py-3 flex flex-col gap-3">
          <p className="text-[0.55rem] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5"><Sun className="size-3" />White Balance</p>
          <Slider label="Temp"       value={vals.temp}       onChange={set('temp')} />
          <Slider label="Tint"       value={vals.tint}       onChange={set('tint')} />
          <p className="mt-1 text-[0.55rem] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5"><Contrast className="size-3" />Light</p>
          <Slider label="Brightness" value={vals.brightness} onChange={set('brightness')} />
          <Slider label="Contrast"   value={vals.contrast}   onChange={set('contrast')} />
          <Slider label="Highlights" value={vals.highlights} onChange={set('highlights')} />
          <Slider label="Shadows"    value={vals.shadows}    onChange={set('shadows')} />
          <Slider label="Whites"     value={vals.whites}     onChange={set('whites')} />
          <Slider label="Blacks"     value={vals.blacks}     onChange={set('blacks')} />
          <p className="mt-1 text-[0.55rem] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5"><Droplets className="size-3" />Color</p>
          <Slider label="Vibrance"   value={vals.vibrance}   onChange={set('vibrance')} />
          <Slider label="Saturation" value={vals.saturation} onChange={set('saturation')} />
          <p className="mt-1 text-[0.55rem] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5"><Sparkles className="size-3" />Texture</p>
          <Slider label="Sharpness"  value={vals.sharpness}  onChange={set('sharpness')} />
          <Slider label="Clarity"    value={vals.clarity}    onChange={set('clarity')} />
          <button type="button" onClick={() => setVals({ temp:50,tint:50,brightness:50,contrast:50,highlights:50,shadows:50,whites:50,blacks:50,vibrance:50,saturation:50,sharpness:50,clarity:50 })}
            className="mt-1 w-full rounded-lg border border-border py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground transition hover:bg-accent hover:text-foreground">
            Reset all
          </button>
        </div>
      </div>
    </div>
  )
}

function CropPanel({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'freeform' | 'original' | '1:1' | 'custom'>('freeform')
  const [rotation, setRotation] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, onClose)
  const modes = [
    { id: 'freeform', label: 'Freeform' },
    { id: 'original', label: 'Original' },
    { id: '1:1',      label: '1 : 1' },
  ] as const
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center pt-14 pointer-events-none">
      <div ref={ref} className="pointer-events-auto w-60 rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-foreground flex items-center gap-1.5"><Crop className="size-3.5 text-primary" />Crop</span>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
        </div>
        <div className="px-4 py-3 flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-1.5">
            {modes.map((m) => (
              <button key={m.id} type="button" onClick={() => setMode(m.id as typeof mode)}
                className={cn('rounded-lg border py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition',
                  mode === m.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/40')}>
                {m.label}
              </button>
            ))}
          </div>
          <Slider label="Rotation" value={rotation} onChange={setRotation} min={-180} max={180} />
          <button type="button" className="w-full rounded-xl bg-primary py-2 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground hover:opacity-90 transition">
            Apply crop
          </button>
        </div>
      </div>
    </div>
  )
}

function FlipPanel({ onClose }: { onClose: () => void }) {
  const [flippedH, setFlippedH] = useState(false)
  const [flippedV, setFlippedV] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, onClose)
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center pt-14 pointer-events-none">
      <div ref={ref} className="pointer-events-auto w-48 rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-foreground">Flip</span>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
        </div>
        <div className="px-4 py-3 flex flex-col gap-2">
          <button type="button" onClick={() => setFlippedH((v) => !v)}
            className={cn('flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] transition',
              flippedH ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground')}>
            <FlipHorizontal className="size-3.5" />Horizontal
          </button>
          <button type="button" onClick={() => setFlippedV((v) => !v)}
            className={cn('flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] transition',
              flippedV ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground')}>
            <FlipVertical className="size-3.5" />Vertical
          </button>
        </div>
      </div>
    </div>
  )
}

function TransparencyPanel({ opacity, onChange, onClose }: { opacity: number; onChange: (v: number) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, onClose)
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center pt-14 pointer-events-none">
      <div ref={ref} className="pointer-events-auto w-56 rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-foreground">Transparency</span>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
        </div>
        <div className="px-4 py-4">
          {/* Checkerboard icon + value */}
          <div className="flex items-center gap-3 mb-3">
            <div className="size-8 rounded-lg border border-border shrink-0" style={{
              backgroundImage: 'linear-gradient(45deg,#888 25%,transparent 25%),linear-gradient(-45deg,#888 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#888 75%),linear-gradient(-45deg,transparent 75%,#888 75%)',
              backgroundSize: '8px 8px', backgroundPosition: '0 0,0 4px,4px -4px,-4px 0',
            }} />
            <span className="text-xl font-bold tabular-nums text-foreground">{opacity}%</span>
          </div>
          <Slider label="Opacity" value={opacity} onChange={onChange} />
        </div>
      </div>
    </div>
  )
}

function PositionPanel({
  asset, onClose, onUpdate, canvasAssets,
}: {
  asset: CanvasAsset
  onClose: () => void
  onUpdate: (id: string, changes: Partial<CanvasAsset>) => void
  canvasAssets: CanvasAsset[]
}) {
  const [tab, setTab] = useState<PositionTab>('arrange')
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, onClose)

  const ALIGN_GRID = [
    [{ icon: AlignHorizontalJustifyCenter, label: 'Align Top',    act: () => onUpdate(asset.id, { y: 10 }) },
     { icon: AlignCenter,                  label: 'Align Middle', act: () => onUpdate(asset.id, { y: 200 }) },
     { icon: AlignVerticalJustifyCenter,   label: 'Align Bottom', act: () => onUpdate(asset.id, { y: 380 }) }],
    [{ icon: AlignLeft,                    label: 'Align Left',   act: () => onUpdate(asset.id, { x: 10 }) },
     { icon: AlignCenter,                  label: 'Center',       act: () => onUpdate(asset.id, { x: 250 }) },
     { icon: AlignLeft,                    label: 'Align Right',  act: () => onUpdate(asset.id, { x: 490 }) }],
  ]

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center pt-14 pointer-events-none">
      <div ref={ref} className="pointer-events-auto w-72 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex gap-1">
            {(['arrange', 'layers'] as PositionTab[]).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)}
                className={cn('rounded-lg px-3 py-1 text-[0.6rem] font-bold uppercase tracking-[0.1em] transition',
                  tab === t ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}>
                {t}
              </button>
            ))}
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
        </div>

        {tab === 'arrange' ? (
          <div className="px-4 py-3 flex flex-col gap-4">
            {/* Align */}
            <div>
              <p className="mb-2 text-[0.55rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">Align</p>
              {ALIGN_GRID.map((row, ri) => (
                <div key={ri} className="flex gap-1.5 mb-1.5">
                  {row.map(({ icon: Icon, label, act }) => (
                    <button key={label} type="button" onClick={act} aria-label={label}
                      className="flex flex-1 flex-col items-center gap-1 rounded-lg border border-border bg-background py-2 text-muted-foreground transition hover:border-primary/50 hover:text-foreground">
                      <Icon className="size-3.5" />
                      <span className="text-[0.48rem] uppercase tracking-wide">{label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
            {/* Z-index */}
            <div>
              <p className="mb-2 text-[0.55rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">Z-index</p>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { icon: ArrowUp,   label: 'Forward',  act: () => onUpdate(asset.id, { zIndex: asset.zIndex + 1 }) },
                  { icon: ArrowDown, label: 'Backward', act: () => onUpdate(asset.id, { zIndex: Math.max(0, asset.zIndex - 1) }) },
                  { icon: MoveUp,    label: 'Front',    act: () => onUpdate(asset.id, { zIndex: 99 }) },
                  { icon: MoveDown,  label: 'Back',     act: () => onUpdate(asset.id, { zIndex: 0 }) },
                ].map(({ icon: Icon, label, act }) => (
                  <button key={label} type="button" onClick={act}
                    className="flex flex-col items-center gap-1 rounded-lg border border-border bg-background py-2 text-muted-foreground transition hover:border-primary/50 hover:text-foreground">
                    <Icon className="size-3.5" />
                    <span className="text-[0.48rem] uppercase tracking-wide">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Exact inputs */}
            <div>
              <p className="mb-2 text-[0.55rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">Exact position</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'W', icon: MoveHorizontal, val: asset.w, key: 'w' as const },
                  { label: 'H', icon: MoveVertical,   val: asset.h, key: 'h' as const },
                  { label: 'X', icon: MoveHorizontal, val: asset.x, key: 'x' as const },
                  { label: 'Y', icon: MoveVertical,   val: asset.y, key: 'y' as const },
                  { label: 'R', icon: RotateCw,       val: asset.rotation, key: 'rotation' as const },
                ].map(({ label, icon: Icon, val, key }) => (
                  <div key={label} className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.5">
                    <span className="text-[0.55rem] font-bold uppercase text-muted-foreground w-3 shrink-0">{label}</span>
                    <input type="number" value={val}
                      onChange={(e) => onUpdate(asset.id, { [key]: Number(e.target.value) })}
                      className="w-full bg-transparent text-[0.65rem] text-foreground outline-none tabular-nums" />
                    <Icon className="size-3 shrink-0 text-muted-foreground/50" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Layers */
          <div className="px-4 py-3 flex flex-col gap-2">
            <p className="text-[0.55rem] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-1">Layer Stack</p>
            {[...canvasAssets].sort((x, y) => y.zIndex - x.zIndex).map((a) => (
              <div key={a.id} className={cn('flex items-center gap-2.5 rounded-xl border px-3 py-2 transition',
                a.id === asset.id ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-primary/30')}>
                <Layers className="size-3 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-[0.62rem] font-semibold text-foreground">{a.label}</span>
                <span className="text-[0.55rem] tabular-nums text-muted-foreground">z{a.zIndex}</span>
                <div className="flex gap-1">
                  <button type="button" aria-label="Move up" className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground transition">
                    <ChevronUp className="size-3" />
                  </button>
                  <button type="button" aria-label="Move down" className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground transition">
                    <ChevronDown className="size-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   CONTEXTUAL TOP BAR (when asset selected)
   ══════════════════════════════════════════ */
function ContextualBar({
  asset,
  onDeselect,
  onUpdate,
  canvasAssets,
}: {
  asset: CanvasAsset
  onDeselect: () => void
  onUpdate: (id: string, changes: Partial<CanvasAsset>) => void
  canvasAssets: CanvasAsset[]
}) {
  const [openPanel, setOpenPanel] = useState<EditToolbar>(null)

  function toggle(t: EditToolbar) { setOpenPanel((p) => (p === t ? null : t)) }

  const TOOLS: { id: EditToolbar; label: string; icon: React.ElementType }[] = [
    { id: 'adjust',       label: 'Edit / Adjust', icon: Sliders },
    { id: 'crop',         label: 'Crop',           icon: Crop },
    { id: 'flip',         label: 'Flip',           icon: FlipHorizontal },
    { id: 'transparency', label: 'Transparency',   icon: Eye },
    { id: 'position',     label: 'Position',       icon: Layers },
  ]

  return (
    <>
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-primary/30 bg-primary/5 px-4">
        <span className="mr-2 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-primary truncate max-w-[120px]">{asset.label}</span>
        {TOOLS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => toggle(id)}
            className={cn('flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] transition',
              openPanel === id ? 'bg-primary text-primary-foreground' : 'border border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground')}>
            <Icon className="size-3.5" />{label}
          </button>
        ))}
        <div className="flex-1" />
        <button type="button" onClick={onDeselect} aria-label="Deselect"
          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition hover:bg-accent hover:text-foreground">
          <X className="size-3" />Deselect
        </button>
      </div>
      {openPanel === 'adjust'       && <AdjustPanel onClose={() => setOpenPanel(null)} />}
      {openPanel === 'crop'         && <CropPanel onClose={() => setOpenPanel(null)} />}
      {openPanel === 'flip'         && <FlipPanel onClose={() => setOpenPanel(null)} />}
      {openPanel === 'transparency' && <TransparencyPanel opacity={asset.opacity} onChange={(v) => onUpdate(asset.id, { opacity: v })} onClose={() => setOpenPanel(null)} />}
      {openPanel === 'position'     && <PositionPanel asset={asset} onClose={() => setOpenPanel(null)} onUpdate={onUpdate} canvasAssets={canvasAssets} />}
    </>
  )
}

/* ══════════════════════════════════════════
   PAGE MANAGEMENT BOTTOM BAR
   ══════════════════════════════════════════ */

function PageBar({
  pages,
  currentPage,
  pageNavMode,
  onTogglePageNavMode,
  onSelectPage,
  onAddPage,
  onRenamePage,
  onMovePage,
  onDuplicatePage,
  onToggleHidden,
  onDeletePage,
  zoom,
  onZoomChange,
  showGrid,
  onToggleGrid,
  onFitToScreen,
  isFullscreen,
  onToggleFullscreen,
}: {
  pages: CanvasPage[]
  currentPage: string
  pageNavMode: 'flow' | 'thumbnail'
  onTogglePageNavMode: () => void
  onSelectPage: (pageId: string) => void
  onAddPage: () => void
  onRenamePage: (id: string, title: string) => void
  onMovePage: (id: string, dir: -1 | 1) => void
  onDuplicatePage: (id: string) => void
  onToggleHidden: (id: string) => void
  onDeletePage: (id: string) => void
  zoom: number
  onZoomChange: (z: number) => void
  showGrid: boolean
  onToggleGrid: () => void
  onFitToScreen: () => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
}) {
  // "Pages grid view" — a full modal overview of every page at once (Canva-style), distinct
  // from the inline thumbnail strip.
  const [gridViewOpen, setGridViewOpen] = useState(false)
  const [hoveredPage, setHoveredPage] = useState<string | null>(null)

  const currentIdx = Math.max(0, pages.findIndex((p) => p.id === currentPage))

  function selectPage(id: string) {
    onSelectPage(id)
  }

  // In Thumbnail mode, horizontal strip is always visible; in Flow mode, it is hidden
  const showThumbnails = pageNavMode === 'thumbnail'

  return (
    <div className="flex shrink-0 flex-col border-t border-border bg-card">
      {/* Horizontal thumbnail filmstrip (always visible in Thumbnail mode) */}
      {showThumbnails && (
        <div className="flex items-stretch gap-2 overflow-x-auto px-4 py-3 border-b border-border scrollbar-thin">
          {pages.map((page, idx) => (
            <div
              key={page.id}
              onMouseEnter={() => setHoveredPage(page.id)}
              onMouseLeave={() => setHoveredPage(null)}
              className="relative group shrink-0"
            >
              <div
                className={cn('flex flex-col items-center gap-1.5 rounded-xl border p-2 transition min-w-[120px]',
                  currentPage === page.id ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-primary/40',
                  page.hidden && 'opacity-50')}>
                {/* Mini artboard thumbnail */}
                <button type="button" onClick={() => selectPage(page.id)}
                  className="w-full aspect-video rounded-lg border border-border bg-white dark:bg-neutral-900 overflow-hidden flex items-center justify-center">
                  <span className="text-[0.5rem] text-muted-foreground font-medium uppercase tracking-wide">{page.title}</span>
                </button>
                <input
                  type="text"
                  value={page.title}
                  placeholder="Add page title"
                  onChange={(e) => onRenamePage(page.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full truncate rounded bg-transparent px-1 text-center text-[0.58rem] font-medium text-foreground outline-none focus:bg-accent"
                />
                <span className="text-[0.5rem] text-muted-foreground">{idx + 1}</span>
              </div>

              {/* Hover action row */}
              {hoveredPage === page.id && (
                <div className="absolute -bottom-0 left-1/2 -translate-x-1/2 translate-y-full z-50 flex items-center gap-0.5 rounded-xl border border-border bg-popover px-2 py-1.5 shadow-xl">
                  <button type="button" onClick={() => onMovePage(page.id, -1)} aria-label="Move up" disabled={idx === 0} className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition"><MoveUp className="size-3" /></button>
                  <button type="button" onClick={() => onMovePage(page.id, 1)} aria-label="Move down" disabled={idx === pages.length - 1} className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition"><MoveDown className="size-3" /></button>
                  <button type="button" onClick={() => onToggleHidden(page.id)} aria-label="Toggle visibility" className={cn('flex size-5 items-center justify-center rounded transition', page.hidden ? 'text-amber-400 hover:text-amber-300' : 'text-muted-foreground hover:text-foreground')}><EyeOff className="size-3" /></button>
                  <button type="button" onClick={() => onDuplicatePage(page.id)} aria-label="Duplicate" className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground transition"><Copy className="size-3" /></button>
                  <button type="button" onClick={() => onDeletePage(page.id)} aria-label="Delete" disabled={pages.length <= 1} className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-destructive disabled:opacity-30 transition"><Trash2 className="size-3" /></button>
                </div>
              )}
            </div>
          ))}
          {/* Add new page */}
          <button type="button" onClick={onAddPage}
            className="flex shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-background px-6 py-4 text-muted-foreground transition hover:border-primary/50 hover:text-foreground min-w-[100px]">
            <Plus className="size-5" />
            <span className="text-[0.58rem] font-semibold uppercase tracking-[0.1em]">Add page</span>
          </button>
        </div>
      )}

      {/* Bottom bar row */}
      <div className="flex h-9 items-center justify-between gap-3 px-4">
        {/* Left: compact Mode Toggle button */}
        <button
          type="button"
          onClick={onTogglePageNavMode}
          title={pageNavMode === 'flow' ? 'Switch to Horizontal Thumbnails' : 'Switch to Vertical Flow'}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] transition shrink-0',
            pageNavMode === 'thumbnail'
              ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20'
              : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
          )}
        >
          {pageNavMode === 'flow' ? (
            <>
              <GalleryVertical className="size-3 text-primary" />
              <span>{currentIdx + 1} / {pages.length}</span>
            </>
          ) : (
            <>
              <LayoutGrid className="size-3" />
              <span>{currentIdx + 1} / {pages.length}</span>
            </>
          )}
        </button>

        {/* Center: zoom controls */}
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => onZoomChange(Math.max(10, zoom - 10))} aria-label="Zoom out"
            className="flex size-6 items-center justify-center rounded text-muted-foreground transition hover:bg-accent hover:text-foreground">
            <ZoomOut className="size-3.5" />
          </button>
          <input type="range" min={10} max={200} step={5} value={zoom} onChange={(e) => onZoomChange(Number(e.target.value))}
            className="w-24 h-1.5 cursor-pointer accent-primary" />
          <button type="button" onClick={() => onZoomChange(Math.min(200, zoom + 10))} aria-label="Zoom in"
            className="flex size-6 items-center justify-center rounded text-muted-foreground transition hover:bg-accent hover:text-foreground">
            <ZoomIn className="size-3.5" />
          </button>
          <span className="w-10 text-center text-[0.62rem] tabular-nums font-semibold text-muted-foreground">{zoom}%</span>
        </div>

        {/* Right: fit / grid / fullscreen */}
        <div className="flex items-center gap-1">
          <button type="button" onClick={onFitToScreen} aria-label="Fit to screen"
            className="flex size-6 items-center justify-center rounded text-muted-foreground transition hover:bg-accent hover:text-foreground">
            <Maximize2 className="size-3.5" />
          </button>
          <button type="button" onClick={onToggleGrid} aria-label="Toggle grid"
            className={cn('flex size-6 items-center justify-center rounded transition',
              showGrid ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
            <Grid3x3 className="size-3.5" />
          </button>
          <button type="button" onClick={() => setGridViewOpen(true)} aria-label="Pages grid view"
            className="flex size-6 items-center justify-center rounded text-muted-foreground transition hover:bg-accent hover:text-foreground">
            <Grid2X2 className="size-3.5" />
          </button>
          <button type="button" onClick={onToggleFullscreen} aria-label={isFullscreen ? 'Exit full screen' : 'Fullscreen view'} aria-pressed={isFullscreen}
            className={cn('flex size-6 items-center justify-center rounded transition',
              isFullscreen ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
            {isFullscreen ? <Minimize className="size-3.5" /> : <Fullscreen className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* Pages grid view — modal overview of every page for quick jump (Canva-style). */}
      {gridViewOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="All pages"
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-8"
          onClick={() => setGridViewOpen(false)}
        >
          <div
            className="flex max-h-full w-full max-w-3xl flex-col rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="font-display text-sm tracking-[0.12em] text-foreground">All Pages</h2>
              <button type="button" onClick={() => setGridViewOpen(false)} aria-label="Close pages grid view"
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 overflow-y-auto p-5 sm:grid-cols-4">
              {pages.map((page, idx) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => { selectPage(page.id); setGridViewOpen(false) }}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border p-2 text-left transition',
                    currentPage === page.id ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-primary/40',
                    page.hidden && 'opacity-50',
                  )}
                >
                  <span className="flex aspect-video w-full items-center justify-center rounded-lg border border-border bg-white dark:bg-neutral-900">
                    <span className="text-[0.6rem] font-medium uppercase tracking-wide text-muted-foreground">{page.title}</span>
                  </span>
                  <span className="truncate text-[0.65rem] font-semibold text-foreground">{idx + 1}. {page.title}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => { onAddPage(); setGridViewOpen(false) }}
                className="flex aspect-[4/5] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
              >
                <Plus className="size-5" />
                <span className="text-[0.58rem] font-semibold uppercase tracking-[0.1em]">Add page</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════��══════════════════════
   RIGHT-CLICK CONTEXT MENU
   ══════════════════════════════════════════ */
function ContextMenu({
  x, y, asset, onClose,
  onDuplicate, onDelete, onLock, onCopy, onPaste, onAlign, onComment, canPaste,
}: {
  x: number; y: number
  asset: CanvasAsset | null
  onClose: () => void
  onDuplicate: () => void
  onDelete: () => void
  onLock: () => void
  onCopy: () => void
  onPaste: () => void
  onAlign: (alignment: string) => void
  onComment: () => void
  canPaste: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, onClose)
  const [alignSub, setAlignSub] = useState(false)
  const [lockSub, setLockSub] = useState(false)

  const ALIGN_SUB = ['Align left', 'Center horizontally', 'Align right', 'Align top', 'Center vertically', 'Align bottom']
  const LOCK_SUB  = [
    { label: 'Lock Position',  desc: 'Prevents moving' },
    { label: 'Lock Elements',  desc: 'Prevents editing' },
  ]

  // Keep the panel on-screen even when the right-click happens near the viewport edge.
  const MENU_W = 208
  const clampedX = Math.min(x, window.innerWidth - MENU_W - 8)
  const clampedY = Math.min(y, window.innerHeight - 320)

  return (
    <div ref={ref}
      className="fixed z-[90] w-52 rounded-xl border border-border bg-popover py-1 shadow-2xl"
      style={{ left: clampedX, top: clampedY }}>

      {/* Copy */}
      <button type="button" disabled={!asset} onClick={() => { onCopy(); onClose() }}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-popover-foreground transition hover:bg-accent disabled:pointer-events-none disabled:opacity-40">
        <span className="flex items-center gap-2.5"><Copy className="size-3.5 text-muted-foreground" />Copy</span>
        <span className="text-[0.58rem] text-muted-foreground">Ctrl+C</span>
      </button>

      {/* Paste */}
      <button type="button" disabled={!canPaste} onClick={() => { onPaste(); onClose() }}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-popover-foreground transition hover:bg-accent disabled:pointer-events-none disabled:opacity-40">
        <span className="flex items-center gap-2.5"><Plus className="size-3.5 text-muted-foreground" />Paste</span>
        <span className="text-[0.58rem] text-muted-foreground">Ctrl+V</span>
      </button>

      {/* Duplicate */}
      <button type="button" disabled={!asset} onClick={() => { onDuplicate(); onClose() }}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-popover-foreground transition hover:bg-accent disabled:pointer-events-none disabled:opacity-40">
        <span className="flex items-center gap-2.5"><Copy className="size-3.5 text-muted-foreground" />Duplicate</span>
        <span className="text-[0.58rem] text-muted-foreground">Ctrl+D</span>
      </button>

      {/* Delete */}
      <button type="button" disabled={!asset} onClick={() => { onDelete(); onClose() }}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-destructive transition hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-40">
        <span className="flex items-center gap-2.5"><Trash2 className="size-3.5" />Delete</span>
        <span className="text-[0.58rem]">DELETE</span>
      </button>

      {/* Divider */}
      <div className="my-1 border-t border-border" />

      {/* Align to page — submenu */}
      <div className="relative"
        onMouseEnter={() => setAlignSub(true)}
        onMouseLeave={() => setAlignSub(false)}>
        <button type="button" disabled={!asset}
          className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-popover-foreground transition hover:bg-accent disabled:pointer-events-none disabled:opacity-40">
          <span className="flex items-center gap-2.5"><AlignCenter className="size-3.5 text-muted-foreground" />Align to page</span>
          <ChevronRight className="size-3 text-muted-foreground" />
        </button>
        {alignSub && asset && (
          <div className="absolute left-full top-0 w-44 rounded-xl border border-border bg-popover py-1 shadow-2xl -mt-1 ml-0.5">
            {ALIGN_SUB.map((label) => (
              <button key={label} type="button" onClick={() => { onAlign(label); onClose() }}
                className="flex w-full items-center px-3 py-2 text-left text-xs text-popover-foreground transition hover:bg-accent">
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="my-1 border-t border-border" />

      {/* Comment */}
      <button type="button" disabled={!asset} onClick={() => { onComment(); onClose() }}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-popover-foreground transition hover:bg-accent disabled:pointer-events-none disabled:opacity-40">
        <span className="flex items-center gap-2.5"><MessageCircle className="size-3.5 text-muted-foreground" />Comment</span>
        <span className="text-[0.58rem] text-muted-foreground">Ctrl+Alt+N</span>
      </button>

      {/* Lock — submenu */}
      <div className="relative"
        onMouseEnter={() => setLockSub(true)}
        onMouseLeave={() => setLockSub(false)}>
        <button type="button" disabled={!asset} onClick={() => { onLock(); onClose() }}
          className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-popover-foreground transition hover:bg-accent disabled:pointer-events-none disabled:opacity-40">
          <span className="flex items-center gap-2.5"><Lock className="size-3.5 text-muted-foreground" />{asset?.locked ? 'Unlock' : 'Lock'}</span>
          <ChevronRight className="size-3 text-muted-foreground" />
        </button>
        {lockSub && asset && (
          <div className="absolute left-full top-0 w-48 rounded-xl border border-border bg-popover py-1 shadow-2xl -mt-1 ml-0.5">
            {LOCK_SUB.map(({ label, desc }) => (
              <button key={label} type="button" onClick={() => { onLock(); onClose() }}
                className="flex w-full flex-col gap-0.5 px-3 py-2 text-left transition hover:bg-accent">
                <span className="text-xs text-popover-foreground">{label}</span>
                <span className="text-[0.58rem] text-muted-foreground">{desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════��══════════════════════════════
   INFINITE ARTBOARD CANVAS
   ══════════════════════════════════════════ */
function InfiniteCanvas({
  assets, selectedId, zoom, showGrid, onSelect, onUpdate, onDeselect, onDuplicate, onDelete, onDropAsset,
}: {
  assets: CanvasAsset[]
  selectedId: string | null
  zoom: number
  showGrid: boolean
  onSelect: (id: string) => void
  onUpdate: (id: string, changes: Partial<CanvasAsset>) => void
  onDeselect: () => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onDropAsset: (dropped: DroppedAsset, canvasX: number, canvasY: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; assetId: string | null } | null>(null)
  const [dragging, setDragging] = useState<{ assetId: string; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const [floatingBar, setFloatingBar] = useState<{ x: number; y: number } | null>(null)

  const ARTBOARD_W = 700
  const ARTBOARD_H = 500
  const scale = zoom / 100

  const selectedAsset = assets.find((a) => a.id === selectedId) ?? null

  /* Update floating toolbar position when selection changes */
  useEffect(() => {
    if (!selectedAsset) { setFloatingBar(null); return }
    setFloatingBar({ x: selectedAsset.x + selectedAsset.w / 2, y: selectedAsset.y - 44 })
  }, [selectedId, selectedAsset])

  /* Drag logic */
  const handleAssetMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const asset = assets.find((a) => a.id === id)
    if (!asset || asset.locked) return
    onSelect(id)
    setDragging({ assetId: id, startX: e.clientX, startY: e.clientY, origX: asset.x, origY: asset.y })
  }, [assets, onSelect])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging) return
      const dx = (e.clientX - dragging.startX) / scale
      const dy = (e.clientY - dragging.startY) / scale
      onUpdate(dragging.assetId, { x: dragging.origX + dx, y: dragging.origY + dy })
    }
    function onMouseUp() { setDragging(null) }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp) }
  }, [dragging, scale, onUpdate])

  /* Right-click */
  function handleContextMenu(e: React.MouseEvent, assetId: string | null) {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, assetId })
  }

  const ctxAsset = ctxMenu?.assetId ? assets.find((a) => a.id === ctxMenu.assetId) ?? null : null

  return (
    <div
      ref={containerRef}
      className="relative flex flex-1 items-center justify-center overflow-auto bg-background"
      style={{ backgroundImage: showGrid ? 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)' : 'none', backgroundSize: '24px 24px' }}
      onClick={onDeselect}
      onContextMenu={(e) => handleContextMenu(e, null)}
    >
      {/* Artboard */}
      <div
        className="relative shrink-0 bg-white shadow-2xl"
        style={{
          width: ARTBOARD_W * scale,
          height: ARTBOARD_H * scale,
          outline: selectedId === null ? '2px solid hsl(var(--border))' : '2px solid hsl(var(--primary) / 0.5)',
          transform: 'translateZ(0)',
        }}
        onClick={(e) => { e.stopPropagation(); onDeselect() }}
        onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, null) }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const raw = e.dataTransfer.getData(DRAG_MIME)
          if (!raw) return
          const dropped: DroppedAsset = JSON.parse(raw)
          // Convert client coords → artboard-local coords
          const rect = e.currentTarget.getBoundingClientRect()
          const canvasX = Math.round((e.clientX - rect.left) / scale)
          const canvasY = Math.round((e.clientY - rect.top) / scale)
          onDropAsset(dropped, canvasX, canvasY)
        }}
      >
        {assets.filter((a) => !a.hidden).sort((a, b) => a.zIndex - b.zIndex).map((asset) => {
          const isSelected = asset.id === selectedId
          return (
            <div
              key={asset.id}
              style={{
                position: 'absolute',
                left: asset.x * scale,
                top: asset.y * scale,
                width: asset.w * scale,
                height: asset.h * scale,
                transform: `rotate(${asset.rotation}deg)`,
                opacity: asset.opacity / 100,
                zIndex: asset.zIndex,
                cursor: asset.locked ? 'not-allowed' : dragging?.assetId === asset.id ? 'grabbing' : 'grab',
              }}
              onMouseDown={(e) => handleAssetMouseDown(e, asset.id)}
              onClick={(e) => { e.stopPropagation(); onSelect(asset.id) }}
              onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, asset.id) }}
            >
              <img
                src={asset.src}
                alt={asset.label}
                className="size-full object-cover select-none pointer-events-none"
                draggable={false}
                crossOrigin="anonymous"
              />

              {/* Selection boundary + handles */}
              {isSelected && (
                <>
                  <div className="absolute inset-0 pointer-events-none" style={{ outline: '2px solid hsl(var(--primary))', outlineOffset: 1 }} />
                  {/* Corner + edge handles */}
                  {[
                    { top: -5, left: -5 }, { top: -5, left: '50%', transform: 'translateX(-50%)' }, { top: -5, right: -5 },
                    { top: '50%', left: -5, transform: 'translateY(-50%)' }, { top: '50%', right: -5, transform: 'translateY(-50%)' },
                    { bottom: -5, left: -5 }, { bottom: -5, left: '50%', transform: 'translateX(-50%)' }, { bottom: -5, right: -5 },
                  ].map((style, i) => (
                    <div key={i} className="absolute size-2 rounded-sm border-2 border-primary bg-white pointer-events-auto cursor-se-resize"
                      style={style as React.CSSProperties} onMouseDown={(e) => e.stopPropagation()} />
                  ))}
                  {/* Rotation handle */}
                  <div className="absolute pointer-events-auto cursor-grab" style={{ top: -28, left: '50%', transform: 'translateX(-50%)' }}
                    onMouseDown={(e) => e.stopPropagation()}>
                    <div className="size-3.5 rounded-full border-2 border-primary bg-white" />
                    <div className="w-px bg-primary mx-auto" style={{ height: 14 }} />
                  </div>
                </>
              )}
            </div>
          )
        })}

        {/* Floating action toolbar above selected asset */}
        {selectedAsset && floatingBar && (
          <div
            className="absolute z-50 pointer-events-auto"
            style={{
              left: floatingBar.x * scale,
              top: Math.max(4, floatingBar.y * scale),
              transform: 'translateX(-50%)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-0.5 rounded-xl border border-border bg-card px-2 py-1.5 shadow-xl">
              <button type="button" aria-label="Comment" className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground"><MessageCircle className="size-3.5" /></button>
              <button type="button" aria-label={selectedAsset.locked ? 'Unlock' : 'Lock'}
                onClick={() => onUpdate(selectedAsset.id, { locked: !selectedAsset.locked })}
                className={cn('flex size-7 items-center justify-center rounded-lg transition', selectedAsset.locked ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
                <Lock className="size-3.5" />
              </button>
              <button type="button" aria-label="Duplicate" onClick={() => onDuplicate(selectedAsset.id)} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground"><Copy className="size-3.5" /></button>
              <button type="button" aria-label="Delete" onClick={() => { onDelete(selectedAsset.id); onDeselect() }} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-3.5" /></button>
              <div className="mx-0.5 h-4 w-px bg-border" />
              <button type="button" aria-label="More options" className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground"><MoreHorizontal className="size-3.5" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x} y={ctxMenu.y} asset={ctxAsset}
          onClose={() => setCtxMenu(null)}
          onDuplicate={() => ctxMenu.assetId && onDuplicate(ctxMenu.assetId)}
          onDelete={() => ctxMenu.assetId && onDelete(ctxMenu.assetId)}
          onLock={() => ctxMenu.assetId && onUpdate(ctxMenu.assetId, { locked: !ctxAsset?.locked })}
          onCopy={() => {}}
          onPaste={() => {}}
          onAlign={() => {}}
          onComment={() => {}}
          canPaste={false}
        />
      )}
    </div>
  )
}

// Retained temporarily for backwards-compatible local references while KonvaInfiniteCanvas is the active renderer.
void InfiniteCanvas

/* ══════════════════════════════════════════
   RIGHT PANEL — LOGISTICS & ASSET ALLOCATION
   ══════════════════════════════════════════ */

function AllocationModal({
  asset, onClose, onSave, onStrategy,
}: {
  asset: AllocatedAsset; onClose: () => void; onSave: (id: string, qty: number, unit: string) => void
  onStrategy: (path: StrategyPath, id: string, qty: number, unit: string) => void
}) {
  const [qty, setQty] = useState<string>(asset.dragCount.toString())
  const [unit, setUnit] = useState(asset.unit)
  const [declareMax, setDeclareMax] = useState(false)
  const [deficitOpen, setDeficitOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, onClose)
  const requested = Math.max(0, Number(qty) || 0)
  const requestedBase = convertToBase(requested, unit)
  const availableBase = convertToBase(asset.availableStock, asset.unit)
  const deficit = Math.max(0, requestedBase - availableBase) / (UNIT_FACTORS[unit] ?? 1)

  function handleDeclareMax(checked: boolean) { setDeclareMax(checked); if (checked) setQty(asset.availableStock.toString()) }
  function handleSave() { if (deficit > 0) { setDeficitOpen(true); return }; onSave(asset.id, requested, unit); onClose() }
  function handleUnitChange(newUnit: string) {
    const currentQty = Math.max(0, Number(qty) || 0)
    const base = convertToBase(currentQty, unit)
    const converted = base / (UNIT_FACTORS[newUnit] ?? 1)
    setQty((Math.round(converted * 100) / 100).toString())
    setUnit(newUnit)
  }

  if (deficitOpen) return <DeficitModal asset={asset} requested={requested} unit={unit} deficit={deficit} onClose={onClose} onAccept={() => { onSave(asset.id, asset.availableStock, unit); onClose() }} onBack={() => setDeficitOpen(false)} onStrategy={onStrategy} />

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div ref={ref} className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <span className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-foreground">Allocate Asset</span>
          <button type="button" onClick={onClose} className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition"><X className="size-3.5" /></button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Boxes className="size-4 text-primary" /></div>
            <span className="text-[0.72rem] font-semibold text-foreground">{asset.name}</span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[0.58rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">Enter Quantity</label>
              <input type="number" min="1" value={qty} onChange={(e) => { setQty(e.target.value); setDeclareMax(false) }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-primary transition" />
            </div>
            <div className="w-24">
              <label className="mb-1 block text-[0.58rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">Unit</label>
              <select value={unit} onChange={(e) => handleUnitChange(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-2 py-2 text-xs text-foreground outline-none focus:border-primary transition">
                {UNIT_OPTIONS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <span className={cn('flex size-4 shrink-0 items-center justify-center rounded border transition', declareMax ? 'border-primary bg-primary' : 'border-border bg-background group-hover:border-primary/60')}>
              {declareMax && <Check className="size-2.5 text-primary-foreground" />}
            </span>
            <input type="checkbox" checked={declareMax} onChange={(e) => handleDeclareMax(e.target.checked)} className="sr-only" />
            <span className="text-[0.62rem] text-muted-foreground group-hover:text-foreground transition">Declare available stocks <span className="font-semibold text-foreground">(auto-fill max)</span></span>
          </label>
          {asset.existingAllocations.length > 0 && (
            <div className="rounded-xl border border-border bg-background p-3 flex flex-col gap-2">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">Existing Event Allocations</p>
              {asset.existingAllocations.map((a) => (
                <div key={a.event} className="flex items-center justify-between">
                  <span className="text-[0.62rem] text-foreground truncate max-w-[60%]">{a.event}</span>
                  <span className="text-[0.62rem] font-semibold text-primary">{a.allocated} / {a.total}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5">
            <span className="text-[0.62rem] text-muted-foreground">Available Stocks</span>
            <span className="text-[0.68rem] font-bold text-foreground">{formatStock(asset.availableStock)} default {asset.unit}(s)</span>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-muted-foreground hover:bg-accent hover:text-foreground transition">Cancel</button>
            <button type="button" onClick={handleSave} className="flex-1 rounded-xl bg-primary py-2 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground hover:opacity-90 transition">Allocate</button>
          </div>
        </div>
      </div>
    </div>
  )
}

type DeficitStep = 'main' | 'strategy'
type StrategyPath = 'crossdock' | 'replenish'

function DeficitModal({ asset, requested, unit, deficit, onClose, onAccept, onBack, onStrategy }: {
  asset: AllocatedAsset; requested: number; unit: string; deficit: number
  onClose: () => void; onAccept: () => void; onBack: () => void
  onStrategy: (path: StrategyPath, id: string, qty: number, unit: string) => void
}) {
  const [step, setStep] = useState<DeficitStep>('main')
  const [strategyPath, setStrategyPath] = useState<StrategyPath | null>(null)
  const [crossdockEvent, setCrossdockEvent] = useState(PRIOR_EVENTS[0].id)
  const [transferQty, setTransferQty] = useState('')
  const [replenishQty, setReplenishQty] = useState(deficit.toString())
  const [strategyDone, setStrategyDone] = useState<{ path: StrategyPath; gained: number } | null>(null)
  const [crossdockReview, setCrossdockReview] = useState(false)
  const [confirmReplenish, setConfirmReplenish] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, onClose)
  const selectedEvent = PRIOR_EVENTS.find((e) => e.id === crossdockEvent)!

  function handleCancelCrossdock() { setTransferQty(''); setStep('main') }
  function handleCancelReplenish() { setConfirmReplenish(false); setStep('main') }

  if (step === 'strategy') {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div ref={ref} className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <span className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-foreground">{strategyPath === 'crossdock' ? 'Cross-Docking Exception' : 'Add Replenishment'}</span>
            <button type="button" onClick={onClose} className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition"><X className="size-3.5" /></button>
          </div>
          <div className="px-5 py-4 flex flex-col gap-4">
            {!strategyDone ? (
              strategyPath === 'crossdock' ? (
                <>
                  <p className="text-[0.62rem] text-muted-foreground leading-relaxed">Transfer items from a prior event that has already reached full stop.</p>
                  <div>
                    <label className="mb-1 block text-[0.58rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">Prior Event</label>
                    <select value={crossdockEvent} onChange={(e) => setCrossdockEvent(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary transition">
                      {PRIOR_EVENTS.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                    </select>
                    <p className="mt-1 text-[0.58rem] text-muted-foreground">Full stop: <span className="font-semibold text-foreground">{selectedEvent.fullStop}</span></p>
                  </div>
                  <div>
                    <label className="mb-1 block text-[0.58rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">Transfer Quantity</label>
                    <input type="number" min="1" value={transferQty} onChange={(e) => setTransferQty(e.target.value)} placeholder={`e.g. ${deficit}`}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-primary transition" />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleCancelCrossdock}
                      className="flex-1 rounded-xl border border-border py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-muted-foreground hover:bg-accent hover:text-foreground transition">
                      Cancel
                    </button>
                    <button type="button" onClick={() => { const gained = parseInt(transferQty) || 0; onStrategy('crossdock', asset.id, gained, unit); setStrategyDone({ path: 'crossdock', gained }) }} disabled={!transferQty}
                      className="flex-1 rounded-xl bg-primary py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition">
                      Add to Stocks
                    </button>
                  </div>
                </>
              ) : !confirmReplenish ? (
                <>
                  <p className="text-[0.62rem] text-muted-foreground leading-relaxed">Request additional inventory from the warehouse. This will appear in the Pending Replenishment tab.</p>
                  <div>
                    <label className="mb-1 block text-[0.58rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">Request Quantity</label>
                    <input type="number" min="1" value={replenishQty} onChange={(e) => setReplenishQty(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-primary transition" />
                  </div>
                  <button type="button" onClick={() => setConfirmReplenish(true)} disabled={!replenishQty}
                    className="w-full rounded-xl bg-amber-600 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition">
                    Request Replenishment
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3">
                    <AlertTriangle className="size-4 shrink-0 text-amber-400 mt-0.5" />
                    <p className="text-[0.62rem] text-amber-200 leading-relaxed">Confirm this replenishment request for <span className="font-semibold">{replenishQty} {unit}</span> of {asset.name}. It will be sent to the Pending Replenishment tab for verification.</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleCancelReplenish}
                      className="flex-1 rounded-xl border border-border py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-muted-foreground hover:bg-accent hover:text-foreground transition">
                      Cancel
                    </button>
                    <button type="button" onClick={() => { const gained = parseInt(replenishQty) || 0; onStrategy('replenish', asset.id, gained, unit); setStrategyDone({ path: 'replenish', gained }) }}
                      className="flex-1 rounded-xl bg-amber-600 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-white hover:opacity-90 transition">
                      Request
                    </button>
                  </div>
                </>
              )
            ) : strategyDone.path === 'crossdock' && !crossdockReview ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15"><Check className="size-4 text-emerald-400" /></div>
                  <span className="text-[0.72rem] font-semibold text-foreground">Strategy Applied</span>
                </div>
                <div className="rounded-xl border border-border bg-background px-4 py-3 flex flex-col gap-2">
                  <div className="flex justify-between text-[0.62rem]"><span className="text-muted-foreground">Strategy</span><span className="font-semibold text-foreground">Cross-Docking</span></div>
                  <div className="flex justify-between text-[0.62rem]"><span className="text-muted-foreground">Quantity Gained</span><span className="font-semibold text-emerald-400">+{strategyDone.gained} {unit}</span></div>
                  <div className="flex justify-between text-[0.62rem]"><span className="text-muted-foreground">New Available</span><span className="font-semibold text-foreground">{asset.availableStock + strategyDone.gained} {unit}</span></div>
                </div>
                <button type="button" onClick={() => setCrossdockReview(true)} className="w-full rounded-xl bg-primary py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-primary-foreground hover:opacity-90 transition">Next</button>
              </div>
            ) : strategyDone.path === 'crossdock' && crossdockReview ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15"><Boxes className="size-4 text-primary" /></div>
                  <span className="text-[0.72rem] font-semibold text-foreground">Review Updated Allocation</span>
                </div>
                <div className="rounded-xl border border-border bg-background px-4 py-3 flex flex-col gap-2">
                  <div className="flex justify-between text-[0.62rem]"><span className="text-muted-foreground">Item</span><span className="font-semibold text-foreground">{asset.name}</span></div>
                  <div className="flex justify-between text-[0.62rem]"><span className="text-muted-foreground">Requested</span><span className="font-semibold text-foreground">{requested} {unit}</span></div>
                  <div className="flex justify-between text-[0.62rem]"><span className="text-muted-foreground">Updated Available Stock</span><span className="font-semibold text-emerald-400">{asset.availableStock + strategyDone.gained} {unit}</span></div>
                </div>
                <button type="button" onClick={onClose} className="w-full rounded-xl bg-primary py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-primary-foreground hover:opacity-90 transition">Confirm &amp; Close</button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15"><Check className="size-4 text-emerald-400" /></div>
                  <span className="text-[0.72rem] font-semibold text-foreground">Strategy Applied</span>
                </div>
                <div className="rounded-xl border border-border bg-background px-4 py-3 flex flex-col gap-2">
                  <div className="flex justify-between text-[0.62rem]"><span className="text-muted-foreground">Strategy</span><span className="font-semibold text-foreground">Replenishment Request</span></div>
                  <div className="flex justify-between text-[0.62rem]"><span className="text-muted-foreground">Quantity Gained</span><span className="font-semibold text-emerald-400">+{strategyDone.gained} {unit}</span></div>
                  <div className="flex justify-between text-[0.62rem]"><span className="text-muted-foreground">New Available</span><span className="font-semibold text-foreground">{asset.availableStock + strategyDone.gained} {unit}</span></div>
                </div>
                <button type="button" onClick={onClose} className="w-full rounded-xl bg-primary py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-primary-foreground hover:opacity-90 transition">Done</button>
              </div>
            )}
            {!strategyDone && (
              <button type="button" onClick={() => setStep('main')} className="text-center text-[0.6rem] text-muted-foreground hover:text-foreground transition underline">Back to deficit options</button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div ref={ref} className="w-full max-w-sm rounded-2xl border border-destructive/40 bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition"><X className="size-3.5" /></button>
            <span className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-destructive">Inventory Deficit Detected</span>
          </div>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-3">
            <AlertTriangle className="size-4 shrink-0 text-destructive mt-0.5" />
            <p className="text-[0.62rem] text-destructive leading-relaxed">The requested quantity exceeds available physical warehouse stock.</p>
          </div>
          <div className="rounded-xl border border-border bg-background px-4 py-3 flex flex-col gap-2">
            {[
              { label: 'Item Name',               value: asset.name },
              { label: 'Requested Capacity',       value: `${requested} ${unit}` },
              { label: 'Verified Physical Stock',  value: `${asset.availableStock} ${unit}` },
              { label: 'Net Allocation Deficit',   value: `−${deficit} ${unit}`, red: true },
            ].map(({ label, value, red }) => (
              <div key={label} className="flex justify-between items-start gap-2">
                <span className="text-[0.6rem] text-muted-foreground">{label}</span>
                <span className={cn('text-[0.65rem] font-semibold text-right', red ? 'text-destructive' : 'text-foreground')}>{value}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={onAccept} className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-emerald-400 hover:bg-emerald-500/20 transition">Accept — use lower available count ({asset.availableStock} {unit})</button>
            <button type="button" onClick={onBack} className="w-full rounded-xl border border-border py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-muted-foreground hover:bg-accent hover:text-foreground transition">Back — return to adjustments</button>
            {asset.existingAllocations.length > 0 && <button type="button" onClick={() => { setStrategyPath('crossdock'); setStep('strategy') }} className="w-full rounded-xl border border-border bg-background py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-foreground hover:border-primary/50 transition flex items-center justify-center gap-2"><RefreshCw className="size-3.5" />Cross-Docking Exception</button>}
            <button type="button" onClick={() => { setStrategyPath('replenish'); setStep('strategy') }} className="w-full rounded-xl bg-amber-600/90 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-white hover:opacity-90 transition flex items-center justify-center gap-2"><Plus className="size-3.5" />Add More / Request Replenishment</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function VerifyReplenishmentModal({ item, onClose, onVerify }: { item: PendingReplenishment; onClose: () => void; onVerify: (item: PendingReplenishment, adjustedQty: number) => void }) {
  const [adjustedQty, setAdjustedQty] = useState(item.requestedQty.toString())
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, onClose)
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div ref={ref} className="w-full max-w-xs rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <span className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-foreground">Verify Request</span>
          <button type="button" onClick={onClose} className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition"><X className="size-3.5" /></button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-background px-4 py-3 flex flex-col gap-2">
            <div className="flex justify-between text-[0.62rem]"><span className="text-muted-foreground">Item</span><span className="font-semibold text-foreground">{item.name}</span></div>
            <div className="flex justify-between text-[0.62rem]"><span className="text-muted-foreground">Event</span><span className="font-semibold text-foreground truncate max-w-[55%] text-right">{item.event}</span></div>
            <div className="flex justify-between text-[0.62rem]"><span className="text-muted-foreground">Requested</span><span className="font-semibold text-amber-400">{item.requestedQty} {item.unit}</span></div>
          </div>
          <div>
            <label className="mb-1 block text-[0.58rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">Adjust Quantity</label>
            <input type="number" min="1" value={adjustedQty} onChange={(e) => setAdjustedQty(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-primary transition" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground hover:bg-accent transition">Cancel</button>
            <button type="button" onClick={() => { const approved = Math.max(0, Number(adjustedQty) || 0); if (approved > 0) { onVerify(item, approved); onClose() } }} className="flex-1 rounded-xl bg-emerald-600 py-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-white hover:opacity-90 transition">Verify / Approve</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Fires automatically from on-canvas drag activity (see the dragCount-vs-availableStock
// effect in CanvasWorkspacePage) — separate from AllocationModal's deficit flow, which
// only runs when a user manually opens that modal.
function StockAvailabilityWarningModal({ asset, onClose }: { asset: AllocatedAsset; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, onClose)
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div ref={ref} className="w-72 rounded-2xl border border-amber-500/40 bg-card p-4 shadow-2xl">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15"><AlertTriangle className="size-4 text-amber-400" /></div>
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-foreground">Stock Availability Warning</span>
        </div>
        <p className="mb-3 text-[0.64rem] text-muted-foreground leading-relaxed">
          You&apos;ve placed <span className="font-semibold text-foreground">{asset.dragCount} {asset.unit}</span> of <span className="font-semibold text-foreground">{asset.name}</span> on the canvas, which reaches its available stock of <span className="font-semibold text-foreground">{asset.availableStock} {asset.unit}</span> for this event window.
        </p>
        <button type="button" onClick={onClose}
          className="w-full rounded-xl bg-primary py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground hover:opacity-90 transition">
          Got It
        </button>
      </div>
    </div>
  )
}

function RightPanel({ expanded, onToggleExpand, droppedAssets: _droppedAssets, onRemoveDropped, assets, setAssets, pending, setPending }: {
  expanded: boolean
  onToggleExpand: () => void
  droppedAssets: DroppedAsset[]
  onRemoveDropped: (id: string) => void
  assets: AllocatedAsset[]
  setAssets: React.Dispatch<React.SetStateAction<AllocatedAsset[]>>
  pending: PendingReplenishment[]
  setPending: React.Dispatch<React.SetStateAction<PendingReplenishment[]>>
}) {
  const [isOpen, setIsOpen] = useState(true)
  const [tab, setTab] = useState<RightPanelTab>('allocated')
  const [selectedAsset, setSelectedAsset] = useState<AllocatedAsset | null>(null)
  const [verifyItem, setVerifyItem] = useState<PendingReplenishment | null>(null)

  function handleDelete(id: string) {
    setAssets((a) => a.filter((x) => x.id !== id))
    onRemoveDropped(id)
  }
  function handleSaveAllocation(id: string, qty: number, unit: string) {
    setAssets((current) => current.map((x) => x.id === id ? { ...x, quantity: qty, unit, allocated: true, availableStock: Math.max(0, x.availableStock - qty) } : x))
  }
  function handleStrategy(path: StrategyPath, id: string, qty: number, unit: string) {
    if (qty <= 0) return
    if (path === 'replenish') {
      const source = assets.find((x) => x.id === id)
      setPending((current) => [...current, { id: `pr-${Date.now()}`, name: source?.name ?? id, requestedQty: qty, unit, event: 'Current canvas event' }])
    }
    setAssets((current) => current.map((x) => x.id === id ? { ...x, availableStock: x.availableStock + qty } : x))
  }
  function handleVerify(item: PendingReplenishment, adjustedQty: number) {
    setPending((p) => p.filter((x) => x.id !== item.id))
    setAssets((current) => current.map((x) => x.name === item.name ? { ...x, availableStock: x.availableStock + adjustedQty } : x))
  }

  return (
    <>
      {/* Collapsed icon rail — shown only when panel is closed */}
      {!isOpen && (
        <div className="flex shrink-0 flex-col items-center gap-2 border-l border-border bg-card py-3 w-10 transition-all duration-300 ease-in-out">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open logistics panel"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <PanelRightOpen className="size-3.5" />
          </button>
          <Package className="size-3.5 text-primary/50 mt-1" />
          {pending.length > 0 && (
            <span className="flex size-3.5 items-center justify-center rounded-full bg-amber-500 text-[0.45rem] font-bold text-white">
              {pending.length}
            </span>
          )}
        </div>
      )}

      <aside className={cn(
        'flex shrink-0 flex-col border-l border-border bg-card overflow-hidden transition-all duration-300 ease-in-out',
        isOpen ? (expanded ? 'w-96' : 'w-80') : 'w-0 border-l-0',
      )}>
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <Package className="size-3.5 text-primary" />
            <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-foreground whitespace-nowrap">Logistics</span>
          </div>
          <div className="flex items-center gap-0.5">
            <button type="button" onClick={onToggleExpand} aria-label={expanded ? 'Shrink panel' : 'Expand panel'}
              className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition">
              {expanded ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}
            </button>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Collapse logistics panel"
              className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition">
              <PanelRightClose className="size-3.5" />
            </button>
          </div>
        </div>
        <div className="flex shrink-0 border-b border-border">
          {(['allocated', 'pending'] as RightPanelTab[]).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={cn('flex-1 py-2 text-[0.58rem] font-bold uppercase tracking-[0.1em] transition border-b-2',
                tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              {t === 'allocated' ? 'Allocated Assets' : 'Pending Replenishment'}
              {t === 'pending' && pending.length > 0 && (
                <span className="ml-1.5 inline-flex size-3.5 items-center justify-center rounded-full bg-amber-500 text-[0.45rem] font-bold text-white">{pending.length}</span>
              )}
            </button>
          ))}
        </div>
        {tab === 'allocated' && (
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {assets.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center"><Boxes className="size-8 text-border" /><p className="text-[0.62rem] text-muted-foreground uppercase tracking-[0.1em]">No assets on canvas</p></div>
            )}
            {assets.map((asset) => (
              <div key={asset.id} role="button" tabIndex={0} aria-label={`Allocate ${asset.name}`}
                onClick={() => setSelectedAsset(asset)} onKeyDown={(e) => e.key === 'Enter' && setSelectedAsset(asset)}
                className={cn('group relative flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition',
                  asset.allocated ? 'border-amber-700/50 bg-amber-900/20 hover:border-amber-600/70' : 'border-border bg-background hover:border-primary/40')}>
                <div className={cn('size-2 shrink-0 rounded-full', asset.allocated ? 'bg-amber-400' : 'bg-muted-foreground/40')} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[0.65rem] font-semibold text-foreground">{asset.name}</span>
                  <span className="text-[0.56rem] text-muted-foreground">{asset.allocated ? `${asset.quantity} ${asset.unit} allocated` : `Suggested: ${asset.dragCount} ${asset.unit} — unallocated`}</span>
                </div>
                <button type="button" aria-label={`Remove ${asset.name}`} onClick={(e) => { e.stopPropagation(); handleDelete(asset.id) }}
                  className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition"><X className="size-3" /></button>
              </div>
            ))}
            <div className="mt-2 flex flex-col gap-1 border-t border-border pt-3">
              <p className="text-[0.55rem] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1">Legend</p>
              <div className="flex items-center gap-2"><div className="size-2 rounded-full bg-muted-foreground/40" /><span className="text-[0.58rem] text-muted-foreground">Gray — on canvas, unallocated</span></div>
              <div className="flex items-center gap-2"><div className="size-2 rounded-full bg-amber-400" /><span className="text-[0.58rem] text-muted-foreground">Amber — successfully allocated</span></div>
            </div>
          </div>
        )}
        {tab === 'pending' && (
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {pending.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center"><RefreshCw className="size-8 text-border" /><p className="text-[0.62rem] text-muted-foreground uppercase tracking-[0.1em]">No pending requests</p></div>
            )}
            {pending.map((item) => (
              <div key={item.id} role="button" tabIndex={0} aria-label={`Verify request for ${item.name}`}
                onClick={() => setVerifyItem(item)} onKeyDown={(e) => e.key === 'Enter' && setVerifyItem(item)}
                className="flex flex-col gap-1.5 rounded-xl border border-amber-700/40 bg-amber-900/15 px-3 py-2.5 cursor-pointer transition hover:border-amber-500/60">
                <div className="flex items-center justify-between">
                  <span className="text-[0.65rem] font-semibold text-foreground">{item.name}</span>
                  <span className="rounded-full border border-amber-600/40 bg-amber-600/10 px-2 py-0.5 text-[0.55rem] font-bold text-amber-400">{item.requestedQty} {item.unit}</span>
                </div>
                <span className="text-[0.58rem] text-muted-foreground truncate">{item.event}</span>
                <span className="text-[0.55rem] text-amber-400/70 uppercase tracking-[0.1em]">Click to verify</span>
              </div>
            ))}
          </div>
        )}
      </aside>
      {selectedAsset && <AllocationModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} onSave={handleSaveAllocation} onStrategy={handleStrategy} />}
      {verifyItem && <VerifyReplenishmentModal item={verifyItem} onClose={() => setVerifyItem(null)} onVerify={handleVerify} />}
    </>
  )
}

/* ═════════���══════════════════════════��═════
   TOP-NAV COMPONENTS
   ══════════════════════════════════════════ */
const SETTINGS_ITEMS = [
  { icon: Ruler,         label: 'Rulers' },
  { icon: Grid3x3,       label: 'Guides' },
  { icon: AlignJustify,  label: 'Margin' },
  { icon: MessageSquare, label: 'Comments' },
]

function SettingsDropdown() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<Record<string, boolean>>({})
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, () => setOpen(false))
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition hover:bg-accent hover:text-foreground">
        Settings <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-xl border border-border bg-popover py-1 shadow-2xl">
          {SETTINGS_ITEMS.map(({ icon: Icon, label }) => (
            <button key={label} type="button" onClick={() => setActive((a) => ({ ...a, [label]: !a[label] }))}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-popover-foreground transition hover:bg-accent">
              <span className="flex items-center gap-2"><Icon className="size-3.5 text-muted-foreground" />{label}</span>
              {active[label] && <Check className="size-3 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const MODES: WorkspaceMode[] = ['Viewing', 'Commenting', 'Planning', 'Designing', 'Asset Planning']

function ModeDropdown({ mode, onChange }: { mode: WorkspaceMode; onChange: (m: WorkspaceMode) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, () => setOpen(false))
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-foreground transition hover:border-primary/50">
        <Eye className="size-3 text-primary" />{mode}
        <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-border bg-popover py-1 shadow-2xl">
          {MODES.map((m) => (
            <button key={m} type="button" onClick={() => { onChange(m); setOpen(false) }}
              className={cn('flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition hover:bg-accent',
                m === mode ? 'text-primary font-semibold' : 'text-popover-foreground')}>
              {m}{LOCKED_MODES.includes(m) && <Lock className="size-3 text-muted-foreground" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PinModal({ targetMode, onSuccess, onCancel }: { targetMode: WorkspaceMode; onSuccess: () => void; onCancel: () => void }) {
  const [digits, setDigits] = useState<string[]>(['', '', '', ''])
  const [error, setError] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  useEffect(() => { inputRefs.current[0]?.focus() }, [])

  function handleDigit(index: number, val: string) {
    if (!/^\d?$/.test(val)) return
    const next = [...digits]; next[index] = val; setDigits(next); setError(false)
    if (val && index < 3) inputRefs.current[index + 1]?.focus()
  }
  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus()
  }
  function handleSubmit() {
    const pin = digits.join('')
    if (pin.length < 4 || pin === '0000') { setError(true); return }
    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-sm uppercase tracking-[0.2em] text-foreground">Unlock {targetMode}</h2>
          <button type="button" onClick={onCancel} aria-label="Cancel"
            className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"><X className="size-4" /></button>
        </div>
        <p className="mb-6 text-[0.68rem] text-muted-foreground tracking-wide">Enter your 4-digit PIN to switch to <span className="font-semibold text-primary">{targetMode}</span> mode.</p>
        <div className="mb-6 flex justify-center gap-3">
          {digits.map((d, i) => (
            <input key={i} ref={(el) => { inputRefs.current[i] = el }} type="password" inputMode="numeric"
              maxLength={1} value={d} onChange={(e) => handleDigit(i, e.target.value)} onKeyDown={(e) => handleKeyDown(i, e)}
              className={cn('size-12 rounded-xl border bg-background text-center text-xl font-bold tracking-widest outline-none transition focus:ring-2',
                error ? 'border-destructive text-destructive focus:ring-destructive/30' : 'border-border text-foreground focus:border-primary focus:ring-primary/30')} />
          ))}
        </div>
        {error && <p className="mb-4 text-center text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-destructive">Invalid PIN. Please try again.</p>}
        <button type="button" onClick={handleSubmit}
          className="w-full rounded-xl bg-primary py-2.5 text-[0.7rem] font-bold uppercase tracking-[0.15em] text-primary-foreground transition hover:opacity-90">Confirm</button>
        <p className="mt-4 text-center text-[0.6rem] text-muted-foreground">Use any 4-digit PIN (except 0000) to unlock for demo purposes.</p>
      </div>
    </div>
  )
}

function ShareModal({ title, onClose }: { title: string; onClose: () => void }) {
  const [collabs, setCollabs] = useState([{ id: 'owner', name: 'You', email: 'admin@lumiere.com', access: 'Owner' }, ...DEMO_COLLABORATORS])
  const [searchVal, setSearchVal] = useState('')
  const [notifyEnabled, setNotifyEnabled] = useState(true)
  const [generalAccess, setGeneralAccess] = useState('Restricted')
  const [showRoles, setShowRoles] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, onClose)

  const filteredCollabs = collabs.filter((c) => `${c.name} ${c.email}`.toLowerCase().includes(searchVal.toLowerCase()))
  function changeAccess(id: string, access: string) { if (id !== 'owner') setCollabs((cs) => cs.map((c) => (c.id === id ? { ...c, access } : c))) }
  function copyEmails() { navigator.clipboard.writeText(collabs.map((c) => c.email).join(', ')).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  function copyLink() { navigator.clipboard.writeText(window.location.href).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div ref={ref} className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-sm uppercase tracking-[0.2em] text-foreground">Share &ldquo;{title}&rdquo;</h2>
          <button type="button" onClick={onClose} aria-label="Close"
            className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"><X className="size-4" /></button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Add people" value={searchVal} onChange={(e) => setSearchVal(e.target.value)}
                className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none" />
            </div>
            <button type="button" onClick={() => setShowRoles((v) => !v)} aria-label="Role descriptions"
              className={cn('flex size-8 items-center justify-center rounded-full border transition',
                showRoles ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground')}>
              <Info className="size-3.5" />
            </button>
          </div>
          {showRoles && (
            <div className="rounded-xl border border-border bg-background p-3 flex flex-col gap-1.5">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1">Role Permissions</p>
              {ROLE_DESCRIPTIONS.map(({ role, desc }) => (
                <div key={role} className="flex gap-2">
                  <span className="shrink-0 w-24 text-[0.62rem] font-semibold text-primary">{role}</span>
                  <span className="text-[0.62rem] text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
            {filteredCollabs.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-accent/30">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><User className="size-3.5" /></div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[0.68rem] font-semibold text-foreground">{c.name}</span>
                  <span className="truncate text-[0.58rem] text-muted-foreground">{c.email}</span>
                </div>
                {c.id === 'owner' ? <span className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-primary">Owner</span> : <AccessSelect value={c.access} onChange={(v) => changeAccess(c.id, v)} />}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 border-t border-border pt-3">
            <button type="button" onClick={copyEmails}
              className="flex items-center gap-2 self-start rounded-lg border border-border bg-background px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-foreground transition hover:border-primary/50">
              {copied ? <Check className="size-3 text-primary" /> : <Copy className="size-3" />}
              {copied ? 'Copied!' : 'Copy collaborator emails'}
            </button>
            <button type="button" onClick={copyLink}
              className="flex items-center gap-2 self-start rounded-lg border border-border bg-background px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-foreground transition hover:border-primary/50">
              <Share2 className="size-3" />Copy share link
            </button>
            <div className="flex items-center justify-between">
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-foreground">Notify people</span>
              <button type="button" role="switch" aria-checked={notifyEnabled} onClick={() => setNotifyEnabled((v) => !v)}
                className={cn('relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors', notifyEnabled ? 'bg-primary' : 'bg-muted')}>
                <span className={cn('pointer-events-none inline-block size-4 rounded-full bg-white shadow transition-transform', notifyEnabled ? 'translate-x-4' : 'translate-x-0')} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-foreground">General access</span>
              <AccessSelect value={generalAccess} onChange={setGeneralAccess} options={['Restricted', 'Anyone can view', 'Anyone can comment', 'Anyone can edit']} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AccessSelect({ value, onChange, options = ACCESS_OPTIONS }: { value: string; onChange: (v: string) => void; options?: string[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, () => setOpen(false))
  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-foreground transition hover:border-primary/50">
        {value}<ChevronDown className={cn('size-2.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-xl border border-border bg-popover py-1 shadow-2xl">
          {options.map((opt) => (
            <button key={opt} type="button" onClick={(e) => { e.stopPropagation(); onChange(opt); setOpen(false) }}
              className={cn('flex w-full items-center justify-between px-3 py-2 text-left text-xs transition hover:bg-accent',
                value === opt ? 'text-primary font-semibold' : 'text-popover-foreground')}>
              {opt}{value === opt && <Check className="size-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PresentDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, () => setOpen(false))
  const options = [{ icon: Monitor, label: 'Present' }, { icon: Maximize2, label: 'Full Screen' }, { icon: Eye, label: 'Presenter View' }]
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-foreground transition hover:border-primary/50">
        Present<ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-border bg-popover py-1 shadow-2xl">
          {options.map(({ icon: Icon, label }) => (
            <button key={label} type="button" onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-popover-foreground transition hover:bg-accent">
              <Icon className="size-3.5 text-muted-foreground" />{label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ════════════════��═════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════ */
interface CanvasComment { id: string; pageId: string; assetId?: string; author: string; text: string; createdAt: string }

function CommentsPanel({ pageId, selectedAsset, comments, onAdd, onClose }: { pageId: string; selectedAsset: CanvasAsset | null; comments: CanvasComment[]; onAdd: (text: string, assetId?: string) => void; onClose: () => void }) {
  const [scope, setScope] = useState<'current' | 'all'>('current')
  const [draft, setDraft] = useState('')
  const visible = scope === 'current' ? comments.filter((c) => c.pageId === pageId) : comments
  function submit() { const text = draft.trim(); if (!text) return; onAdd(text, selectedAsset?.id); setDraft('') }
  return <aside className="flex w-64 shrink-0 flex-col border-l border-border bg-card">
    <div className="flex items-center justify-between border-b border-border px-4 py-3"><span className="font-display text-[0.65rem] uppercase tracking-[0.15em] text-foreground">Comments</span><button type="button" onClick={onClose} aria-label="Close comments" className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-accent"><X className="size-3.5" /></button></div>
    <div className="flex shrink-0 border-b border-border"><button type="button" onClick={() => setScope('current')} className={cn('flex-1 border-b-2 py-2 text-[0.58rem] font-bold uppercase tracking-[0.1em]', scope === 'current' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}>Current Page</button><button type="button" onClick={() => setScope('all')} className={cn('flex-1 border-b-2 py-2 text-[0.58rem] font-bold uppercase tracking-[0.1em]', scope === 'all' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}>All Pages</button></div>
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">{visible.length === 0 ? <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center"><MessageSquare className="size-8 text-border" /><p className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">There is no comment on this page</p></div> : visible.map((comment) => <div key={comment.id} className="rounded-xl border border-border bg-background p-3"><div className="flex items-center justify-between gap-2"><span className="text-[0.62rem] font-semibold text-foreground">{comment.author}</span><span className="text-[0.52rem] text-muted-foreground">{comment.createdAt}</span></div>{comment.assetId && <span className="mt-1 block text-[0.52rem] uppercase tracking-[0.08em] text-primary">Selected asset</span>}<p className="mt-1.5 text-[0.66rem] leading-relaxed text-foreground/80">{comment.text}</p></div>)}</div>
    <div className="shrink-0 border-t border-border p-3"><div className="flex flex-col gap-2 rounded-xl border border-border bg-background p-2"><textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={selectedAsset ? `Comment on ${selectedAsset.label}` : 'Add a comment'} rows={3} className="resize-none bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground" /><button type="button" disabled={!draft.trim()} onClick={submit} className="flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary-foreground disabled:opacity-40"><Plus className="size-3" />Add Comment</button></div></div>
  </aside>
}

export function CanvasWorkspacePage() {
  const { navigate } = useNav()
  const { adminName } = useAuth()
  const { events, selectedEventId } = usePlanner()
  // In-workspace Event Pipeline drawer (Logistical Overview / Material Requirement / Design
  // Documents / Team Assignments) — reuses the exact same panel + data source as the
  // pipeline route, just rendered as a slide-out instead of a full-page navigation. Falls
  // back to the first pipeline event so the drawer always has real data to show, even when
  // this design wasn't opened directly from a specific pipeline record.
  const pipelineEvent = events.find((e) => e.id === selectedEventId) ?? events[0]
  const [pipelineDrawerOpen, setPipelineDrawerOpen] = useState(false)

  const [card] = useState<WorkspaceCard | null>(() => {
    try { const raw = sessionStorage.getItem('lumiere-workspace-card'); return raw ? JSON.parse(raw) : null }
    catch { return null }
  })

  const isMoodBoard = card?.type === 'Mood Board'
  const [boardName, setBoardName] = useState(card?.title ?? (isMoodBoard ? 'Untitled Mood Board' : 'Untitled Design'))
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(boardName)
  const [starred, setStarred] = useState(card?.starred ?? false)
  // Per the spec: ALL projects (event-based Designs and Mood Boards alike)
  // open in Viewing mode by default. Switching to any edit mode requires PIN verification.
  const [mode, setMode] = useState<WorkspaceMode>('Viewing')
  const [pendingMode, setPendingMode] = useState<WorkspaceMode | null>(null)
  const [showShare, setShowShare] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [rightExpanded, setRightExpanded] = useState(false)
  const [currentPage, setCurrentPage] = useState('pg1')
  const [comments, setComments] = useState<CanvasComment[]>([])

  /* Page navigation mode state scoped per project with generic 'flow' fallback */
  const [pageNavMode, setPageNavMode] = useState<'flow' | 'thumbnail'>(() => {
    if (card?.id) {
      const saved = localStorage.getItem(`lumiere-page-nav-mode-${card.id}`)
      if (saved === 'flow' || saved === 'thumbnail') return saved
    }
    return 'flow'
  })

  useEffect(() => {
    if (card?.id) {
      localStorage.setItem(`lumiere-page-nav-mode-${card.id}`, pageNavMode)
    }
  }, [pageNavMode, card?.id])

  /* Pages state scoped per project with generic 2-page fallback */
  const [pages, setPages] = useState<CanvasPage[]>(() => {
    if (card?.id) {
      const saved = localStorage.getItem(`lumiere-pages-${card.id}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed
          }
        } catch (e) {
          console.error('[CanvasWorkspace] Failed to parse saved pages:', e)
        }
      }
    }
    return [
      { id: 'pg1', title: 'Page 1', hidden: false },
      { id: 'pg2', title: 'Page 2', hidden: false },
    ]
  })

  useEffect(() => {
    if (card?.id) {
      localStorage.setItem(`lumiere-pages-${card.id}`, JSON.stringify(pages))
    }
  }, [pages, card?.id])

  function handleSelectPage(pageId: string) {
    setCurrentPage(pageId)
    if (selectedAssetId) {
      const asset = canvasAssets.find((a) => a.id === selectedAssetId)
      if (asset && (asset.pageId || pages[0]?.id) !== pageId) {
        setSelectedAssetId(null)
      }
    }
    canvasHandleRef.current?.scrollToPage(pageId)
  }

  function handleAddPage() {
    const newId = `pg${Date.now()}`
    setPages((prev) => [...prev, { id: newId, title: `Page ${prev.length + 1}`, hidden: false }])
    setCurrentPage(newId)
    setTimeout(() => {
      canvasHandleRef.current?.scrollToPage(newId)
    }, 50)
  }

  function handleRenamePage(id: string, title: string) {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, title } : p)))
  }

  function handleMovePage(id: string, dir: -1 | 1) {
    setPages((prev) => {
      const idx = prev.findIndex((p) => p.id === id)
      if (idx < 0) return prev
      const next = [...prev]
      const to = idx + dir
      if (to < 0 || to >= next.length) return prev
      ;[next[idx], next[to]] = [next[to], next[idx]]
      return next
    })
  }

  function handleDuplicatePage(id: string) {
    const newId = `pg${Date.now()}`
    setPages((prev) => {
      const idx = prev.findIndex((p) => p.id === id)
      if (idx < 0) return prev
      const src = prev[idx]
      const copy = { ...src, id: newId, title: `${src.title} (copy)` }
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)]
    })
    setCanvasAssets((prev) => {
      const srcAssets = prev.filter((a) => (a.pageId || pages[0]?.id) === id)
      const cloned = srcAssets.map((a) => ({
        ...a,
        id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        pageId: newId,
      }))
      return [...prev, ...cloned]
    })
    setCurrentPage(newId)
    setTimeout(() => {
      canvasHandleRef.current?.scrollToPage(newId)
    }, 50)
  }

  function handleToggleHidden(id: string) {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, hidden: !p.hidden } : p)))
  }

  function handleDeletePage(id: string) {
    if (pages.length <= 1) return
    setPages((prev) => prev.filter((p) => p.id !== id))
    setCanvasAssets((prev) => prev.filter((a) => (a.pageId || pages[0]?.id) !== id))
    if (currentPage === id) {
      const remaining = pages.filter((p) => p.id !== id)
      const nextId = remaining[0]?.id ?? 'pg1'
      setCurrentPage(nextId)
      canvasHandleRef.current?.scrollToPage(nextId)
    }
  }

  function addComment(text: string, assetId?: string) {
    setComments((prev) => [...prev, { id: `comment-${Date.now()}`, pageId: currentPage, assetId, author: 'You', text, createdAt: 'Just now' }])
  }

  /* Helpers to detect and purge stale mock data baked in prior versions */
  const isLeakedInitialAssets = (items: unknown): boolean =>
    Array.isArray(items) &&
    items.length === 3 &&
    items.some((i) => i?.id === 'asset-vase') &&
    items.some((i) => i?.id === 'asset-floral') &&
    items.some((i) => i?.id === 'asset-lights')

  const isLeakedDroppedAssets = (items: unknown): boolean =>
    Array.isArray(items) &&
    items.length === 3 &&
    items.some((i) => i?.id === 'cp4') &&
    items.some((i) => i?.id === 'cp1') &&
    items.some((i) => i?.id === 'cl3')

  const isLeakedAllocatedAssets = (items: unknown): boolean =>
    Array.isArray(items) &&
    items.some((i) => i?.id === 'a1' && i?.dragCount === 12 && i?.allocated === true)

  const isLeakedPending = (items: unknown): boolean =>
    Array.isArray(items) &&
    items.length === 3 &&
    items.some((i) => i?.id === 'pr1') &&
    items.some((i) => i?.id === 'pr2') &&
    items.some((i) => i?.id === 'pr3')

  /* Canvas state */
  const [canvasAssets, setCanvasAssets] = useState<CanvasAsset[]>(() => {
    // Purge legacy unnamespaced keys if present
    try {
      localStorage.removeItem('lumiere-canvas-assets')
      localStorage.removeItem('lumiere-dropped-assets')
      localStorage.removeItem('lumiere-allocated-assets')
      localStorage.removeItem('lumiere-pending-replenishment')
    } catch {}

    if (card?.id) {
      const saved = localStorage.getItem(`lumiere-canvas-assets-${card.id}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (!isLeakedInitialAssets(parsed)) {
            return parsed
          }
          localStorage.removeItem(`lumiere-canvas-assets-${card.id}`)
        } catch (e) {
          console.error('[CanvasWorkspace] Failed to parse saved canvas assets:', e)
        }
      }
      return []
    }
    return []
  })
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(77)
  const [showGrid, setShowGrid] = useState(false)
  // Right-click context menu (Copy/Paste/Duplicate/Delete/Align/Comment/Lock) — shared with the keyboard shortcuts below.
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; assetId: string | null } | null>(null)
  const [clipboardAsset, setClipboardAsset] = useState<CanvasAsset | null>(null)
  // Tracks every library/element asset that's been dragged onto the canvas or panel,
  // so the Logistics right panel can reflect what's actually been allocated.
  const [droppedAssets, setDroppedAssets] = useState<DroppedAsset[]>(() => {
    if (card?.id) {
      const saved = localStorage.getItem(`lumiere-dropped-assets-${card.id}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (!isLeakedDroppedAssets(parsed)) {
            return parsed
          }
          localStorage.removeItem(`lumiere-dropped-assets-${card.id}`)
        } catch (e) {
          console.error('[CanvasWorkspace] Failed to parse saved dropped assets:', e)
        }
      }
      return []
    }
    return []
  })

  // Single shared source of truth for stock: powers asset.availableStock in the
  // Logistics panel's AllocationModal AND the Elements panel's Zero-Stock badges.
  const [assets, setAssets] = useState<AllocatedAsset[]>(() => {
    const cleanDefault = [...DEMO_ALLOCATED.map(a => ({ ...a, dragCount: 0, quantity: null, allocated: false })), ...CATALOG_STOCK_SEED]
    if (card?.id) {
      const saved = localStorage.getItem(`lumiere-allocated-assets-${card.id}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (!isLeakedAllocatedAssets(parsed)) {
            return parsed
          }
          localStorage.removeItem(`lumiere-allocated-assets-${card.id}`)
        } catch (e) {
          console.error('[CanvasWorkspace] Failed to parse saved allocated assets:', e)
        }
      }
      return cleanDefault
    }
    return cleanDefault
  })
  const [pending, setPending] = useState<PendingReplenishment[]>(() => {
    if (card?.id) {
      const saved = localStorage.getItem(`lumiere-pending-replenishment-${card.id}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (!isLeakedPending(parsed)) {
            return parsed
          }
          localStorage.removeItem(`lumiere-pending-replenishment-${card.id}`)
        } catch (e) {
          console.error('[CanvasWorkspace] Failed to parse saved pending replenishment:', e)
        }
      }
      return []
    }
    return []
  })

  useEffect(() => {
    if (card?.id) {
      localStorage.setItem(`lumiere-canvas-assets-${card.id}`, JSON.stringify(canvasAssets))
    }
  }, [canvasAssets, card?.id])

  useEffect(() => {
    if (card?.id) {
      localStorage.setItem(`lumiere-dropped-assets-${card.id}`, JSON.stringify(droppedAssets))
    }
  }, [droppedAssets, card?.id])

  useEffect(() => {
    if (card?.id) {
      localStorage.setItem(`lumiere-allocated-assets-${card.id}`, JSON.stringify(assets))
    }
  }, [assets, card?.id])

  useEffect(() => {
    if (card?.id) {
      localStorage.setItem(`lumiere-pending-replenishment-${card.id}`, JSON.stringify(pending))
    }
  }, [pending, card?.id])
  const [stockWarning, setStockWarning] = useState<AllocatedAsset | null>(null)
  const warnedDragCounts = useRef<Record<string, number>>({})

  /* Canvas fit-to-screen + full-screen controls */
  const canvasHandleRef = useRef<KonvaInfiniteCanvasHandle>(null)
  const canvasColumnRef = useRef<HTMLDivElement>(null)
  const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false)

  /* ── Canvas active tool state ── */
  const [activeTool, setActiveTool] = useState<CanvasTool>('select')
  useEffect(() => {
    if (activeTool !== 'select') {
      setSelectedAssetId(null)
    }
  }, [activeTool])

  function handlePlaceElement(element: Partial<KonvaCanvasAsset>) {
    const newAsset: KonvaCanvasAsset = {
      id: element.id || `el-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      label: element.label || 'Canvas Element',
      src: element.src || '',
      x: element.x ?? 100,
      y: element.y ?? 100,
      w: element.w ?? 150,
      h: element.h ?? 150,
      rotation: element.rotation ?? 0,
      opacity: element.opacity ?? 100,
      locked: element.locked ?? false,
      hidden: element.hidden ?? false,
      zIndex: Date.now(),
      pageId: element.pageId || currentPage,
      kind: element.kind || 'rect',
      points: element.points,
      text: element.text,
      fill: element.fill,
      strokeColor: element.strokeColor,
      strokeWidth: element.strokeWidth,
      fontSize: element.fontSize,
    }
    setCanvasAssets((prev) => [...prev, newAsset])
    setSelectedAssetId(newAsset.id)
  }

  /* ── Artboard Background (color or photo) — persisted per project ── */
  const [artboardBgColor, setArtboardBgColor] = useState<string>(() => {
    if (card?.id) {
      try {
        const saved = localStorage.getItem(`lumiere-bg-color-${card.id}`)
        if (saved) return saved
      } catch { /* ignore */ }
    }
    return '#fbf8f1'
  })
  const [artboardBgPhotoDataUrl, setArtboardBgPhotoDataUrl] = useState<string | null>(() => {
    if (card?.id) {
      try {
        return localStorage.getItem(`lumiere-bg-photo-${card.id}`) ?? null
      } catch { /* ignore */ }
    }
    return null
  })

  // Load the photo bg as an HTMLImageElement for Konva consumption
  const [artboardBgImageEl, setArtboardBgImageEl] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!artboardBgPhotoDataUrl) { setArtboardBgImageEl(null); return }
    const img = new window.Image()
    img.onload = () => setArtboardBgImageEl(img)
    img.onerror = () => setArtboardBgImageEl(null)
    img.src = artboardBgPhotoDataUrl
  }, [artboardBgPhotoDataUrl])

  function handleApplyBackground(color: string | null, photoDataUrl: string | null) {
    if (color) {
      setArtboardBgColor(color)
      setArtboardBgPhotoDataUrl(null)
      if (card?.id) {
        localStorage.setItem(`lumiere-bg-color-${card.id}`, color)
        localStorage.removeItem(`lumiere-bg-photo-${card.id}`)
      }
    } else if (photoDataUrl) {
      setArtboardBgPhotoDataUrl(photoDataUrl)
      if (card?.id) {
        try {
          localStorage.setItem(`lumiere-bg-photo-${card.id}`, photoDataUrl)
        } catch { /* quota — silently skip photo persistence */ }
      }
    }
  }

  useEffect(() => {
    function onFullscreenChange() {
      setIsCanvasFullscreen(document.fullscreenElement === canvasColumnRef.current)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  function toggleCanvasFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      canvasColumnRef.current?.requestFullscreen()
    }
  }

  // Keep the allocated list in sync with what's actually been dragged onto the
  // canvas/panel: new asset types show up unallocated with a live suggested count.
  useEffect(() => {
    setAssets((prev) => {
      const counts = new Map<string, number>()
      droppedAssets.forEach((d) => counts.set(d.id, (counts.get(d.id) ?? 0) + 1))
      const next = [...prev]
      counts.forEach((count, id) => {
        const idx = next.findIndex((a) => a.id === id)
        if (idx >= 0) {
          next[idx] = { ...next[idx], dragCount: count }
        } else {
          const dropped = droppedAssets.find((d) => d.id === id)
          next.push({
            id, name: dropped?.name ?? id, dragCount: count, quantity: null,
            unit: dropped?.defaultUnit ?? 'pcs', allocated: false, availableStock: DEFAULT_ELEMENT_STOCK, existingAllocations: [],
          })
        }
      })
      return next
    })
  }, [droppedAssets])

  // Proactive Stock Availability Warning: fires purely from on-canvas drag activity
  // this session — not from manually opening AllocationModal, and not from any
  // preset/demo dragCount that was never actually dropped. Recompute live counts
  // straight from droppedAssets (rather than trusting assets[].dragCount, which
  // can include stale seed values) and trigger the moment an unallocated asset's
  // live canvas usage reaches or exceeds its real-time availableStock.
  useEffect(() => {
    const liveCounts = new Map<string, number>()
    droppedAssets.forEach((d) => liveCounts.set(d.id, (liveCounts.get(d.id) ?? 0) + 1))
    for (const [id, count] of liveCounts) {
      const a = assets.find((x) => x.id === id)
      if (!a || a.allocated) continue
      if (count >= a.availableStock) {
        const lastWarned = warnedDragCounts.current[id] ?? 0
        if (count > lastWarned) {
          warnedDragCounts.current[id] = count
          setStockWarning(a)
          break
        }
      }
    }
  }, [droppedAssets, assets])

  function handleRouteToDeficit(item: { id: string; name: string; unit: string }) {
    setPending((current) => [...current, { id: `pr-${Date.now()}`, name: item.name, requestedQty: 1, unit: item.unit || 'pcs', event: 'Current canvas event' }])
  }

  function updateAsset(id: string, changes: Partial<CanvasAsset>) {
    setCanvasAssets((prev) => prev.map((a) => a.id === id ? { ...a, ...changes } : a))
  }
  function duplicateAsset(id: string) {
    const src = canvasAssets.find((a) => a.id === id)
    if (!src) return
    const copy: CanvasAsset = {
      ...src,
      id: `asset-${Date.now()}`,
      x: src.x + 20,
      y: src.y + 20,
      zIndex: src.zIndex + 1,
      pageId: src.pageId || currentPage,
    }
    setCanvasAssets((prev) => [...prev, copy])
    setSelectedAssetId(copy.id)
  }
  function deleteAsset(id: string) {
    setCanvasAssets((prev) => prev.filter((a) => a.id !== id))
    if (selectedAssetId === id) setSelectedAssetId(null)
  }
  function copyAsset(id: string) {
    const src = canvasAssets.find((a) => a.id === id)
    if (src) setClipboardAsset(src)
  }
  function pasteAsset() {
    if (!clipboardAsset) return
    const copy: CanvasAsset = {
      ...clipboardAsset,
      id: `asset-${Date.now()}`,
      x: clipboardAsset.x + 24,
      y: clipboardAsset.y + 24,
      zIndex: canvasAssets.length + 1,
      pageId: clipboardAsset.pageId || currentPage,
    }
    setCanvasAssets((prev) => [...prev, copy])
    setSelectedAssetId(copy.id)
  }
  function alignAssetToPage(id: string, alignment: string) {
    const asset = canvasAssets.find((a) => a.id === id)
    if (!asset) return
    const changes: Partial<CanvasAsset> = {}
    switch (alignment) {
      case 'Align left':             changes.x = 0; break
      case 'Center horizontally':    changes.x = (ARTBOARD_W - asset.w) / 2; break
      case 'Align right':            changes.x = ARTBOARD_W - asset.w; break
      case 'Align top':              changes.y = 0; break
      case 'Center vertically':      changes.y = (ARTBOARD_H - asset.h) / 2; break
      case 'Align bottom':           changes.y = ARTBOARD_H - asset.h; break
    }
    updateAsset(id, changes)
  }
  function commentOnAsset(id: string) {
    setSelectedAssetId(id)
    setCommentsOpen(true)
  }

  function placeAssetOnCanvas(dropped: DroppedAsset, x?: number, y?: number, targetPageId?: string) {
    const pageId = targetPageId || currentPage || pages[0]?.id || 'pg1'
    const newAsset: CanvasAsset = {
      id: `asset-${Date.now()}`,
      label: dropped.name,
      src: dropped.src,
      x: x ?? 260,
      y: y ?? 200,
      w: 160,
      h: 160,
      rotation: 0,
      opacity: 100,
      locked: false,
      hidden: false,
      zIndex: canvasAssets.length + 1,
      pageId,
    }
    setCanvasAssets((prev) => [...prev, newAsset])
    setSelectedAssetId(newAsset.id)
    setDroppedAssets((prev) => [...prev, dropped])
  }
  // Dragging (or "Add to Canvas") from the Elements panel places the asset in a default spot
  function handleDropFromPanel(dropped: DroppedAsset) { placeAssetOnCanvas(dropped) }
  // Dragging directly onto the artboard places it at the exact drop coordinates on the target page
  function handleDropOnCanvas(dropped: DroppedAsset, x: number, y: number, pageId?: string) {
    placeAssetOnCanvas(dropped, x, y, pageId)
  }
  function handleRemoveDropped(id: string) {
    setDroppedAssets((prev) => prev.filter((d) => d.id !== id))
  }

  function requestModeChange(m: WorkspaceMode) {
    if (m === 'Viewing') { setMode('Viewing'); return }
    if (LOCKED_MODES.includes(m)) { setPendingMode(m); return }
    setMode(m)
  }
  function onPinSuccess() { if (pendingMode) setMode(pendingMode); setPendingMode(null) }
  function commitName() {
    const nextName = nameDraft.trim() || boardName
    setBoardName(nextName)
    setEditingName(false)
    if (card?.id) {
      try {
        const saved = localStorage.getItem('lumiere-recents-cards')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed)) {
            const updated = parsed.map((c: WorkspaceCard) => c.id === card.id ? { ...c, title: nextName, lastEdited: 'Just now' } : c)
            localStorage.setItem('lumiere-recents-cards', JSON.stringify(updated))
          }
        }
      } catch { /* ignore */ }
    }
  }

  const selectedAsset =
    canvasAssets.find((a) => a.id === selectedAssetId && (a.pageId || pages[0]?.id) === currentPage) ?? null
  const displayTitle = boardName

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground font-sans">

      {/* ══════════ TOP NAV ══════════ */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button type="button" onClick={() => navigate('canvas')} aria-label="Back to Creatives Dashboard"
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition hover:bg-accent hover:text-foreground shrink-0">
            <Home className="size-3.5" /><span className="hidden sm:inline">Home</span>
          </button>
          <span className="text-border shrink-0">/</span>
          {editingName ? (
            <span className="flex items-center gap-1 min-w-0">
              <input autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}
                onBlur={commitName} onKeyDown={(e) => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditingName(false) }}
                className="w-36 rounded border border-input bg-background px-2 py-0.5 text-[0.7rem] font-semibold text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring/30" />
              <button type="button" onClick={commitName} aria-label="Save name"
                className="flex size-6 items-center justify-center rounded text-primary transition hover:bg-primary/10"><Check className="size-3" /></button>
            </span>
          ) : (
            <button type="button" onClick={() => { setNameDraft(boardName); setEditingName(true) }}
              className="group flex min-w-0 items-center gap-1 rounded px-1.5 py-1 transition hover:bg-accent" title={isMoodBoard ? 'Rename mood board' : 'Rename design'}>
              <span className="truncate text-[0.7rem] font-semibold text-foreground">{boardName}</span>
              <Pencil className="size-2.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
            </button>
          )}
          {/* Alias/date/last-edited meta only applies to a linked/existing project */}
          {card && (
            <div className="hidden items-center gap-2 lg:flex shrink-0">
              {card.eventAlias ? (
                <>
                  <span className="text-border">·</span>
                  <span className="text-[0.58rem] font-medium uppercase tracking-[0.1em] text-muted-foreground">{card.eventAlias}</span>
                </>
              ) : null}
              {card.eventDate ? (
                <>
                  <span className="text-border">·</span>
                  <span className="text-[0.58rem] text-muted-foreground">{card.eventDate}</span>
                </>
              ) : null}
              <span className="text-border">·</span>
              <span className="text-[0.58rem] text-muted-foreground italic">{card.lastEdited}</span>
            </div>
          )}
          <SettingsDropdown />
          <div className="hidden items-center gap-0.5 xl:flex shrink-0">
            <button type="button" aria-label="Cloud saved" className="flex size-7 items-center justify-center rounded-md text-emerald-400 transition hover:bg-accent"><Cloud className="size-3.5" /></button>
            <button type="button" aria-label="Offline mode" className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"><CloudOff className="size-3.5" /></button>
            <button type="button" onClick={() => setStarred((s) => !s)} aria-label={starred ? 'Unstar' : 'Star'}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground">
              <Star className={cn('size-3.5', starred && 'fill-primary text-primary')} />
            </button>
            <button type="button" aria-label="Copy" className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"><Copy className="size-3.5" /></button>
            <button type="button" aria-label="Download" className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"><Download className="size-3.5" /></button>
            <button type="button" aria-label="Move to trash" className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-destructive"><Trash2 className="size-3.5" /></button>
          </div>
          <ModeDropdown mode={mode} onChange={requestModeChange} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" aria-label="Profile"
            className="flex size-7 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary transition hover:bg-primary/20"><User className="size-3.5" /></button>
          <button type="button" onClick={() => setCommentsOpen((o) => !o)} aria-label="Toggle comments" aria-pressed={commentsOpen}
            className={cn('flex size-7 items-center justify-center rounded-md border transition',
              commentsOpen ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground')}>
            <MessageSquare className="size-3.5" />
          </button>
          <PresentDropdown />
          <button type="button" onClick={() => setPipelineDrawerOpen((o) => !o)} aria-label="Toggle Event Pipeline panel" aria-pressed={pipelineDrawerOpen}
            title="Event Pipeline"
            className={cn('flex size-7 items-center justify-center rounded-md border transition',
              pipelineDrawerOpen ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground')}>
            <GalleryVerticalEnd className="size-3.5" />
          </button>
          <button type="button" onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:opacity-90">
            <Share2 className="size-3" />Share
          </button>
        </div>
      </header>

      {/* ══════════ CONTEXTUAL BAR (when asset selected) ══════════ */}
      {selectedAsset && (
        <ContextualBar asset={selectedAsset} onDeselect={() => setSelectedAssetId(null)} onUpdate={updateAsset} canvasAssets={canvasAssets} />
      )}

      {/* ══════════ BODY ══════════ */}
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel onDropAsset={handleDropFromPanel} eventAlias={card?.eventAlias} assets={assets} onRouteToDeficit={handleRouteToDeficit} onApplyBackground={handleApplyBackground} activeTool={activeTool} onToolChange={setActiveTool} />

        {/* Canvas + bottom bar */}
        <div ref={canvasColumnRef} className="flex flex-1 flex-col overflow-hidden bg-background">
          <KonvaInfiniteCanvas
            ref={canvasHandleRef}
            assets={canvasAssets}
            pages={pages}
            currentPage={currentPage}
            pageNavMode={pageNavMode}
            onCurrentPageChange={(newPageId) => {
              setCurrentPage(newPageId)
              if (selectedAssetId) {
                const asset = canvasAssets.find((a) => a.id === selectedAssetId)
                if (asset && (asset.pageId || pages[0]?.id) !== newPageId) {
                  setSelectedAssetId(null)
                }
              }
            }}
            selectedId={selectedAssetId}
            zoom={zoom}
            showGrid={showGrid}
            onSelect={setSelectedAssetId}
            onUpdate={updateAsset}
            onDeselect={() => setSelectedAssetId(null)}
            onDuplicate={duplicateAsset}
            onDelete={deleteAsset}
            onDropAsset={handleDropOnCanvas}
            onPlaceElement={handlePlaceElement}
            activeTool={activeTool}
            onToolReset={() => setActiveTool('select')}
            onZoomChange={setZoom}
            onContextMenu={(x, y, assetId) => setCtxMenu({ x, y, assetId })}
            onCopy={copyAsset}
            onPaste={pasteAsset}
            onComment={commentOnAsset}
            onRenamePage={handleRenamePage}
            onMovePage={handleMovePage}
            onDuplicatePage={handleDuplicatePage}
            onToggleHidden={handleToggleHidden}
            onDeletePage={handleDeletePage}
            onAddPage={handleAddPage}
            artboardBg={artboardBgColor}
            artboardBgImage={artboardBgImageEl}
          />
          {ctxMenu && (
            <ContextMenu
              x={ctxMenu.x}
              y={ctxMenu.y}
              asset={ctxMenu.assetId ? canvasAssets.find((a) => a.id === ctxMenu.assetId) ?? null : null}
              onClose={() => setCtxMenu(null)}
              onDuplicate={() => ctxMenu.assetId && duplicateAsset(ctxMenu.assetId)}
              onDelete={() => ctxMenu.assetId && deleteAsset(ctxMenu.assetId)}
              onLock={() => { if (!ctxMenu.assetId) return; const a = canvasAssets.find((x) => x.id === ctxMenu.assetId); if (a) updateAsset(ctxMenu.assetId, { locked: !a.locked }) }}
              onCopy={() => ctxMenu.assetId && copyAsset(ctxMenu.assetId)}
              onPaste={pasteAsset}
              onAlign={(alignment) => ctxMenu.assetId && alignAssetToPage(ctxMenu.assetId, alignment)}
              onComment={() => ctxMenu.assetId && commentOnAsset(ctxMenu.assetId)}
              canPaste={!!clipboardAsset}
            />
          )}
          <PageBar
            pages={pages}
            currentPage={currentPage}
            pageNavMode={pageNavMode}
            onTogglePageNavMode={() => setPageNavMode((m) => (m === 'flow' ? 'thumbnail' : 'flow'))}
            onSelectPage={handleSelectPage}
            onAddPage={handleAddPage}
            onRenamePage={handleRenamePage}
            onMovePage={handleMovePage}
            onDuplicatePage={handleDuplicatePage}
            onToggleHidden={handleToggleHidden}
            onDeletePage={handleDeletePage}
            zoom={zoom}
            onZoomChange={setZoom}
            showGrid={showGrid}
            onToggleGrid={() => setShowGrid((g) => !g)}
            onFitToScreen={() => canvasHandleRef.current?.fitToScreen()}
            isFullscreen={isCanvasFullscreen}
            onToggleFullscreen={toggleCanvasFullscreen}
          />
        </div>

        {/* Comments panel */}
        {commentsOpen && <CommentsPanel pageId={currentPage} selectedAsset={selectedAsset} comments={comments} onAdd={addComment} onClose={() => setCommentsOpen(false)} />}

        {/* Event Pipeline drawer — collapsible, in-workspace. Same panel/data source as the
            standalone pipeline route; opening/closing it never navigates away from the canvas. */}
        {pipelineDrawerOpen && pipelineEvent && (
          <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <GalleryVerticalEnd className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span className="truncate font-display text-[0.65rem] uppercase tracking-[0.15em] text-foreground">Event Pipeline</span>
              </div>
              <button type="button" onClick={() => setPipelineDrawerOpen(false)} aria-label="Close Event Pipeline panel"
                className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent">
                <X className="size-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <EventPipelinePanel event={pipelineEvent} adminName={adminName} compact />
            </div>
          </aside>
        )}

        {/* Right logistics panel */}
        <RightPanel
          expanded={rightExpanded}
          onToggleExpand={() => setRightExpanded((v) => !v)}
          droppedAssets={droppedAssets}
          onRemoveDropped={handleRemoveDropped}
          assets={assets}
          setAssets={setAssets}
          pending={pending}
          setPending={setPending}
        />
      </div>

      {/* PIN Modal */}
      {pendingMode && <PinModal targetMode={pendingMode} onSuccess={onPinSuccess} onCancel={() => setPendingMode(null)} />}

      {/* Share Modal */}
      {showShare && <ShareModal title={displayTitle} onClose={() => setShowShare(false)} />}

      {/* Proactive Stock Availability Warning — fired from canvas drag activity only */}
      {stockWarning && <StockAvailabilityWarningModal asset={stockWarning} onClose={() => setStockWarning(null)} />}
    </div>
  )
}
