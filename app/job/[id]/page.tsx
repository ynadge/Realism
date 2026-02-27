'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { JobStream } from '@/components/JobStream'
import { SpendMeter } from '@/components/SpendMeter'
import { ArtifactViewer } from '@/components/ArtifactViewer'
import { Receipt } from '@/components/Receipt'
import { SurfaceCard } from '@/components/ui/SurfaceCard'
import { MonoLabel } from '@/components/ui/MonoLabel'
import type { SpendEvent, Artifact, StreamEvent } from '@/types'

function JobPageContent() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const [events, setEvents] = useState<SpendEvent[]>([])
  const [artifact, setArtifact] = useState<Artifact | null>(null)
  const [isLive, setIsLive] = useState(true)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const hasStarted = useRef(false)

  const budget = parseFloat(searchParams.get('budget') ?? '2.00') || 2.0

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    async function startJob() {
      const res = await fetch('/api/jobs/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: id }),
      })

      if (!res.ok) {
        if (res.status === 409) {
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

  return (
    <main className="bg-mesh bg-noise min-h-screen px-4 py-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">

        <div className="flex items-center justify-between">
          <MonoLabel variant="muted" size="xs" className="tracking-widest uppercase">
            — realism —
          </MonoLabel>
          <MonoLabel variant="muted" size="xs">{id.slice(0, 8)}...</MonoLabel>
        </div>

        {error && (
          <SurfaceCard>
            <MonoLabel variant="error">{error}</MonoLabel>
          </SurfaceCard>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="flex flex-col gap-4">
            <SurfaceCard>
              <JobStream events={events} isLive={isLive} />
            </SurfaceCard>

            <SurfaceCard>
              <SpendMeter spent={total} budget={budget} />
            </SurfaceCard>
          </div>

          <div>
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
