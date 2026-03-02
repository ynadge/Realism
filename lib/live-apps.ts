import { Redis } from '@upstash/redis'
import type {
  LiveAppConfig,
  DataPlan,
  DataAPIResponse,
  ConnectorCredentials,
} from '@/types/live'

// ─── Redis client ──────────────────────────────────────────────────────────────

let _client: Redis | null = null

function getRedis(): Redis {
  if (_client) return _client
  const url = process.env.UPSTASH_REDIS_URL
  const token = process.env.UPSTASH_REDIS_TOKEN
  if (!url || !token) throw new Error('UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN must be set')
  _client = new Redis({ url, token })
  return _client
}

// ─── Key schema ───────────────────────────────────────────────────────────────

const BUNDLE_TTL = 60 * 60 * 24 * 365  // 1 year
const PLAN_TTL   = 60 * 60 * 24 * 365
const CACHE_TTL  = 60 * 60             // default, overridden per plan

const liveKeys = {
  bundle:    (userId: string, slug: string) => `live-bundle:${userId}:${slug}`,
  plan:      (userId: string, slug: string) => `live-plan:${userId}:${slug}`,
  cache:     (userId: string, slug: string) => `live-cache:${userId}:${slug}`,
  config:    (userId: string, slug: string) => `live-config:${userId}:${slug}`,
  userApps:  (userId: string)               => `user:${userId}:live-apps`,
  connector: (userId: string, id: string)   => `connector:${userId}:${id}`,
}

// ─── App Config ───────────────────────────────────────────────────────────────

export async function getLiveApp(
  userId: string,
  slug: string
): Promise<LiveAppConfig | null> {
  return getRedis().get<LiveAppConfig>(liveKeys.config(userId, slug))
}

export async function setLiveApp(config: LiveAppConfig): Promise<void> {
  await Promise.all([
    getRedis().set(liveKeys.config(config.userId, config.slug), config, { ex: BUNDLE_TTL }),
    getRedis().sadd(liveKeys.userApps(config.userId), config.slug),
  ])
}

export async function updateLiveApp(
  userId: string,
  slug: string,
  partial: Partial<LiveAppConfig>
): Promise<LiveAppConfig | null> {
  const existing = await getLiveApp(userId, slug)
  if (!existing) return null
  const updated = { ...existing, ...partial, updatedAt: new Date().toISOString() }
  await setLiveApp(updated)
  return updated
}

export async function deleteLiveApp(userId: string, slug: string): Promise<void> {
  const redis = getRedis()
  await Promise.all([
    redis.del(liveKeys.config(userId, slug)),
    redis.del(liveKeys.bundle(userId, slug)),
    redis.del(liveKeys.plan(userId, slug)),
    redis.del(liveKeys.cache(userId, slug)),
    redis.srem(liveKeys.userApps(userId), slug),
  ])
}

export async function getUserLiveApps(userId: string): Promise<LiveAppConfig[]> {
  const slugs = await getRedis().smembers(liveKeys.userApps(userId)) as string[]
  if (!slugs.length) return []
  const configs = await Promise.all(slugs.map(slug => getLiveApp(userId, slug)))
  return (configs.filter(Boolean) as LiveAppConfig[]).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

// ─── App Bundle ───────────────────────────────────────────────────────────────

export async function getLiveBundle(userId: string, slug: string): Promise<string | null> {
  return getRedis().get<string>(liveKeys.bundle(userId, slug))
}

export async function setLiveBundle(
  userId: string,
  slug: string,
  html: string
): Promise<void> {
  await getRedis().set(liveKeys.bundle(userId, slug), html, { ex: BUNDLE_TTL })
}

// ─── Data Plan ────────────────────────────────────────────────────────────────

export async function getDataPlan(userId: string, slug: string): Promise<DataPlan | null> {
  return getRedis().get<DataPlan>(liveKeys.plan(userId, slug))
}

export async function setDataPlan(plan: DataPlan): Promise<void> {
  await getRedis().set(liveKeys.plan(plan.userId, plan.slug), plan, { ex: PLAN_TTL })
}

// ─── Data Cache ───────────────────────────────────────────────────────────────

export async function getCachedData(
  userId: string,
  slug: string
): Promise<DataAPIResponse | null> {
  return getRedis().get<DataAPIResponse>(liveKeys.cache(userId, slug))
}

export async function setCachedData(
  userId: string,
  slug: string,
  data: DataAPIResponse,
  ttl: number = CACHE_TTL
): Promise<void> {
  await getRedis().set(liveKeys.cache(userId, slug), data, { ex: ttl })
}

export async function invalidateCache(userId: string, slug: string): Promise<void> {
  await getRedis().del(liveKeys.cache(userId, slug))
}

// ─── Connector Credentials ────────────────────────────────────────────────────

export async function getConnectorCredentials(
  userId: string,
  connectorId: string
): Promise<ConnectorCredentials | null> {
  return getRedis().get<ConnectorCredentials>(liveKeys.connector(userId, connectorId))
}

export async function setConnectorCredentials(
  userId: string,
  connectorId: string,
  credentials: ConnectorCredentials
): Promise<void> {
  await getRedis().set(liveKeys.connector(userId, connectorId), credentials, { ex: BUNDLE_TTL })
}

export async function deleteConnectorCredentials(
  userId: string,
  connectorId: string
): Promise<void> {
  await getRedis().del(liveKeys.connector(userId, connectorId))
}

// ─── Slug generation ──────────────────────────────────────────────────────────

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48)
    .replace(/^-|-$/g, '')
}

export async function isSlugTaken(userId: string, slug: string): Promise<boolean> {
  const existing = await getLiveApp(userId, slug)
  return existing !== null
}

export async function generateUniqueSlug(
  userId: string,
  title: string
): Promise<string> {
  const base = generateSlug(title)
  let slug = base
  let attempt = 1

  while (await isSlugTaken(userId, slug)) {
    slug = `${base}-${attempt}`
    attempt++
  }

  return slug
}
