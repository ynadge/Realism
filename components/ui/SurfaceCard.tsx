import { cn } from '@/lib/utils'

type SurfaceCardProps = {
  children: React.ReactNode
  className?: string
  padded?: boolean
  onClick?: () => void
}

export function SurfaceCard({ children, className, padded = true, onClick }: SurfaceCardProps) {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-md',
        padded && 'p-4',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
    >
      {children}
    </div>
  )
}
