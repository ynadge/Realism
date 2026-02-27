import { cn } from '@/lib/utils'

type SurfaceCardProps = {
  children: React.ReactNode
  className?: string
  padded?: boolean
}

export function SurfaceCard({ children, className, padded = true }: SurfaceCardProps) {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-md',
        padded && 'p-4',
        className
      )}
    >
      {children}
    </div>
  )
}
