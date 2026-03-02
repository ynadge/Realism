'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { LiveAppConfig } from '@/types/live'

type Props = {
  config: LiveAppConfig
  bundle: string
  userId: string
  slug: string
}

export function LiveShell({ config, bundle, userId, slug }: Props) {
  const [headerVisible, setHeaderVisible] = useState(true)

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A] overflow-hidden">
      {headerVisible && (
        <header className="flex-shrink-0 h-10 bg-[#0A0A0A] border-b border-[#1E1E1E] flex items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="text-[#888888] font-mono text-xs tracking-widest hover:text-[#F5F5F5] transition-colors"
          >
            REALISM
          </Link>

          <span className="text-[#F5F5F5] text-xs font-mono truncate max-w-[40%] text-center">
            {config.title}
          </span>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#E8FF47] animate-pulse" />
              <span className="text-[#888888] font-mono text-xs">LIVE</span>
            </div>

            <Link
              href={`/live/${userId}/${slug}/settings`}
              className="text-[#888888] font-mono text-xs hover:text-[#F5F5F5] transition-colors"
            >
              settings
            </Link>

            <button
              onClick={() => setHeaderVisible(false)}
              className="text-[#888888] font-mono text-xs hover:text-[#F5F5F5] transition-colors"
              title="Hide header"
            >
              ✕
            </button>
          </div>
        </header>
      )}

      {!headerVisible && (
        <button
          onClick={() => setHeaderVisible(true)}
          className="fixed top-2 right-2 z-50 bg-[#111111] border border-[#1E1E1E] text-[#888888] font-mono text-xs px-2 py-1 hover:text-[#F5F5F5] hover:border-[#333333] transition-all"
        >
          REALISM
        </button>
      )}

      <div className="flex-1 overflow-hidden">
        <iframe
          srcDoc={bundle}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          className="w-full h-full border-0"
          title={config.title}
          loading="eager"
        />
      </div>
    </div>
  )
}
