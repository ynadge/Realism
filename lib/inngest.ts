import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'realism',
  name: 'Realism',
})

export type RealismEvents = {
  'job/execute': {
    data: {
      jobId: string
    }
  }
  'job/webhook': {
    data: {
      jobId: string
    }
  }
  'live/create': {
    data: {
      goal: string
      userId: string
    }
  }
}
