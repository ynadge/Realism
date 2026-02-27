'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PersistentJobCard } from '@/components/PersistentJobCard'
import { MonoLabel } from '@/components/ui/MonoLabel'
import { SurfaceCard } from '@/components/ui/SurfaceCard'
import type { Job } from '@/types'

export default function Dashboard() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  async function loadJobs() {
    const res = await fetch('/api/jobs')
    if (res.status === 401) {
      router.push('/?auth=required')
      return
    }
    const data = await res.json()
    setJobs(data.jobs ?? [])
    setLoading(false)
  }

  useEffect(() => { loadJobs() }, [])

  const persistentJobs = jobs.filter(
    j => j.type === 'persistent' && j.status !== 'paused'
  )
  const historyJobs = jobs.filter(
    j => j.type === 'one-shot' || j.status === 'paused' || j.status === 'complete'
  )

  return (
    <main className="bg-mesh bg-noise min-h-screen px-4 py-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">

        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Make something new
          </button>
          <MonoLabel variant="muted" size="xs" className="tracking-widest uppercase">
            — realism —
          </MonoLabel>
        </div>

        {loading && (
          <MonoLabel variant="muted" size="xs" className="animate-pulse">
            Loading...
          </MonoLabel>
        )}

        {persistentJobs.length > 0 && (
          <section className="flex flex-col gap-3">
            <MonoLabel variant="muted" size="xs" className="tracking-widest uppercase">
              Active Monitors
            </MonoLabel>
            {persistentJobs.map(job => (
              <PersistentJobCard
                key={job.id}
                job={job}
                onCancelled={loadJobs}
              />
            ))}
          </section>
        )}

        <section className="flex flex-col gap-3">
          <MonoLabel variant="muted" size="xs" className="tracking-widest uppercase">
            History
          </MonoLabel>

          {historyJobs.length === 0 && !loading && (
            <SurfaceCard>
              <MonoLabel variant="muted" size="xs">
                Nothing yet. Go make something real.
              </MonoLabel>
            </SurfaceCard>
          )}

          {historyJobs.map(job => (
            <SurfaceCard
              key={job.id}
              className="cursor-pointer hover:border-accent-lime transition-colors"
              onClick={() => router.push(`/job/${job.id}?budget=${job.budget}`)}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="font-ui text-sm text-foreground truncate">
                    {job.goal}
                  </p>
                  <div className="flex items-center gap-2">
                    <MonoLabel variant="muted" size="xs">
                      {new Date(job.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric'
                      })}
                    </MonoLabel>
                    <MonoLabel variant="muted" size="xs">·</MonoLabel>
                    <MonoLabel
                      variant={job.status === 'complete' ? 'success' : job.status === 'failed' ? 'error' : 'muted'}
                      size="xs"
                    >
                      {job.status}
                    </MonoLabel>
                    {job.artifact?.type && (
                      <>
                        <MonoLabel variant="muted" size="xs">·</MonoLabel>
                        <MonoLabel variant="muted" size="xs">{job.artifact.type}</MonoLabel>
                      </>
                    )}
                  </div>
                </div>
                <MonoLabel variant="muted" size="xs" className="shrink-0">
                  ${job.spendTotal.toFixed(3)}
                </MonoLabel>
              </div>
            </SurfaceCard>
          ))}
        </section>

      </div>
    </main>
  )
}
