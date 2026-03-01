import { createOpenAI } from '@ai-sdk/openai'
import { getSapiomFetch } from '@/lib/sapiom'

// Sapiom's OpenRouter proxy rejects assistant messages with content: null
// when tool_calls are present (standard OpenAI spec allows this). Patch
// empty content fields before requests reach the proxy.
function createPatchedFetch(): typeof globalThis.fetch {
  const baseFetch = getSapiomFetch()

  return async (input, init) => {
    if (init?.body && typeof init.body === 'string') {
      try {
        const payload = JSON.parse(init.body)
        if (Array.isArray(payload.messages)) {
          for (const msg of payload.messages) {
            if (msg.role === 'assistant' && !msg.content && msg.tool_calls?.length) {
              msg.content = 'Calling tools.'
            }
          }
          init = { ...init, body: JSON.stringify(payload) }
        }
      } catch {
        // Not JSON — pass through unchanged
      }
    }
    return baseFetch(input, init)
  }
}

export const sapiomAI = createOpenAI({
  baseURL: 'https://openrouter.services.sapiom.ai/v1',
  apiKey: process.env.SAPIOM_API_KEY!,
  fetch: createPatchedFetch(),
})

// Force chat completions endpoint (/v1/chat/completions) — Sapiom's /v1/responses
// endpoint silently drops tool definitions, causing the model to skip all tool calls.
export const ORCHESTRATOR_MODEL = sapiomAI.chat('anthropic/claude-3.5-sonnet')
