'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AuthModal } from '@/components/AuthModal'
import { GoalInput, type GoalInputHandle } from '@/components/GoalInput'

function NavLink() {
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    setHasSession(document.cookie.includes('realism-session'))
  }, [])

  if (!hasSession) return null

  return (
    <a
      href="/dashboard"
      className="fixed top-4 right-4 z-10 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      Dashboard →
    </a>
  )
}

function HomeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [authOpen, setAuthOpen] = useState(false)
  const goalInputRef = useRef<GoalInputHandle>(null)

  useEffect(() => {
    if (searchParams.get('auth') === 'required') {
      setAuthOpen(true)
    }
  }, [searchParams])

  function handleAuthSuccess() {
    setAuthOpen(false)
    goalInputRef.current?.submit()
  }

  return (
    <main className="bg-mesh bg-noise min-h-screen flex flex-col items-center justify-center gap-10 px-4 py-16">

      <NavLink />

      <div className="animate-fade-up-1 text-center">
        <p className="font-mono text-muted-foreground text-xs tracking-[0.3em] uppercase mb-3">
          — realism —
        </p>
        <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
          If you can think it,
          <br />
          <span className="text-accent-lime">you can make it real.</span>
        </h1>
      </div>

      <div className="animate-fade-up-3 w-full max-w-xl">
        <GoalInput
          ref={goalInputRef}
          onAuthRequired={() => setAuthOpen(true)}
        />
      </div>

      <AuthModal
        open={authOpen}
        onSuccess={handleAuthSuccess}
        onClose={() => setAuthOpen(false)}
      />

    </main>
  )
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  )
}
