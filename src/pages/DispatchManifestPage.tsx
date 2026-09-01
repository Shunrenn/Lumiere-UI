import { useMemo, useState } from 'react'
import { Search, ClipboardCheck, MapPin, Calendar, Briefcase } from 'lucide-react'
import { ConsoleLayout } from '@/components/ConsoleLayout'
import { VerifyHandoffModal } from '@/components/VerifyHandoffModal'
import { ManifestDetailModal } from '@/components/ManifestDetailModal'
import { cn } from '@/lib/utils'

type HandshakeStatus = 'Pending Verification' | 'In Transit' | 'Completed'

interface Manifest {
  id: string
  manifestId: string
  vehicle: string
  event: string
  venue: string
  date: string
  fieldTask: string
  logisticsHandoff: string
  fieldReceiver: string
  status: HandshakeStatus
}

const MANIFESTS: Manifest[] = [
  {
    id: 'm-1',
    manifestId: 'MNF-9940',
    vehicle: 'Truck Alpha (6-Ton)',
    event: 'Spring Gala 2026',
    venue: 'The Peninsula Manila',
    date: '28 May 2026',
    fieldTask: 'Scenic Backdrop & Floral Arch Setup',
    logisticsHandoff: 'M. Kowalski',
    fieldReceiver: 'Eleanor Vance',
    status: 'Pending Verification',
  },
  {
    id: 'm-2',
    manifestId: 'MNF-9941',
    vehicle: 'Van Beta (Transit)',
    event: 'Fashion Week Gala',
    venue: 'Chateau Grand Ballroom',
    date: '28 May 2026',
    fieldTask: 'Logistics & Fleet Coordination',
    logisticsHandoff: 'J. Santos',
    fieldReceiver: 'Sebastian Cross',
    status: 'In Transit',
  },
  {
    id: 'm-3',
    manifestId: 'MNF-9938',
    vehicle: 'Truck Gamma (4-Ton)',
    event: 'Private Exhibit',
    venue: 'Shangri-La Horizon Room',
    date: '30 May 2026',
    fieldTask: 'Lighting Rig Setup & Calibration',
    logisticsHandoff: 'M. Kowalski',
    fieldReceiver: 'Marcus Sterling',
    status: 'Completed',
  },
  {
    id: 'm-4',
    manifestId: 'MNF-9942',
    vehicle: 'Van Delta (Transit)',
    event: 'Golden Anniversary Soirée',
    venue: 'Raffles Makati Grand Salon',
    date: '01 Jun 2026',
    fieldTask: 'Tablescape & Candle Ambiance Setup',
    logisticsHandoff: 'R. Nakamura',
    fieldReceiver: 'J. Moreau',
    status: 'Pending Verification',
  },
  {
    id: 'm-5',
    manifestId: 'MNF-9943',
    vehicle: 'Truck Echo (6-Ton)',
    event: 'Corporate Gala Night',
    venue: 'Solaire Resort Grand Ballroom',
    date: '02 Jun 2026',
    fieldTask: 'AV Staging & Backdrop Assembly',
    logisticsHandoff: 'S. Chen',
    fieldReceiver: 'Eleanor Vance',
    status: 'Pending Verification',
  },
]

const STATUS_META: Record<HandshakeStatus, { badge: string; dot: string }> = {
  'Pending Verification': { badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  'In Transit':           { badge: 'bg-sky-100 text-sky-800',    dot: 'bg-sky-500'   },
  'Completed':            { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
}

type Filter = 'All Active' | HandshakeStatus

const FILTERS: Filter[] = ['All Active', 'Pending Verification', 'In Transit', 'Completed']

const KPIS = [
  { label: 'Awaiting Handshake',   value: '3',  sub: 'Manifests arrived at venue loading bays',   accent: 'text-foreground'    },
  { label: 'In Transit Custody',   value: '9',  sub: 'En route to event destinations',            accent: 'text-foreground'    },
  { label: 'Verified Today',       value: '14', sub: 'Successful digital handshakes completed',   accent: 'text-foreground'    },
  { label: 'Discrepancy Alerts',   value: '0',  sub: 'All quantities perfectly reconciled',       accent: 'text-emerald-700'   },
]

function actionsFor(status: HandshakeStatus): [string, string] {
  switch (status) {
    case 'Pending Verification': return ['Review & Sign', '']
    case 'In Transit':           return ['View Manifest', '']
    case 'Completed':            return ['View Manifest', '']
  }
}

export function DispatchManifestPage() {
  const [query,        setQuery]        = useState('')
  const [filter,       setFilter]       = useState<Filter>('All Active')
  const [manifests,    setManifests]    = useState<Manifest[]>(MANIFESTS)
  const [verifyOpen,   setVerifyOpen]   = useState(false)
  const [preselectedId,setPreselectedId]= useState<string | null>(null)
  const [detailFor,    setDetailFor]    = useState<Manifest | null>(null)

  const pendingManifests = useMemo(
    () => manifests.filter((m) => m.status === 'Pending Verification'),
    [manifests],
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return manifests.filter((m) => {
      const matchesFilter = filter === 'All Active' || m.status === filter
      const matchesQuery =
        !q ||
        m.manifestId.toLowerCase().includes(q) ||
        m.vehicle.toLowerCase().includes(q) ||
        m.fieldReceiver.toLowerCase().includes(q) ||
        m.event.toLowerCase().includes(q) ||
        m.fieldTask.toLowerCase().includes(q) ||
        m.venue.toLowerCase().includes(q)
      return matchesFilter && matchesQuery
    })
  }, [query, filter, manifests])

  const openVerify = (manifestId: string | null) => {
    setPreselectedId(manifestId)
    setVerifyOpen(true)
  }

  const handleVerifyAuthorize = (manifestId: string) => {
    setManifests((prev) =>
      prev.map((m) => (m.id === manifestId ? { ...m, status: 'In Transit' as HandshakeStatus } : m)),
    )
  }

  return (
    <ConsoleLayout>
      {/* Header */}
      <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Warehouse · Dispatch Records
          </p>
          <h1 className="mt-1 font-serif text-3xl font-medium tracking-tight text-foreground lg:text-4xl">
            Automated Asset Allocation &amp; Handshake
          </h1>
          <p className="mt-2 max-w-xl text-xs italic text-muted-foreground">
            Real-time deployment manifest showing auto-allocated events, tasks, and asset custody
            verification between warehouse logistics and on-site field leads.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search manifest, event, task, or lead..."
              className="w-full rounded-md border border-input bg-card py-2.5 pl-9 pr-3 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30 sm:w-64"
            />
          </div>
          <button
            type="button"
            onClick={() => openVerify(null)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90"
          >
            <ClipboardCheck className="size-3.5" />
            Verify Handoff
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-7 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="bg-card p-5 sm:p-6">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {k.label}
            </p>
            <p className={cn('mt-3 font-sans text-2xl font-bold leading-none', k.accent)}>
              {k.value}
            </p>
            <p className="mt-3 text-[0.6rem] uppercase tracking-[0.08em] text-muted-foreground">
              {k.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Manifest table */}
      <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-2xl font-medium tracking-tight text-card-foreground">
              Active Deployment Manifests
            </h2>
            <span className="rounded-full bg-muted px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {filtered.length} Manifests
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-[0.56rem] font-semibold uppercase tracking-[0.1em] transition',
                  filter === f
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted',
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead>
              <tr className="bg-sidebar/95">
                {['Manifest ID', 'Event / Venue', 'Schedule Date', 'Field Task', 'Crew Lead', 'Handshake Status', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className={cn(
                      'px-5 py-3.5 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-sidebar-primary',
                      h === 'Actions' && 'text-right',
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-xs text-muted-foreground">
                    No manifests match the current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const [primary] = actionsFor(m.status)
                  const meta = STATUS_META[m.status]
                  return (
                    <tr key={m.id} className="border-t border-border/60 align-middle">
                      <td className="px-5 py-4 text-xs font-medium text-card-foreground">
                        {m.manifestId}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-2">
                          <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-card-foreground">{m.event}</p>
                            <p className="truncate text-[0.6rem] text-muted-foreground">{m.venue}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-xs text-card-foreground">
                          <Calendar className="size-3.5 text-muted-foreground" />
                          {m.date}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-2">
                          <Briefcase className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                          <p className="truncate text-xs text-card-foreground">{m.fieldTask}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs font-medium text-card-foreground">{m.fieldReceiver}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em]',
                            meta.badge,
                          )}
                        >
                          <span className={cn('size-1.5 rounded-full', meta.dot)} />
                          {m.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (m.status === 'Pending Verification') {
                              openVerify(m.id)
                            } else {
                              setDetailFor(m)
                            }
                          }}
                          className="cursor-pointer text-[0.6rem] font-bold uppercase tracking-[0.1em] text-card-foreground underline-offset-4 transition hover:underline"
                        >
                          {primary}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-border px-5 py-4">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Showing {filtered.length} of {manifests.length} deployment manifest records
          </p>
        </div>
      </div>

      {/* Modals */}
      <VerifyHandoffModal
        open={verifyOpen}
        manifests={pendingManifests}
        preselectedId={preselectedId}
        onClose={() => {
          setVerifyOpen(false)
          setPreselectedId(null)
        }}
        onAuthorize={handleVerifyAuthorize}
      />
      <ManifestDetailModal manifest={detailFor} onClose={() => setDetailFor(null)} />
    </ConsoleLayout>
  )
}
