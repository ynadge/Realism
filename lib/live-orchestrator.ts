import { generateText } from 'ai'
import { ORCHESTRATOR_MODEL } from '@/lib/ai-provider'
import { classifyLiveGoal } from '@/lib/classifier'
import { buildDesignBrief, getPersonality } from '@/lib/design-personalities'
import { getConnectorSummaryForUser } from '@/lib/connector-manager'
import { generateUniqueSlug, setLiveApp, setLiveBundle, setDataPlan } from '@/lib/live-apps'
import { sapiomSearch, sapiomFetchUrl } from '@/lib/sapiom'
import type {
  DataPlan, DataFetch, DataAPIResponse, DataResult,
  LiveCreationInput, LiveCreationResult, DesignPersonalityId,
} from '@/types/live'

// ─── Step 1: PLAN ─────────────────────────────────────────────────────────────

export async function planLiveApp(input: LiveCreationInput): Promise<DataPlan> {
  const { goal, userId } = input

  const classification = await classifyLiveGoal(goal)
  const personality = getPersonality(classification.designPersonality)
  const connectorSummary = await getConnectorSummaryForUser(userId)

  const systemPrompt = `You are the planning engine for Realism, a personal software generator.

Your job is to produce a DataPlan — a structured JSON config that describes what data sources
a personal app needs. You are NOT generating the app itself. You are planning what data it will fetch.

AVAILABLE DATA SOURCES:
1. sapiom_search — web search via Linkup (good for news, current events, general research)
2. sapiom_deep_search — deeper web search via Linkup deep mode (use alongside sapiom_search for broader coverage on research-heavy topics)
3. sapiom_fetch — extract content from a specific URL (good for pulling size guides, documentation, specific pages)
4. connector — use a connected service (see available connectors below)

AVAILABLE CONNECTORS:
${connectorSummary}

RULES:
- Plan 2-4 data fetches maximum. More is not better — focused is better.
- Each fetch must have a clear, specific purpose that serves the goal
- For news/current events: use sapiom_search with SPECIFIC, TARGETED queries — not generic single-word queries. Include year, context, and specifics. Example: "bitcoin price analysis narratives smart money 2026" not just "bitcoin"
- For broad research: pair sapiom_search (standard) with sapiom_deep_search (deep) using different query angles for coverage
- For specific pages: use sapiom_fetch with the actual URL
- For connectors: only suggest them if they would genuinely improve the app
- Set cacheTTL appropriately: real-time news = 300 (5 min), slower news = 600 (10 min), slow data = 3600 (1 hour), static references = 86400 (1 day)
- If the goal mentions personal measurements, sizes, or preferences — extract them as userContext key-value pairs
- synthesize: true means the raw results will be passed through an LLM to extract key insights
- Use synthesize: true for search results that need summarization, synthesize: false for structured connector data
- Give each fetch a descriptive id that reflects its purpose (e.g. "bitcoin-price-narratives", "artist-mkgee-coverage")
- synthesisPrompt should be specific: "Extract the 5 most significant Bitcoin developments and price catalysts" not "Summarize"

OUTPUT: Respond with ONLY a valid JSON object matching this exact shape. No explanation. No markdown fences. No preamble. Just the JSON object.

{
  "slug": "url-safe-slug-max-48-chars",
  "title": "Short descriptive title for the app",
  "description": "One sentence describing what this app does",
  "fetches": [
    {
      "id": "unique-descriptive-fetch-id",
      "type": "sapiom_search" | "sapiom_fetch" | "sapiom_deep_search" | "connector",
      "query": "specific targeted search query with context and year (for search types)",
      "url": "https://... (for sapiom_fetch type only)",
      "connector": "connector-id (for connector type only)",
      "method": "method-id (for connector type only)",
      "synthesize": true | false,
      "synthesisPrompt": "Specific instructions on what to extract and how to present it (if synthesize is true)"
    }
  ],
  "userContext": {
    "key": "value extracted from goal (e.g. chest: '38in')"
  },
  "connectors": [
    { "id": "connector-id", "connected": true | false, "scopes": [] }
  ],
  "cacheTTL": 300
}`

  const userPrompt = `GOAL: ${goal}

Design personality detected: ${personality.name} (${classification.designPersonality})
Suggested connectors: ${classification.suggestedConnectors.join(', ') || 'none'}
Personal context fields detected: ${classification.personalContextFields.join(', ') || 'none'}

Produce the DataPlan JSON for this goal.`

  const { text } = await generateText({
    model: ORCHESTRATOR_MODEL,
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 1500,
  })

  return parsePlanResponse(text, goal, userId)
}

// ─── Plan response parsing ─────────────────────────────────────────────────────

function parsePlanResponse(text: string, goal: string, userId: string): DataPlan {
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  // Strip any preamble text before the first {
  const firstBrace = cleaned.indexOf('{')
  if (firstBrace > 0) {
    cleaned = cleaned.slice(firstBrace)
  }

  // Strip any trailing text after the last }
  const lastBrace = cleaned.lastIndexOf('}')
  if (lastBrace >= 0 && lastBrace < cleaned.length - 1) {
    cleaned = cleaned.slice(0, lastBrace + 1)
  }

  let raw: Partial<DataPlan>
  try {
    raw = JSON.parse(cleaned)
  } catch {
    console.error('[planLiveApp] Failed to parse plan response:', text.slice(0, 300))
    return buildFallbackPlan(goal, userId)
  }

  const plan: DataPlan = {
    slug: sanitizeSlug(raw.slug ?? goal),
    userId,
    title: raw.title ?? goal.slice(0, 60),
    description: raw.description ?? goal,
    fetches: validateFetches(raw.fetches ?? []),
    userContext: raw.userContext ?? {},
    connectors: raw.connectors ?? [],
    cacheTTL: raw.cacheTTL ?? 300,
  }

  if (plan.fetches.length === 0) {
    plan.fetches = [{
      id: 'primary-search',
      type: 'sapiom_search',
      query: goal,
      synthesize: true,
      synthesisPrompt: 'Extract the most relevant and interesting information',
    }]
  }

  return plan
}

function validateFetches(fetches: unknown[]): DataFetch[] {
  if (!Array.isArray(fetches)) return []

  return fetches
    .filter((f): f is Record<string, unknown> => typeof f === 'object' && f !== null)
    .filter(f => typeof f.id === 'string' && typeof f.type === 'string')
    .map(f => ({
      id: String(f.id),
      type: f.type as DataFetch['type'],
      query: f.query ? String(f.query) : undefined,
      url: f.url ? String(f.url) : undefined,
      connector: f.connector ? String(f.connector) : undefined,
      method: f.method ? String(f.method) : undefined,
      synthesize: Boolean(f.synthesize ?? true),
      synthesisPrompt: f.synthesisPrompt ? String(f.synthesisPrompt) : undefined,
    }))
    .slice(0, 4)
}

function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48)
    .replace(/^-|-$/g, '')
}

function buildFallbackPlan(goal: string, userId: string): DataPlan {
  return {
    slug: sanitizeSlug(goal),
    userId,
    title: goal.slice(0, 60),
    description: goal,
    fetches: [
      {
        id: 'primary-search',
        type: 'sapiom_search',
        query: goal,
        synthesize: true,
        synthesisPrompt: 'Extract the most relevant and useful information for the user',
      },
    ],
    userContext: {},
    connectors: [],
    cacheTTL: 300,
  }
}

// ─── Step 2: VERIFY ───────────────────────────────────────────────────────────

export type VerifiedPlan = {
  plan: DataPlan
  sampleData: DataAPIResponse
}

export async function verifyDataPlan(plan: DataPlan): Promise<VerifiedPlan> {
  const results: Record<string, DataResult> = {}
  const validFetches: DataFetch[] = []

  const fetchResults = await Promise.allSettled(
    plan.fetches.map(async (dataFetch) => {
      const result = await executePlanFetch(dataFetch, plan.userContext)
      return { id: dataFetch.id, result }
    })
  )

  for (let i = 0; i < fetchResults.length; i++) {
    const settled = fetchResults[i]
    const dataFetch = plan.fetches[i]

    if (settled.status === 'fulfilled') {
      const { id, result } = settled.value
      if (result.items.length > 0) {
        results[id] = result
        validFetches.push(dataFetch)
      } else if (dataFetch.type === 'sapiom_search' && dataFetch.query) {
        console.warn(`[verifyDataPlan] Empty result for fetch "${id}", trying fallback`)
        try {
          const fallbackResult = await executeFallbackFetch(dataFetch)
          if (fallbackResult.items.length > 0) {
            results[id] = fallbackResult
            validFetches.push(dataFetch)
          }
        } catch {
          console.warn(`[verifyDataPlan] Fallback also failed for fetch "${id}"`)
        }
      }
    } else {
      console.error(`[verifyDataPlan] Fetch "${dataFetch.id}" failed:`, settled.reason)
    }
  }

  if (validFetches.length === 0) {
    const fallback: DataFetch = {
      id: 'fallback-search',
      type: 'sapiom_search',
      query: plan.title,
      synthesize: true,
      synthesisPrompt: 'Extract the most relevant and useful information',
    }
    try {
      const fallbackResult = await executePlanFetch(fallback, plan.userContext)
      if (fallbackResult.items.length > 0) {
        results['fallback-search'] = fallbackResult
        validFetches.push(fallback)
      }
    } catch {
      results['fallback-search'] = { items: [], error: 'Could not fetch initial data' }
      validFetches.push(fallback)
    }
  }

  const sampleData: DataAPIResponse = {
    title: plan.title,
    refreshedAt: new Date().toISOString(),
    cached: false,
    data: results,
    userContext: plan.userContext,
  }

  return {
    plan: { ...plan, fetches: validFetches },
    sampleData,
  }
}

// ─── Fetch execution ──────────────────────────────────────────────────────────

async function executePlanFetch(
  dataFetch: DataFetch,
  userContext: Record<string, string>
): Promise<DataResult> {
  const interpolatedQuery = dataFetch.query
    ? interpolate(dataFetch.query, userContext)
    : undefined

  switch (dataFetch.type) {
    case 'sapiom_search': {
      if (!interpolatedQuery) return { items: [] }
      const raw = await sapiomSearch(interpolatedQuery, 'standard')
      return { items: normalizeSearchResults(raw) }
    }

    case 'sapiom_deep_search': {
      if (!interpolatedQuery) return { items: [] }
      const raw = await sapiomSearch(interpolatedQuery, 'deep')
      return { items: normalizeSearchResults(raw) }
    }

    case 'sapiom_fetch': {
      if (!dataFetch.url) return { items: [] }
      const raw = await sapiomFetchUrl(dataFetch.url)
      return {
        items: [{
          title: dataFetch.url,
          summary: raw.markdown?.slice(0, 1000) ?? '',
          url: dataFetch.url,
        }],
      }
    }

    case 'connector': {
      return {
        items: [{
          title: `${dataFetch.connector} connector`,
          summary: `Live data from ${dataFetch.connector} will appear here when the user connects their account`,
        }],
      }
    }

    default:
      return { items: [] }
  }
}

async function executeFallbackFetch(dataFetch: DataFetch): Promise<DataResult> {
  const words = (dataFetch.query ?? '').split(' ').slice(0, 4).join(' ')
  const raw = await sapiomSearch(words, 'standard')
  return { items: normalizeSearchResults(raw) }
}

// ─── Result normalization ──────────────────────────────────────────────────────

type NormalizedItem = {
  title: string
  summary?: string
  url?: string
  publishedAt?: string
  metadata?: Record<string, string>
}

function normalizeSearchResults(raw: unknown): NormalizedItem[] {
  if (!raw) return []

  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>

    if (Array.isArray(obj.results)) {
      return (obj.results as Record<string, unknown>[]).slice(0, 8).map(r => ({
        title: String(r.name ?? r.title ?? 'Result'),
        summary: String(r.content ?? r.snippet ?? r.summary ?? '').slice(0, 400),
        url: r.url ? String(r.url) : undefined,
      }))
    }

    if (typeof obj.answer === 'string') {
      const items: NormalizedItem[] = [{
        title: 'Summary',
        summary: (obj.answer as string).slice(0, 800),
      }]
      if (Array.isArray(obj.sources)) {
        const sourceItems = (obj.sources as Record<string, unknown>[]).slice(0, 5).map(s => ({
          title: String(s.name ?? s.title ?? 'Source'),
          summary: String(s.snippet ?? s.content ?? '').slice(0, 300),
          url: s.url ? String(s.url) : undefined,
        }))
        items.push(...sourceItems)
      }
      return items
    }
  }

  if (typeof raw === 'string') {
    return [{ title: 'Result', summary: raw.slice(0, 600) }]
  }

  return []
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function interpolate(template: string, context: Record<string, string>): string {
  return template.replace(/\{userContext\.(\w+)\}/g, (_, key) => context[key] ?? `{${key}}`)
}

// ─── Step 3: GENERATE ────────────────────────────────────────────────────────

export async function generateLiveApp(
  plan: DataPlan,
  sampleData: DataAPIResponse,
  designPersonalityId: DesignPersonalityId,
): Promise<string> {
  const designBrief = buildDesignBrief(designPersonalityId)
  const dataShape = buildDataShape(plan, sampleData)

  const sampleDataStr = JSON.stringify(
    truncateSampleData(sampleData),
    null,
    2
  )

  const userContextStr = Object.keys(plan.userContext).length > 0
    ? Object.entries(plan.userContext)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
    : 'none'

  const systemPrompt = `You are an expert frontend developer generating complete, self-contained HTML applications.

The app will run inside a sandboxed iframe. It:
- Cannot access cookies, localStorage, or the parent window
- Receives its data by calling fetch('/api/live/data/${plan.slug}') on load
- Must work entirely with vanilla HTML, CSS, and JavaScript
- Must use Tailwind CSS via CDN for styling

${designBrief}

TECHNICAL REQUIREMENTS:
- Start with <!DOCTYPE html> — output the complete HTML document and nothing else
- Include in <head>: <script src="https://cdn.tailwindcss.com"></script>
- Include Google Fonts via <link> tag — choose fonts that match the design directive exactly
- All JavaScript must be vanilla — no React, no Vue, no build step, no imports
- On DOMContentLoaded: call fetch('/api/live/data/${plan.slug}') and render the JSON response
- Show a loading skeleton while data fetches — style it to match the design personality
- Show a meaningful, styled error state if the fetch fails
- Include a subtle refresh button — clicking it re-fetches and re-renders
- The refresh button must be visually consistent with the overall design

DATA SHAPE (what fetch('/api/live/data/${plan.slug}') returns):
${dataShape}

JAVASCRIPT PATTERN TO FOLLOW:
\`\`\`javascript
document.addEventListener('DOMContentLoaded', async () => {
  showLoading()
  try {
    const res = await fetch('/api/live/data/${plan.slug}')
    if (!res.ok) throw new Error('Failed to fetch')
    const data = await res.json()
    renderApp(data)
  } catch (err) {
    showError(err.message)
  }
})

function renderApp(data) {
  // data.title — string
  // data.refreshedAt — ISO timestamp
  // data.cached — boolean
  // data.userContext — { key: value } personal context
  // data.data — { fetchId: { items: [...], synthesized?: string } }
  // Access individual fetches: data.data['${plan.fetches[0]?.id ?? 'primary-search'}']
}
\`\`\`

OUTPUT RULES:
- Return ONLY the complete HTML document
- No explanation before or after
- No markdown code fences
- No comments explaining what you're doing
- The first character of your response must be < (the start of <!DOCTYPE html>)`

  const userPrompt = `GOAL: ${plan.title}
USER CONTEXT: ${userContextStr}

SAMPLE DATA (real data from the verification step — design the UI around this actual content):
${sampleDataStr}

Generate the complete HTML application.`

  const { text } = await generateText({
    model: ORCHESTRATOR_MODEL,
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 8192,
  })

  return stripMarkdownFences(text.trim())
}

// ─── Data shape builder ───────────────────────────────────────────────────────

function buildDataShape(plan: DataPlan, sampleData: DataAPIResponse): string {
  const lines: string[] = [
    '{',
    '  title: string,',
    '  refreshedAt: string (ISO timestamp),',
    '  cached: boolean,',
    '  userContext: {',
    ...Object.keys(plan.userContext).map(k => `    ${k}: string,`),
    '  },',
    '  data: {',
  ]

  for (const f of plan.fetches) {
    const result = sampleData.data[f.id]
    const itemCount = result?.items?.length ?? 0
    const hasSynthesized = f.synthesize && result?.synthesized

    lines.push(`    '${f.id}': {`)
    lines.push(`      items: Array(${itemCount}) of {`)
    lines.push('        title: string,')
    lines.push('        summary?: string,')
    lines.push('        url?: string,')
    lines.push('        imageUrl?: string,')
    lines.push('        publishedAt?: string,')
    lines.push('        metadata?: Record<string, string>,')
    lines.push('      },')
    if (hasSynthesized) {
      lines.push('      synthesized: string (AI summary of all items),')
    }
    lines.push('    },')
  }

  lines.push('  }')
  lines.push('}')

  return lines.join('\n')
}

// ─── Sample data truncation ───────────────────────────────────────────────────

function truncateSampleData(sampleData: DataAPIResponse): Partial<DataAPIResponse> {
  const truncated: Record<string, unknown> = {}

  for (const [key, result] of Object.entries(sampleData.data)) {
    truncated[key] = {
      items: result.items.slice(0, 3).map(item => ({
        title: item.title,
        summary: item.summary?.slice(0, 200),
        url: item.url,
        publishedAt: item.publishedAt,
        metadata: item.metadata,
      })),
      synthesized: result.synthesized?.slice(0, 500),
    }
  }

  return {
    title: sampleData.title,
    data: truncated as DataAPIResponse['data'],
    userContext: sampleData.userContext,
  }
}

function stripMarkdownFences(html: string): string {
  let cleaned = html
    .replace(/^```html\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  // Strip any preamble before the first <
  const firstAngle = cleaned.indexOf('<')
  if (firstAngle > 0) {
    cleaned = cleaned.slice(firstAngle)
  }

  return cleaned
}

// ─── Full creation flow ───────────────────────────────────────────────────────

export async function createLiveApp(input: LiveCreationInput): Promise<LiveCreationResult> {
  const { goal, userId } = input

  const classification = await classifyLiveGoal(goal)
  const rawPlan = await planLiveApp(input)

  const slug = await generateUniqueSlug(userId, rawPlan.slug || goal)
  const plan = { ...rawPlan, slug, userId }

  const { plan: verifiedPlan, sampleData } = await verifyDataPlan(plan)

  const html = await generateLiveApp(
    verifiedPlan,
    sampleData,
    classification.designPersonality
  )

  const now = new Date().toISOString()
  const config = {
    id: crypto.randomUUID(),
    userId,
    slug,
    title: verifiedPlan.title,
    description: verifiedPlan.description,
    designPersonality: classification.designPersonality,
    createdAt: now,
    updatedAt: now,
  }

  await Promise.all([
    setLiveApp(config),
    setLiveBundle(userId, slug, html),
    setDataPlan(verifiedPlan),
  ])

  return {
    slug,
    url: `/live/${userId}/${slug}`,
    config,
    plan: verifiedPlan,
  }
}
