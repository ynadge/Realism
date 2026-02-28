import { NextRequest } from 'next/server'
import { validateSession } from '@/lib/auth'
import { getJob } from '@/lib/jobs'
import { getStreamEvents } from '@/lib/upstash'

export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params

  const token = req.cookies.get('realism-session')?.value
  if (!token) return new Response('Unauthorized', { status: 401 })
  const userId = await validateSession(token)
  if (!userId) return new Response('Unauthorized', { status: 401 })

  const job = await getJob(jobId)
  if (!job) return new Response('Not found', { status: 404 })
  if (job.userId !== userId) return new Response('Forbidden', { status: 403 })

  let index = 0
  let keepAlive: ReturnType<typeof setInterval>

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      async function poll() {
        try {
          const events = await getStreamEvents(jobId, index)

          if (events.length > 0) {
            for (const raw of events) {
              try {
                const event = typeof raw === 'string' ? JSON.parse(raw) : raw
                send(event)

                if (event.type === 'complete' || event.type === 'error') {
                  clearInterval(keepAlive)
                  controller.close()
                  return
                }
              } catch { /* skip malformed */ }
            }
            index += events.length
          }
        } catch { /* Redis error — keep trying */ }
      }

      await poll()
      keepAlive = setInterval(poll, 500)
    },

    cancel() {
      clearInterval(keepAlive)
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
