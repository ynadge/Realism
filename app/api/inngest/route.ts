import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { executeJob, executeWebhookJob, createLiveAppFunction } from '@/lib/inngest-functions'

export const maxDuration = 300

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [executeJob, executeWebhookJob, createLiveAppFunction],
  streaming: 'allow',
})
