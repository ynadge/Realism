'use client'

import { MonoLabel } from '@/components/ui/MonoLabel'
import { SurfaceCard } from '@/components/ui/SurfaceCard'
import type { Artifact } from '@/types'

type ArtifactViewerProps = {
  artifact: Artifact | null
  isLoading: boolean
}

export function ArtifactViewer({ artifact, isLoading }: ArtifactViewerProps) {
  if (isLoading && !artifact) {
    return (
      <SurfaceCard className="min-h-48 flex items-center justify-center">
        <MonoLabel variant="muted" size="xs" className="animate-pulse">
          Assembling artifact...
        </MonoLabel>
      </SurfaceCard>
    )
  }

  if (!artifact) return null

  return (
    <div className="flex flex-col gap-4 animate-fade-up">
      <div className="flex items-center gap-2">
        <MonoLabel variant="accent" size="xs">[artifact]</MonoLabel>
        <MonoLabel variant="muted" size="xs">{artifact.type}</MonoLabel>
      </div>

      <h2 className="font-display text-xl font-semibold">{artifact.title}</h2>

      {artifact.content && (
        <SurfaceCard>
          <div className="whitespace-pre-wrap font-ui text-sm leading-relaxed text-foreground">
            {artifact.content}
          </div>
        </SurfaceCard>
      )}

      {artifact.audioUrl && (
        <SurfaceCard>
          <MonoLabel variant="muted" size="xs" className="mb-2 block">audio output</MonoLabel>
          <audio
            controls
            src={artifact.audioUrl}
            className="w-full h-8"
          />
        </SurfaceCard>
      )}

      {artifact.imageUrl && (
        <SurfaceCard padded={false} className="overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artifact.imageUrl}
            alt={artifact.title}
            className="w-full object-cover animate-fade-up"
          />
        </SurfaceCard>
      )}

      {artifact.summary && (
        <p className="text-muted-foreground text-sm leading-relaxed">
          {artifact.summary}
        </p>
      )}
    </div>
  )
}
