import { generateText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import {
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
  updateJob,
  appendStreamEvent as appendStreamEventSapiom,
} from '@/lib/redis'
import { appendStreamEvent as appendStreamEventUpstash } from '@/lib/upstash'
import { startJob, completeJob, failJob, addSpend } from '@/lib/jobs'
import { ORCHESTRATOR_MODEL } from '@/lib/ai-provider'
import type { Job, SpendEvent, Artifact } from '@/types'

async function appendStreamEvent(jobId: string, event: object): Promise<void> {
  await Promise.all([
    appendStreamEventSapiom(jobId, event),
    appendStreamEventUpstash(jobId, event),
  ])
}

// ─── Cost estimates ──────────────────────────────────────────────────────────

const TOOL_COSTS: Record<string, number> = {
  sapiom_search:         0.006,
  sapiom_deep_search:    0.055,
  sapiom_fetch:          0.010,
  sapiom_screenshot:     0.010,
  sapiom_generate_image: 0.040,
  sapiom_text_to_speech: 0.024,
}

// ─── System prompt ───────────────────────────────────────────────────────────

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
- Each tool call costs roughly $0.006–$0.055
- If you are approaching $${(job.budget * 0.9).toFixed(2)}, wrap up with what you have
- Never exceed the budget

OUTPUT:
When you have completed the goal, write your final response.
Include all content in your text response.
If you generated audio, include the URL.
If you generated an image, include the URL.
End with a JSON block in this exact format:

ARTIFACT_JSON
{"type": "document|audio|image|mixed", "title": "Short descriptive title", "content": "Full markdown content of your deliverable", "audioUrl": "URL if audio was generated, omit otherwise", "imageUrl": "URL if image was generated, omit otherwise", "summary": "One paragraph plain text summary"}
END_ARTIFACT_JSON`
}

// ─── Tool definitions (Vercel AI SDK format) ─────────────────────────────────

function buildTools(job: Job, spendRef: { total: number }) {
  async function trackAndExecute<T>(
    toolName: string,
    description: string,
    executeFn: () => Promise<T>
  ): Promise<T> {
    const cost = TOOL_COSTS[toolName] ?? 0.005
    spendRef.total += cost

    const spendEvent: SpendEvent = {
      jobId: job.id,
      tool: toolName,
      description,
      cost,
      timestamp: new Date().toISOString(),
    }

    await Promise.all([
      appendSpendEvent(spendEvent),
      appendStreamEvent(job.id, { type: 'tool_call', payload: spendEvent }),
      addSpend(job.id, cost),
    ])

    return executeFn()
  }

  return {
    sapiom_search: tool({
      description: 'Search the web using Linkup. Returns AI-synthesized answers with source citations. Use depth "deep" for thorough research.',
      inputSchema: z.object({
        query: z.string().describe('Search query'),
        depth: z.enum(['standard', 'deep']).optional().default('standard'),
      }),
      execute: async ({ query, depth }) =>
        trackAndExecute(
          'sapiom_search',
          `Searching: "${query}"`,
          () => sapiomSearch(query, depth ?? 'standard')
        ),
    }),

    sapiom_deep_search: tool({
      description: 'Alternative web search via You.com. Use alongside sapiom_search for broader coverage — different indexes.',
      inputSchema: z.object({
        query: z.string().describe('Search query'),
      }),
      execute: async ({ query }) =>
        trackAndExecute(
          'sapiom_deep_search',
          `Deep searching: "${query}"`,
          () => sapiomSearch(query, 'deep')
        ),
    }),

    sapiom_fetch: tool({
      description: 'Extract webpage content as clean markdown. Use after search to read full articles — snippets are never enough.',
      inputSchema: z.object({
        url: z.string().url().describe('URL to fetch'),
      }),
      execute: async ({ url }) =>
        trackAndExecute(
          'sapiom_fetch',
          `Reading: ${url}`,
          async () => {
            try {
              const result = await sapiomFetchUrl(url)
              return { content: result.markdown.slice(0, 8000), url }
            } catch {
              const result = await sapiomExtract(url)
              return { content: result.content.slice(0, 8000), url }
            }
          }
        ),
    }),

    sapiom_screenshot: tool({
      description: 'Capture a screenshot of any URL.',
      inputSchema: z.object({
        url: z.string().url().describe('URL to screenshot'),
      }),
      execute: async ({ url }) =>
        trackAndExecute(
          'sapiom_screenshot',
          `Screenshot: ${url}`,
          () => sapiomScreenshot(url)
        ),
    }),

    sapiom_generate_image: tool({
      description: 'Generate an image from a text prompt using FLUX. Use for visual artifacts, cover images, brand concepts.',
      inputSchema: z.object({
        prompt: z.string().describe('Detailed image generation prompt'),
        model: z.enum(['fal-ai/flux/schnell', 'fal-ai/flux/dev', 'fal-ai/flux-pro'])
          .optional()
          .default('fal-ai/flux/schnell')
          .describe('schnell is fastest, dev is higher quality, pro is highest quality'),
      }),
      execute: async ({ prompt, model }) =>
        trackAndExecute(
          'sapiom_generate_image',
          `Generating image: "${prompt.slice(0, 60)}..."`,
          () => sapiomGenerateImage(prompt, model)
        ),
    }),

    sapiom_text_to_speech: tool({
      description: 'Convert text to speech. Returns a URL to an mp3. Use for audio summaries or briefings.',
      inputSchema: z.object({
        text: z.string().describe('Text to convert. Max ~2000 chars for best results.'),
        voiceId: z.string().optional().describe('Voice ID. Leave blank for default.'),
      }),
      execute: async ({ text, voiceId }) =>
        trackAndExecute(
          'sapiom_text_to_speech',
          `Converting to audio (${text.split(' ').length} words)`,
          () => sapiomTextToSpeech(text, voiceId)
        ),
    }),
  }
}

// ─── JSON repair ─────────────────────────────────────────────────────────────

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
  try {
    const parsed = JSON.parse(raw)
    if (parsed.type && parsed.title) return parsed as Artifact
  } catch { /* fall through */ }

  try {
    const repaired = repairJsonNewlines(raw.trim())
    const parsed = JSON.parse(repaired)
    if (parsed.type && parsed.title) return parsed as Artifact
  } catch { /* fall through */ }

  return null
}

// ─── Artifact parser ─────────────────────────────────────────────────────────

function parseArtifact(fullResponse: string): Artifact | null {
  const markerIdx = fullResponse.indexOf('ARTIFACT_JSON')
  const textContent = markerIdx > 0 ? fullResponse.slice(0, markerIdx).trim() : ''

  const markerMatch = fullResponse.match(/ARTIFACT_JSON\s*([\s\S]*?)\s*END_ARTIFACT_JSON/)
  if (markerMatch) {
    const result = tryParseArtifact(markerMatch[1])
    if (result) {
      if (!result.content && textContent) result.content = textContent
      return result
    }
  }

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

function buildFallbackArtifact(job: Job, content: string): Artifact {
  return {
    type: 'document',
    title: job.goal.slice(0, 60),
    content,
    summary: content.slice(0, 300),
  }
}

// ─── Main run function ───────────────────────────────────────────────────────

export async function runJob(job: Job): Promise<void> {
  await startJob(job.id)

  const spendRef = { total: 0 }

  try {
    const result = await generateText({
      model: ORCHESTRATOR_MODEL,
      system: buildSystemPrompt(job),
      prompt: job.goal,
      tools: buildTools(job, spendRef),
      stopWhen: stepCountIs(15),
      maxOutputTokens: 4096,
    })

    const finalText = result.text

    console.log(`[orchestrator] Job ${job.id}: ${result.steps.length} steps, ${finalText.length} chars`)

    const artifact = parseArtifact(finalText) ?? buildFallbackArtifact(job, finalText)

    // Strip ARTIFACT_JSON block from content if parseArtifact extracted it from markers
    if (artifact.content) {
      artifact.content = artifact.content
        .replace(/ARTIFACT_JSON[\s\S]*?END_ARTIFACT_JSON/g, '')
        .replace(/ARTIFACT_JSON[\s\S]*/g, '')
        .replace(/```json[\s\S]*?```/g, '')
        .trim() || artifact.summary || finalText.slice(0, 500)
    }

    await Promise.all([
      completeJob(job.id, artifact),
      setArtifact(job.id, artifact),
      appendStreamEvent(job.id, { type: 'artifact', payload: artifact }),
      appendStreamEvent(job.id, {
        type: 'complete',
        payload: { jobId: job.id, total: spendRef.total },
      }),
    ])
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[orchestrator] Job ${job.id} failed:`, message)
    await failJob(job.id, message)
    await appendStreamEvent(job.id, {
      type: 'error',
      payload: { message: 'Job failed. Please try again.' },
    })
  }
}
