import { createOpenAI } from '@ai-sdk/openai'
import { getSapiomFetch } from '@/lib/sapiom'

export const sapiomAI = createOpenAI({
  baseURL: 'https://openrouter.services.sapiom.ai/v1',
  apiKey: process.env.SAPIOM_API_KEY!,
  fetch: getSapiomFetch(),
})

// Force chat completions endpoint (/v1/chat/completions) — Sapiom's /v1/responses
// endpoint silently drops tool definitions, causing the model to skip all tool calls.
export const ORCHESTRATOR_MODEL = sapiomAI.chat('anthropic/claude-3.5-sonnet')
