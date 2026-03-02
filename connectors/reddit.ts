import type { Connector, DataItem } from '@/connectors/types'

type RedditPost = {
  data: {
    title: string
    selftext: string
    url: string
    permalink: string
    score: number
    num_comments: number
    created_utc: number
    thumbnail: string
    author: string
    subreddit: string
  }
}

type RedditResponse = {
  data: {
    children: RedditPost[]
  }
}

const USER_AGENT = 'Realism/1.0 (personal software generator)'

async function fetchSubreddit(
  subreddit: string,
  sort: 'hot' | 'new' | 'top' = 'hot',
  limit: number = 25
): Promise<DataItem[]> {
  const url = `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=${limit}`

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    throw new Error(`Reddit API error: ${res.status} for r/${subreddit}`)
  }

  const json: RedditResponse = await res.json()

  return json.data.children.map(post => ({
    title: post.data.title,
    summary: post.data.selftext
      ? post.data.selftext.slice(0, 300)
      : `${post.data.score} points · ${post.data.num_comments} comments`,
    url: `https://www.reddit.com${post.data.permalink}`,
    imageUrl: post.data.thumbnail?.startsWith('http') ? post.data.thumbnail : undefined,
    publishedAt: new Date(post.data.created_utc * 1000).toISOString(),
    metadata: {
      score: String(post.data.score),
      comments: String(post.data.num_comments),
      author: post.data.author,
      subreddit: post.data.subreddit,
    },
  }))
}

async function searchPosts(
  query: string,
  subreddit?: string,
  limit: number = 25
): Promise<DataItem[]> {
  const base = subreddit
    ? `https://www.reddit.com/r/${subreddit}/search.json`
    : `https://www.reddit.com/search.json`

  const params = new URLSearchParams({
    q: query,
    sort: 'relevance',
    limit: String(limit),
    ...(subreddit ? { restrict_sr: 'true' } : {}),
  })

  const res = await fetch(`${base}?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    throw new Error(`Reddit search error: ${res.status} for query "${query}"`)
  }

  const json: RedditResponse = await res.json()

  return json.data.children.map(post => ({
    title: post.data.title,
    summary: post.data.selftext
      ? post.data.selftext.slice(0, 300)
      : `${post.data.score} points · ${post.data.num_comments} comments`,
    url: `https://www.reddit.com${post.data.permalink}`,
    publishedAt: new Date(post.data.created_utc * 1000).toISOString(),
    metadata: {
      score: String(post.data.score),
      comments: String(post.data.num_comments),
      author: post.data.author,
      subreddit: post.data.subreddit,
    },
  }))
}

export const reddit: Connector = {
  id: 'reddit',
  name: 'Reddit',
  description: 'Community discussions, news, and content from any subreddit. No authentication required — works immediately for any user.',
  icon: '🟠',
  authType: 'none',

  methods: [
    {
      id: 'hot_posts',
      description: 'Get the current hot/trending posts from a specific subreddit',
      params: {
        subreddit: { type: 'string', description: 'Subreddit name without r/', required: true },
        limit: { type: 'string', description: 'Number of posts to fetch (default: 25)', required: false },
      },
      fetch: async (_credentials, params) => {
        return fetchSubreddit(
          params.subreddit,
          'hot',
          params.limit ? parseInt(params.limit) : 25
        )
      },
    },

    {
      id: 'new_posts',
      description: 'Get the newest posts from a specific subreddit',
      params: {
        subreddit: { type: 'string', description: 'Subreddit name without r/', required: true },
        limit: { type: 'string', description: 'Number of posts to fetch (default: 25)', required: false },
      },
      fetch: async (_credentials, params) => {
        return fetchSubreddit(
          params.subreddit,
          'new',
          params.limit ? parseInt(params.limit) : 25
        )
      },
    },

    {
      id: 'search_posts',
      description: 'Search Reddit posts by keyword, optionally within a specific subreddit',
      params: {
        query: { type: 'string', description: 'Search query', required: true },
        subreddit: { type: 'string', description: 'Limit search to this subreddit (optional)', required: false },
        limit: { type: 'string', description: 'Number of results (default: 25)', required: false },
      },
      fetch: async (_credentials, params) => {
        return searchPosts(
          params.query,
          params.subreddit,
          params.limit ? parseInt(params.limit) : 25
        )
      },
    },
  ],
}
