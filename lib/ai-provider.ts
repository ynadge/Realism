import { createOpenAI } from '@ai-sdk/openai'
import { getSapiomFetch } from '@/lib/sapiom'

export const sapiomAI = createOpenAI({
  baseURL: 'https://openrouter.services.sapiom.ai/v1',
  apiKey: process.env.SAPIOM_API_KEY!,
  fetch: getSapiomFetch(),
})

export const ORCHESTRATOR_MODEL = sapiomAI('anthropic/claude-3.5-sonnet')
