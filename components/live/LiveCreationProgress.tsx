'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  eventId: string
  onCancel: () => void
}

const STEPS = [
  { label: 'Planning what data to fetch', delay: 0 },
  { label: 'Verifying data sources return results', delay: 15_000 },
  { label: 'Generating your custom interface', delay: 35_000 },
]

export function LiveCreationProgress({ eventId, onCancel }: Props) {
  const router = useRouter()
  const [activeStep, setActiveStep] = useState(0)
  const [status, setStatus] = useState<'pending' | 'complete' | 'failed'>('pending')
  const [errorMsg, setErrorMsg] = useState('')
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stepTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    stepTimers.current.push(
      setTimeout(() => setActiveStep(1), STEPS[1].delay),
      setTimeout(() => setActiveStep(2), STEPS[2].delay),
    )

    function poll() {
      fetch(`/api/live/status/${eventId}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'complete') {
            setStatus('complete')
            setActiveStep(3)
            setTimeout(() => router.push(data.url), 800)
          } else if (data.status === 'failed') {
            setStatus('failed')
            setErrorMsg(data.error ?? 'Creation failed. Please try again.')
          } else {
            pollRef.current = setTimeout(poll, 3000)
          }
        })
        .catch(() => {
          pollRef.current = setTimeout(poll, 3000)
        })
    }

    pollRef.current = setTimeout(poll, 3000)

    return () => {
      if (pollRef.current) clearTimeout(pollRef.current)
      stepTimers.current.forEach(t => clearTimeout(t))
      stepTimers.current = []
    }
  }, [eventId, router])

  return (
    <div className="flex flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          {status === 'failed' ? 'Something went wrong' : 'Creating your app...'}
        </h2>
        {status === 'pending' && (
          <p className="text-muted-foreground text-sm font-ui">
            This takes about 60 seconds.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        {STEPS.map((step, i) => {
          const isActive = i <= activeStep
          const isDone = i < activeStep || status === 'complete'
          return (
            <div key={step.label} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full shrink-0 transition-all duration-500 ${
                isDone
                  ? 'bg-[#4ADE80]'
                  : isActive
                    ? 'bg-accent-lime animate-pulse'
                    : 'bg-border'
              }`} />
              <span className={`font-mono text-xs transition-colors duration-500 ${
                isActive ? 'text-foreground' : 'text-muted-foreground/50'
              }`}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {status === 'failed' && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-[#F87171] font-mono text-xs text-center max-w-sm">
            {errorMsg}
          </p>
          <button
            onClick={onCancel}
            className="text-accent-lime font-mono text-xs hover:underline"
          >
            ← Try again
          </button>
        </div>
      )}

      {status === 'pending' && (
        <button
          onClick={onCancel}
          className="text-muted-foreground font-mono text-xs hover:text-foreground transition-colors"
        >
          cancel
        </button>
      )}

      {status === 'complete' && (
        <p className="text-[#4ADE80] font-mono text-xs animate-pulse">
          Redirecting...
        </p>
      )}
    </div>
  )
}
