// Run: npx tsx scripts/test-demo-dc4.ts
// Tests Done Condition 4: research briefing with audio ($2 budget)

import { createFetch } from '@sapiom/fetch'

const BASE = 'http://localhost:3000'

;(async () => {
  const API_KEY = process.env.SAPIOM_API_KEY
  const REDIS_URL = process.env.SAPIOM_REDIS_URL
  if (!API_KEY || !REDIS_URL) {
    console.error('SAPIOM_API_KEY and SAPIOM_REDIS_URL must be set')
    process.exit(1)
  }

  const sapiomFetch = createFetch({ apiKey: API_KEY })

  // Step 1: Create test session
  console.log('--- Creating test session ---')
  const testToken = crypto.randomUUID()
  const session = {
    token: testToken,
    userId: 'test-user-dc4',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }

  await sapiomFetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([['SET', `session:${testToken}`, JSON.stringify(session), 'EX', '3600']]),
  })
  console.log(`✅ Session: ${testToken}`)

  // Step 2: Create job (DC4 — research briefing with audio)
  console.log('\n--- Creating job (research briefing, $2 budget) ---')

  const createRes = await fetch(`${BASE}/api/jobs/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `realism-session=${testToken}`,
    },
    body: JSON.stringify({
      goal: 'Research the state of AI agent payments and produce a briefing with audio',
      budget: 2.00,
    }),
  })

  const createData = await createRes.json()
  console.log(`Create response (${createRes.status}):`, createData)

  if (!createRes.ok) {
    console.error('❌ Job creation failed')
    process.exit(1)
  }

  const { jobId } = createData
  console.log(`✅ Job created: ${jobId}`)

  // Step 3: Execute the job (SSE stream)
  console.log('\n--- Executing job (streaming) ---')

  const execRes = await fetch(`${BASE}/api/jobs/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `realism-session=${testToken}`,
    },
    body: JSON.stringify({ jobId }),
  })

  if (!execRes.ok) {
    const errText = await execRes.text()
    console.error(`❌ Execute failed (${execRes.status}): ${errText}`)
    process.exit(1)
  }

  console.log('✅ Stream started, reading events...\n')

  const reader = execRes.body?.getReader()
  if (!reader) {
    console.error('❌ No readable stream')
    process.exit(1)
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let totalCost = 0
  let artifactReceived = false
  let hasAudio = false
  let hasContent = false

  function processLine(line: string) {
    if (!line.startsWith('data: ')) return
    const raw = line.slice(6).trim()
    if (!raw) return

    try {
      const event = JSON.parse(raw)

      switch (event.type) {
        case 'tool_call':
          totalCost += event.payload.cost
          console.log(`  [${event.payload.tool}] ${event.payload.description}  $${event.payload.cost.toFixed(3)}`)
          break
        case 'artifact':
          artifactReceived = true
          hasAudio = !!event.payload.audioUrl
          hasContent = !!event.payload.content
          console.log(`\n✅ ARTIFACT RECEIVED:`)
          console.log(`  Type: ${event.payload.type}`)
          console.log(`  Title: ${event.payload.title}`)
          if (event.payload.audioUrl) {
            const isBase64 = event.payload.audioUrl.startsWith('data:')
            console.log(`  Audio: ${isBase64 ? `base64 data URL (${event.payload.audioUrl.length} chars)` : event.payload.audioUrl.slice(0, 80)}`)
          }
          if (event.payload.content) {
            console.log(`  Content preview: ${event.payload.content.slice(0, 300)}...`)
          }
          if (event.payload.summary) {
            console.log(`  Summary: ${event.payload.summary.slice(0, 200)}`)
          }
          break
        case 'complete':
          console.log(`\n✅ JOB COMPLETE — Total: $${event.payload.total.toFixed(3)}`)
          break
        case 'error':
          console.error(`\n❌ ERROR: ${event.payload.message}`)
          break
      }
    } catch {
      // skip malformed
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      if (buffer.trim()) buffer.split('\n').forEach(processLine)
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    lines.forEach(processLine)
  }

  console.log(`\n--- Done Condition 4 Summary ---`)
  console.log(`Total cost: $${totalCost.toFixed(3)}`)
  console.log(`Artifact: ${artifactReceived ? 'Yes' : 'No'}`)
  console.log(`Has content: ${hasContent ? 'Yes' : 'No'}`)
  console.log(`Has audio: ${hasAudio ? 'Yes' : 'No'}`)

  if (artifactReceived && hasContent && hasAudio) {
    console.log('✅ Done Condition 4 PASSED (research briefing with audio)')
  } else if (artifactReceived && hasContent) {
    console.log('⚠️  Done Condition 4 PARTIAL — got content but no audio')
  } else {
    console.log('❌ Done Condition 4 FAILED')
  }
})()
