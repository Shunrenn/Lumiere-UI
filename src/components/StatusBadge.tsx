import React from 'react'
import { cn } from '@/lib/utils'

export type StatusVariant =
  | 'success'
  | 'warning'
  | 'destructive'
  | 'danger'
  | 'info'
  | 'accent'
  | 'neutral'

export type StatusSize = 'sm' | 'md'

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: StatusVariant
  size?: StatusSize
  showDot?: boolean
  dotClassName?: string
  icon?: React.ReactNode
  children: React.ReactNode
}

const variantStyles: Record<
  StatusVariant,
  {
    container: string
    dot: string
  }
> = {
  success: {
    container:
      'bg-emerald-100 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/60',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
  },
  warning: {
    container:
      'bg-amber-100 text-amber-900 border-amber-200/80 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/60',
    dot: 'bg-amber-500 dark:bg-amber-400',
  },
  destructive: {
    container:
      'bg-rose-100 text-rose-800 border-rose-200/80 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/60',
    dot: 'bg-rose-500 dark:bg-rose-400',
  },
  danger: {
    container:
      'bg-rose-100 text-rose-800 border-rose-200/80 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/60',
    dot: 'bg-rose-500 dark:bg-rose-400',
  },
  info: {
    container:
      'bg-sky-100 text-sky-800 border-sky-200/80 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-800/60',
    dot: 'bg-sky-500 dark:bg-sky-400',
  },
  accent: {
    container:
      'bg-indigo-100 text-indigo-800 border-indigo-200/80 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800/60',
    dot: 'bg-indigo-500 dark:bg-indigo-400',
  },
  neutral: {
    container:
      'bg-muted/80 text-muted-foreground border-border/80 dark:bg-muted/50 dark:text-muted-foreground dark:border-border/60',
    dot: 'bg-muted-foreground/60 dark:bg-muted-foreground/50',
  },
}

const sizeStyles: Record<
  StatusSize,
  {
    container: string
    dot: string
    icon: string
  }
> = {
  sm: {
    container: 'px-2 py-0.5 text-[0.55rem] tracking-[0.1em]',
    dot: 'size-1.5',
    icon: 'size-3',
  },
  md: {
    container: 'px-2.5 py-1 text-[0.6rem] tracking-[0.1em]',
    dot: 'size-2',
    icon: 'size-3.5',
  },
}

export function StatusBadge({
  variant = 'neutral',
  size = 'sm',
  showDot = true,
  dotClassName,
  icon,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  const v = variantStyles[variant] ?? variantStyles.neutral
  const s = sizeStyles[size] ?? sizeStyles.sm

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-bold uppercase select-none transition-colors',
        v.container,
        s.container,
        className,
      )}
      {...props}
    >
      {icon ? (
        <span className={cn('shrink-0', s.icon)} aria-hidden="true">
          {icon}
        </span>
      ) : showDot ? (
        <span
          className={cn('shrink-0 rounded-full', s.dot, v.dot, dotClassName)}
          aria-hidden="true"
        />
      ) : null}
      <span className="truncate">{children}</span>
    </span>
  )
}
