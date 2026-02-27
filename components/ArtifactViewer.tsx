'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { MonoLabel } from '@/components/ui/MonoLabel'
import { SurfaceCard } from '@/components/ui/SurfaceCard'
import type { Artifact } from '@/types'

type ArtifactViewerProps = {
  artifact: Artifact | null
  isLoading: boolean
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h1 className="font-display text-xl font-bold text-foreground mb-3 mt-4 first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="font-display text-lg font-semibold text-foreground mb-2 mt-4 first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="font-display text-base font-semibold text-foreground mb-2 mt-3">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="font-ui text-sm text-foreground leading-relaxed mb-3 last:mb-0">
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul className="mb-3 space-y-1 pl-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 space-y-1 pl-4 list-decimal">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="font-ui text-sm text-foreground leading-relaxed flex gap-2">
            <span className="text-accent-lime shrink-0">–</span>
            <span>{children}</span>
          </li>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="text-muted-foreground italic">{children}</em>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-lime underline underline-offset-2 hover:no-underline"
          >
            {children}
          </a>
        ),
        hr: () => <hr className="border-border my-4" />,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-accent-lime pl-4 my-3 text-muted-foreground italic">
            {children}
          </blockquote>
        ),
        code: ({ children }) => (
          <code className="font-mono text-xs bg-border px-1.5 py-0.5 rounded text-accent-lime">
            {children}
          </code>
        ),
        img: () => null,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function downloadText(content: string, title: string) {
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${slugify(title)}.md`
  a.click()
  URL.revokeObjectURL(url)
}

function DownloadButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="font-mono text-xs text-muted-foreground border border-border rounded px-3 py-1.5 hover:border-accent-lime hover:text-accent-lime transition-colors"
    >
      {label}
    </button>
  )
}

function MediaDownloadButton({
  url,
  filename,
  downloadLabel,
  openLabel,
}: {
  url: string
  filename: string
  downloadLabel: string
  openLabel: string
}) {
  const [useOpen, setUseOpen] = useState(false)

  function handleClick() {
    if (useOpen) {
      window.open(url, '_blank', 'noopener')
      return
    }
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    // Cross-origin URLs ignore the download attribute — if the URL is external,
    // switch to "open in new tab" mode after the first attempt.
    try {
      const origin = new URL(url).origin
      if (origin !== window.location.origin) setUseOpen(true)
    } catch { /* keep download mode */ }
  }

  return (
    <DownloadButton
      label={useOpen ? openLabel : downloadLabel}
      onClick={handleClick}
    />
  )
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

      <div className="flex items-center gap-2 flex-wrap">
        {artifact.content && (
          <DownloadButton
            label="↓ Download text (.md)"
            onClick={() => downloadText(artifact.content!, artifact.title)}
          />
        )}
        {artifact.audioUrl && (
          <MediaDownloadButton
            url={artifact.audioUrl}
            filename={`${slugify(artifact.title)}.mp3`}
            downloadLabel="↓ Download audio (.mp3)"
            openLabel="Open audio ↗"
          />
        )}
        {artifact.imageUrl && (
          <MediaDownloadButton
            url={artifact.imageUrl}
            filename={`${slugify(artifact.title)}.png`}
            downloadLabel="↓ Download image"
            openLabel="Open image ↗"
          />
        )}
      </div>

      {artifact.content && (
        <SurfaceCard>
          <MarkdownContent content={artifact.content} />
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
