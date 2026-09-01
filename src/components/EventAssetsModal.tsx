import { useState } from 'react'
import { X, Check, AlertCircle, Users } from 'lucide-react'
import { CREW } from '@/lib/roster'
import { useDeployments } from '@/lib/deployments'

interface Asset {
  id: string
  name: string
  quantity: number
  category: string
  status: 'staged' | 'pending' | 'delivered'
  report?: string
}

interface Props {
  open: boolean
  eventTitle?: string
  onClose: () => void
}

const mockAssets: Asset[] = [
  {
    id: 'AST-001',
    name: 'Premium White Resin Tiffany Chairs',
    quantity: 150,
    category: 'Seating',
    status: 'delivered',
  },
  {
    id: 'AST-002',
    name: 'Gold Chiavari Chair Rentals',
    quantity: 80,
    category: 'Seating',
    status: 'delivered',
  },
  {
    id: 'AST-003',
    name: 'Crystal Chandelier Centerpieces',
    quantity: 24,
    category: 'Lighting',
    status: 'pending',
    report: 'Awaiting final delivery confirmation',
  },
  {
    id: 'AST-004',
    name: 'Luxury Table Linens (Ivory)',
    quantity: 50,
    category: 'Fabrics',
    status: 'staged',
  },
  {
    id: 'AST-005',
    name: 'Floral Arrangement Installations',
    quantity: 12,
    category: 'Decor',
    status: 'pending',
    report: 'Designer on-site for final arrangements',
  },
]

export function EventAssetsModal({ open, eventTitle, onClose }: Props) {
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null)
  const deployments = useDeployments()

  const statusConfig = {
    delivered: { bg: 'bg-green-50', text: 'text-green-700', label: 'Delivered', icon: Check },
    staged: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Staged', icon: Check },
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending', icon: AlertCircle },
  }

  const stagedCount = mockAssets.filter((a) => a.status !== 'pending').length
  const totalCount = mockAssets.length
  const normalizedEventTitle = (eventTitle ?? '').toLowerCase()
  const eventDeployments = deployments.filter((deployment) => deployment.event.trim().toLowerCase() === normalizedEventTitle.trim())
  const deployedNames = new Set(eventDeployments.flatMap((deployment) => [...deployment.crewLeads, ...deployment.staffMembers]))
  const assignedCrew = CREW.filter((member) => {
    const allocationEvent = member.allocation?.event.toLowerCase() ?? ''
    const rosterMatch = Boolean(member.allocation && allocationEvent && (normalizedEventTitle.includes(allocationEvent) || allocationEvent.includes(normalizedEventTitle)))
    return rosterMatch || deployedNames.has(member.name)
  })
  const deployedCrew = eventDeployments.flatMap((deployment) => [...deployment.crewLeads, ...deployment.staffMembers]).filter((name, index, names) => names.indexOf(name) === index && !assignedCrew.some((member) => member.name === name))

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-hidden="false"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-neutral-700/60 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-2xl rounded-lg border border-border bg-card shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Event Assets & Logistics
            </p>
            <h2 className="mt-1 font-serif text-2xl font-medium text-card-foreground">
              {eventTitle || 'Event Assets'}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {stagedCount} of {totalCount} items staged • Tracking and verification status
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground transition hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-96 space-y-2 overflow-y-auto px-6 py-4">
          {mockAssets.map((asset) => {
            const config = statusConfig[asset.status]
            const StatusIcon = config.icon
            const isExpanded = expandedAsset === asset.id

            return (
              <div key={asset.id} className="rounded-lg border border-border bg-background">
                <button
                  onClick={() => setExpandedAsset(isExpanded ? null : asset.id)}
                  className="w-full px-4 py-3 text-left transition hover:bg-muted"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {asset.name}
                        </h3>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] ${config.bg} ${config.text}`}>
                          {config.label}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>Qty: {asset.quantity}</span>
                        <span>Category: {asset.category}</span>
                        <span>ID: {asset.id}</span>
                      </div>
                    </div>
                    <StatusIcon className={`shrink-0 size-4 ${config.text}`} />
                  </div>
                </button>

                {isExpanded && asset.report && (
                  <div className="border-t border-border px-4 py-3 bg-muted/30">
                    <p className="text-xs font-medium text-card-foreground">Status Report:</p>
                    <p className="mt-1 text-xs text-muted-foreground">{asset.report}</p>
                  </div>
                )}
              </div>
            )
          })}
          {(assignedCrew.length > 0 || deployedCrew.length > 0) && (
            <section className="mt-4 border-t border-border pt-4" aria-labelledby="assigned-crew-heading">
              <div className="mb-3 flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <h3 id="assigned-crew-heading" className="text-[0.58rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">Assigned crew</h3>
                <span className="text-[0.58rem] text-muted-foreground">{assignedCrew.length} assigned</span>
              </div>
              <div className="space-y-2">
                {assignedCrew.map((member) => (
                  <div key={member.id} className="rounded-lg border border-border bg-card px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{member.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{member.role} · {member.employeeId}</p>
                      </div>
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-green-700">{member.status}</span>
                    </div>
                    {member.allocation && <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>{member.allocation.task}</span><span>{member.allocation.venue}</span><span>{member.allocation.date}</span></div>}
                  </div>
                ))}
                {deployedCrew.map((name) => (
                  <div key={name} className="rounded-lg border border-border bg-card px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Assigned through task deployment</p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-amber-800">Deployed</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-input bg-background px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-foreground transition hover:bg-muted"
          >
            Close
          </button>
          <button
            type="button"
            className="flex-1 rounded-md bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90"
          >
            Generate Report
          </button>
        </div>
      </div>
    </div>
  )
}
