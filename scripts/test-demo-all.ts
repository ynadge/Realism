// Run: npx tsx scripts/test-demo-all.ts
// Tests all three demo scenarios from Ticket 008

import { createFetch } from '@sapiom/fetch'

const BASE = 'http://localhost:3000'

const API_KEY = process.env.SAPIOM_API_KEY
const REDIS_URL = process.env.SAPIOM_REDIS_URL
if (!API_KEY || !REDIS_URL) {
  console.error('SAPIOM_API_KEY and SAPIOM_REDIS_URL must be set')
  process.exit(1)
}

const sapiomFetch = createFetch({ apiKey: API_KEY })

async function createTestSession(): Promise<string> {
  const testToken = crypto.randomUUID()
  const testUserId = 'test-user-demo'
  const session = {
    token: testToken,
    userId: testUserId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }
  const sessionKey = `session:${testToken}`
  await sapiomFetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([['SET', sessionKey, JSON.stringify(session), 'EX', '3600']]),
  })
  return testToken
}

type StreamResult = {
  events: Array<{ tool: string; description: string; cost: number }>
  artifact: Record<string, unknown> | null
  totalCost: number
  error: string | null
}

async function executeJobStream(jobId: string, token: string): Promise<StreamResult> {
  const res = await fetch(`${BASE}/api/jobs/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `realism-session=${token}`,
    },
    body: JSON.stringify({ jobId }),
  })

  if (!res.ok) {
    const text = await res.text()
    return { events: [], artifact: null, totalCost: 0, error: `Execute ${res.status}: ${text}` }
  }

  const reader = res.body?.getReader()
  if (!reader) return { events: [], artifact: null, totalCost: 0, error: 'No stream' }

  const decoder = new TextDecoder()
  let buffer = ''
  const result: StreamResult = { events: [], artifact: null, totalCost: 0, error: null }

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
        switch (event.type) {
          case 'tool_call':
            result.events.push(event.payload)
            result.totalCost += event.payload.cost
            console.log(`    [${event.payload.tool}] ${event.payload.description}  $${event.payload.cost.toFixed(3)}`)
            break
          case 'artifact':
            result.artifact = event.payload
            break
          case 'complete':
            result.totalCost = event.payload.total
            break
          case 'error':
            result.error = event.payload.message
            console.error(`    ❌ ERROR: ${event.payload.message}`)
            break
        }
      } catch { /* skip */ }
    }
  }
  return result
}

;(async () => {
  console.log('=== Creating test session ===')
  const token = await createTestSession()
  console.log(`✅ Session: ${token.slice(0, 8)}...\n`)

  // ===== DEMO 2: Visual brand concept (cheapest, run first) =====
  console.log('═══════════════════════════════════════════')
  console.log('  DEMO 2 — Visual brand concept ($0.50)')
  console.log('═══════════════════════════════════════════')

  const create2 = await fetch(`${BASE}/api/jobs/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `realism-session=${token}` },
    body: JSON.stringify({
      goal: 'Generate a cover image and one-paragraph pitch for a startup that helps restaurants reduce food waste using AI',
      budget: 0.50,
    }),
  })
  const data2 = await create2.json()
  if (!create2.ok) { console.error('❌ Create failed:', data2); process.exit(1) }
  console.log(`  Job created: ${data2.jobId}`)

  const r2 = await executeJobStream(data2.jobId, token)
  console.log(`\n  Artifact: ${r2.artifact ? '✅' : '❌'} ${r2.artifact ? (r2.artifact as { type?: string }).type ?? '' : ''}`)
  if (r2.artifact) {
    const a = r2.artifact as Record<string, string | undefined>
    if (a.imageUrl) console.log(`  Image: ${a.imageUrl.startsWith('data:') ? '(base64)' : a.imageUrl.slice(0, 80)}`)
    if (a.content) console.log(`  Content: ${a.content.slice(0, 120)}...`)
  }
  console.log(`  Cost: $${r2.totalCost.toFixed(3)}`)
  console.log(`  ${!r2.error && r2.artifact ? '✅ DEMO 2 PASSED' : '❌ DEMO 2 FAILED'}\n`)

  // ===== DEMO 1: Research briefing with audio =====
  console.log('═══════════════════════════════════════════')
  console.log('  DEMO 1 — Research briefing ($2.00)')
  console.log('═══════════════════════════════════════════')

  const create1 = await fetch(`${BASE}/api/jobs/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `realism-session=${token}` },
    body: JSON.stringify({
      goal: 'Research the state of agentic payments in 2026 and produce a briefing with an audio summary',
      budget: 2.00,
    }),
  })
  const data1 = await create1.json()
  if (!create1.ok) { console.error('❌ Create failed:', data1); process.exit(1) }
  console.log(`  Job created: ${data1.jobId}`)

  const r1 = await executeJobStream(data1.jobId, token)
  console.log(`\n  Artifact: ${r1.artifact ? '✅' : '❌'} ${r1.artifact ? (r1.artifact as { type?: string }).type ?? '' : ''}`)
  if (r1.artifact) {
    const a = r1.artifact as Record<string, string | undefined>
    if (a.audioUrl) console.log(`  Audio: ${a.audioUrl.slice(0, 80)}`)
    if (a.content) console.log(`  Content: ${a.content.slice(0, 120)}...`)
  }
  console.log(`  Cost: $${r1.totalCost.toFixed(3)} (tool calls: ${r1.events.length})`)
  const hasAudio = !!(r1.artifact as Record<string, string | undefined>)?.audioUrl
  console.log(`  Audio present: ${hasAudio ? '✅' : '❌'}`)
  console.log(`  ${!r1.error && r1.artifact && hasAudio ? '✅ DEMO 1 PASSED' : '❌ DEMO 1 FAILED'}\n`)

  // ===== DEMO 3: Persistent monitor =====
  console.log('═══════════════════════════════════════════')
  console.log('  DEMO 3 — Persistent monitor ($1.00)')
  console.log('═══════════════════════════════════════════')

  const create3 = await fetch(`${BASE}/api/jobs/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `realism-session=${token}` },
    body: JSON.stringify({
      goal: 'Monitor the Sapiom docs for any new capabilities and brief me weekly',
      budget: 1.00,
      cadence: 'weekly',
    }),
  })
  const data3 = await create3.json()
  console.log(`  Create response:`, data3)

  if (data3.needsCadence) {
    console.log('  Classifier asked for cadence — resubmitting with weekly...')
    const create3b = await fetch(`${BASE}/api/jobs/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `realism-session=${token}` },
      body: JSON.stringify({
        goal: 'Monitor the Sapiom docs for any new capabilities and brief me weekly',
        budget: 1.00,
        cadence: 'weekly',
      }),
    })
    const data3b = await create3b.json()
    console.log(`  Re-create response:`, data3b)
    if (!create3b.ok) { console.error('❌ Create failed'); process.exit(1) }
    console.log(`  Job created: ${data3b.jobId} (type: ${data3b.type})`)

    // For persistent jobs, the first run is triggered via webhook.
    // Wait for it to complete.
    console.log('  Waiting 90s for first webhook run to complete...')
    await new Promise(r => setTimeout(r, 90000))

    // Check job status
    const jobRes = await fetch(`${BASE}/api/jobs/${data3b.jobId}`, {
      headers: { Cookie: `realism-session=${token}` },
    })
    if (jobRes.ok) {
      const jobData = await jobRes.json()
      console.log(`  Job status: ${jobData.job?.status}`)
      console.log(`  Spend events: ${jobData.spendEvents?.length ?? 0}`)
      console.log(`  Artifact: ${jobData.artifact ? '✅' : '❌'}`)
      if (jobData.artifact) {
        console.log(`  Artifact type: ${jobData.artifact.type}`)
        console.log(`  Artifact title: ${jobData.artifact.title}`)
      }
      const passed = !!jobData.artifact
      console.log(`  ${passed ? '✅ DEMO 3 PASSED' : '❌ DEMO 3 FAILED'}`)
    } else {
      console.log(`  ❌ Could not fetch job: ${jobRes.status}`)
    }
  } else if (create3.ok) {
    console.log(`  Job created: ${data3.jobId} (type: ${data3.type})`)

    if (data3.type === 'persistent') {
      console.log('  Waiting 90s for first webhook run to complete...')
      await new Promise(r => setTimeout(r, 90000))

      const jobRes = await fetch(`${BASE}/api/jobs/${data3.jobId}`, {
        headers: { Cookie: `realism-session=${token}` },
      })
      if (jobRes.ok) {
        const jobData = await jobRes.json()
        console.log(`  Job status: ${jobData.job?.status}`)
        console.log(`  Spend events: ${jobData.spendEvents?.length ?? 0}`)
        console.log(`  Artifact: ${jobData.artifact ? '✅' : '❌'}`)
        if (jobData.artifact) {
          console.log(`  Artifact type: ${jobData.artifact.type}`)
          console.log(`  Artifact title: ${jobData.artifact.title}`)
        }
        const passed = !!jobData.artifact
        console.log(`  ${passed ? '✅ DEMO 3 PASSED' : '❌ DEMO 3 FAILED'}`)
      }
    } else {
      console.log(`  ⚠️ Expected persistent, got ${data3.type} — running as one-shot`)
      const r3 = await executeJobStream(data3.jobId, token)
      console.log(`  Artifact: ${r3.artifact ? '✅' : '❌'}`)
      console.log(`  Cost: $${r3.totalCost.toFixed(3)}`)
      console.log(`  ${!r3.error && r3.artifact ? '✅ DEMO 3 PASSED' : '❌ DEMO 3 FAILED'}`)
    }
  }

  // ===== Check dashboard =====
  console.log('\n═══════════════════════════════════════════')
  console.log('  DASHBOARD CHECK')
  console.log('═══════════════════════════════════════════')

  const dashRes = await fetch(`${BASE}/api/jobs`, {
    headers: { Cookie: `realism-session=${token}` },
  })
  if (dashRes.ok) {
    const dashData = await dashRes.json()
    console.log(`  Total jobs: ${dashData.jobs?.length ?? 0}`)
    for (const j of dashData.jobs ?? []) {
      console.log(`    - ${j.type} | ${j.status} | $${j.spendTotal?.toFixed(3) ?? '0.000'} | ${j.goal.slice(0, 50)}...`)
    }
    console.log('  ✅ Dashboard loads correctly')
  } else {
    console.error(`  ❌ Dashboard failed: ${dashRes.status}`)
  }

  console.log('\n=== ALL DEMOS COMPLETE ===')
})()
