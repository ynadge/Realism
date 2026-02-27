export type JobStatus = 'pending' | 'running' | 'complete' | 'failed' | 'paused'
export type JobType = 'one-shot' | 'persistent'
export type ArtifactType = 'document' | 'audio' | 'image' | 'mixed'
export type JobCadence = 'daily' | 'weekly'

export type Artifact = {
  type: ArtifactType
  title: string
  content?: string
  audioUrl?: string
  imageUrl?: string
  summary?: string
}

export type SpendEvent = {
  jobId: string
  tool: string
  description: string
  cost: number
  timestamp: string
}

export type Job = {
  id: string
  userId: string
  goal: string
  budget: number
  type: JobType
  status: JobStatus
  spendRuleId?: string
  spendTotal: number
  artifact?: Artifact
  cadence?: JobCadence
  qstashScheduleId?: string
  lastRunAt?: string
  nextRunAt?: string
  createdAt: string
  completedAt?: string
  failureReason?: string
}

export type Session = {
  token: string
  userId: string
  createdAt: string
  expiresAt: string
}

export type StreamEvent =
  | { type: 'tool_call'; payload: SpendEvent }
  | { type: 'artifact'; payload: Artifact }
  | { type: 'complete'; payload: { jobId: string; total: number } }
  | { type: 'error'; payload: { message: string } }
