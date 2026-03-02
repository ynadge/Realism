import type { Connector, DataItem } from '@/connectors/types'

async function fetchFeed(feedUrl: string, limit: number = 20): Promise<DataItem[]> {
  const res = await fetch(feedUrl, {
    headers: { 'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml' },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    throw new Error(`RSS fetch error: ${res.status} for ${feedUrl}`)
  }

  const xml = await res.text()
  const items: DataItem[] = []

  // Match <item> or <entry> blocks (covers RSS 2.0 and Atom)
  const itemPattern = /<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi
  let match: RegExpExecArray | null

  while ((match = itemPattern.exec(xml)) !== null && items.length < limit) {
    const block = match[1]

    const title = extractTag(block, 'title')
    const link = extractTag(block, 'link') ?? extractAtomLink(block)
    const description = extractTag(block, 'description') ?? extractTag(block, 'summary') ?? extractTag(block, 'content')
    const pubDate = extractTag(block, 'pubDate') ?? extractTag(block, 'published') ?? extractTag(block, 'updated')
    const imageUrl = extractMediaUrl(block)

    if (!title && !link) continue

    items.push({
      title: title ? stripHtml(title) : 'Untitled',
      summary: description ? stripHtml(description).slice(0, 300) : undefined,
      url: link ?? undefined,
      imageUrl,
      publishedAt: pubDate ? safeISODate(pubDate) : undefined,
      metadata: {
        source: new URL(feedUrl).hostname,
      },
    })
  }

  return items
}

// ─── Minimal XML helpers — no dependencies ────────────────────────────────────

function extractTag(xml: string, tag: string): string | null {
  const pattern = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</${tag}>`,
    'i'
  )
  const m = xml.match(pattern)
  if (!m) return null
  return (m[1] ?? m[2] ?? '').trim() || null
}

function extractAtomLink(xml: string): string | null {
  const m = xml.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i)
  return m ? m[1] : null
}

function extractMediaUrl(xml: string): string | undefined {
  const patterns = [
    /<media:thumbnail[^>]+url=["']([^"']+)["']/i,
    /<media:content[^>]+url=["']([^"']+)["']/i,
    /<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image/i,
  ]
  for (const p of patterns) {
    const m = xml.match(p)
    if (m) return m[1]
  }
  return undefined
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function safeISODate(raw: string): string | undefined {
  try {
    return new Date(raw).toISOString()
  } catch {
    return undefined
  }
}

export const rss: Connector = {
  id: 'rss',
  name: 'RSS / Atom',
  description: 'Any website with an RSS or Atom feed — news sites, blogs, podcasts, YouTube channels, GitHub releases. No authentication required.',
  icon: '📡',
  authType: 'none',

  methods: [
    {
      id: 'feed',
      description: 'Fetch the latest items from any RSS or Atom feed URL',
      params: {
        url: { type: 'string', description: 'Full URL of the RSS or Atom feed', required: true },
        limit: { type: 'string', description: 'Maximum number of items to return (default: 20)', required: false },
      },
      fetch: async (_credentials, params) => {
        return fetchFeed(
          params.url,
          params.limit ? parseInt(params.limit) : 20
        )
      },
    },
  ],
}
