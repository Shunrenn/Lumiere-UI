import { useState, useRef, useEffect, useMemo } from 'react'
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react'
import { useWarehouseVendors } from '@/lib/warehouse-vendors'
import { AddVendorModal } from '@/components/warehouse/vendors/AddVendorModal'
import { cn } from '@/lib/utils'

interface SearchableVendorSelectProps {
  value: string
  onChange: (vendorId: string) => void
  placeholder?: string
  label?: string
  allowAdd?: boolean
  disabled?: boolean
  className?: string
}

export function SearchableVendorSelect({
  value,
  onChange,
  placeholder = 'Select vendor…',
  label,
  allowAdd = true,
  disabled = false,
  className,
}: SearchableVendorSelectProps) {
  const vendors = useWarehouseVendors()
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [addVendorOpen, setAddVendorOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedVendor = useMemo(
    () => vendors.find((v) => v.id === value),
    [vendors, value],
  )

  const filteredVendors = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return vendors
    return vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.specialty.toLowerCase().includes(q) ||
        v.contactName.toLowerCase().includes(q),
    )
  }, [vendors, search])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (vendorId: string) => {
    onChange(vendorId)
    setIsOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setSearch('')
  }

  return (
    <div className={cn('relative flex flex-col gap-1', className)} ref={containerRef}>
      {label && (
        <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </span>
      )}

      {/* Control Button */}
      <div
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            setIsOpen(!isOpen)
          }
        }}
        className={cn(
          'flex min-h-[38px] w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground transition outline-none focus:border-primary focus:ring-1.5 focus:ring-primary/30',
          disabled && 'cursor-not-allowed opacity-50',
          !disabled && 'cursor-pointer hover:border-primary/50',
        )}
      >
        <span className="truncate">
          {selectedVendor ? (
            <span className="flex items-center gap-2">
              <span className="font-medium text-foreground">{selectedVendor.name}</span>
              {selectedVendor.status !== 'Active' && (
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider',
                    selectedVendor.status === 'On Hold'
                      ? 'bg-amber-500/10 text-amber-600'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {selectedVendor.status}
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>

        <div className="flex items-center gap-1">
          {selectedVendor && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear selection"
            >
              <X className="size-3.5" />
            </button>
          )}
          <ChevronDown className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
        </div>
      </div>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-[105%] z-50 flex max-h-64 w-full flex-col overflow-hidden rounded-md border border-border bg-card shadow-lg animate-in fade-in-50 zoom-in-95">
          {/* Search Box */}
          <div className="relative border-b border-border p-2">
            <Search className="absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendor name or specialty…"
              className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-3 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
          </div>

          {/* Vendors List */}
          <div className="flex-1 overflow-y-auto p-1">
            {filteredVendors.length === 0 ? (
              <p className="px-3 py-2 text-center text-xs text-muted-foreground">No vendors match your search.</p>
            ) : (
              filteredVendors.map((vendor) => {
                const isSelected = vendor.id === value
                return (
                  <button
                    key={vendor.id}
                    type="button"
                    onClick={() => handleSelect(vendor.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition hover:bg-accent',
                      isSelected && 'bg-accent/60 font-medium text-foreground',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium text-card-foreground">{vendor.name}</span>
                        {vendor.status !== 'Active' && (
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.2 text-[0.55rem] font-bold uppercase tracking-wider',
                              vendor.status === 'On Hold'
                                ? 'bg-amber-500/10 text-amber-600'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {vendor.status}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[0.62rem] text-muted-foreground">{vendor.specialty}</p>
                    </div>
                    {isSelected && <Check className="size-3.5 shrink-0 text-primary" />}
                  </button>
                )
              })
            )}
          </div>

          {/* Add New Vendor Action */}
          {allowAdd && (
            <div className="border-t border-border p-1 bg-muted/30">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  setAddVendorOpen(true)
                }}
                className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
              >
                <Plus className="size-3.5" />
                <span>+ Add new vendor…</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Vendor Modal */}
      {addVendorOpen && (
        <AddVendorModal
          onClose={() => setAddVendorOpen(false)}
          onCreated={(newVendor) => {
            onChange(newVendor.id)
            setAddVendorOpen(false)
          }}
        />
      )}
    </div>
  )
}
