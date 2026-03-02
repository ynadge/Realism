'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { LiveAppConfig, DataPlan } from '@/types/live'

type ConnectorStatus = {
  id: string
  name: string
  icon: string
  connected: boolean
  authUrl: string
}

type Props = {
  config: LiveAppConfig
  plan: DataPlan
  userId: string
  slug: string
  connectorStatuses: ConnectorStatus[]
}

export function SettingsClient({ config, plan, userId, slug, connectorStatuses }: Props) {
  const router = useRouter()
  const [userContext, setUserContext] = useState<Record<string, string>>(plan.userContext)
  const [isSaving, setIsSaving] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const saveContext = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/live/${slug}/context`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userContext }),
      })
      if (!res.ok) throw new Error('Save failed')
      showMessage('success', 'Context saved')
    } catch {
      showMessage('error', 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const regenerate = async () => {
    setIsRegenerating(true)
    try {
      const res = await fetch(`/api/live/${slug}/regenerate`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Regenerate failed')
      showMessage('success', 'Regenerating your app...')
      setTimeout(() => router.push(`/live/${userId}/${slug}`), 2000)
    } catch {
      showMessage('error', 'Regenerate failed')
      setIsRegenerating(false)
    }
  }

  const deleteApp = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/live/${slug}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
      router.push('/dashboard')
    } catch {
      showMessage('error', 'Delete failed')
      setIsDeleting(false)
      setDeleteConfirm(false)
    }
  }

  const hasContext = Object.keys(userContext).length > 0

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5]">
      <header className="h-10 border-b border-[#1E1E1E] flex items-center justify-between px-4">
        <Link
          href={`/live/${userId}/${slug}`}
          className="text-[#888888] font-mono text-xs hover:text-[#F5F5F5] transition-colors"
        >
          ← {config.title}
        </Link>
        <span className="text-[#888888] font-mono text-xs">SETTINGS</span>
        <Link
          href="/dashboard"
          className="text-[#888888] font-mono text-xs hover:text-[#F5F5F5] transition-colors"
        >
          dashboard
        </Link>
      </header>

      {message && (
        <div className={`px-4 py-2 text-xs font-mono text-center ${
          message.type === 'success' ? 'bg-[#4ADE80]/10 text-[#4ADE80]' : 'bg-[#F87171]/10 text-[#F87171]'
        }`}>
          {message.text}
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        <section>
          <h1 className="text-[#F5F5F5] text-lg font-medium mb-1">{config.title}</h1>
          <p className="text-[#888888] text-sm">{config.description}</p>
          <p className="text-[#555555] font-mono text-xs mt-2">
            {config.designPersonality} · created {new Date(config.createdAt).toLocaleDateString()}
          </p>
        </section>

        <section>
          <h2 className="text-[#F5F5F5] text-sm font-medium mb-3 font-mono uppercase tracking-widest">
            Data Sources
          </h2>
          <div className="space-y-2">
            {plan.fetches.map(f => (
              <div
                key={f.id}
                className="bg-[#111111] border border-[#1E1E1E] px-3 py-2.5 flex items-start gap-3"
              >
                <span className="text-[#555555] font-mono text-xs mt-0.5 shrink-0">
                  {f.type}
                </span>
                <div className="min-w-0">
                  <p className="text-[#F5F5F5] text-xs font-mono truncate">{f.id}</p>
                  {f.query && (
                    <p className="text-[#888888] text-xs mt-0.5 truncate">&quot;{f.query}&quot;</p>
                  )}
                  {f.url && (
                    <p className="text-[#888888] text-xs mt-0.5 truncate">{f.url}</p>
                  )}
                  {f.synthesize && (
                    <p className="text-[#555555] text-xs mt-0.5">synthesized</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {hasContext && (
          <section>
            <h2 className="text-[#F5F5F5] text-sm font-medium mb-1 font-mono uppercase tracking-widest">
              Your Context
            </h2>
            <p className="text-[#888888] text-xs mb-3">
              Personal information used to personalize this app&apos;s data and recommendations.
            </p>
            <div className="space-y-2">
              {Object.entries(userContext).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="text-[#888888] font-mono text-xs w-24 shrink-0">{key}</label>
                  <input
                    type="text"
                    value={value}
                    onChange={e => setUserContext(prev => ({ ...prev, [key]: e.target.value }))}
                    className="flex-1 bg-[#111111] border border-[#1E1E1E] text-[#F5F5F5] font-mono text-xs px-3 py-1.5 focus:outline-none focus:border-[#333333]"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={saveContext}
              disabled={isSaving}
              className="mt-3 text-[#E8FF47] font-mono text-xs hover:underline disabled:opacity-50"
            >
              {isSaving ? 'saving...' : 'save context'}
            </button>
          </section>
        )}

        {connectorStatuses.length > 0 && (
          <section>
            <h2 className="text-[#F5F5F5] text-sm font-medium mb-1 font-mono uppercase tracking-widest">
              Connectors
            </h2>
            <p className="text-[#888888] text-xs mb-3">
              Connected services that provide live data for this app.
            </p>
            <div className="space-y-2">
              {connectorStatuses.map(connector => (
                <div
                  key={connector.id}
                  className="bg-[#111111] border border-[#1E1E1E] px-3 py-2.5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span>{connector.icon}</span>
                    <span className="text-[#F5F5F5] text-sm">{connector.name}</span>
                  </div>
                  {connector.connected ? (
                    <span className="text-[#4ADE80] font-mono text-xs">connected ✓</span>
                  ) : (
                    <a
                      href={connector.authUrl}
                      className="text-[#E8FF47] font-mono text-xs hover:underline"
                    >
                      connect →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-[#F5F5F5] text-sm font-medium mb-1 font-mono uppercase tracking-widest">
            Regenerate App
          </h2>
          <p className="text-[#888888] text-xs mb-3">
            Regenerates only the visual design and layout — data sources and personal context are preserved.
            Takes ~20 seconds. Costs approximately $0.05.
          </p>
          <button
            onClick={regenerate}
            disabled={isRegenerating}
            className="bg-[#111111] border border-[#1E1E1E] text-[#F5F5F5] font-mono text-xs px-4 py-2 hover:border-[#333333] hover:text-[#E8FF47] transition-colors disabled:opacity-50"
          >
            {isRegenerating ? 'regenerating...' : 'regenerate →'}
          </button>
        </section>

        <section className="border-t border-[#1E1E1E] pt-8">
          <h2 className="text-[#F5F5F5] text-sm font-medium mb-1 font-mono uppercase tracking-widest">
            Delete App
          </h2>
          <p className="text-[#888888] text-xs mb-3">
            Permanently deletes this app and all its data. This cannot be undone.
          </p>
          <button
            onClick={deleteApp}
            disabled={isDeleting}
            className={`font-mono text-xs px-4 py-2 transition-colors disabled:opacity-50 ${
              deleteConfirm
                ? 'bg-[#F87171]/20 border border-[#F87171] text-[#F87171]'
                : 'bg-[#111111] border border-[#1E1E1E] text-[#888888] hover:border-[#F87171] hover:text-[#F87171]'
            }`}
          >
            {isDeleting ? 'deleting...' : deleteConfirm ? 'click again to confirm delete' : 'delete app'}
          </button>
          {deleteConfirm && (
            <button
              onClick={() => setDeleteConfirm(false)}
              className="ml-3 text-[#555555] font-mono text-xs hover:text-[#888888]"
            >
              cancel
            </button>
          )}
        </section>

      </div>
    </div>
  )
}
