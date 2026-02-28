import { createFetch } from '@sapiom/fetch'

export class SapiomError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'SapiomError'
  }
}

// Lazy singleton — avoids re-creation on hot reload in dev
let _sapiomFetch: typeof fetch | null = null

export function getSapiomFetch(): typeof fetch {
  if (_sapiomFetch) return _sapiomFetch

  const apiKey = process.env.SAPIOM_API_KEY
  if (!apiKey) {
    throw new Error('SAPIOM_API_KEY is not set in environment variables')
  }

  _sapiomFetch = createFetch({
    apiKey,
    agentName: 'realism',
  })

  return _sapiomFetch
}

// Generic typed helper — POST JSON, parse JSON response
async function sapiomPost<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await getSapiomFetch()(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const text = await res.text()

  if (!res.ok) {
    throw new SapiomError(res.status, `Sapiom API error ${res.status} at ${url}: ${text}`)
  }

  try {
    return JSON.parse(text) as T
  } catch {
    throw new SapiomError(res.status, `Sapiom non-JSON response at ${url}: ${text.slice(0, 200)}`)
  }
}

async function sapiomGet<T>(url: string): Promise<T> {
  const res = await getSapiomFetch()(url)

  if (!res.ok) {
    const text = await res.text().catch(() => '(no body)')
    throw new SapiomError(res.status, `Sapiom API error ${res.status} at ${url}: ${text}`)
  }

  return res.json() as Promise<T>
}

// ─── Verify (Prelude) ────────────────────────────────────────────────────────
// Docs: https://docs.sapiom.ai/capabilities/verify/

const PRELUDE_BASE = 'https://prelude.services.sapiom.ai'

export async function sapiomVerifySend(phoneNumber: string): Promise<{
  id: string
  status: string
}> {
  return sapiomPost(`${PRELUDE_BASE}/verifications`, {
    target: { type: 'phone_number', value: phoneNumber },
  })
}

export async function sapiomVerifyCheck(
  verificationRequestId: string,
  code: string
): Promise<{ id: string; status: 'success' | 'pending' | 'failure' }> {
  return sapiomPost(`${PRELUDE_BASE}/verifications/check`, {
    verificationRequestId,
    code,
  })
}

// ─── Search (Linkup) ─────────────────────────────────────────────────────────
// Docs: https://docs.sapiom.ai/capabilities/search/

const LINKUP_BASE = 'https://linkup.services.sapiom.ai'

export async function sapiomSearch(
  query: string,
  depth: 'standard' | 'deep' = 'standard'
): Promise<{
  results: Array<{ title: string; url: string; snippet: string }>
}> {
  return sapiomPost(`${LINKUP_BASE}/v1/search`, {
    q: query,
    depth,
    outputType: 'searchResults',
  })
}

export async function sapiomFetchUrl(
  url: string,
  options?: { renderJs?: boolean }
): Promise<{ markdown: string }> {
  return sapiomPost(`${LINKUP_BASE}/v1/fetch`, {
    url,
    renderJs: options?.renderJs ?? false,
  })
}

// ─── Browser (Anchor) ────────────────────────────────────────────────────────
// Docs: https://docs.sapiom.ai/capabilities/browser/

const ANCHOR_BASE = 'https://anchor-browser.services.sapiom.ai'

export async function sapiomExtract(url: string): Promise<{
  content: string
  title: string
  url: string
}> {
  return sapiomPost(`${ANCHOR_BASE}/v1/tools/fetch-webpage`, {
    url,
    format: 'markdown',
  })
}

export async function sapiomScreenshot(url: string): Promise<{
  image: string
  width: number
  height: number
}> {
  return sapiomPost(`${ANCHOR_BASE}/v1/tools/screenshot`, {
    url,
    format: 'png',
    width: 1280,
    height: 720,
  })
}

// ─── AI Models (OpenRouter via Sapiom) ───────────────────────────────────────
// Docs: https://docs.sapiom.ai/capabilities/ai-models/

const OPENROUTER_BASE = 'https://openrouter.services.sapiom.ai'

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export async function sapiomChat(
  messages: ChatMessage[],
  model = 'anthropic/claude-3.5-sonnet',
  stream = false,
  maxTokens = 4096
): Promise<Response | { choices: Array<{ message: { content: string } }> }> {
  const res = await getSapiomFetch()(`${OPENROUTER_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream, max_tokens: maxTokens }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '(no body)')
    throw new Error(`sapiomChat error ${res.status}: ${body}`)
  }

  if (stream) return res
  return res.json()
}

// ─── Images (FAL) ────────────────────────────────────────────────────────────
// Docs: https://docs.sapiom.ai/capabilities/images/

const FAL_BASE = 'https://fal.services.sapiom.ai'

export async function sapiomGenerateImage(
  prompt: string,
  model = 'fal-ai/flux/schnell',
  options?: { imageSize?: string; numImages?: number }
): Promise<{ images: Array<{ url: string; width: number; height: number }> }> {
  return sapiomPost(`${FAL_BASE}/v1/run/${model}`, {
    prompt,
    image_size: options?.imageSize ?? 'landscape_4_3',
    num_images: options?.numImages ?? 1,
  })
}

// ─── Audio (ElevenLabs) ──────────────────────────────────────────────────────
// Docs: https://docs.sapiom.ai/capabilities/audio/
// TTS returns binary audio (arraybuffer), not JSON.
// The caller is responsible for storing the audio and producing a URL.

const ELEVENLABS_BASE = 'https://elevenlabs.services.sapiom.ai'

export async function sapiomTextToSpeech(
  text: string,
  voiceId = 'JBFqnCBsd6RMkjVDRZzb'
): Promise<{ audioUrl: string; expiresAt: string }> {
  const res = await getSapiomFetch()(`${ELEVENLABS_BASE}/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '(no body)')
    throw new Error(`sapiomTextToSpeech error ${res.status}: ${body}`)
  }

  const data = await res.json() as { url: string; expiresAt: string }
  const audioUrl = data.url.startsWith('http')
    ? data.url
    : `${ELEVENLABS_BASE}${data.url}`

  return { audioUrl, expiresAt: data.expiresAt }
}

export async function sapiomListVoices(): Promise<{
  voices: Array<{ voice_id: string; name: string }>
}> {
  return sapiomGet(`${ELEVENLABS_BASE}/v2/voices`)
}

// ─── Governance (Spending Rules) ─────────────────────────────────────────────
// Docs: https://docs.sapiom.ai/api-reference/endpoints/rules/v1-spending-rules-post/
// NOTE: Governance API uses Bearer auth, NOT x402 — use raw fetch.

export async function sapiomCreateSpendRule(
  jobId: string,
  budgetUSD: number
): Promise<{ id: string; status: string }> {
  const apiKey = process.env.SAPIOM_API_KEY
  if (!apiKey) throw new Error('SAPIOM_API_KEY is not set')

  const res = await fetch('https://api.sapiom.ai/v1/spending-rules', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `realism-job-${jobId}`,
      ruleType: 'usage_limit',
      resolutionStrategy: 'automatic',
      metadata: { source: 'realism', jobId },
      conditions: [
        {
          fieldType: 'service',
          fieldName: 'all',
          operator: 'equals',
          value: 'all',
          conditionGroup: 'primary',
        },
      ],
      parameters: [
        {
          parameterName: 'Job budget cap',
          limitValue: String(budgetUSD),
          measurementType: 'sum_payment_amount',
          intervalValue: 720,
          intervalUnit: 'hours',
          isRolling: false,
          measurementScope: 'all',
          description: `Budget cap of $${budgetUSD.toFixed(2)} for job ${jobId}`,
        },
      ],
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '(no body)')
    throw new SapiomError(res.status, `Spending rule creation failed (${res.status}): ${text}`)
  }

  return res.json()
}

export async function sapiomGetAnalytics(jobId: string): Promise<{
  totalSpend: number
  breakdown: Array<{ service: string; cost: number; calls: number }>
}> {
  const apiKey = process.env.SAPIOM_API_KEY
  if (!apiKey) throw new Error('SAPIOM_API_KEY is not set')

  const res = await fetch(`https://api.sapiom.ai/v1/analytics/summary?agentName=realism-${jobId}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '(no body)')
    throw new SapiomError(res.status, `Analytics fetch failed (${res.status}): ${text}`)
  }

  return res.json()
}

// ─── Messaging (QStash) ──────────────────────────────────────────────────────
// Docs: https://docs.sapiom.ai/capabilities/messaging/

const QSTASH_BASE = 'https://upstash.services.sapiom.ai'

// Schedule creation uses the QStash schedules endpoint with destination in the
// URL path and cron expression in the Upstash-Cron header (native QStash pattern).
// NOTE: This endpoint is NOT documented on the Sapiom Messaging page — only
// publish/enqueue/batch are. It works because the proxy forwards QStash paths.

export async function sapiomScheduleJob(
  jobId: string,
  cadence: 'daily' | 'weekly',
  webhookUrl: string
): Promise<{ scheduleId: string }> {
  const cron = cadence === 'daily' ? '0 9 * * *' : '0 9 * * 1'

  const res = await getSapiomFetch()(
    `${QSTASH_BASE}/v1/qstash/schedules/${webhookUrl}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Upstash-Cron': cron,
      },
      body: JSON.stringify({ jobId }),
    }
  )

  if (!res.ok) {
    const body = await res.text().catch(() => '(no body)')
    throw new SapiomError(res.status, `QStash schedule creation failed (${res.status}): ${body}`)
  }

  const data = await res.json() as Record<string, unknown>
  const scheduleId = (data.scheduleId ?? data.messageId ?? data.id ?? '') as string
  return { scheduleId }
}

export async function sapiomDeleteSchedule(scheduleId: string): Promise<void> {
  const res = await getSapiomFetch()(`${QSTASH_BASE}/v1/qstash/schedules/${scheduleId}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '(no body)')
    throw new SapiomError(res.status, `sapiomDeleteSchedule error ${res.status}: ${body}`)
  }
}

export async function sapiomPublishMessage(
  destinationUrl: string,
  body: Record<string, unknown>
): Promise<{ messageId: string }> {
  return sapiomPost(`${QSTASH_BASE}/v1/qstash/publish/${destinationUrl}`, body)
}
