interface WarehouseModuleHeaderProps {
  title: string
  description: string
  eyebrow?: string
}

/** Shared title treatment for Warehouse Operations Manager modules. */
export function WarehouseModuleHeader({
  title,
  description,
  eyebrow,
}: WarehouseModuleHeaderProps) {
  return (
    <div>
      {eyebrow ? (
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
      ) : null}
      <h1 className="mt-1 font-serif text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
