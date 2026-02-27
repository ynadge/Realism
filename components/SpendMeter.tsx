'use client'

import { MonoLabel } from '@/components/ui/MonoLabel'

type SpendMeterProps = {
  spent: number
  budget: number
}

export function SpendMeter({ spent, budget }: SpendMeterProps) {
  const pct = Math.min((spent / budget) * 100, 100)
  const barVariant = pct >= 100 ? 'error' : pct >= 90 ? 'warning' : 'accent'
  const barColor = pct >= 100
    ? 'bg-error'
    : pct >= 90
      ? 'bg-warning'
      : 'bg-accent-lime'

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <MonoLabel variant="muted" size="xs">spend</MonoLabel>
        <div className="flex items-center gap-1">
          <MonoLabel variant={barVariant} size="xs">${spent.toFixed(3)}</MonoLabel>
          <MonoLabel variant="muted" size="xs">/ ${budget.toFixed(2)}</MonoLabel>
        </div>
      </div>
      <div className="h-0.5 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {pct >= 100 && (
        <MonoLabel variant="error" size="xs">Budget reached</MonoLabel>
      )}
    </div>
  )
}
