import { useAuth } from '@/lib/auth'
export function WarehouseHeader() {
  const { adminName } = useAuth()

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      {/* Left Title & Greeting */}
      <div>
        <p className="text-[0.6rem] font-bold uppercase tracking-[0.28em] text-primary">
          Warehouse Operations Manager
        </p>
        <h1 className="mt-0.5 font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Good to see you, {adminName.split(' ')[0] || 'there'}.
        </h1>
      </div>

    </header>
  )
}
