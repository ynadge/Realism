// Run: npx tsx scripts/test-redis.ts
// Confirms Redis is live and commands work

import { createFetch } from '@sapiom/fetch'

;(async () => {
  const API_KEY = process.env.SAPIOM_API_KEY
  const REDIS_URL = process.env.SAPIOM_REDIS_URL

  if (!API_KEY || !REDIS_URL) {
    console.error('ERROR: SAPIOM_API_KEY and SAPIOM_REDIS_URL must be set in .env.local')
    process.exit(1)
  }

  const sapiomFetch = createFetch({ apiKey: API_KEY })

  async function redisCmd(command: string, ...args: string[]) {
    const path = [command, ...args].join('/')
    const res = await sapiomFetch(`${REDIS_URL}/${path}`, { method: 'POST' })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Redis ${command} failed (${res.status}): ${text}`)
    }
    const data = await res.json()
    return data.result
  }

  try {
    // SET with 60s TTL
    const testValue = encodeURIComponent(JSON.stringify({ ok: true, ts: Date.now() }))
    await redisCmd('set', 'realism:test', testValue, 'EX', '60')
    console.log('✅ SET succeeded')

    // GET
    const raw = await redisCmd('get', 'realism:test')
    const value = JSON.parse(decodeURIComponent(raw))
    console.log('✅ GET succeeded:', value)

    // DEL
    await redisCmd('del', 'realism:test')
    console.log('✅ DEL succeeded')

    // Verify DEL
    const gone = await redisCmd('get', 'realism:test')
    if (gone === null) {
      console.log('✅ DEL verified (key is gone)')
    }

    console.log('\n✅ Redis connection test passed. Ready for Ticket 003.')
  } catch (err) {
    console.error('\n❌ Redis test failed:', err)
    process.exit(1)
  }
})()
