'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SurfaceCard } from '@/components/ui/SurfaceCard'
import { MonoLabel } from '@/components/ui/MonoLabel'
import { LiveDot } from '@/components/ui/LiveDot'
import type { Job } from '@/types'

type PersistentJobCardProps = {
  job: Job
  onCancelled?: () => void
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function PersistentJobCard({ job, onCancelled }: PersistentJobCardProps) {
  const router = useRouter()
  const [cancelling, setCancelling] = useState(false)

  async function handleCancel() {
    if (!confirm('Stop this monitor? This cannot be undone.')) return
    setCancelling(true)
    await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' })
    onCancelled?.()
    setCancelling(false)
  }

  const isActive = job.status === 'running' || job.status === 'pending'

  return (
    <SurfaceCard>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {isActive && <LiveDot />}
            <MonoLabel
              variant={isActive ? 'accent' : 'muted'}
              size="xs"
            >
              {isActive ? 'ACTIVE' : job.status.toUpperCase()}
            </MonoLabel>
            <MonoLabel variant="muted" size="xs">
              {job.cadence ?? 'recurring'}
            </MonoLabel>
          </div>
          <MonoLabel variant="muted" size="xs">
            ${job.spendTotal.toFixed(2)} total
          </MonoLabel>
        </div>

        <p className="font-ui text-sm text-foreground leading-snug line-clamp-2">
          {job.goal}
        </p>

        <div className="flex items-center justify-between flex-wrap gap-1">
          <MonoLabel variant="muted" size="xs">
            {job.lastRunAt
              ? `Last run: ${relativeTime(job.lastRunAt)}`
              : 'Not yet run'}
          </MonoLabel>
          {job.nextRunAt && (
            <MonoLabel variant="muted" size="xs">
              Next: {new Date(job.nextRunAt).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </MonoLabel>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1">
          {job.artifact && (
            <button
              onClick={() => router.push(`/job/${job.id}?budget=${job.budget}`)}
              className="font-mono text-xs text-accent-lime hover:underline"
            >
              View last result →
            </button>
          )}
          {isActive && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="font-mono text-xs text-muted-foreground hover:text-error transition-colors"
            >
              {cancelling ? 'Stopping...' : 'Stop monitor'}
            </button>
          )}
        </div>
      </div>
    </SurfaceCard>
  )
}
