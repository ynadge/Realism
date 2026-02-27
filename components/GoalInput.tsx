'use client'

import { useState, forwardRef, useImperativeHandle, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MonoLabel } from '@/components/ui/MonoLabel'
import { Slider } from '@/components/ui/slider'

export type GoalInputHandle = {
  submit: () => void
}

type GoalInputProps = {
  onAuthRequired: () => void
}

const EXAMPLE_GOALS = [
  'Research the state of AI agent payments and produce a briefing with audio',
  'Generate a brand concept and cover image for a fintech startup',
  'Monitor Hacker News weekly for posts about agentic infrastructure',
]

export const GoalInput = forwardRef<GoalInputHandle, GoalInputProps>(
  function GoalInput({ onAuthRequired }, ref) {
    const router = useRouter()
    const [goal, setGoal] = useState('')
    const [budget, setBudget] = useState(2.0)
    const [type, setType] = useState<'once' | 'recurring'>('once')
    const [cadence, setCadence] = useState<'daily' | 'weekly'>('weekly')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [needsCadence, setNeedsCadence] = useState(false)

    const handleSubmit = useCallback(async () => {
      if (!goal.trim() || isSubmitting) return
      setError('')
      setIsSubmitting(true)

      try {
        const res = await fetch('/api/jobs/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goal: goal.trim(),
            budget,
            cadence: type === 'recurring' ? cadence : undefined,
          }),
        })

        if (res.status === 401) {
          onAuthRequired()
          return
        }

        const data = await res.json()

        if (data.needsCadence) {
          setNeedsCadence(true)
          setType('recurring')
          return
        }

        if (!res.ok) {
          setError(data.error ?? 'Something went wrong. Try again.')
          return
        }

        router.push(`/job/${data.jobId}?budget=${budget.toFixed(2)}`)
      } catch {
        setError('Connection error. Check your network and try again.')
      } finally {
        setIsSubmitting(false)
      }
    }, [goal, budget, type, cadence, isSubmitting, onAuthRequired, router])

    useImperativeHandle(ref, () => ({ submit: handleSubmit }), [handleSubmit])

    function handleExampleClick(example: string) {
      setGoal(example)
      setError('')
      setNeedsCadence(false)
      if (/monitor|weekly|daily/i.test(example)) {
        setType('recurring')
      }
    }

    function handleTypeChange(newType: 'once' | 'recurring') {
      setType(newType)
      if (newType === 'recurring') {
        setNeedsCadence(false)
      }
    }

    const buttonText = needsCadence
      ? 'Choose a schedule \u2192'
      : isSubmitting
        ? 'Working...'
        : 'Make it real \u2192'

    return (
      <div className="flex flex-col gap-5">

        {/* Textarea */}
        <div className="relative">
          <textarea
            value={goal}
            onChange={e => { setGoal(e.target.value); setError(''); setNeedsCadence(false) }}
            placeholder="Describe what you want to be true..."
            rows={4}
            maxLength={500}
            disabled={isSubmitting}
            className="w-full bg-surface border border-border rounded-md px-4 py-3 font-ui text-foreground placeholder:text-muted-foreground/50 resize-none outline-none transition-colors focus:border-accent-lime disabled:opacity-50"
          />
          {goal.length > 400 && (
            <div className="absolute bottom-2 right-3">
              <MonoLabel variant="muted" size="xs">{goal.length}/500</MonoLabel>
            </div>
          )}
        </div>

        {/* Budget */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-ui">Budget</span>
            <MonoLabel variant="accent">${budget.toFixed(2)}</MonoLabel>
          </div>
          <Slider
            min={0.25}
            max={10}
            step={0.25}
            value={[budget]}
            onValueChange={([v]) => setBudget(v)}
            className="w-full"
          />
        </div>

        {/* Type toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => handleTypeChange('once')}
            disabled={isSubmitting}
            className={`flex-1 py-2 rounded-md text-sm font-mono transition-colors ${
              type === 'once'
                ? 'bg-surface border border-accent-lime text-foreground'
                : 'border border-border text-muted-foreground hover:text-foreground'
            } disabled:opacity-50`}
          >
            Once
          </button>
          <button
            onClick={() => handleTypeChange('recurring')}
            disabled={isSubmitting}
            className={`flex-1 py-2 rounded-md text-sm font-mono transition-colors ${
              type === 'recurring'
                ? 'bg-surface border border-accent-lime text-foreground'
                : 'border border-border text-muted-foreground hover:text-foreground'
            } disabled:opacity-50`}
          >
            Recurring
          </button>
        </div>

        {/* Cadence selector — slides in when recurring */}
        <div
          className={`overflow-hidden transition-all duration-200 ease-out ${
            type === 'recurring' ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="flex gap-2">
            <button
              onClick={() => setCadence('daily')}
              disabled={isSubmitting}
              className={`flex-1 py-2 rounded-md text-sm font-mono transition-colors ${
                cadence === 'daily'
                  ? 'bg-surface border border-accent-lime text-foreground'
                  : 'border border-border text-muted-foreground hover:text-foreground'
              } disabled:opacity-50`}
            >
              Daily
            </button>
            <button
              onClick={() => setCadence('weekly')}
              disabled={isSubmitting}
              className={`flex-1 py-2 rounded-md text-sm font-mono transition-colors ${
                cadence === 'weekly'
                  ? 'bg-surface border border-accent-lime text-foreground'
                  : 'border border-border text-muted-foreground hover:text-foreground'
              } disabled:opacity-50`}
            >
              Weekly
            </button>
          </div>
        </div>

        {/* Example goals */}
        <div className="flex flex-col gap-1.5">
          {EXAMPLE_GOALS.map((example) => (
            <button
              key={example}
              onClick={() => handleExampleClick(example)}
              disabled={isSubmitting}
              className="text-left text-muted-foreground text-xs font-ui hover:text-foreground transition-colors disabled:opacity-50"
            >
              <span className="text-accent-lime mr-1.5">&rarr;</span>
              {example}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <MonoLabel variant="error" size="xs">{error}</MonoLabel>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={goal.trim().length === 0 || isSubmitting}
          className="w-full py-3 bg-accent-lime text-background font-display font-semibold rounded-md transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {buttonText}
        </button>

      </div>
    )
  }
)
