import { LiveDot } from '@/components/ui/LiveDot'
import { MonoLabel } from '@/components/ui/MonoLabel'
import { SurfaceCard } from '@/components/ui/SurfaceCard'

export default function Home() {
  return (
    <main className="bg-mesh bg-noise min-h-screen flex flex-col items-center justify-center gap-8 px-4">

      <div className="animate-fade-up-1 text-center">
        <p className="font-mono text-muted-foreground text-xs tracking-[0.3em] uppercase mb-3">
          — realism —
        </p>
        <h1 className="font-display text-7xl font-bold tracking-tight">
          If you can think it,
          <br />
          <span className="text-accent-lime">you can make it real.</span>
        </h1>
      </div>

      <div className="animate-fade-up-3 flex flex-col gap-3 w-full max-w-md">

        <SurfaceCard>
          <div className="flex items-center gap-2">
            <LiveDot />
            <MonoLabel variant="muted" size="xs">LIVE — design system check</MonoLabel>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <div className="flex flex-wrap gap-3">
            <MonoLabel variant="accent">$0.034</MonoLabel>
            <MonoLabel variant="muted">/ $2.00</MonoLabel>
            <MonoLabel variant="success">complete</MonoLabel>
            <MonoLabel variant="warning">running</MonoLabel>
            <MonoLabel variant="error">failed</MonoLabel>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MonoLabel variant="accent" size="xs">[sapiom_search]</MonoLabel>
              <MonoLabel variant="muted" size="xs">Searching: agentic payments 2026</MonoLabel>
            </div>
            <MonoLabel variant="muted" size="xs">$0.006</MonoLabel>
          </div>
        </SurfaceCard>

      </div>

    </main>
  )
}
