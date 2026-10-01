import { ConsoleLayout } from '@/components/ConsoleLayout'
import { VendorManagementModule } from '@/components/warehouse/vendors/VendorManagementModule'

export function VendorManagementPage() {
  return (
    <ConsoleLayout>
      <div className="space-y-6">
        <header className="border-b border-border pb-5">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.24em] text-primary">
            Warehouse Operations
          </p>
          <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-medium text-foreground">
            Vendor Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Manage approved supplier registry, fulfillment contacts, and procurement lead times.
          </p>
        </header>
        <VendorManagementModule />
      </div>
    </ConsoleLayout>
  )
}
