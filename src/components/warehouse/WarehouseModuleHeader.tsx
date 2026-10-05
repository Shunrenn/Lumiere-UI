interface WarehouseModuleHeaderProps {
  title: string
  description: string
  eyebrow?: string
}

/** Shared title treatment for every Warehouse Operations Manager module. */
export function WarehouseModuleHeader({
  title,
  description,
  eyebrow = 'Warehouse Module',
}: WarehouseModuleHeaderProps) {
  return (
    <div>
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
      <h1 className="mt-1.5 font-serif text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">{title}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
