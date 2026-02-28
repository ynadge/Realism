'use client'

import { Suspense, useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { JobStream } from '@/components/JobStream'
import { SpendMeter } from '@/components/SpendMeter'
import { ArtifactViewer } from '@/components/ArtifactViewer'
import { Receipt } from '@/components/Receipt'
import { SurfaceCard } from '@/components/ui/SurfaceCard'
import { MonoLabel } from '@/components/ui/MonoLabel'
import type { SpendEvent, Artifact, StreamEvent } from '@/types'

function JobPageContent() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const [events, setEvents] = useState<SpendEvent[]>([])
  const [artifact, setArtifact] = useState<Artifact | null>(null)
  const [isLive, setIsLive] = useState(true)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [notFound, setNotFound] = useState(false)
  const hasStarted = useRef(false)

  const budget = parseFloat(searchParams.get('budget') ?? '2.00') || 2.0

  const loadPersistedData = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${id}`)
      if (res.status === 404) {
        setNotFound(true)
        return
      }
      if (!res.ok) return
      const data = await res.json()
      if (data.spendEvents?.length) {
        setEvents(data.spendEvents)
        const sum = data.spendEvents.reduce((s: number, e: SpendEvent) => s + e.cost, 0)
        setTotal(sum)
      }
      if (data.artifact) setArtifact(data.artifact)
    } catch {
      // Non-fatal
    }
  }, [id])

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    let es: EventSource | null = null

    async function start() {
      // Trigger execution (fire-and-forget — orchestrator runs in background)
      const res = await fetch('/api/jobs/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: id }),
      })

      if (!res.ok && res.status !== 409) {
        if (res.status === 404) {
          setNotFound(true)
          setIsLive(false)
          return
        }
        setError(`Failed to start job (${res.status}).`)
        setIsLive(false)
        return
      }

      // If 409, job already running or complete — SSE will still work for
      // running jobs (events stream in), and for complete jobs the endpoint
      // sends all stored events then closes.
      if (res.status === 409) {
        const jobRes = await fetch(`/api/jobs/${id}`).then(r => r.json()).catch(() => null)
        if (jobRes?.job?.status === 'complete' || jobRes?.job?.status === 'failed') {
          await loadPersistedData()
          setIsLive(false)
          return
        }
      }

      // Connect to SSE endpoint
      es = new EventSource(`/api/jobs/${id}/events`)

      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as StreamEvent

          switch (event.type) {
            case 'tool_call':
              setEvents(prev => [...prev, event.payload])
              setTotal(prev => prev + event.payload.cost)
              break
            case 'artifact':
              setArtifact(event.payload)
              break
            case 'complete':
              setIsLive(false)
              setTotal(event.payload.total)
              es?.close()
              break
            case 'error':
              setError(event.payload.message)
              setIsLive(false)
              es?.close()
              break
          }
        } catch {
          // Malformed event
        }
      }

      es.onerror = async () => {
        es?.close()
        // SSE died (timeout, network issue, etc.) — try loading persisted
        // data since the worker may have finished while we were disconnected.
        await loadPersistedData()
        setIsLive(false)
      }
    }

    start()

    return () => {
      es?.close()
    }
  }, [id, loadPersistedData])

  if (notFound) {
    return (
      <main className="bg-mesh bg-noise min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <MonoLabel variant="muted" size="sm">Job not found.</MonoLabel>
        <button
          onClick={() => router.push('/dashboard')}
          className="font-mono text-xs text-accent-lime hover:underline"
        >
          ← Back to dashboard
        </button>
      </main>
    )
  }

  return (
    <main className="bg-mesh bg-noise min-h-screen px-4 py-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Dashboard
            </button>
            <MonoLabel variant="muted" size="xs" className="tracking-widest uppercase">
              — realism —
            </MonoLabel>
          </div>
          <MonoLabel variant="muted" size="xs">{id.slice(0, 8)}...</MonoLabel>
        </div>

        {error && (
          <SurfaceCard>
            <MonoLabel variant="error">{error}</MonoLabel>
          </SurfaceCard>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
          <SurfaceCard>
            <JobStream events={events} isLive={isLive} />
          </SurfaceCard>
          <SurfaceCard className="md:w-56">
            <SpendMeter spent={total} budget={budget} />
          </SurfaceCard>
        </div>

        <ArtifactViewer artifact={artifact} isLoading={isLive} />

        {!isLive && events.length > 0 && (
          <Receipt events={events} total={total} budget={budget} />
        )}

      </div>
    </main>
  )
}

export default function JobPage() {
  return (
    <Suspense fallback={null}>
      <JobPageContent />
    </Suspense>
  )
}
