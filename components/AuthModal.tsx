'use client'

import { useState, useRef, useCallback } from 'react'
import { MonoLabel } from '@/components/ui/MonoLabel'

type AuthModalProps = {
  open: boolean
  onSuccess: () => void
  onClose?: () => void
}

type ModalStep = 'phone' | 'sending' | 'code' | 'verifying'

const E164_REGEX = /^\+[1-9]\d{1,14}$/

function maskPhone(phone: string): string {
  if (phone.length < 5) return phone
  const last4 = phone.slice(-4)
  const country = phone.slice(0, 2)
  return `${country} \u2022\u2022\u2022\u2022 \u2022\u2022${last4}`
}

export function AuthModal({ open, onSuccess, onClose }: AuthModalProps) {
  const [step, setStep] = useState<ModalStep>('phone')
  const [phone, setPhone] = useState('')
  const [verificationId, setVerificationId] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const codeInputRef = useRef<HTMLInputElement>(null)

  const resetToPhone = useCallback(() => {
    setStep('phone')
    setCode('')
    setVerificationId('')
    setError('')
  }, [])

  if (!open) return null

  async function handleSend() {
    setError('')

    const trimmed = phone.trim()
    if (!trimmed || !E164_REGEX.test(trimmed)) {
      setError('Use E.164 format: +15551234567')
      return
    }

    setStep('sending')

    try {
      const res = await fetch('/api/auth/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: trimmed }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send code.')
        setStep('phone')
        return
      }

      setVerificationId(data.verificationId)
      setStep('code')
      setTimeout(() => codeInputRef.current?.focus(), 50)
    } catch {
      setError('Network error. Try again.')
      setStep('phone')
    }
  }

  async function handleVerify(codeValue?: string) {
    const codeToVerify = codeValue ?? code

    if (step === 'verifying') return
    if (codeToVerify.length < 4) return

    setError('')
    setStep('verifying')

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationId,
          code: codeToVerify,
          phone: phone.trim(),
        }),
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

  function handlePhoneKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSend()
  }

  function handleCodeKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleVerify()
  }

  const isPhoneStep = step === 'phone' || step === 'sending'
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

        {isPhoneStep && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Enter your number.
              </h2>
              <p className="font-mono text-muted-foreground text-xs mt-1">
                We&apos;ll send a one-time code.
              </p>
            </div>

            <input
              type="tel"
              value={phone}
              onChange={e => { setPhone(e.target.value); setError('') }}
              onKeyDown={handlePhoneKeyDown}
              placeholder="+1 555 000 0000"
              disabled={isSending}
              autoFocus
              className={`w-full py-3 px-4 bg-background border rounded-md text-foreground font-mono text-base placeholder:text-muted-foreground/50 outline-none transition-colors ${
                hasError
                  ? 'border-error'
                  : 'border-border focus:border-accent-lime'
              } disabled:opacity-50`}
            />

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
          </div>
        )}

        {isCodeStep && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Check your phone.
              </h2>
              <p className="font-mono text-muted-foreground text-xs mt-1">
                {maskPhone(phone.trim())}
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
              onClick={resetToPhone}
              disabled={isVerifying}
              className="font-mono text-muted-foreground text-xs hover:text-foreground transition-colors disabled:opacity-50"
            >
              &larr; Wrong number?
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
