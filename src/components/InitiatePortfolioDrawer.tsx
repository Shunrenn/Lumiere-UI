import { useMemo, useState } from 'react'
import { X, Inbox, Building2, CalendarDays, Check, Crown } from 'lucide-react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { usePlanner, type NewPortfolioDraft, type PortfolioTier } from '@/lib/planner'
import { usePortal } from '@/lib/store'
import type { ExperienceTier } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
}

/* Admin events carry verbose experience tiers; map them to the planner's
   condensed portfolio segments. */
function mapTier(tier: ExperienceTier): PortfolioTier {
  if (tier.startsWith('Tier-1')) return 'VIP'
  if (tier.startsWith('Tier-2')) return 'Premium'
  return 'Corporate'
}

const tierBadge: Record<PortfolioTier, string> = {
  VIP: 'bg-primary/10 text-primary border-primary/30',
  Premium: 'bg-amber-100 text-amber-800 border-amber-300',
  Corporate: 'bg-muted text-muted-foreground border-border',
}

export function InitiatePortfolioDrawer({ open, onClose }: Props) {
  const { addPortfolio, events: pipelineEvents } = usePlanner()
  const { events: adminEvents } = usePortal()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  /* Only surface admin events that have not already been pulled into the
     planner pipeline (compared by title). */
  const availableEvents = useMemo(() => {
    const claimed = new Set(pipelineEvents.map((e) => e.title.toLowerCase()))
    return adminEvents.filter((e) => !claimed.has(e.title.toLowerCase()))
  }, [adminEvents, pipelineEvents])

  const selected = availableEvents.find((e) => e.id === selectedId) ?? null

  const close = () => {
    setSelectedId(null)
    setConfirmOpen(false)
    onClose()
  }

  const submit = () => {
    if (!selected) return
    const draft: NewPortfolioDraft = {
      title: selected.title,
      client: selected.client,
      tier: mapTier(selected.tier),
      venue: selected.venue,
      date: selected.targetDate,
    }
    addPortfolio(draft)
    close()
  }

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-foreground/60 backdrop-blur-sm transition-opacity ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={close}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Initiate new event portfolio"
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-card shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Lumière · Pipeline — Assignment Intake
            </p>
            <h2 className="mt-1 font-serif text-2xl font-medium text-card-foreground">
              Initiate New Event Portfolio
            </h2>
            <p className="mt-0.5 text-[0.58rem] uppercase tracking-[0.15em] text-muted-foreground">
              Select an admin-assigned event to onboard
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="text-muted-foreground transition hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mb-4 flex items-center gap-2 border-b border-border pb-2">
            <Inbox className="size-3.5 text-primary" />
            <h3 className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-card-foreground">
              Events Assigned by Admin
            </h3>
          </div>

          {availableEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Inbox className="size-6 text-muted-foreground" />
              </span>
              <h4 className="mt-5 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-foreground">
                No New Assignments
              </h4>
              <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
                Every event assigned by the admin has already been onboarded into your pipeline. New
                portfolios appear here once the admin registers an event.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableEvents.map((ev) => {
                const tier = mapTier(ev.tier)
                const active = ev.id === selectedId
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setSelectedId(ev.id)}
                    aria-pressed={active}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      active
                        ? 'border-primary bg-primary/5 ring-2 ring-ring/30'
                        : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[0.55rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                          {ev.refId}
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-card-foreground">
                          {ev.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{ev.client}</p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[0.52rem] font-bold uppercase tracking-[0.1em] ${tierBadge[tier]}`}
                      >
                        {tier === 'VIP' && <Crown className="size-2.5" />}
                        {tier}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.65rem] text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="size-3" />
                        {ev.venue}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-3" />
                        {ev.targetDate}
                      </span>
                    </div>
                    {active && (
                      <div className="mt-3 flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary">
                        <Check className="size-3.5" />
                        Selected for onboarding
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={!selected}
            className="w-full rounded-md bg-primary px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Onboard to Pipeline →
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        eyebrow="Pipeline Initialization"
        title="Onboard Assigned Event"
        confirmLabel="Initialize Portfolio"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          submit()
        }}
        description={
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-sm font-semibold text-card-foreground">
                {selected?.title || 'No event selected'}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {selected?.client} · {selected ? mapTier(selected.tier) : ''}
              </p>
            </div>
            <p>
              This will onboard the admin-assigned event into Phase I — Concept Definition of your
              pipeline. Proceed?
            </p>
          </div>
        }
      />
    </div>
  )
}
