'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PersistentJobCard } from '@/components/PersistentJobCard'
import { MonoLabel } from '@/components/ui/MonoLabel'
import { SurfaceCard } from '@/components/ui/SurfaceCard'
import type { Job } from '@/types'
import type { LiveAppConfig, DesignPersonalityId } from '@/types/live'

const PERSONALITY_NAMES: Record<DesignPersonalityId, string> = {
  'financial-data': 'Terminal',
  'music-culture': 'Editorial',
  'personal-utility': 'Tool',
  'news-intelligence': 'Brief',
  'default': 'Clean',
}

export default function Dashboard() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [liveApps, setLiveApps] = useState<LiveAppConfig[]>([])
  const [liveUserId, setLiveUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadJobs() {
    try {
      const res = await fetch('/api/jobs')
      if (res.status === 401) {
        router.push('/?auth=required')
        return
      }
      if (!res.ok) {
        setError(`Failed to load jobs (${res.status}).`)
        return
      }
      const data = await res.json()
      setJobs(data.jobs ?? [])
    } catch {
      setError('Connection error. Check your network and try again.')
    }
  }

  async function loadLiveApps() {
    try {
      const res = await fetch('/api/live/apps')
      if (!res.ok) return
      const data = await res.json()
      setLiveApps(data.apps ?? [])
      setLiveUserId(data.userId ?? '')
    } catch {
      // non-fatal — Live Apps section just won't show
    }
  }

  useEffect(() => {
    Promise.all([loadJobs(), loadLiveApps()]).finally(() => setLoading(false))
  }, [])

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

        {error && (
          <SurfaceCard>
            <MonoLabel variant="error" size="xs">{error}</MonoLabel>
          </SurfaceCard>
        )}

        {/* Live Apps section */}
        {!loading && (
          <section className="flex flex-col gap-3">
            <MonoLabel variant="muted" size="xs" className="tracking-widest uppercase">
              Live Apps
            </MonoLabel>

            {liveApps.length === 0 ? (
              <SurfaceCard>
                <div className="flex flex-col items-center gap-2 py-3">
                  <MonoLabel variant="muted" size="xs">
                    No live apps yet. Create one from the home page.
                  </MonoLabel>
                  <Link
                    href="/"
                    className="font-mono text-xs text-accent-lime hover:underline"
                  >
                    ← Create a Live app
                  </Link>
                </div>
              </SurfaceCard>
            ) : (
              liveApps.map(app => (
                <SurfaceCard key={app.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-ui text-sm text-foreground truncate">
                          {app.title}
                        </p>
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                          {PERSONALITY_NAMES[app.designPersonality] ?? 'Clean'}
                        </span>
                      </div>
                      <p className="font-ui text-xs text-muted-foreground truncate">
                        {app.description}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <Link
                          href={`/live/${liveUserId}/${app.slug}`}
                          className="font-mono text-xs text-accent-lime hover:underline"
                        >
                          Open →
                        </Link>
                        <Link
                          href={`/live/${liveUserId}/${app.slug}/settings`}
                          className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Settings
                        </Link>
                      </div>
                    </div>
                    <MonoLabel variant="muted" size="xs" className="shrink-0">
                      {new Date(app.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric'
                      })}
                    </MonoLabel>
                  </div>
                </SurfaceCard>
              ))
            )}
          </section>
        )}

        {/* Active Monitors */}
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

        {/* History */}
        <section className="flex flex-col gap-3">
          <MonoLabel variant="muted" size="xs" className="tracking-widest uppercase">
            History
          </MonoLabel>

          {!loading && historyJobs.length === 0 && liveApps.length === 0 && jobs.length === 0 && (
            <SurfaceCard>
              <div className="flex flex-col items-center gap-3 py-4">
                <MonoLabel variant="muted" size="xs">
                  Nothing yet. Go make something real.
                </MonoLabel>
                <Link
                  href="/"
                  className="font-mono text-xs text-accent-lime hover:underline"
                >
                  ← Start here
                </Link>
              </div>
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
