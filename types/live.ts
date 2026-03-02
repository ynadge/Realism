// ─── Core Live App Config ─────────────────────────────────────────────────────

export type LiveAppConfig = {
  id: string
  userId: string
  slug: string
  title: string
  description: string
  designPersonality: DesignPersonalityId
  createdAt: string
  updatedAt: string
  lastVisitedAt?: string
}

// ─── Data Plan ────────────────────────────────────────────────────────────────

export type DataPlan = {
  slug: string
  userId: string
  title: string
  description: string
  fetches: DataFetch[]
  userContext: Record<string, string>
  connectors: ConnectorRef[]
  cacheTTL: number
}

export type DataFetch = {
  id: string
  type: 'sapiom_search' | 'sapiom_fetch' | 'sapiom_deep_search' | 'connector'
  query?: string
  url?: string
  connector?: string
  method?: string
  synthesize: boolean
  synthesisPrompt?: string
}

export type ConnectorRef = {
  id: string
  connected: boolean
  scopes: string[]
}

// ─── Data API Response ────────────────────────────────────────────────────────

export type DataAPIResponse = {
  title: string
  refreshedAt: string
  cached: boolean
  data: Record<string, DataResult>
  userContext: Record<string, string>
}

export type DataResult = {
  items: DataItem[]
  synthesized?: string
  error?: string
}

export type DataItem = {
  title: string
  summary?: string
  url?: string
  imageUrl?: string
  publishedAt?: string
  metadata?: Record<string, string>
}

// ─── Design Personalities ────────────────────────────────────────────────────

export type DesignPersonalityId =
  | 'financial-data'
  | 'music-culture'
  | 'personal-utility'
  | 'news-intelligence'
  | 'default'

export type DesignPersonality = {
  id: DesignPersonalityId
  name: string
  colorScheme: string
  typography: string
  layoutStyle: string
  motionStyle: string
  designDirective: string
}

// ─── Connector Types ─────────────────────────────────────────────────────────

export type ConnectorCredentials = {
  accessToken?: string
  apiKey?: string
  refreshToken?: string
  expiresAt?: string
  extra?: Record<string, string>
}

// ─── Creation Flow ────────────────────────────────────────────────────────────

export type LiveCreationInput = {
  goal: string
  userId: string
}

export type LiveCreationResult = {
  slug: string
  url: string
  config: LiveAppConfig
  plan: DataPlan
}
