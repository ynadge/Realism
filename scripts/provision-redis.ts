// Run once: npx tsx scripts/provision-redis.ts
// Copy the output URL into .env.local as SAPIOM_REDIS_URL
// Do NOT run this again — it creates a new database each time

import { createFetch } from '@sapiom/fetch'

;(async () => {
  const API_KEY = process.env.SAPIOM_API_KEY

  if (!API_KEY) {
    console.error('ERROR: SAPIOM_API_KEY is not set.')
    console.error('Set it in .env.local or pass it: $env:SAPIOM_API_KEY="sk_live_..."; npx tsx scripts/provision-redis.ts')
    process.exit(1)
  }

  const sapiomFetch = createFetch({ apiKey: API_KEY })

  try {
    const res = await sapiomFetch('https://upstash.services.sapiom.ai/v1/redis/databases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'realism-db', region: 'us-east-1' }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Provisioning failed (${res.status}): ${text}`)
    }

    const db = await res.json()

    console.log('\n✅ Redis database provisioned successfully.\n')
    console.log('Add this line to your .env.local:\n')
    console.log(`SAPIOM_REDIS_URL=${db.url}`)
    console.log('\nDo not run this script again.')
  } catch (err) {
    console.error('Failed to provision Redis:', err)
    process.exit(1)
  }
})()
