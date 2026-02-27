'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
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

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    async function loadPersistedData() {
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
        // Non-fatal — just can't load history
      }
    }

    async function startJob() {
      const res = await fetch('/api/jobs/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: id }),
      })

      if (!res.ok) {
        if (res.status === 409) {
          setIsLive(false)
          await loadPersistedData()
          return
        }
        if (res.status === 404) {
          setNotFound(true)
          setIsLive(false)
          return
        }
        setError(`Failed to start job (${res.status}).`)
        setIsLive(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) return

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          try {
            const event = JSON.parse(raw) as StreamEvent

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
                break
              case 'error':
                setError(event.payload.message)
                setIsLive(false)
                break
            }
          } catch {
            // Malformed SSE line — skip
          }
        }
      }

      setIsLive(false)
    }

    startJob()
  }, [id])

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

          <div className="flex flex-col gap-4 min-w-0">
            <SurfaceCard>
              <JobStream events={events} isLive={isLive} />
            </SurfaceCard>

            <SurfaceCard>
              <SpendMeter spent={total} budget={budget} />
            </SurfaceCard>
          </div>

          <div className="min-w-0">
            <ArtifactViewer artifact={artifact} isLoading={isLive} />
          </div>
        </div>

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
