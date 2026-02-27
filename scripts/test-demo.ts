// Run: npx tsx scripts/test-demo.ts
// Tests Done Condition 3: cheap visual goal

import { createFetch } from '@sapiom/fetch'

const BASE = 'http://localhost:3000'

;(async () => {
  // Step 1: Create a session directly (bypass phone OTP for testing)
  console.log('--- Creating test session via Redis directly ---')

  const API_KEY = process.env.SAPIOM_API_KEY
  const REDIS_URL = process.env.SAPIOM_REDIS_URL
  if (!API_KEY || !REDIS_URL) {
    console.error('SAPIOM_API_KEY and SAPIOM_REDIS_URL must be set')
    process.exit(1)
  }

  const sapiomFetch = createFetch({ apiKey: API_KEY })

  // Create a test session in Redis
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
  console.log(`✅ Test session created: ${testToken}`)

  // Step 2: Create a job (Done Condition 3 — cheap visual goal)
  console.log('\n--- Creating job (Demo 2: visual goal, $0.50 budget) ---')

  const createRes = await fetch(`${BASE}/api/jobs/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `realism-session=${testToken}`,
    },
    body: JSON.stringify({
      goal: 'Generate a cover image and one-paragraph pitch for a startup that helps restaurants reduce food waste',
      budget: 0.50,
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
            totalCost += event.payload.cost
            console.log(`  [${event.payload.tool}] ${event.payload.description}  $${event.payload.cost.toFixed(3)}`)
            break
          case 'artifact':
            artifactReceived = true
            console.log(`\n✅ ARTIFACT RECEIVED:`)
            console.log(`  Type: ${event.payload.type}`)
            console.log(`  Title: ${event.payload.title}`)
            if (event.payload.imageUrl) {
              const urlPreview = event.payload.imageUrl.startsWith('data:')
                ? '(base64 data URL)'
                : event.payload.imageUrl.slice(0, 80)
              console.log(`  Image: ${urlPreview}`)
            }
            if (event.payload.content) {
              console.log(`  Content: ${event.payload.content.slice(0, 200)}...`)
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
  }

  console.log(`\n--- Summary ---`)
  console.log(`Total estimated cost: $${totalCost.toFixed(3)}`)
  console.log(`Artifact received: ${artifactReceived ? 'Yes' : 'No'}`)
  console.log(artifactReceived ? '✅ Done Condition 3 PASSED' : '❌ Done Condition 3 FAILED')
})()
