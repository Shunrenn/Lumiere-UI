import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PwaButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  children: ReactNode
}

export function PwaButton({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className,
  disabled,
  ...props
}: PwaButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl text-xs font-bold uppercase tracking-[0.14em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
        variant === 'primary' && 'bg-primary text-primary-foreground shadow-sm hover:opacity-90',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        variant === 'outline' && 'border border-border bg-card text-foreground hover:bg-accent/50',
        variant === 'ghost' && 'text-muted-foreground hover:bg-accent/40 hover:text-foreground',
        variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:opacity-90',
        size === 'sm' && 'min-h-[38px] px-3 text-[0.65rem]',
        size === 'md' && 'min-h-[44px] px-4 text-xs',
        size === 'lg' && 'min-h-[50px] px-5 text-sm',
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  )
}
