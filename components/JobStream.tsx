'use client'

import { LiveDot } from '@/components/ui/LiveDot'
import { MonoLabel } from '@/components/ui/MonoLabel'
import type { SpendEvent } from '@/types'

type JobStreamProps = {
  events: SpendEvent[]
  isLive: boolean
}

export function JobStream({ events, isLive }: JobStreamProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {isLive && <LiveDot />}
        <MonoLabel variant={isLive ? 'accent' : 'muted'} size="xs">
          {isLive ? 'WORKING' : 'DONE'}
        </MonoLabel>
      </div>

      <div className="flex flex-col gap-1.5">
        {events.length === 0 && isLive && (
          <MonoLabel variant="muted" size="xs" className="animate-pulse">
            Starting...
          </MonoLabel>
        )}
        {events.map((event, i) => (
          <div
            key={`${event.timestamp}-${i}`}
            className="flex items-start justify-between gap-3 animate-stream-in"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="flex items-start gap-2 min-w-0">
              <MonoLabel variant="accent" size="xs" className="shrink-0">
                [{event.tool}]
              </MonoLabel>
              <MonoLabel variant="muted" size="xs" className="truncate">
                {event.description}
              </MonoLabel>
            </div>
            <MonoLabel variant="muted" size="xs" className="shrink-0">
              ${event.cost.toFixed(3)}
            </MonoLabel>
          </div>
        ))}
      </div>
    </div>
  )
}
