type LiveDotProps = {
  size?: 'sm' | 'md'
  className?: string
}

export function LiveDot({ size = 'sm', className = '' }: LiveDotProps) {
  const dimensions = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'

  return (
    <span
      className={`inline-block rounded-full bg-accent-lime animate-live-pulse ${dimensions} ${className}`}
      aria-label="Live"
    />
  )
}
