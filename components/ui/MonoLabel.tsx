import { cn } from '@/lib/utils'

type MonoLabelProps = {
  children: React.ReactNode
  variant?: 'default' | 'accent' | 'muted' | 'success' | 'warning' | 'error'
  size?: 'xs' | 'sm' | 'md'
  className?: string
}

const variantClasses = {
  default: 'text-foreground',
  accent:  'text-accent-lime',
  muted:   'text-muted-foreground',
  success: 'text-success',
  warning: 'text-warning',
  error:   'text-error',
}

const sizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
}

export function MonoLabel({
  children,
  variant = 'default',
  size = 'sm',
  className,
}: MonoLabelProps) {
  return (
    <span
      className={cn(
        'font-mono',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  )
}
