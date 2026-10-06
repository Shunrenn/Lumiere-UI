import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Clock,
  Building2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
  Layers,
  Package,
  Users,
  Hammer,
  ShieldCheck,
  ExternalLink,
  Edit3,
  Banknote,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  PackageSearch,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react'
import type { PortalEvent, ProcurementItem, Staff, DamageException } from '@/lib/types'
import type { ProjectPitch } from '@/lib/project-pitch'
import { fetchEventBudget, type EventBudgetData, type BudgetLineItem } from '@/features/budget/api/budgetApi'
import { fetchManningForEvent, type ManningRecordDto } from '@/features/manning/api/manningApi'
import { fetchDamageReportsForEvent, checkSettlementBlockedBackend } from '@/features/damage/api/damageApi'
import { fetchReservationsForEvent, type ReservationResponseDto } from '@/features/events/api/reservationsApi'
import { fetchGanttScheduleForEvent, type GanttScheduleResponseDto } from '@/features/production/api/productionApi'
import { fetchCanvasLayoutApi, type CanvasResponseDto } from '@/features/canvas/api/canvasApi'
import { fetchDeficitQueueApi, type DeficitQueueItemDto } from '@/features/inventory/api/deficitApi'
import { cn } from '@/lib/utils'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

function WorkspaceBudgetRow({ item }: { item: BudgetLineItem }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-t border-border/40 first:border-t-0 text-xs">
      <div className="min-w-0">
        <p className="font-medium text-foreground truncate">{item.label}</p>
        {item.description && (
          <p className="text-[0.65rem] text-muted-foreground">{item.description}</p>
        )}
      </div>
      <span
        className={cn(
          'shrink-0 font-mono text-[0.72rem]',
          item.isMissingCost ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-foreground',
        )}
      >
        {item.isMissingCost ? '⚠ unpriced' : item.lineTotal != null ? formatCurrency(item.lineTotal) : '—'}
      </span>
    </div>
  )
}

function WorkspaceBudgetSection({
  title,
  icon: Icon,
  items,
  total,
  colorClass,
  defaultOpen = false,
}: {
  title: string
  icon: React.ElementType
  items: BudgetLineItem[]
  total: number
  colorClass: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (items.length === 0) return null
  return (
    <div className="rounded-xl border border-border bg-card/60 overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Icon className={`size-4 ${colorClass}`} />
          <span className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-foreground">{title}</span>
          <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[0.6rem] font-semibold text-muted-foreground">
            {items.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-foreground">{formatCurrency(total)}</span>
          {open ? <ChevronUp className="size-3.5 text-muted-foreground" /> : <ChevronDown className="size-3.5 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-border/50 px-4 py-2 bg-background/50">
          {items.map((item, i) => <WorkspaceBudgetRow key={i} item={item} />)}
        </div>
      )}
    </div>
  )
}

interface ProjectManagerEventWorkspaceProps {
  event: PortalEvent
  staff: Staff[]
  procurement: ProcurementItem[]
  damageExceptions: DamageException[]
  pitches: ProjectPitch[]
  assignedPmName?: string
  onBack: () => void
  onEditRecord: (event: PortalEvent) => void
  onOpenCanvas?: () => void
}

export type WorkspaceSection =
  | 'overview'
  | 'client-pitch'
  | 'registry'
  | 'schedule'
  | 'planning'
  | 'assets'
  | 'manning'
  | 'production'
  | 'oversight'

export function ProjectManagerEventWorkspace({
  event,
  staff: _staff,
  procurement: _procurement,
  damageExceptions: _initialDamageExceptions,
  pitches,
  assignedPmName = 'Project Manager',
  onBack,
  onEditRecord,
  onOpenCanvas,
}: ProjectManagerEventWorkspaceProps) {
  const [section, setSection] = useState<WorkspaceSection>('overview')

  // Real backend budget state (GET /api/events/{eventId}/budget)
  const [budgetData, setBudgetData] = useState<EventBudgetData | null>(null)
  const [budgetLoading, setBudgetLoading] = useState(true)
  const [budgetError, setBudgetError] = useState<string | null>(null)

  const loadBudget = useCallback(async () => {
    if (!event.id) return
    setBudgetLoading(true)
    setBudgetError(null)
    try {
      const data = await fetchEventBudget(event.id)
      setBudgetData(data)
    } catch (err: any) {
      console.warn('[ProjectManagerEventWorkspace] fetchEventBudget failed:', err)
      setBudgetError(err?.message || 'Failed to load budget')
    } finally {
      setBudgetLoading(false)
    }
  }, [event.id])

  useEffect(() => {
    loadBudget()
  }, [loadBudget])

  const displayBudgetAmount = useMemo(() => {
    if (budgetLoading) return 'Loading...'
    if (event.budget && event.budget > 0) return formatCurrency(event.budget)
    if (budgetData?.estimatedRevenue != null && budgetData.estimatedRevenue > 0) {
      return formatCurrency(budgetData.estimatedRevenue)
    }
    return 'Under Assessment'
  }, [budgetLoading, event.budget, budgetData])

  // Real backend manning state (GET /api/manning/event/{eventId})
  const [manningList, setManningList] = useState<ManningRecordDto[]>([])
  const [manningLoading, setManningLoading] = useState(true)
  const [manningError, setManningError] = useState<string | null>(null)

  const loadManning = useCallback(async () => {
    if (!event.id) return
    setManningLoading(true)
    setManningError(null)
    try {
      const data = await fetchManningForEvent(event.id)
      setManningList(data)
    } catch (err: any) {
      console.warn('[ProjectManagerEventWorkspace] fetchManningForEvent failed:', err)
      setManningError(err?.message || 'Failed to load manning assignments')
    } finally {
      setManningLoading(false)
    }
  }, [event.id])

  useEffect(() => {
    loadManning()
  }, [loadManning])

  // Real backend damage reports state (GET /api/damage-reports/event/{eventId})
  const [damageReports, setDamageReports] = useState<DamageException[]>([])
  const [damageLoading, setDamageLoading] = useState(true)
  const [damageError, setDamageError] = useState<string | null>(null)

  const loadDamages = useCallback(async () => {
    if (!event.id) return
    setDamageLoading(true)
    setDamageError(null)
    try {
      const data = await fetchDamageReportsForEvent(event.id)
      setDamageReports(data)
    } catch (err: any) {
      console.warn('[ProjectManagerEventWorkspace] fetchDamageReportsForEvent failed:', err)
      setDamageError(err?.message || 'Failed to load damage reports')
    } finally {
      setDamageLoading(false)
    }
  }, [event.id])

  useEffect(() => {
    loadDamages()
  }, [loadDamages])

  // Real backend settlement blocker state (GET /api/damage-reports/event/{eventId}/settlement-blocked)
  const [settlementStatus, setSettlementStatus] = useState<{ blocked: boolean; blockingItemsCount: number } | null>(null)
  const [settlementLoading, setSettlementLoading] = useState(true)
  const [settlementError, setSettlementError] = useState<string | null>(null)

  const loadSettlementStatus = useCallback(async () => {
    if (!event.id) return
    setSettlementLoading(true)
    setSettlementError(null)
    try {
      const data = await checkSettlementBlockedBackend(event.id)
      setSettlementStatus(data)
    } catch (err: any) {
      console.warn('[ProjectManagerEventWorkspace] checkSettlementBlockedBackend failed:', err)
      setSettlementError(err?.message || 'Failed to check settlement blocker status')
    } finally {
      setSettlementLoading(false)
    }
  }, [event.id])

  useEffect(() => {
    loadSettlementStatus()
  }, [loadSettlementStatus])

  // Real backend canvas layout state (GET /api/canvas/event/{eventId})
  const [canvasData, setCanvasData] = useState<CanvasResponseDto | null>(null)
  const [canvasLoading, setCanvasLoading] = useState(true)
  const [canvasError, setCanvasError] = useState<string | null>(null)

  const loadCanvas = useCallback(async () => {
    if (!event.id) return
    setCanvasLoading(true)
    setCanvasError(null)
    try {
      const data = await fetchCanvasLayoutApi(event.id)
      setCanvasData(data)
    } catch (err: any) {
      console.warn('[ProjectManagerEventWorkspace] fetchCanvasLayoutApi failed:', err)
      setCanvasError(err?.message || 'Failed to load canvas layout')
    } finally {
      setCanvasLoading(false)
    }
  }, [event.id])

  useEffect(() => {
    loadCanvas()
  }, [loadCanvas])

  // Real backend reservations state (GET /api/reservations/event/{eventId})
  const [reservationsList, setReservationsList] = useState<ReservationResponseDto[]>([])
  const [reservationsLoading, setReservationsLoading] = useState(true)
  const [reservationsError, setReservationsError] = useState<string | null>(null)

  const loadReservations = useCallback(async () => {
    if (!event.id) return
    setReservationsLoading(true)
    setReservationsError(null)
    try {
      const data = await fetchReservationsForEvent(event.id)
      setReservationsList(data)
    } catch (err: any) {
      console.warn('[ProjectManagerEventWorkspace] fetchReservationsForEvent failed:', err)
      setReservationsError(err?.message || 'Failed to load reservations')
    } finally {
      setReservationsLoading(false)
    }
  }, [event.id])

  useEffect(() => {
    loadReservations()
  }, [loadReservations])

  // Real backend production gantt schedule (GET /api/production/event/{eventId}/gantt)
  const [ganttSchedule, setGanttSchedule] = useState<GanttScheduleResponseDto | null>(null)
  const [productionLoading, setProductionLoading] = useState(true)
  const [productionError, setProductionError] = useState<string | null>(null)

  const loadProductionGantt = useCallback(async () => {
    if (!event.id) return
    setProductionLoading(true)
    setProductionError(null)
    try {
      const data = await fetchGanttScheduleForEvent(event.id)
      setGanttSchedule(data)
    } catch (err: any) {
      console.warn('[ProjectManagerEventWorkspace] fetchGanttScheduleForEvent failed:', err)
      setProductionError(err?.message || 'Failed to load production schedule')
    } finally {
      setProductionLoading(false)
    }
  }, [event.id])

  useEffect(() => {
    loadProductionGantt()
  }, [loadProductionGantt])

  // Real backend deficit queue state (GET /api/deficit-queue?eventId={eventId})
  const [deficitList, setDeficitList] = useState<DeficitQueueItemDto[]>([])
  const [deficitLoading, setDeficitLoading] = useState(true)
  const [deficitError, setDeficitError] = useState<string | null>(null)

  const loadDeficits = useCallback(async () => {
    if (!event.id) return
    setDeficitLoading(true)
    setDeficitError(null)
    try {
      const data = await fetchDeficitQueueApi(event.id)
      setDeficitList(data)
    } catch (err: any) {
      console.warn('[ProjectManagerEventWorkspace] fetchDeficitQueueApi failed:', err)
      setDeficitError(err?.message || 'Failed to load deficit queue')
    } finally {
      setDeficitLoading(false)
    }
  }, [event.id])

  useEffect(() => {
    loadDeficits()
  }, [loadDeficits])

  // Derived live production status banner
  const productionBanner = useMemo(() => {
    if (productionLoading) return 'Loading...'
    if (!ganttSchedule || ganttSchedule.tasks.length === 0) return 'No Active Builds'
    const pct = Math.round(ganttSchedule.overallProgressPercentage)
    return `${pct}% Complete (${ganttSchedule.tasks.length} task${ganttSchedule.tasks.length > 1 ? 's' : ''})`
  }, [productionLoading, ganttSchedule])

  // Truthful Event Health calculation
  const overallEventHealth = useMemo(() => {
    if (settlementStatus?.blocked) {
      return { status: 'Settlement Blocked', color: 'text-rose-600 dark:text-rose-400', icon: 'blocked' }
    }
    const criticalDeficits = deficitList.filter((d) => d.priority === 'Critical' || d.urgencyLevel === 'Critical')
    if (criticalDeficits.length > 0) {
      return { status: 'Deficit Alert', color: 'text-amber-600 dark:text-amber-400', icon: 'warning' }
    }
    if (budgetData?.isLossMaker) {
      return { status: 'Loss Risk', color: 'text-rose-600 dark:text-rose-400', icon: 'warning' }
    }
    if (event.status === 'On Hold') {
      return { status: 'Operations On Hold', color: 'text-amber-600 dark:text-amber-400', icon: 'warning' }
    }
    if (event.status === 'Completed') {
      return { status: 'Completed', color: 'text-emerald-600 dark:text-emerald-400', icon: 'ok' }
    }
    return { status: 'On Track', color: 'text-emerald-600 dark:text-emerald-400', icon: 'ok' }
  }, [settlementStatus, deficitList, budgetData, event.status])

  // Linked Client Pitch
  const linkedPitch = useMemo(
    () =>
      pitches.find(
        (p) =>
          p.convertedEventId === event.id ||
          p.brief.clientName.toLowerCase() === event.client.toLowerCase(),
      ),
    [pitches, event.id, event.client],
  )

  const pmDisplay = event.projectManagerName || assignedPmName

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-16">
      {/* Top Context Bar: Single-Event Command Header */}
      <div className="border-b border-border/80 bg-card/80 backdrop-blur-md px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 max-w-7xl mx-auto">
          {/* Back & Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition group"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
              <span>Back to Command Center</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="rounded-md border border-border/80 bg-background px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                {event.refId || 'PRT-2026'}
              </span>

              <span
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider border',
                  event.tier?.includes('Tier-1')
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                    : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
                )}
              >
                {event.tier || 'Tier-1 VIP'}
              </span>

              <span
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider border',
                  event.status === 'Completed'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                    : event.status === 'In Production'
                    ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20'
                    : 'bg-muted text-muted-foreground border-border',
                )}
              >
                {event.status}
              </span>
            </div>
          </div>

          {/* Event Master Identity Title & Meta Strip */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {event.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 text-foreground font-semibold">
                  <Building2 className="size-3.5 text-primary" />
                  {event.client}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-primary" />
                  {event.venue}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-primary" />
                  {event.targetDate}
                </span>
                <span className="flex items-center gap-1.5 text-primary font-medium">
                  <User className="size-3.5" />
                  PM: {pmDisplay}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 self-start lg:self-auto">
              <button
                type="button"
                onClick={() => onEditRecord(event)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-accent transition shadow-sm"
              >
                <Edit3 className="size-3.5" />
                Edit Event Record
              </button>
            </div>
          </div>

          {/* Compact Contextual Event Navigation Toolbar (Segmented Tabs) */}
          <div className="flex items-center gap-1 overflow-x-auto border-t border-border/60 pt-3 text-xs scrollbar-none">
            {[
              { id: 'overview', label: 'Overview', icon: Layers },
              { id: 'client-pitch', label: 'Client & Pitch', icon: Sparkles },
              { id: 'registry', label: 'Event Registry', icon: FileText },
              { id: 'schedule', label: 'Schedule', icon: Clock },
              { id: 'planning', label: 'Planning', icon: Edit3, badge: canvasData ? 1 : 0 },
              { id: 'assets', label: 'Assets', icon: Package, badge: reservationsList.length },
              { id: 'manning', label: 'Manning', icon: Users, badge: manningList.length },
              { id: 'production', label: 'Production', icon: Hammer, badge: ganttSchedule?.tasks.length ?? 0 },
              { id: 'oversight', label: 'Project Oversight', icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon
              const active = section === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSection(tab.id as WorkspaceSection)}
                  className={cn(
                    'flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 font-semibold transition',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                  )}
                >
                  <Icon className="size-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={cn(
                        'flex size-4 items-center justify-center rounded-full text-[0.6rem] font-bold',
                        active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* 1. OVERVIEW SECTION */}
        {section === 'overview' && (
          <div className="flex flex-col gap-6">
            {/* Strategic KPI & Health Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm backdrop-blur-sm">
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Event Health
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={cn('text-lg font-bold', overallEventHealth.color)}
                  >
                    {overallEventHealth.status}
                  </span>
                  {overallEventHealth.icon === 'blocked' ? (
                    <ShieldAlert className="size-4 text-rose-500" />
                  ) : overallEventHealth.icon === 'warning' ? (
                    <AlertTriangle className="size-4 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  )}
                </div>
                <p className="text-[0.68rem] text-muted-foreground mt-0.5">
                  {settlementStatus?.blocked
                    ? `${settlementStatus.blockingItemsCount} damage item(s) block financial settlement`
                    : deficitList.some((d) => d.priority === 'Critical' || d.urgencyLevel === 'Critical')
                    ? 'Critical material deficit flagged in replenishment queue'
                    : 'Synchronized across live server logistics checkpoints'}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm backdrop-blur-sm">
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Budget Authorization
                </span>
                <div className="mt-1 text-lg font-bold text-foreground">
                  {displayBudgetAmount}
                </div>
                <p className="text-[0.68rem] text-muted-foreground mt-0.5">
                  {budgetData?.estimatedGrossMargin != null
                    ? `Est. Margin: ${formatCurrency(budgetData.estimatedGrossMargin)}${budgetData.isLossMaker ? ' (Loss Risk)' : ''}`
                    : budgetData?.totalEstimatedCost
                    ? `Est. Cost: ${formatCurrency(budgetData.totalEstimatedCost)}`
                    : 'Approved project expenditure ceiling'}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm backdrop-blur-sm">
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Field Manning
                </span>
                <div className="mt-1 text-lg font-bold text-foreground">
                  {manningLoading ? '...' : `${manningList.length} Assigned`}
                </div>
                <p className="text-[0.68rem] text-muted-foreground mt-0.5">
                  {manningError
                    ? 'Could not load manning assignments'
                    : manningList.length === 0
                    ? 'No workforce allocations recorded'
                    : `${manningList.length} field role(s) deployed`}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm backdrop-blur-sm">
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Production / Build
                </span>
                <div className="mt-1 text-lg font-bold text-foreground">
                  {productionBanner}
                </div>
                <p className="text-[0.68rem] text-muted-foreground mt-0.5">
                  {productionError
                    ? 'Could not load production schedule'
                    : ganttSchedule
                    ? `${ganttSchedule.tasks.length} build milestone(s) active`
                    : 'No bespoke fabrication orders pending'}
                </p>
              </div>
            </div>

            {/* Department Readiness Matrix */}
            <div className="rounded-2xl border border-border bg-card/60 p-6 shadow-sm">
              <h3 className="font-serif text-base font-semibold text-foreground mb-4">
                Cross-Department Execution Matrix
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Planning */}
                <div className="rounded-xl border border-border/70 bg-background/80 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-muted-foreground">Design & Planning</span>
                      <span className="text-primary font-bold">
                        {canvasLoading
                          ? 'Checking...'
                          : canvasData
                          ? `${canvasData.canvasStatus} (${canvasData.canvasMode})`
                          : 'Concept Ready'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {canvasData?.submittedAt
                        ? `Canvas submitted ${new Date(canvasData.submittedAt).toLocaleDateString()}`
                        : event.moodPlan || 'Concept styling and material specifications approved.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSection('planning')}
                    className="mt-3 text-xs font-semibold text-primary hover:underline text-left"
                  >
                    View Planning Details →
                  </button>
                </div>

                {/* Assets */}
                <div className="rounded-xl border border-border/70 bg-background/80 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-muted-foreground">Asset Fulfillment</span>
                      <span className="text-emerald-600 font-bold">
                        {reservationsLoading ? '...' : `${reservationsList.length} Reserved`}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {reservationsError
                        ? 'Could not load asset reservations'
                        : reservationsList.length === 0
                        ? 'No inventory locks recorded on server.'
                        : 'Authoritative inventory locks confirmed for event.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSection('assets')}
                    className="mt-3 text-xs font-semibold text-primary hover:underline text-left"
                  >
                    View Asset Manifest →
                  </button>
                </div>

                {/* Manning */}
                <div className="rounded-xl border border-border/70 bg-background/80 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-muted-foreground">Manning Coverage</span>
                      <span className="text-sky-600 font-bold">
                        {manningLoading ? '...' : `${manningList.length} Assigned`}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {manningError
                        ? 'Could not load manning assignments'
                        : manningList.length === 0
                        ? 'No workforce allocations recorded.'
                        : 'Field logistics crew allocated per shift requirements.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSection('manning')}
                    className="mt-3 text-xs font-semibold text-primary hover:underline text-left"
                  >
                    View Staffing Roster →
                  </button>
                </div>

                {/* Production */}
                <div className="rounded-xl border border-border/70 bg-background/80 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-muted-foreground">Fabrication Floor</span>
                      <span className="text-indigo-600 font-bold">{productionBanner}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {productionError
                        ? 'Could not load production schedule'
                        : ganttSchedule && ganttSchedule.tasks.length > 0
                        ? `${ganttSchedule.tasks.length} tasks scheduled on fabrication floor.`
                        : 'Standard catalog assets only.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSection('production')}
                    className="mt-3 text-xs font-semibold text-primary hover:underline text-left"
                  >
                    View Production Tracking →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. CLIENT & PITCH SECTION */}
        {section === 'client-pitch' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-semibold text-foreground">
                  Client Brief & Proposal Record
                </h3>
                <p className="text-xs text-muted-foreground">
                  Originating concept pitch and client communication logs
                </p>
              </div>

              {linkedPitch && (
                <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary">
                  Linked Pitch: {linkedPitch.status}
                </span>
              )}
            </div>

            {linkedPitch ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Brief */}
                <div className="rounded-2xl border border-border bg-card/60 p-6 flex flex-col gap-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-2">
                    Client & Project Brief
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Client:</span>
                      <p className="font-semibold text-foreground">{linkedPitch.brief.clientName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Contact:</span>
                      <p className="font-semibold text-foreground">{linkedPitch.brief.contactPerson}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Target Date:</span>
                      <p className="font-semibold text-foreground">{linkedPitch.brief.proposedDate}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Venue:</span>
                      <p className="font-semibold text-foreground">{linkedPitch.brief.proposedVenue}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Guest Count:</span>
                      <p className="font-semibold text-foreground">{linkedPitch.brief.estimatedGuests}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Budget Range:</span>
                      <p className="font-semibold text-foreground">{linkedPitch.brief.budgetRange}</p>
                    </div>
                  </div>

                  <div className="text-xs border-t border-border/40 pt-3">
                    <span className="text-muted-foreground font-semibold">Requirements:</span>
                    <p className="mt-1 text-foreground">{linkedPitch.brief.requirements}</p>
                  </div>
                </div>

                {/* Proposal & Feedback */}
                <div className="rounded-2xl border border-border bg-card/60 p-6 flex flex-col gap-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-2">
                    Approved Proposal Concept
                  </h4>

                  <div className="text-xs">
                    <span className="text-muted-foreground">Concept Title:</span>
                    <h5 className="text-sm font-serif font-bold text-foreground mt-0.5">
                      {linkedPitch.proposal.conceptTitle}
                    </h5>
                    <p className="text-muted-foreground mt-2">
                      {linkedPitch.proposal.conceptSummary}
                    </p>
                  </div>

                  <div className="text-xs border-t border-border/40 pt-3">
                    <span className="text-muted-foreground font-semibold">Deliverables:</span>
                    <ul className="list-disc list-inside mt-1 space-y-1 text-foreground">
                      {linkedPitch.proposal.deliverables.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  {linkedPitch.feedback.length > 0 && (
                    <div className="text-xs border-t border-border/40 pt-3">
                      <span className="text-muted-foreground font-semibold">Latest Client Feedback:</span>
                      <p className="mt-1 italic text-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50">
                        &quot;{linkedPitch.feedback[0].notes}&quot;
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
                <Sparkles className="size-8 text-muted-foreground/50 mx-auto mb-2" />
                <h4 className="font-serif text-base font-medium text-foreground">
                  Direct Registry Event
                </h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                  This event was initialized directly via the Event Registry. Client Brief parameters are inherited from the official registry record.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 3. EVENT REGISTRY SECTION */}
        {section === 'registry' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-semibold text-foreground">
                  Official Event Registry Record
                </h3>
                <p className="text-xs text-muted-foreground">
                  Authoritative operational specifications & logistics bounds
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEditRecord(event)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow hover:opacity-90"
              >
                <Edit3 className="size-3.5" />
                Edit Registry Fields
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-border bg-card/60 p-6 flex flex-col gap-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-2">
                  Identification & Logistics
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Reference ID:</span>
                    <p className="font-semibold text-foreground">{event.refId}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Experience Tier:</span>
                    <p className="font-semibold text-foreground">{event.tier}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Assigned Client:</span>
                    <p className="font-semibold text-foreground">{event.client}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Geo Classification:</span>
                    <p className="font-semibold text-foreground">{event.geoClass || 'Local'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Official Venue:</span>
                    <p className="font-semibold text-foreground">{event.venue}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card/60 p-6 flex flex-col gap-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-2">
                  Timing & Site Schedule
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Ingress Date:</span>
                    <p className="font-semibold text-foreground">{event.ingressDate || event.installationStart}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ingress Time Call:</span>
                    <p className="font-semibold text-foreground">{event.ingressTime || '08:00 AM'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Target Execution Date:</span>
                    <p className="font-semibold text-foreground">{event.targetDate}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Full Stop Site Clearance:</span>
                    <p className="font-semibold text-foreground">{event.fullStop || '11:00 PM'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Approved Budget:</span>
                    <p className="font-semibold text-foreground">{displayBudgetAmount}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Current Status:</span>
                    <p className="font-semibold text-foreground">{event.status}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. SCHEDULE SECTION */}
        {section === 'schedule' && (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="font-serif text-lg font-semibold text-foreground">
                Master Project Schedule
              </h3>
              <p className="text-xs text-muted-foreground">
                Critical chronological milestones from build staging to site handover
              </p>
            </div>

            <div className="relative border-l-2 border-primary/30 ml-4 pl-6 space-y-8">
              {/* Ingress */}
              <div className="relative">
                <span className="absolute -left-[31px] top-0 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[0.6rem] font-bold">
                  1
                </span>
                <div>
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-primary">
                    Stage 1 · Site Ingress & Dispatch
                  </span>
                  <h4 className="text-sm font-semibold text-foreground mt-0.5">
                    Fleet Dispatch & Venue Arrival Call
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Date: {event.ingressDate || event.installationStart} at {event.ingressTime || '08:00 AM'} · Venue: {event.venue}
                  </p>
                </div>
              </div>

              {/* Staging & Setup */}
              <div className="relative">
                <span className="absolute -left-[31px] top-0 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[0.6rem] font-bold">
                  2
                </span>
                <div>
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-primary">
                    Stage 2 · Installation & Rigging
                  </span>
                  <h4 className="text-sm font-semibold text-foreground mt-0.5">
                    Scenic Build & Technical Calibration
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Installation window: {event.installationStart} through {event.installationEnd}
                  </p>
                </div>
              </div>

              {/* Execution */}
              <div className="relative">
                <span className="absolute -left-[31px] top-0 flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[0.6rem] font-bold">
                  3
                </span>
                <div>
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-emerald-600">
                    Stage 3 · Event Execution
                  </span>
                  <h4 className="text-sm font-semibold text-foreground mt-0.5">
                    Official Event Showtime
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Date: {event.targetDate} · Full operations & standby manning on-site
                  </p>
                </div>
              </div>

              {/* Full Stop & Egress */}
              <div className="relative">
                <span className="absolute -left-[31px] top-0 flex size-5 items-center justify-center rounded-full bg-muted-foreground text-background text-[0.6rem] font-bold">
                  4
                </span>
                <div>
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                    Stage 4 · Site Clearance
                  </span>
                  <h4 className="text-sm font-semibold text-foreground mt-0.5">
                    Full Stop & Egress Chain of Custody
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Full stop deadline: {event.fullStop || '11:00 PM'} · Return batch reconciliation
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. PLANNING SECTION */}
        {section === 'planning' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-semibold text-foreground">
                  Creative Design & Floor Plan Concepts
                </h3>
                <p className="text-xs text-muted-foreground">
                  Live 2D/3D Design Canvas layout from server ledger (GET /api/canvas/event/{event.id})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadCanvas()}
                  title="Reload canvas layout"
                  className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition"
                >
                  <RefreshCw className={cn('size-3.5', canvasLoading && 'animate-spin')} />
                </button>
                {onOpenCanvas && (
                  <button
                    type="button"
                    onClick={onOpenCanvas}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
                  >
                    <ExternalLink className="size-3.5" />
                    Open Canvas Workspace
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/60 p-6 flex flex-col gap-4 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-2">
                Creative Direction & Aesthetic Mood
              </h4>
              <p className="text-sm text-foreground leading-relaxed">
                {event.moodPlan || 'Concept styling, theme notes, and material specifications recorded in event registry.'}
              </p>
            </div>

            {canvasLoading && (
              <div className="h-36 rounded-2xl border border-border bg-card/60 p-6 animate-pulse" />
            )}

            {canvasError && (
              <div className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300">
                <div className="flex items-center gap-2">
                  <HelpCircle className="size-4 shrink-0" />
                  <span>Could not load event canvas layout: {canvasError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => loadCanvas()}
                  className="underline hover:no-underline font-semibold"
                >
                  Retry
                </button>
              </div>
            )}

            {!canvasLoading && !canvasError && canvasData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-card/60 p-5 flex flex-col justify-between gap-3 shadow-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Canvas Architecture
                      </span>
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-[0.62rem] font-bold text-primary">
                        {canvasData.canvasStatus || 'Draft'}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground mt-1.5">
                      Mode: {canvasData.canvasMode || 'Standard'} Layout
                    </h4>
                  </div>
                  <div className="text-xs text-muted-foreground border-t border-border/50 pt-2 grid grid-cols-2 gap-2">
                    <div>
                      <span>Submitted:</span>{' '}
                      <span className="font-semibold text-foreground">
                        {canvasData.submittedAt ? new Date(canvasData.submittedAt).toLocaleDateString() : 'Pending'}
                      </span>
                    </div>
                    <div>
                      <span>Approved:</span>{' '}
                      <span className="font-semibold text-foreground">
                        {canvasData.approvedAt ? new Date(canvasData.approvedAt).toLocaleDateString() : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {canvasData.pdfUrl && (
                  <div className="rounded-xl border border-border bg-card/60 p-5 flex flex-col justify-between gap-3 shadow-sm">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Exported Plan Document
                      </span>
                      <p className="text-xs text-foreground mt-1">
                        Authoritative visual schematic generated from layout canvas.
                      </p>
                    </div>
                    <a
                      href={canvasData.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      <FileText className="size-3.5" />
                      View Floorplan PDF
                    </a>
                  </div>
                )}
              </div>
            )}

            {!canvasLoading && !canvasError && !canvasData && (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-xs text-muted-foreground">
                No visual canvas layout created for this event yet. Event Planners can initialize a layout in the Design Canvas hub.
              </div>
            )}
          </div>
        )}

        {/* 6. ASSETS SECTION */}
        {section === 'assets' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-semibold text-foreground">
                  Allocated Asset Reservations ({reservationsLoading ? '...' : reservationsList.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Authoritative inventory locks from server ledger (GET /api/reservations/event/{event.id})
                </p>
              </div>
              <button
                type="button"
                onClick={() => loadReservations()}
                title="Reload reservations"
                className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition"
              >
                <RefreshCw className={cn('size-3.5', reservationsLoading && 'animate-spin')} />
              </button>
            </div>

            {reservationsLoading && (
              <div className="space-y-3 animate-pulse">
                <div className="h-16 rounded-xl bg-muted/60" />
                <div className="h-12 rounded-xl bg-muted/40" />
              </div>
            )}

            {reservationsError && (
              <div className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300">
                <div className="flex items-center gap-2">
                  <HelpCircle className="size-4 shrink-0" />
                  <span>Could not load asset reservations: {reservationsError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => loadReservations()}
                  className="underline hover:no-underline font-semibold"
                >
                  Retry
                </button>
              </div>
            )}

            {!reservationsLoading && !reservationsError && reservationsList.length > 0 && (
              <div className="rounded-2xl border border-border bg-card/60 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-muted/40 font-bold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3.5">Asset Lock Identifier</th>
                        <th className="px-5 py-3.5">Lock Start</th>
                        <th className="px-5 py-3.5">Lock End</th>
                        <th className="px-5 py-3.5">Reservation Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {reservationsList.map((res) => (
                        <tr key={res.id} className="hover:bg-accent/30 transition">
                          <td className="px-5 py-3 font-semibold text-foreground">
                            {res.assetName ? `${res.assetName} (${res.assetId.slice(0, 8)}...)` : `Asset ID: ${res.assetId}`}
                          </td>
                          <td className="px-5 py-3 text-muted-foreground">
                            {res.lockStart ? new Date(res.lockStart).toLocaleString() : '—'}
                          </td>
                          <td className="px-5 py-3 text-muted-foreground">
                            {res.lockEnd ? new Date(res.lockEnd).toLocaleString() : '—'}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={cn(
                                'rounded-full px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider',
                                res.status === 'Active' || res.status === 'Confirmed'
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                                  : 'bg-primary/10 text-primary',
                              )}
                            >
                              {res.status || 'Active Lock'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!reservationsLoading && !reservationsError && reservationsList.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-xs text-muted-foreground">
                No inventory locks or asset reservations registered for this event yet.
              </div>
            )}
          </div>
        )}

        {/* 7. MANNING SECTION */}
        {section === 'manning' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-semibold text-foreground">
                  Crew Allocation & Manning ({manningLoading ? '...' : manningList.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Live workforce allocation from server ledger (GET /api/manning/event/{event.id})
                </p>
              </div>
              <button
                type="button"
                onClick={() => loadManning()}
                title="Reload crew assignments"
                className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition"
              >
                <RefreshCw className={cn('size-3.5', manningLoading && 'animate-spin')} />
              </button>
            </div>

            {manningLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 rounded-xl bg-muted/60" />
                ))}
              </div>
            )}

            {manningError && (
              <div className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300">
                <div className="flex items-center gap-2">
                  <HelpCircle className="size-4 shrink-0" />
                  <span>Could not load event crew allocations: {manningError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => loadManning()}
                  className="underline hover:no-underline font-semibold"
                >
                  Retry
                </button>
              </div>
            )}

            {!manningLoading && !manningError && manningList.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {manningList.map((member) => (
                  <div
                    key={member.id}
                    className="rounded-xl border border-border bg-card/60 p-4 flex flex-col justify-between shadow-sm gap-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-foreground">
                          {member.userName || member.userEmail || 'Assigned Staff'}
                        </h4>
                        <p className="text-[0.68rem] text-muted-foreground mt-0.5">
                          {member.roleName || 'Crew Member'}
                        </p>
                      </div>
                      {member.isOverride ? (
                        <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[0.62rem] font-bold text-amber-600 dark:text-amber-400">
                          Override
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[0.62rem] font-bold">
                          Assigned
                        </span>
                      )}
                    </div>
                    <div className="text-[0.68rem] text-muted-foreground border-t border-border/50 pt-2 flex items-center justify-between">
                      <span>Date: {member.shiftDate ? member.shiftDate.split('T')[0] : 'Event Day'}</span>
                      <span>
                        {member.shiftStartTime && member.shiftEndTime
                          ? `${member.shiftStartTime.slice(0, 5)} - ${member.shiftEndTime.slice(0, 5)}`
                          : 'Full Shift'}
                      </span>
                    </div>
                    {member.notes && (
                      <p className="text-[0.65rem] text-muted-foreground italic border-t border-border/40 pt-1">
                        Note: {member.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!manningLoading && !manningError && manningList.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-xs text-muted-foreground">
                No workforce allocations or field technicians assigned to this event yet.
              </div>
            )}
          </div>
        )}

        {/* 8. PRODUCTION SECTION */}
        {section === 'production' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-semibold text-foreground">
                  Fabrication & Production Gantt Schedule
                </h3>
                <p className="text-xs text-muted-foreground">
                  Live production milestones and tasks (GET /api/production/event/{event.id}/gantt)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary">
                  Overall: {productionBanner}
                </span>
                <button
                  type="button"
                  onClick={() => loadProductionGantt()}
                  title="Reload production schedule"
                  className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition"
                >
                  <RefreshCw className={cn('size-3.5', productionLoading && 'animate-spin')} />
                </button>
              </div>
            </div>

            {productionLoading && (
              <div className="space-y-3 animate-pulse">
                <div className="h-16 rounded-xl bg-muted/60" />
                <div className="h-24 rounded-xl bg-muted/40" />
              </div>
            )}

            {productionError && (
              <div className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300">
                <div className="flex items-center gap-2">
                  <HelpCircle className="size-4 shrink-0" />
                  <span>Could not load production schedule: {productionError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => loadProductionGantt()}
                  className="underline hover:no-underline font-semibold"
                >
                  Retry
                </button>
              </div>
            )}

            {!productionLoading && !productionError && ganttSchedule && ganttSchedule.tasks.length > 0 && (
              <div className="flex flex-col gap-4">
                {/* Overall Timeline Bar */}
                <div className="rounded-xl border border-border bg-card/60 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
                  <div>
                    <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                      Timeline Window
                    </span>
                    <p className="text-xs font-semibold text-foreground mt-0.5">
                      {new Date(ganttSchedule.timelineStart).toLocaleDateString()} — {new Date(ganttSchedule.timelineEnd).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="w-full sm:w-64 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[0.68rem] font-bold">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="text-primary">{Math.round(ganttSchedule.overallProgressPercentage)}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, ganttSchedule.overallProgressPercentage))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Tasks Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ganttSchedule.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-xl border border-border bg-card/60 p-4 flex flex-col justify-between gap-3 shadow-sm"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-semibold text-foreground">{task.taskName}</h4>
                          <span className={cn(
                            'rounded px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider',
                            task.status === 'Completed'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                              : 'bg-primary/10 text-primary',
                          )}>
                            {task.status || 'In Progress'}
                          </span>
                        </div>
                        <div className="text-[0.68rem] text-muted-foreground mt-1">
                          <span>Category: {task.category || 'Build'}</span> · <span>Target: {task.targetQuantity} units</span> (Done: {task.completedQuantity})
                        </div>
                      </div>

                      <div className="border-t border-border/50 pt-2 flex flex-col gap-1.5 text-[0.68rem] text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span>Assigned: <strong className="text-foreground">{task.assignedUserName || 'Production Crew'}</strong></span>
                          <span>{new Date(task.startDate).toLocaleDateString()} – {new Date(task.endDate).toLocaleDateString()}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(0, task.progressPercentage))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!productionLoading && !productionError && (!ganttSchedule || ganttSchedule.tasks.length === 0) && (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-xs text-muted-foreground">
                No bespoke fabrication tasks or production schedule scheduled for this event. Standard catalog assets only.
              </div>
            )}
          </div>
        )}

        {/* 9. PROJECT OVERSIGHT SECTION */}
        {section === 'oversight' && (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="font-serif text-lg font-semibold text-foreground">
                Project Oversight & Risk Assessment
              </h3>
              <p className="text-xs text-muted-foreground">
                Financial, operational and logistical exception monitor
              </p>
            </div>

            {/* Real-time Project Financial Valuation Card */}
            <div className="rounded-2xl border border-border bg-card/60 p-6 flex flex-col gap-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h4 className="font-serif text-base font-semibold text-foreground">
                    Financial Oversight & Cost Breakdown
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Live valuation from server event ledger (GET /api/events/{event.id}/budget)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {budgetData?.isLossMaker && (
                    <span className="flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      <ShieldAlert className="size-3" />
                      Loss Maker Alert
                    </span>
                  )}
                  {budgetData?.hasIncompleteCostData && (
                    <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="size-3" />
                      Incomplete Cost Data
                    </span>
                  )}
                  {budgetData && !budgetData.hasIncompleteCostData && !budgetData.isLossMaker && (
                    <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3" />
                      Fully Costed
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => loadBudget()}
                    title="Reload budget"
                    className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition"
                  >
                    <RefreshCw className={cn('size-3.5', budgetLoading && 'animate-spin')} />
                  </button>
                </div>
              </div>

              {budgetLoading && (
                <div className="space-y-3 animate-pulse">
                  <div className="h-16 rounded-xl bg-muted/60" />
                  <div className="h-12 rounded-xl bg-muted/40" />
                </div>
              )}

              {budgetError && (
                <div className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="size-4 shrink-0" />
                    <span>Could not load event financial data: {budgetError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadBudget()}
                    className="underline hover:no-underline font-semibold"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!budgetLoading && !budgetError && budgetData && (
                <div className="flex flex-col gap-4">
                  {/* Financial KPI Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-border bg-background/60 p-3.5">
                      <span className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
                        Client Quotation (Revenue)
                      </span>
                      <div className="mt-1 font-mono text-sm font-bold text-foreground">
                        {budgetData.estimatedRevenue != null
                          ? formatCurrency(budgetData.estimatedRevenue)
                          : 'Under Assessment'}
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-background/60 p-3.5">
                      <span className="text-[0.6rem] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                        Reserved Asset Cost
                      </span>
                      <div className="mt-1 font-mono text-sm font-bold text-sky-700 dark:text-sky-300">
                        {formatCurrency(budgetData.estimatedAssetCost)}
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-background/60 p-3.5">
                      <span className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
                        Total Estimated Cost
                      </span>
                      <div className="mt-1 font-mono text-sm font-bold text-foreground">
                        {formatCurrency(budgetData.totalEstimatedCost)}
                      </div>
                    </div>

                    <div className={cn(
                      'rounded-xl border p-3.5',
                      budgetData.isLossMaker
                        ? 'border-rose-500/30 bg-rose-500/10'
                        : 'border-emerald-500/30 bg-emerald-500/10',
                    )}>
                      <span className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
                        Estimated Net Margin
                      </span>
                      <div className={cn(
                        'mt-1 font-mono text-sm font-bold flex items-center gap-1.5',
                        budgetData.isLossMaker
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400',
                      )}>
                        {budgetData.isLossMaker ? <TrendingDown className="size-4" /> : <TrendingUp className="size-4" />}
                        {budgetData.estimatedGrossMargin != null
                          ? formatCurrency(budgetData.estimatedGrossMargin)
                          : 'Under Assessment'}
                      </div>
                    </div>
                  </div>

                  {/* Line Item Accordions */}
                  <div className="space-y-3 pt-2">
                    <WorkspaceBudgetSection
                      title="Reserved Asset Line Items"
                      icon={Banknote}
                      items={budgetData.assetLineItems || []}
                      total={budgetData.estimatedAssetCost}
                      colorClass="text-sky-500"
                      defaultOpen={Boolean(budgetData.assetLineItems && budgetData.assetLineItems.length > 0 && budgetData.assetLineItems.length <= 4)}
                    />
                    <WorkspaceBudgetSection
                      title="Damage Liabilities"
                      icon={ShieldAlert}
                      items={budgetData.damageLineItems || []}
                      total={budgetData.totalDamageCosts}
                      colorClass="text-rose-500"
                    />
                    <WorkspaceBudgetSection
                      title="Emergency Procurement Costs"
                      icon={PackageSearch}
                      items={budgetData.procurementLineItems || []}
                      total={budgetData.totalProcurementCosts}
                      colorClass="text-amber-500"
                    />
                  </div>
                </div>
              )}

              {!budgetLoading && !budgetError && !budgetData && (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-xs text-muted-foreground">
                  Financial budget details under assessment for this event.
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-card/60 p-5">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Damage Exception Holds
                </span>
                <div className="text-xl font-bold text-foreground mt-2">
                  {damageLoading ? '...' : damageReports.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {damageError
                    ? 'Failed to load damage reports.'
                    : damageReports.length === 0
                    ? 'No transit or returned asset damage recorded.'
                    : `${damageReports.length} damage report(s) flagged during logistics checks.`}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card/60 p-5">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Settlement Blocker Status
                </span>
                <div className={cn(
                  'text-xl font-bold mt-2',
                  settlementStatus?.blocked
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400',
                )}>
                  {settlementLoading
                    ? '...'
                    : settlementStatus?.blocked
                    ? 'Settlement Blocked'
                    : 'Clear for Settlement'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {settlementError
                    ? 'Settlement check unavailable.'
                    : settlementStatus?.blocked
                    ? `${settlementStatus.blockingItemsCount} unresolved damage item(s) blocking final settlement.`
                    : 'No damage exceptions blocking project financial settlement.'}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card/60 p-5">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Replenishment Critical Deficits
                </span>
                <div className="text-xl font-bold text-foreground mt-2">
                  {deficitLoading
                    ? '...'
                    : deficitList.filter((d) => d.priority === 'Critical' || d.urgencyLevel === 'Critical').length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {deficitError
                    ? 'Deficit queue unavailable.'
                    : `${deficitList.length} replenishment item(s) logged on server.`}
                </p>
              </div>
            </div>

            {/* Event Damage Reports List */}
            <div className="rounded-2xl border border-border bg-card/60 p-6 flex flex-col gap-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif text-base font-semibold text-foreground">
                    Event Damage Reports ({damageLoading ? '...' : damageReports.length})
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Live damage exceptions recorded by ground crew (GET /api/damage-reports/event/{event.id})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    loadDamages()
                    loadSettlementStatus()
                  }}
                  title="Reload damage reports"
                  className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition"
                >
                  <RefreshCw className={cn('size-3.5', damageLoading && 'animate-spin')} />
                </button>
              </div>

              {damageLoading && (
                <div className="space-y-2 animate-pulse">
                  <div className="h-16 rounded-xl bg-muted/60" />
                  <div className="h-16 rounded-xl bg-muted/40" />
                </div>
              )}

              {damageError && (
                <div className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="size-4 shrink-0" />
                    <span>Could not load damage reports: {damageError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadDamages()}
                    className="underline hover:no-underline font-semibold"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!damageLoading && !damageError && damageReports.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {damageReports.map((report) => (
                    <div
                      key={report.id}
                      className="rounded-xl border border-border bg-background/70 p-4 flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="text-xs font-bold text-foreground">
                            {report.assetName}
                          </h5>
                          <span className="text-[0.65rem] font-mono text-muted-foreground">
                            {report.assetSku} · {report.logId}
                          </span>
                        </div>
                        <span className={cn(
                          'rounded px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider',
                          report.status === 'Pending Verdict' || report.status === 'Held for Audit'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            : 'bg-muted text-muted-foreground',
                        )}>
                          {report.status}
                        </span>
                      </div>
                      <div className="text-[0.7rem] text-muted-foreground flex items-center justify-between">
                        <span>Type: {report.damageType}</span>
                        <span>Est. Cost: {formatCurrency(report.estimatedCost || 0)}</span>
                      </div>
                      {report.notes && (
                        <p className="text-[0.68rem] text-muted-foreground border-t border-border/40 pt-1.5">
                          {report.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!damageLoading && !damageError && damageReports.length === 0 && (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-xs text-muted-foreground">
                  No damage reports flagged for this event. All assets cleared through logistics inspection.
                </div>
              )}
            </div>

            {/* Event Deficit Queue List */}
            <div className="rounded-2xl border border-border bg-card/60 p-6 flex flex-col gap-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif text-base font-semibold text-foreground">
                    Event Deficit & Material Replenishment ({deficitLoading ? '...' : deficitList.length})
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Live deficit queue items logged for this project (GET /api/deficit-queue?eventId={event.id})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loadDeficits()}
                  title="Reload deficit queue"
                  className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition"
                >
                  <RefreshCw className={cn('size-3.5', deficitLoading && 'animate-spin')} />
                </button>
              </div>

              {deficitLoading && (
                <div className="space-y-2 animate-pulse">
                  <div className="h-16 rounded-xl bg-muted/60" />
                  <div className="h-16 rounded-xl bg-muted/40" />
                </div>
              )}

              {deficitError && (
                <div className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="size-4 shrink-0" />
                    <span>Could not load deficit items: {deficitError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadDeficits()}
                    className="underline hover:no-underline font-semibold"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!deficitLoading && !deficitError && deficitList.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {deficitList.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border bg-background/70 p-4 flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="text-xs font-bold text-foreground">
                            {item.itemName || item.assetDescription || 'Material Item'}
                          </h5>
                          <span className="text-[0.65rem] text-muted-foreground">
                            Category: {item.category || item.itemCategory || 'General Asset'} · Need: {item.quantityNeeded} {item.unit || 'units'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {(item.priority === 'Critical' || item.urgencyLevel === 'Critical') && (
                            <span className="rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider">
                              Critical
                            </span>
                          )}
                          <span className="rounded bg-muted text-muted-foreground px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider">
                            {item.status || 'Pending'}
                          </span>
                        </div>
                      </div>
                      <div className="text-[0.7rem] text-muted-foreground flex items-center justify-between border-t border-border/40 pt-1.5">
                        <span>PO Ref: {item.poRef || 'Unassigned'}</span>
                        <span>Supplier: {item.supplier || 'Standard Vendor'}</span>
                        {item.etaHours && <span>ETA: {item.etaHours}h</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!deficitLoading && !deficitError && deficitList.length === 0 && (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-xs text-muted-foreground">
                  No material deficits or stockout alerts logged for this project. All items fulfilled from warehouse stock.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
