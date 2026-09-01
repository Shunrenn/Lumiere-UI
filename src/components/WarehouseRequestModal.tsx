import { useState } from 'react'
import { X, CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface WarehouseRequest {
  id: string
  itemName: string
  quantity: number
  requestedBy: string
  date: string
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled'
  department: string
  priority: 'low' | 'medium' | 'high'
}

interface Props {
  open: boolean
  onClose: () => void
  onApprove?: (requestId: string) => void
  onReject?: (requestId: string) => void
}

const mockRequests: WarehouseRequest[] = [
  {
    id: 'WRQ-001',
    itemName: 'Premium White Resin Tiffany Chairs',
    quantity: 50,
    requestedBy: 'Sarah Chen (Event Coordinator)',
    date: '2026-06-18 10:30 AM',
    status: 'pending',
    department: 'Events Management',
    priority: 'high',
  },
  {
    id: 'WRQ-002',
    itemName: 'Crystal Chandelier Centerpieces',
    quantity: 8,
    requestedBy: 'Marco Delgado (Logistics)',
    date: '2026-06-18 09:15 AM',
    status: 'pending',
    department: 'Logistics',
    priority: 'high',
  },
  {
    id: 'WRQ-003',
    itemName: 'Luxury Table Linens (Ivory)',
    quantity: 25,
    requestedBy: 'Jennifer Park (Styling)',
    date: '2026-06-17 03:45 PM',
    status: 'approved',
    department: 'Styling & Design',
    priority: 'medium',
  },
  {
    id: 'WRQ-004',
    itemName: 'Floral Arrangement Installations',
    quantity: 6,
    requestedBy: 'Antoine Devereaux (Design)',
    date: '2026-06-17 02:20 PM',
    status: 'fulfilled',
    department: 'Design',
    priority: 'medium',
  },
]

const statusConfig = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock, label: 'Pending Review' },
  approved: { bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle, label: 'Approved' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', icon: AlertCircle, label: 'Rejected' },
  fulfilled: { bg: 'bg-blue-50', text: 'text-blue-700', icon: CheckCircle, label: 'Fulfilled' },
}

const priorityConfig = {
  low: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Low' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Medium' },
  high: { bg: 'bg-rose-100', text: 'text-rose-800', label: 'High' },
}

export function WarehouseRequestModal({ open, onClose, onApprove, onReject }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleApprove = (id: string) => {
    onApprove?.(id)
    setSelectedId(null)
  }

  const handleReject = (id: string) => {
    onReject?.(id)
    setSelectedId(null)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-neutral-700/60 transition-opacity ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full max-w-3xl rounded-lg border border-border bg-card shadow-xl transition-transform ${
          open ? 'scale-100' : 'scale-95'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Warehouse Management · Order Requests
            </p>
            <h2 className="mt-1 font-serif text-2xl font-medium text-card-foreground">
              Warehouse Order Requests
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {mockRequests.filter((r) => r.status === 'pending').length} pending • Review and approve internal requests
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
          {mockRequests.map((request) => {
            const statusCfg = statusConfig[request.status]
            const priorityCfg = priorityConfig[request.priority]
            const StatusIcon = statusCfg.icon
            const isSelected = selectedId === request.id

            return (
              <div
                key={request.id}
                className={`rounded-lg border-2 p-4 transition cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/20'
                }`}
                onClick={() => setSelectedId(isSelected ? null : request.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{request.itemName}</h3>
                      <div className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] ${statusCfg.bg} ${statusCfg.text}`}>
                        <StatusIcon className="size-3" />
                        {statusCfg.label}
                      </div>
                      <div
                        className={`rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] ${priorityCfg.bg} ${priorityCfg.text}`}
                      >
                        {priorityCfg.label} Priority
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                      <div>
                        <p className="font-medium uppercase tracking-[0.1em] text-muted-foreground">
                          Quantity
                        </p>
                        <p className="mt-0.5 font-semibold text-foreground">{request.quantity} units</p>
                      </div>
                      <div>
                        <p className="font-medium uppercase tracking-[0.1em] text-muted-foreground">
                          Requested By
                        </p>
                        <p className="mt-0.5 font-semibold text-foreground truncate">
                          {request.requestedBy}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium uppercase tracking-[0.1em] text-muted-foreground">
                          Department
                        </p>
                        <p className="mt-0.5 font-semibold text-foreground">{request.department}</p>
                      </div>
                      <div>
                        <p className="font-medium uppercase tracking-[0.1em] text-muted-foreground">
                          Request ID
                        </p>
                        <p className="mt-0.5 font-mono text-foreground">{request.id}</p>
                      </div>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      Requested: {request.date}
                    </p>
                  </div>
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition ${
                      isSelected ? 'border-primary bg-primary' : 'border-border'
                    }`}
                  >
                    {isSelected && <CheckCircle className="size-4 text-primary-foreground" />}
                  </div>
                </div>

                {/* Action buttons for pending requests */}
                {isSelected && request.status === 'pending' && (
                  <div className="mt-4 flex gap-2 border-t border-border pt-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleReject(request.id)
                      }}
                      className="flex-1 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-destructive transition hover:bg-destructive/20"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleApprove(request.id)
                      }}
                      className="flex-1 rounded-md bg-green-600 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-green-700"
                    >
                      Approve Order
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-foreground transition hover:bg-muted"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
