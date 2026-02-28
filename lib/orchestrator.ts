import {
  getSapiomFetch,
  sapiomSearch,
  sapiomFetchUrl,
  sapiomExtract,
  sapiomScreenshot,
  sapiomGenerateImage,
  sapiomTextToSpeech,
} from '@/lib/sapiom'
import {
  appendSpendEvent,
  setArtifact,
  setOrchestratorState,
  getOrchestratorState,
  deleteOrchestratorState,
  appendStreamEvent as appendStreamEventSapiom,
} from '@/lib/redis'
import { appendStreamEvent as appendStreamEventUpstash } from '@/lib/upstash'
import { completeJob, failJob, startJob, addSpend } from '@/lib/jobs'
import type { Job, SpendEvent, Artifact, StreamEvent } from '@/types'

async function appendStreamEvent(jobId: string, event: object): Promise<void> {
  await Promise.all([
    appendStreamEventSapiom(jobId, event),
    appendStreamEventUpstash(jobId, event),
  ])
}

// ─── Tool definitions (OpenAI function-calling format) ──────────────────────

export const ORCHESTRATOR_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'sapiom_search',
      description: 'Search the web using Linkup. Returns search results with titles, URLs, and snippets. Use depth "deep" for thorough research.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          depth: { type: 'string', enum: ['standard', 'deep'], description: 'Search depth. Use deep for research tasks.' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'sapiom_deep_search',
      description: 'Deep web search for comprehensive coverage — always uses deep mode. Use alongside sapiom_search for broader coverage.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'sapiom_fetch',
      description: 'Extract webpage content as clean markdown. Use after sapiom_search to read full articles — search snippets are never enough.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to fetch' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'sapiom_screenshot',
      description: 'Capture a screenshot of any URL. Use for visual comparison or when the user needs to see a page.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to screenshot' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'sapiom_generate_image',
      description: 'Generate an image from a text prompt using FLUX. Use for visual artifacts, cover images, brand concepts.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Detailed image generation prompt' },
          model: {
            type: 'string',
            enum: ['fal-ai/flux/schnell', 'fal-ai/flux/dev', 'fal-ai/flux-pro'],
            description: 'Model to use. schnell is fastest/cheapest. dev is higher quality.',
          },
        },
        required: ['prompt'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'sapiom_text_to_speech',
      description: 'Convert text to speech audio. Returns a playable audio URL. Use when the user wants an audio summary or podcast-style output.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to convert to speech. Max ~2000 chars for best results.' },
          voiceId: { type: 'string', description: 'Voice ID. Leave blank for default (George, neutral professional).' },
        },
        required: ['text'],
      },
    },
  },
]

// ─── Cost estimates ─────────────────────────────────────────────────────────

const TOOL_COST_ESTIMATES: Record<string, number> = {
  sapiom_search:         0.006,
  sapiom_deep_search:    0.055,
  sapiom_fetch:          0.010,
  sapiom_screenshot:     0.010,
  sapiom_generate_image: 0.040,
  sapiom_text_to_speech: 0.024,
}

function estimateCost(toolName: string): number {
  return TOOL_COST_ESTIMATES[toolName] ?? 0.005
}

// ─── Tool executor ──────────────────────────────────────────────────────────
// Returns { llmResponse, audioUrl?, imageUrl? } — large binary data goes to
// the sideband (audioUrl/imageUrl) rather than into the LLM context window.

type ToolExecResult = {
  llmResponse: string
  audioUrl?: string
  imageUrl?: string
}

async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolExecResult> {
  switch (name) {
    case 'sapiom_search':
    case 'sapiom_deep_search': {
      const result = await sapiomSearch(
        args.query as string,
        name === 'sapiom_deep_search' ? 'deep' : ((args.depth as 'standard' | 'deep') ?? 'standard')
      )
      return { llmResponse: JSON.stringify(result) }
    }
    case 'sapiom_fetch': {
      try {
        const result = await sapiomFetchUrl(args.url as string)
        const content = result.markdown.slice(0, 8000)
        return { llmResponse: JSON.stringify({ content, url: args.url }) }
      } catch {
        const result = await sapiomExtract(args.url as string)
        const content = result.content.slice(0, 8000)
        return { llmResponse: JSON.stringify({ ...result, content }) }
      }
    }
    case 'sapiom_screenshot': {
      const result = await sapiomScreenshot(args.url as string)
      return { llmResponse: JSON.stringify(result) }
    }
    case 'sapiom_generate_image': {
      const result = await sapiomGenerateImage(
        args.prompt as string,
        (args.model as string) || undefined
      )
      const imageUrl = result.images?.[0]?.url
      return {
        llmResponse: JSON.stringify(result),
        imageUrl,
      }
    }
    case 'sapiom_text_to_speech': {
      const result = await sapiomTextToSpeech(
        args.text as string,
        (args.voiceId as string) || undefined
      )
      const wordCount = (args.text as string).split(/\s+/).length

      return {
        llmResponse: JSON.stringify({ status: 'audio_generated', wordCount, format: 'mp3', audioUrl: result.audioUrl }),
        audioUrl: result.audioUrl,
      }
    }
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

// ─── System prompt ──────────────────────────────────────────────────────────

export function buildSystemPrompt(job: Job): string {
  return `You are Realism's execution engine. You make things real.

GOAL: ${job.goal}
BUDGET: $${job.budget.toFixed(2)}
JOB_ID: ${job.id}

YOUR JOB:
Interpret the goal and execute it using the tools available to you.
Always produce a concrete artifact at the end — a document, audio file, image, or a combination.
Never finish without producing something real.

TOOL STRATEGY:
- For research: use sapiom_search first, then sapiom_fetch to read full articles (snippets aren't enough)
- Use sapiom_search AND sapiom_deep_search together for comprehensive coverage (different indexes)
- For audio output: use sapiom_text_to_speech on your final written summary
- For visual output: use sapiom_generate_image with a detailed prompt
- Keep tool calls focused — each one should directly serve the goal

BUDGET RULES:
- Track your spend. Each tool call costs roughly $0.006–$0.055.
- If you're approaching $${(job.budget * 0.9).toFixed(2)}, wrap up with what you have.
- Never exceed the budget.

OUTPUT FORMAT:
When done, write the full artifact as markdown FIRST, then append the metadata block.

Your response structure must be:
1. Full markdown deliverable (the user sees this as the artifact content)
2. Then on a new line: ARTIFACT_JSON
3. One-line JSON with metadata: {"type":"mixed","title":"Title","summary":"Brief summary"}
4. Then: END_ARTIFACT_JSON

type must be: document | audio | image | mixed
Do NOT put "content", "audioUrl", or "imageUrl" in the JSON. Keep JSON on ONE line.
The system captures everything before ARTIFACT_JSON as the content, and injects media URLs automatically.`
}

// ─── JSON repair ─────────────────────────────────────────────────────────────
// Claude often outputs pretty-printed JSON with literal newlines/tabs inside
// string values. This state machine replaces them with proper escape sequences.

function repairJsonNewlines(raw: string): string {
  let result = ''
  let inString = false
  let escaped = false

  for (const ch of raw) {
    if (escaped) { result += ch; escaped = false; continue }
    if (ch === '\\' && inString) { result += ch; escaped = true; continue }
    if (ch === '"') { inString = !inString; result += ch; continue }
    if (inString && ch === '\n') { result += '\\n'; continue }
    if (inString && ch === '\r') { continue }
    if (inString && ch === '\t') { result += '\\t'; continue }
    result += ch
  }

  return result
}

function tryParseArtifact(raw: string): Artifact | null {
  // First attempt: direct parse
  try {
    const parsed = JSON.parse(raw)
    if (parsed.type && parsed.title) return parsed as Artifact
  } catch { /* fall through */ }

  // Second attempt: repair literal newlines in string values
  try {
    const repaired = repairJsonNewlines(raw.trim())
    const parsed = JSON.parse(repaired)
    if (parsed.type && parsed.title) return parsed as Artifact
  } catch { /* fall through */ }

  return null
}

// ─── Artifact parser ─────────────────────────────────────────────────────────
// Extracts content from the LLM's text BEFORE the marker, and metadata from
// the JSON inside the markers. This avoids multi-line JSON string issues.

function parseArtifact(fullResponse: string): Artifact | null {
  // Extract text content before the ARTIFACT_JSON marker
  const markerIdx = fullResponse.indexOf('ARTIFACT_JSON')
  const textContent = markerIdx > 0 ? fullResponse.slice(0, markerIdx).trim() : ''

  // Primary: ARTIFACT_JSON ... END_ARTIFACT_JSON markers
  const markerMatch = fullResponse.match(/ARTIFACT_JSON\s*([\s\S]*?)\s*END_ARTIFACT_JSON/)
  if (markerMatch) {
    const result = tryParseArtifact(markerMatch[1])
    if (result) {
      if (!result.content && textContent) result.content = textContent
      return result
    }
  }

  // Fallback: Claude sometimes wraps in markdown fences
  const fenceMatch = fullResponse.match(/```(?:json)?\s*\n?\s*(\{[\s\S]*?\})\s*\n?\s*```/)
  if (fenceMatch) {
    const fenceIdx = fullResponse.indexOf(fenceMatch[0])
    const fenceContent = fenceIdx > 0 ? fullResponse.slice(0, fenceIdx).trim() : ''
    const result = tryParseArtifact(fenceMatch[1])
    if (result) {
      if (!result.content && fenceContent) result.content = fenceContent
      return result
    }
  }

  // Last resort: find any JSON that looks like artifact metadata
  const jsonBlocks = fullResponse.match(/\{[^{}]*"type"\s*:\s*"(?:document|audio|image|mixed)"[^{}]*\}/g)
  if (jsonBlocks) {
    for (const block of jsonBlocks.reverse()) {
      const result = tryParseArtifact(block)
      if (result) {
        if (!result.content && textContent) result.content = textContent
        return result
      }
    }
  }

  return null
}

// ─── Description builder ────────────────────────────────────────────────────

function buildToolDescription(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case 'sapiom_search':
    case 'sapiom_deep_search':
      return `Searching: "${args.query}"`
    case 'sapiom_fetch':
      return `Reading: ${args.url}`
    case 'sapiom_screenshot':
      return `Screenshot: ${args.url}`
    case 'sapiom_generate_image':
      return `Generating image: "${String(args.prompt).slice(0, 60)}..."`
    case 'sapiom_text_to_speech':
      return `Converting to audio (${String(args.text).split(' ').length} words)`
    default:
      return toolName
  }
}

// ─── The agentic loop ───────────────────────────────────────────────────────

type OrchestratorMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
  tool_call_id?: string
  name?: string
}

const OPENROUTER_URL = 'https://openrouter.services.sapiom.ai/v1/chat/completions'
const MODEL = 'openai/gpt-4o'
const MAX_ITERATIONS = 15

export async function* runOrchestrator(
  job: Job
): AsyncGenerator<StreamEvent> {
  await startJob(job.id)

  const messages: OrchestratorMessage[] = [
    { role: 'system', content: buildSystemPrompt(job) },
    { role: 'user', content: job.goal },
  ]

  let spendAccumulator = 0
  const sapiomFetch = getSapiomFetch()
  const generatedAssets: { audioUrl?: string; imageUrl?: string } = {}

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    let response: Response | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await sapiomFetch(OPENROUTER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: MODEL,
            messages,
            tools: ORCHESTRATOR_TOOLS,
            tool_choice: 'auto',
            max_tokens: 4096,
          }),
        })
      } catch (err) {
        if (attempt === 2) {
          await failJob(job.id, `Network error calling LLM: ${err}`)
          yield { type: 'error', payload: { message: 'Failed to reach the AI model. Please try again.' } }
          return
        }
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
        continue
      }

      if (response.ok) break

      if (response.status >= 500 && attempt < 2) {
        console.warn(`[orchestrator] LLM API ${response.status}, retrying (attempt ${attempt + 1})...`)
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
        continue
      }

      const body = await response.text().catch(() => '')
      console.error(`[orchestrator] LLM API error ${response.status}: ${body.slice(0, 500)}`)
      await failJob(job.id, `LLM API error ${response.status}: ${body.slice(0, 500)}`)
      yield { type: 'error', payload: { message: `AI model error (${response.status}): ${body.slice(0, 200)}` } }
      return
    }

    if (!response || !response.ok) {
      await failJob(job.id, 'LLM call failed after retries')
      yield { type: 'error', payload: { message: 'AI model failed after retries.' } }
      return
    }

    const completion = await response.json()
    const message = completion.choices?.[0]?.message

    if (!message) {
      await failJob(job.id, 'No message in LLM response')
      yield { type: 'error', payload: { message: 'Unexpected response from AI model.' } }
      return
    }

    // Add assistant message to history (preserve tool_calls if present).
    // Some proxies reject null/empty content — always provide a non-empty value.
    const assistantMsg: OrchestratorMessage = {
      role: 'assistant',
      content: message.content || (message.tool_calls?.length ? 'Calling tools.' : ''),
    }
    if (message.tool_calls?.length) {
      assistantMsg.tool_calls = message.tool_calls
    }
    messages.push(assistantMsg)

    // No tool calls — final response
    const toolCalls = message.tool_calls
    if (!toolCalls || toolCalls.length === 0) {
      const fullContent = message.content ?? ''
      let artifact = parseArtifact(fullContent)

      if (!artifact) {
        artifact = {
          type: 'document',
          title: job.goal.slice(0, 60),
          content: fullContent,
          summary: fullContent.slice(0, 200),
        }
      }

      // Ensure content is populated — strip ARTIFACT_JSON block from full response
      if (!artifact.content) {
        const stripped = fullContent
          .replace(/ARTIFACT_JSON[\s\S]*?END_ARTIFACT_JSON/g, '')
          .replace(/ARTIFACT_JSON[\s\S]*/g, '')
          .replace(/```json[\s\S]*?```/g, '')
          .trim()
        artifact.content = stripped || artifact.summary || ''
      }

      // Inject sideband assets that the LLM can't reproduce in its output
      if (generatedAssets.audioUrl && !artifact.audioUrl) {
        artifact.audioUrl = generatedAssets.audioUrl
        if (artifact.type === 'document') artifact.type = 'mixed'
      }
      if (generatedAssets.imageUrl && !artifact.imageUrl) {
        artifact.imageUrl = generatedAssets.imageUrl
        if (artifact.type === 'document') artifact.type = 'mixed'
      }

      await completeJob(job.id, artifact)
      await setArtifact(job.id, artifact)
      yield { type: 'artifact', payload: artifact }

      yield { type: 'complete', payload: { jobId: job.id, total: spendAccumulator } }
      return
    }

    // Execute each tool call
    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name
      let toolArgs: Record<string, unknown> = {}
      try {
        toolArgs = JSON.parse(toolCall.function.arguments ?? '{}')
      } catch {
        toolArgs = {}
      }

      const cost = estimateCost(toolName)
      spendAccumulator += cost

      const spendEvent: SpendEvent = {
        jobId: job.id,
        tool: toolName,
        description: buildToolDescription(toolName, toolArgs),
        cost,
        timestamp: new Date().toISOString(),
      }

      await appendSpendEvent(spendEvent)
      await addSpend(job.id, cost)
      yield { type: 'tool_call', payload: spendEvent }

      let toolResult: string
      try {
        const execResult = await executeTool(toolName, toolArgs)
        toolResult = execResult.llmResponse
        if (execResult.audioUrl) generatedAssets.audioUrl = execResult.audioUrl
        if (execResult.imageUrl) generatedAssets.imageUrl = execResult.imageUrl
      } catch (err) {
        toolResult = JSON.stringify({ error: `Tool execution failed: ${err}` })
      }

      messages.push({
        role: 'tool',
        content: toolResult,
        tool_call_id: toolCall.id,
        name: toolName,
      })

      if (spendAccumulator >= job.budget * 0.9) {
        messages.push({
          role: 'user',
          content: `Budget limit approaching ($${spendAccumulator.toFixed(3)} of $${job.budget.toFixed(2)} spent). Wrap up now and produce your final artifact with what you have.`,
        })
        break
      }
    }
  }

  await failJob(job.id, 'Max iterations reached')
  yield { type: 'error', payload: { message: 'Job took too many steps. Partial results may be available.' } }
}

// ─── Background step execution ──────────────────────────────────────────────
// Instead of running the full loop in one invocation (which times out on
// serverless), `runOrchestratorStep` executes ONE LLM call + its tool calls,
// persists state to Redis, and returns. The caller (worker route) re-enqueues
// via QStash if more work is needed.

export type OrchestratorState = {
  messages: OrchestratorMessage[]
  iteration: number
  spendAccumulator: number
  generatedAssets: { audioUrl?: string; imageUrl?: string }
}

export type StepResult =
  | { done: false; iteration: number }
  | { done: true; outcome: 'completed'; artifact: Artifact; spendTotal: number }
  | { done: true; outcome: 'failed'; reason: string }

export async function runOrchestratorStep(
  job: Job,
  expectedIteration?: number
): Promise<StepResult> {
  let state = await getOrchestratorState<OrchestratorState>(job.id)

  if (!state) {
    state = {
      messages: [
        { role: 'system', content: buildSystemPrompt(job) },
        { role: 'user', content: job.goal },
      ],
      iteration: 0,
      spendAccumulator: 0,
      generatedAssets: {},
    }
  }

  if (expectedIteration !== undefined && state.iteration !== expectedIteration) {
    return { done: false, iteration: state.iteration }
  }

  if (state.iteration >= MAX_ITERATIONS) {
    await appendStreamEvent(job.id, {
      type: 'error',
      payload: { message: 'Job took too many steps. Partial results may be available.' },
    })
    await deleteOrchestratorState(job.id)
    return { done: true, outcome: 'failed', reason: 'Max iterations reached' }
  }

  const sapiomFetch = getSapiomFetch()

  let response: Response | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      response = await sapiomFetch(OPENROUTER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          messages: state.messages,
          tools: ORCHESTRATOR_TOOLS,
          tool_choice: 'auto',
          max_tokens: 4096,
        }),
      })
    } catch (err) {
      if (attempt === 2) {
        await appendStreamEvent(job.id, {
          type: 'error',
          payload: { message: 'Failed to reach the AI model. Please try again.' },
        })
        await deleteOrchestratorState(job.id)
        return { done: true, outcome: 'failed', reason: `Network error calling LLM: ${err}` }
      }
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
      continue
    }

    if (response.ok) break

    if (response.status >= 500 && attempt < 2) {
      console.warn(`[step] LLM API ${response.status}, retrying (attempt ${attempt + 1})...`)
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
      continue
    }

    const body = await response.text().catch(() => '')
    console.error(`[step] LLM API error ${response.status}: ${body.slice(0, 500)}`)
    await appendStreamEvent(job.id, {
      type: 'error',
      payload: { message: `AI model error (${response.status}): ${body.slice(0, 200)}` },
    })
    await deleteOrchestratorState(job.id)
    return { done: true, outcome: 'failed', reason: `LLM API error ${response.status}: ${body.slice(0, 500)}` }
  }

  if (!response || !response.ok) {
    await appendStreamEvent(job.id, {
      type: 'error',
      payload: { message: 'AI model failed after retries.' },
    })
    await deleteOrchestratorState(job.id)
    return { done: true, outcome: 'failed', reason: 'LLM call failed after retries' }
  }

  const completion = await response.json()
  const message = completion.choices?.[0]?.message

  if (!message) {
    await appendStreamEvent(job.id, {
      type: 'error',
      payload: { message: 'Unexpected response from AI model.' },
    })
    await deleteOrchestratorState(job.id)
    return { done: true, outcome: 'failed', reason: 'No message in LLM response' }
  }

  const assistantMsg: OrchestratorMessage = {
    role: 'assistant',
    content: message.content || (message.tool_calls?.length ? 'Calling tools.' : ''),
  }
  if (message.tool_calls?.length) {
    assistantMsg.tool_calls = message.tool_calls
  }
  state.messages.push(assistantMsg)

  const toolCalls = message.tool_calls
  if (!toolCalls || toolCalls.length === 0) {
    const fullContent = message.content ?? ''
    let artifact = parseArtifact(fullContent)

    if (!artifact) {
      artifact = {
        type: 'document',
        title: job.goal.slice(0, 60),
        content: fullContent,
        summary: fullContent.slice(0, 200),
      }
    }

    if (!artifact.content) {
      const stripped = fullContent
        .replace(/ARTIFACT_JSON[\s\S]*?END_ARTIFACT_JSON/g, '')
        .replace(/ARTIFACT_JSON[\s\S]*/g, '')
        .replace(/```json[\s\S]*?```/g, '')
        .trim()
      artifact.content = stripped || artifact.summary || ''
    }

    if (state.generatedAssets.audioUrl && !artifact.audioUrl) {
      artifact.audioUrl = state.generatedAssets.audioUrl
      if (artifact.type === 'document') artifact.type = 'mixed'
    }
    if (state.generatedAssets.imageUrl && !artifact.imageUrl) {
      artifact.imageUrl = state.generatedAssets.imageUrl
      if (artifact.type === 'document') artifact.type = 'mixed'
    }

    await setArtifact(job.id, artifact)
    await appendStreamEvent(job.id, { type: 'artifact', payload: artifact })
    await appendStreamEvent(job.id, {
      type: 'complete',
      payload: { jobId: job.id, total: state.spendAccumulator },
    })
    await deleteOrchestratorState(job.id)
    return { done: true, outcome: 'completed', artifact, spendTotal: state.spendAccumulator }
  }

  for (const toolCall of toolCalls) {
    const toolName = toolCall.function.name
    let toolArgs: Record<string, unknown> = {}
    try {
      toolArgs = JSON.parse(toolCall.function.arguments ?? '{}')
    } catch {
      toolArgs = {}
    }

    const cost = estimateCost(toolName)
    state.spendAccumulator += cost

    const spendEvent: SpendEvent = {
      jobId: job.id,
      tool: toolName,
      description: buildToolDescription(toolName, toolArgs),
      cost,
      timestamp: new Date().toISOString(),
    }

    await appendSpendEvent(spendEvent)
    await addSpend(job.id, cost)
    await appendStreamEvent(job.id, { type: 'tool_call', payload: spendEvent })

    let toolResult: string
    try {
      const execResult = await executeTool(toolName, toolArgs)
      toolResult = execResult.llmResponse
      if (execResult.audioUrl) state.generatedAssets.audioUrl = execResult.audioUrl
      if (execResult.imageUrl) state.generatedAssets.imageUrl = execResult.imageUrl
    } catch (err) {
      toolResult = JSON.stringify({ error: `Tool execution failed: ${err}` })
    }

    state.messages.push({
      role: 'tool',
      content: toolResult,
      tool_call_id: toolCall.id,
      name: toolName,
    })

    if (state.spendAccumulator >= job.budget * 0.9) {
      state.messages.push({
        role: 'user',
        content: `Budget limit approaching ($${state.spendAccumulator.toFixed(3)} of $${job.budget.toFixed(2)} spent). Wrap up now and produce your final artifact with what you have.`,
      })
      break
    }
  }

  state.iteration++
  await setOrchestratorState(job.id, state)
  return { done: false, iteration: state.iteration }
}
