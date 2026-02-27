import { NextRequest } from 'next/server'
import { getJob } from '@/lib/jobs'
import { runOrchestrator } from '@/lib/orchestrator'
import { validateSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('realism-session')?.value
  if (!token) return new Response('Unauthorized', { status: 401 })

  const userId = await validateSession(token)
  if (!userId) return new Response('Unauthorized', { status: 401 })

  let body: { jobId?: string }
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid request body', { status: 400 })
  }

  const { jobId } = body
  if (!jobId) return new Response('jobId required', { status: 400 })

  const job = await getJob(jobId)
  if (!job) return new Response('Job not found', { status: 404 })
  if (job.userId !== userId) return new Response('Forbidden', { status: 403 })
  if (job.status !== 'pending') return new Response('Job already started', { status: 409 })

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      function send(event: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        for await (const event of runOrchestrator(job)) {
          send(event)
        }
      } catch (err) {
        send({ type: 'error', payload: { message: String(err) } })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
