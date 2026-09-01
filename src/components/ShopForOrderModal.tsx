import { useState } from 'react'
import { X, ShoppingCart, Check } from 'lucide-react'

interface Supplier {
  id: string
  name: string
  leadTime: string
  price: number
  stock: number
  rating: number
}

interface Props {
  open: boolean
  itemName?: string
  quantity?: number
  onClose: () => void
  onSelect?: (supplier: Supplier) => void
}

const mockSuppliers: Supplier[] = [
  {
    id: 'SUP-001',
    name: 'Prestige Event Rentals Co.',
    leadTime: '24h',
    price: 12.50,
    stock: 450,
    rating: 4.8,
  },
  {
    id: 'SUP-002',
    name: 'European Furnishings Ltd.',
    leadTime: '48h',
    price: 11.20,
    stock: 320,
    rating: 4.6,
  },
  {
    id: 'SUP-003',
    name: 'Global Event Supplies',
    leadTime: '72h',
    price: 10.80,
    stock: 200,
    rating: 4.4,
  },
  {
    id: 'SUP-004',
    name: 'Premium Logistics & Rental',
    leadTime: '36h',
    price: 13.00,
    stock: 380,
    rating: 4.9,
  },
]

export function ShopForOrderModal({
  open,
  itemName,
  quantity = 150,
  onClose,
  onSelect,
}: Props) {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null)

  const handleSelect = () => {
    if (selectedSupplierId) {
      const supplier = mockSuppliers.find((s) => s.id === selectedSupplierId)
      if (supplier && onSelect) {
        onSelect(supplier)
      }
      onClose()
    }
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
        className={`relative z-10 w-full max-w-2xl rounded-lg border border-border bg-card shadow-xl transition-transform ${
          open ? 'scale-100' : 'scale-95'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Procurement · Supplier Selection
            </p>
            <h2 className="mt-1 font-serif text-2xl font-medium text-card-foreground">
              Shop for Order
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {itemName} • Qty: {quantity} units • Select best supplier
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
        <div className="space-y-2 px-6 py-4">
          {mockSuppliers.map((supplier) => (
            <button
              key={supplier.id}
              type="button"
              onClick={() => setSelectedSupplierId(supplier.id)}
              className={`w-full rounded-lg border-2 p-4 text-left transition ${
                selectedSupplierId === supplier.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{supplier.name}</h3>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-amber-600">★ {supplier.rating}</span>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                    <div>
                      <p className="font-medium uppercase tracking-[0.1em] text-muted-foreground">
                        Lead Time
                      </p>
                      <p className="mt-0.5 font-semibold text-foreground">{supplier.leadTime}</p>
                    </div>
                    <div>
                      <p className="font-medium uppercase tracking-[0.1em] text-muted-foreground">
                        Unit Price
                      </p>
                      <p className="mt-0.5 font-semibold text-foreground">₱{supplier.price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="font-medium uppercase tracking-[0.1em] text-muted-foreground">
                        Available
                      </p>
                      <p className="mt-0.5 font-semibold text-foreground">{supplier.stock} units</p>
                    </div>
                    <div>
                      <p className="font-medium uppercase tracking-[0.1em] text-muted-foreground">
                        Total Cost
                      </p>
                      <p className="mt-0.5 font-semibold text-primary">
                        ₱{(supplier.price * quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition ${
                    selectedSupplierId === supplier.id
                      ? 'border-primary bg-primary'
                      : 'border-border'
                  }`}
                >
                  {selectedSupplierId === supplier.id && (
                    <Check className="size-4 text-primary-foreground" />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-input bg-background px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-foreground transition hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSelect}
            disabled={!selectedSupplierId}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ShoppingCart className="size-4" />
            Place Order
          </button>
        </div>
      </div>
    </div>
  )
}
