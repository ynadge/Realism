import { generateText } from 'ai'
import { ORCHESTRATOR_MODEL } from '@/lib/ai-provider'
import { sapiomSearch, sapiomFetchUrl } from '@/lib/sapiom'
import { executeConnectorFetch } from '@/lib/connector-manager'
import { getConnectorCredentials, setConnectorCredentials } from '@/lib/live-apps'
import { refreshSpotifyToken } from '@/connectors/spotify'
import type { DataPlan, DataFetch, DataAPIResponse, DataResult, DataItem } from '@/types/live'

// ─── Main executor ────────────────────────────────────────────────────────────

export async function executeAllFetches(plan: DataPlan): Promise<DataAPIResponse> {
  const fetchResults = await Promise.allSettled(
    plan.fetches.map(async (dataFetch) => {
      const result = await executeSingleFetch(dataFetch, plan)
      return { id: dataFetch.id, result }
    })
  )

  const data: Record<string, DataResult> = {}

  for (let i = 0; i < fetchResults.length; i++) {
    const settled = fetchResults[i]
    const dataFetch = plan.fetches[i]

    if (settled.status === 'fulfilled') {
      data[dataFetch.id] = settled.value.result
    } else {
      data[dataFetch.id] = {
        items: [],
        error: settled.reason instanceof Error
          ? settled.reason.message
          : 'Fetch failed',
      }
    }
  }

  return {
    title: plan.title,
    refreshedAt: new Date().toISOString(),
    cached: false,
    data,
    userContext: plan.userContext,
  }
}

// ─── Single fetch executor ────────────────────────────────────────────────────

async function executeSingleFetch(
  dataFetch: DataFetch,
  plan: DataPlan
): Promise<DataResult> {
  const interpolatedQuery = dataFetch.query
    ? interpolate(dataFetch.query, plan.userContext)
    : undefined

  let items: DataItem[] = []

  switch (dataFetch.type) {
    case 'sapiom_search': {
      if (!interpolatedQuery) return { items: [] }
      const raw = await sapiomSearch(interpolatedQuery, 'standard')
      items = normalizeSearchResults(raw)
      break
    }

    case 'sapiom_deep_search': {
      if (!interpolatedQuery) return { items: [] }
      const raw = await sapiomSearch(interpolatedQuery, 'deep')
      items = normalizeSearchResults(raw)
      break
    }

    case 'sapiom_fetch': {
      if (!dataFetch.url) return { items: [] }
      const interpolatedUrl = interpolate(dataFetch.url, plan.userContext)
      const raw = await sapiomFetchUrl(interpolatedUrl)
      const content = typeof raw === 'object' && raw !== null && 'markdown' in raw
        ? String((raw as { markdown: string }).markdown)
        : String(raw)

      items = [{
        title: interpolatedUrl,
        summary: content.slice(0, 2000),
        url: interpolatedUrl,
      }]
      break
    }

    case 'connector': {
      const credentials = dataFetch.connector
        ? await getRefreshedConnectorCredentials(plan.userId, dataFetch.connector)
        : null

      const connectorResult = await executeConnectorFetch(dataFetch, plan.userId, credentials)
      if (connectorResult.error) {
        return { items: [], error: connectorResult.error }
      }
      items = connectorResult.items
      break
    }

    default:
      return { items: [] }
  }

  if (dataFetch.synthesize && dataFetch.synthesisPrompt && items.length > 0) {
    const synthesized = await synthesizeItems(items, dataFetch.synthesisPrompt)
    return { items, synthesized }
  }

  return { items }
}

// ─── Synthesis ────────────────────────────────────────────────────────────────

async function synthesizeItems(
  items: DataItem[],
  synthesisPrompt: string
): Promise<string> {
  const itemsText = items
    .slice(0, 10)
    .map((item, i) => {
      const parts = [`[${i + 1}] ${item.title}`]
      if (item.summary) parts.push(item.summary)
      if (item.url) parts.push(`Source: ${item.url}`)
      return parts.join('\n')
    })
    .join('\n\n')

  try {
    const { text } = await generateText({
      model: ORCHESTRATOR_MODEL,
      system: `You are a precise information synthesizer. Your job is to extract key insights from search results.
Be concise. Be specific. No filler phrases like "In conclusion" or "Overall".
Respond in plain text — no markdown, no bullets unless specifically asked.`,
      prompt: `${synthesisPrompt}\n\nSOURCE MATERIAL:\n${itemsText}`,
      maxOutputTokens: 500,
    })
    return text.trim()
  } catch (err) {
    console.error('[synthesizeItems] Synthesis failed:', err)
    return ''
  }
}

// ─── Token refresh ────────────────────────────────────────────────────────────

export async function getRefreshedConnectorCredentials(
  userId: string,
  connectorId: string
) {
  const credentials = await getConnectorCredentials(userId, connectorId)
  if (!credentials) return null

  if (connectorId === 'spotify' && credentials.expiresAt) {
    const expiresAt = new Date(credentials.expiresAt).getTime()
    const isExpired = Date.now() > expiresAt - 60_000

    if (isExpired && credentials.refreshToken) {
      try {
        const refreshed = await refreshSpotifyToken(credentials)
        await setConnectorCredentials(userId, connectorId, refreshed)
        return refreshed
      } catch (err) {
        console.error('[getRefreshedConnectorCredentials] Refresh failed:', err)
        return credentials
      }
    }
  }

  return credentials
}

// ─── Result normalization ──────────────────────────────────────────────────────

function normalizeSearchResults(raw: unknown): DataItem[] {
  if (!raw) return []

  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>

    if (Array.isArray(obj.results)) {
      return (obj.results as Record<string, unknown>[]).slice(0, 10).map(r => ({
        title: String(r.name ?? r.title ?? 'Result'),
        summary: String(r.content ?? r.snippet ?? r.summary ?? '').slice(0, 500),
        url: r.url ? String(r.url) : undefined,
      }))
    }

    if (typeof obj.answer === 'string') {
      const items: DataItem[] = [{ title: 'Summary', summary: (obj.answer as string).slice(0, 1000) }]
      if (Array.isArray(obj.sources)) {
        const sourceItems = (obj.sources as Record<string, unknown>[]).slice(0, 8).map(s => ({
          title: String(s.name ?? s.title ?? 'Source'),
          summary: String(s.snippet ?? s.content ?? '').slice(0, 400),
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
