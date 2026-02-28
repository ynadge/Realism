'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { MonoLabel } from '@/components/ui/MonoLabel'

type AuthModalProps = {
  open: boolean
  onSuccess: () => void
  onClose?: () => void
}

type AuthMethod = 'phone' | 'email'
type ModalStep = 'input' | 'sending' | 'code' | 'verifying'

const E164_REGEX = /^\+[1-9]\d{1,14}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function maskPhone(phone: string): string {
  if (phone.length < 5) return phone
  const last4 = phone.slice(-4)
  const country = phone.slice(0, 2)
  return `${country} \u2022\u2022\u2022\u2022 \u2022\u2022${last4}`
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  const visible = local.slice(0, 2)
  return `${visible}\u2022\u2022\u2022@${domain}`
}

export function AuthModal({ open, onSuccess, onClose }: AuthModalProps) {
  const [method, setMethod] = useState<AuthMethod>('phone')
  const [step, setStep] = useState<ModalStep>('input')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [verificationId, setVerificationId] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [devBypass, setDevBypass] = useState(false)
  const [devLoading, setDevLoading] = useState(false)
  const codeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    fetch('/api/auth/dev-login')
      .then(res => res.ok ? res.json() : null)
      .then(data => setDevBypass(!!data?.available))
      .catch(() => setDevBypass(false))
  }, [open])

  async function handleDevLogin() {
    setDevLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/dev-login', { method: 'POST' })
      if (res.ok) {
        onSuccess()
      } else {
        setError('Dev login failed.')
      }
    } catch {
      setError('Network error.')
    } finally {
      setDevLoading(false)
    }
  }

  const resetToInput = useCallback(() => {
    setStep('input')
    setCode('')
    setVerificationId('')
    setError('')
  }, [])

  if (!open) return null

  const contactValue = method === 'email' ? email.trim().toLowerCase() : phone.trim()

  async function handleSend() {
    setError('')

    if (method === 'phone') {
      if (!contactValue || !E164_REGEX.test(contactValue)) {
        setError('Use E.164 format: +15551234567')
        return
      }
    } else {
      if (!contactValue || !EMAIL_REGEX.test(contactValue)) {
        setError('Enter a valid email address.')
        return
      }
    }

    setStep('sending')

    try {
      const body = method === 'email'
        ? { email: contactValue }
        : { phone: contactValue }

      const res = await fetch('/api/auth/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send code.')
        setStep('input')
        return
      }

      setVerificationId(data.verificationId)
      setStep('code')
      setTimeout(() => codeInputRef.current?.focus(), 50)
    } catch {
      setError('Network error. Try again.')
      setStep('input')
    }
  }

  async function handleVerify(codeValue?: string) {
    const codeToVerify = codeValue ?? code

    if (step === 'verifying') return
    if (codeToVerify.length < 4) return

    setError('')
    setStep('verifying')

    try {
      const body = method === 'email'
        ? { verificationId, code: codeToVerify, email: contactValue }
        : { verificationId, code: codeToVerify, phone: contactValue }

      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Verification failed.')
        setStep('code')
        return
      }

      onSuccess()
    } catch {
      setError('Network error. Try again.')
      setStep('code')
    }
  }

  function handleCodeChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 6)
    setCode(digits)

    if (digits.length === 6 && step === 'code') {
      handleVerify(digits)
    }
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget && onClose) {
      onClose()
    }
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSend()
  }

  function handleCodeKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleVerify()
  }

  function switchMethod() {
    setMethod(m => m === 'phone' ? 'email' : 'phone')
    setError('')
  }

  const isInputStep = step === 'input' || step === 'sending'
  const isSending = step === 'sending'
  const isCodeStep = step === 'code' || step === 'verifying'
  const isVerifying = step === 'verifying'
  const hasError = error.length > 0

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4"
      onClick={handleOverlayClick}
    >
      <div className="max-w-sm w-full bg-surface border border-border rounded-md p-6 animate-fade-up">

        {isInputStep && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                {method === 'phone' ? 'Enter your number.' : 'Enter your email.'}
              </h2>
              <p className="font-mono text-muted-foreground text-xs mt-1">
                We&apos;ll send a one-time code.
              </p>
            </div>

            {method === 'phone' ? (
              <input
                type="tel"
                value={phone}
                onChange={e => { setPhone(e.target.value); setError('') }}
                onKeyDown={handleInputKeyDown}
                placeholder="+1 555 000 0000"
                disabled={isSending}
                autoFocus
                className={`w-full py-3 px-4 bg-background border rounded-md text-foreground font-mono text-base placeholder:text-muted-foreground/50 outline-none transition-colors ${
                  hasError
                    ? 'border-error'
                    : 'border-border focus:border-accent-lime'
                } disabled:opacity-50`}
              />
            ) : (
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                onKeyDown={handleInputKeyDown}
                placeholder="you@example.com"
                disabled={isSending}
                autoFocus
                className={`w-full py-3 px-4 bg-background border rounded-md text-foreground font-mono text-base placeholder:text-muted-foreground/50 outline-none transition-colors ${
                  hasError
                    ? 'border-error'
                    : 'border-border focus:border-accent-lime'
                } disabled:opacity-50`}
              />
            )}

            {hasError && (
              <MonoLabel variant="error" size="xs">{error}</MonoLabel>
            )}

            <button
              onClick={handleSend}
              disabled={isSending}
              className="w-full py-3 bg-accent-lime text-background font-mono text-sm font-medium rounded-md transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSending ? 'Sending...' : 'Send code \u2192'}
            </button>

            <button
              onClick={switchMethod}
              disabled={isSending}
              className="font-mono text-muted-foreground text-xs hover:text-foreground transition-colors disabled:opacity-50"
            >
              {method === 'phone' ? 'Use email instead' : 'Use phone instead'}
            </button>

            {devBypass && (
              <>
                <div className="border-t border-border" />
                <button
                  onClick={handleDevLogin}
                  disabled={devLoading}
                  className="w-full py-2.5 border border-dashed border-border text-muted-foreground font-mono text-xs rounded-md transition-colors hover:border-accent-lime hover:text-foreground disabled:opacity-50"
                >
                  {devLoading ? 'Logging in...' : 'Dev login (skip OTP)'}
                </button>
              </>
            )}
          </div>
        )}

        {isCodeStep && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                {method === 'phone' ? 'Check your phone.' : 'Check your inbox.'}
              </h2>
              <p className="font-mono text-muted-foreground text-xs mt-1">
                {method === 'phone' ? maskPhone(phone.trim()) : maskEmail(email.trim())}
              </p>
            </div>

            <input
              ref={codeInputRef}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => handleCodeChange(e.target.value)}
              onKeyDown={handleCodeKeyDown}
              placeholder="000000"
              disabled={isVerifying}
              autoFocus
              className={`w-full py-3 px-4 bg-background border rounded-md text-foreground font-mono text-xl text-center tracking-[0.4em] placeholder:text-muted-foreground/50 outline-none transition-colors ${
                hasError
                  ? 'border-error'
                  : 'border-border focus:border-accent-lime'
              } disabled:opacity-50`}
            />

            {hasError && (
              <MonoLabel variant="error" size="xs">{error}</MonoLabel>
            )}

            <button
              onClick={() => handleVerify()}
              disabled={isVerifying || code.length < 4}
              className="w-full py-3 bg-accent-lime text-background font-mono text-sm font-medium rounded-md transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isVerifying ? 'Verifying...' : 'Verify \u2192'}
            </button>

            <button
              onClick={resetToInput}
              disabled={isVerifying}
              className="font-mono text-muted-foreground text-xs hover:text-foreground transition-colors disabled:opacity-50"
            >
              {method === 'phone' ? '\u2190 Wrong number?' : '\u2190 Wrong email?'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
