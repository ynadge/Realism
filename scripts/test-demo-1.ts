// Run: npx tsx scripts/test-demo-1.ts
// Tests Demo 1: Research briefing with audio

import { createFetch } from '@sapiom/fetch'

const BASE = 'http://localhost:3000'

const API_KEY = process.env.SAPIOM_API_KEY
const REDIS_URL = process.env.SAPIOM_REDIS_URL
if (!API_KEY || !REDIS_URL) {
  console.error('SAPIOM_API_KEY and SAPIOM_REDIS_URL must be set')
  process.exit(1)
}

const sapiomFetch = createFetch({ apiKey: API_KEY })

;(async () => {
  console.log('--- Creating test session ---')
  const testToken = crypto.randomUUID()
  const session = {
    token: testToken,
    userId: 'test-user-demo',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }
  await sapiomFetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([['SET', `session:${testToken}`, JSON.stringify(session), 'EX', '3600']]),
  })
  console.log(`✅ Session: ${testToken.slice(0, 8)}...`)

  console.log('\n--- Creating job (Demo 1: research briefing, $2.00) ---')
  const createRes = await fetch(`${BASE}/api/jobs/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `realism-session=${testToken}` },
    body: JSON.stringify({
      goal: 'Research the state of agentic payments in 2026 and produce a briefing with an audio summary',
      budget: 2.00,
    }),
  })
  const createData = await createRes.json()
  if (!createRes.ok) { console.error('❌ Create failed:', createData); process.exit(1) }
  console.log(`✅ Job created: ${createData.jobId}`)

  console.log('\n--- Executing (streaming) ---')
  const execRes = await fetch(`${BASE}/api/jobs/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `realism-session=${testToken}` },
    body: JSON.stringify({ jobId: createData.jobId }),
  })
  if (!execRes.ok) {
    console.error(`❌ Execute ${execRes.status}: ${await execRes.text()}`)
    process.exit(1)
  }

  const reader = execRes.body?.getReader()
  if (!reader) { console.error('No stream'); process.exit(1) }
  const decoder = new TextDecoder()
  let buffer = ''
  let totalCost = 0
  let artifact: Record<string, unknown> | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (!raw) continue
      try {
        const event = JSON.parse(raw)
        if (event.type === 'tool_call') {
          totalCost += event.payload.cost
          console.log(`  [${event.payload.tool}] ${event.payload.description}  $${event.payload.cost.toFixed(3)}`)
        }
        if (event.type === 'artifact') {
          artifact = event.payload
          console.log(`\n✅ ARTIFACT: ${event.payload.type} — "${event.payload.title}"`)
          if (event.payload.audioUrl) console.log(`  Audio: ${event.payload.audioUrl.slice(0, 80)}`)
          if (event.payload.imageUrl) console.log(`  Image: ${event.payload.imageUrl.slice(0, 80)}`)
          if (event.payload.content) console.log(`  Content: ${event.payload.content.slice(0, 150)}...`)
        }
        if (event.type === 'complete') {
          totalCost = event.payload.total
          console.log(`\n✅ COMPLETE — $${totalCost.toFixed(3)}`)
        }
        if (event.type === 'error') console.error(`\n❌ ERROR: ${event.payload.message}`)
      } catch { /* skip */ }
    }
  }

  const hasAudio = !!(artifact as Record<string, string>)?.audioUrl
  const hasContent = !!(artifact as Record<string, string>)?.content
  console.log(`\n--- Results ---`)
  console.log(`Tool calls cost: $${totalCost.toFixed(3)}`)
  console.log(`Artifact: ${artifact ? '✅' : '❌'}`)
  console.log(`Audio: ${hasAudio ? '✅' : '❌'}`)
  console.log(`Content: ${hasContent ? '✅' : '❌'}`)
  console.log(artifact && hasAudio && hasContent ? '✅ DEMO 1 PASSED' : '❌ DEMO 1 FAILED')
})()
