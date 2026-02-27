'use client'

import { MonoLabel } from '@/components/ui/MonoLabel'
import { SurfaceCard } from '@/components/ui/SurfaceCard'
import { Separator } from '@/components/ui/separator'
import type { SpendEvent } from '@/types'

type ReceiptProps = {
  events: SpendEvent[]
  total: number
  budget: number
}

export function Receipt({ events, total, budget }: ReceiptProps) {
  const saved = budget - total

  return (
    <SurfaceCard>
      <div className="flex flex-col gap-2">
        <MonoLabel variant="muted" size="xs" className="tracking-widest uppercase">
          Receipt
        </MonoLabel>

        <Separator className="bg-border my-1" />

        {events.map((event, i) => (
          <div key={`${event.timestamp}-${i}`} className="flex justify-between items-start gap-4">
            <div className="flex items-start gap-2 min-w-0">
              <MonoLabel variant="accent" size="xs" className="shrink-0">
                [{event.tool}]
              </MonoLabel>
              <MonoLabel variant="muted" size="xs" className="truncate">
                {event.description}
              </MonoLabel>
            </div>
            <MonoLabel size="xs" className="shrink-0">${event.cost.toFixed(3)}</MonoLabel>
          </div>
        ))}

        <Separator className="bg-border my-1" />

        <div className="flex justify-between items-center">
          <MonoLabel variant="muted" size="xs">Total</MonoLabel>
          <MonoLabel variant="accent" size="sm">${total.toFixed(3)}</MonoLabel>
        </div>

        {saved > 0.001 && (
          <div className="flex justify-between items-center">
            <MonoLabel variant="muted" size="xs">Unused budget</MonoLabel>
            <MonoLabel variant="success" size="xs">${saved.toFixed(3)}</MonoLabel>
          </div>
        )}
      </div>
    </SurfaceCard>
  )
}
