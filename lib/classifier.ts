import { sapiomChat } from '@/lib/sapiom'
import { classifyDesignPersonality } from '@/lib/design-personalities'
import type { JobType } from '@/types'
import type { DesignPersonalityId } from '@/types/live'

// ─── Job mode classification ────────────────────────────────────────────────

const PERSISTENT_KEYWORDS = [
  'monitor', 'watch', 'track', 'alert', 'notify',
  'every day', 'daily', 'weekly', 'every week',
  'keep an eye', 'whenever', 'each time', 'recurring',
]

function keywordClassify(goal: string): JobType {
  const lower = goal.toLowerCase()
  return PERSISTENT_KEYWORDS.some(kw => lower.includes(kw))
    ? 'persistent'
    : 'one-shot'
}

export async function classifyGoal(goal: string): Promise<JobType> {
  try {
    const response = await sapiomChat(
      [
        {
          role: 'system',
          content:
            'You classify user goals as either one-time tasks or ongoing monitoring tasks. ' +
            'Reply with exactly one word: either "one-shot" or "persistent". ' +
            'Use "persistent" if the goal involves monitoring, watching, tracking, ' +
            'repeating, or being notified about future events. ' +
            'Use "one-shot" for everything else.',
        },
        { role: 'user', content: goal },
      ],
      'openai/gpt-4o-mini',
      false,
      16
    ) as { choices: Array<{ message: { content: string } }> }

    const answer = response.choices[0]?.message?.content?.trim().toLowerCase()

    if (answer === 'one-shot' || answer === 'persistent') return answer

    return keywordClassify(goal)
  } catch {
    return keywordClassify(goal)
  }
}

// ─── Live mode classification ───────────────────────────────────────────────

export type LiveClassificationResult = {
  designPersonality: DesignPersonalityId
  suggestedConnectors: string[]
  personalContextFields: string[]
}

export async function classifyLiveGoal(goal: string): Promise<LiveClassificationResult> {
  const designPersonality = classifyDesignPersonality(goal)

  const lower = goal.toLowerCase()
  const suggestedConnectors: string[] = []

  if (lower.includes('reddit') || lower.includes('community') || lower.includes('discussion')) {
    suggestedConnectors.push('reddit')
  }
  if (lower.includes('spotify') || lower.includes('music') || lower.includes('listen') || lower.includes('artist')) {
    suggestedConnectors.push('spotify')
  }
  if (lower.includes('rss') || lower.includes('blog') || lower.includes('podcast') || lower.includes('feed')) {
    suggestedConnectors.push('rss')
  }

  const personalContextFields: string[] = []
  if (lower.includes('measurement') || lower.includes('size') || lower.includes('fit')) {
    if (lower.includes('chest') || lower.includes('waist') || lower.includes('inseam') || lower.includes('shoulder')) {
      if (lower.includes('chest')) personalContextFields.push('chest')
      if (lower.includes('waist')) personalContextFields.push('waist')
      if (lower.includes('inseam')) personalContextFields.push('inseam')
      if (lower.includes('shoulder')) personalContextFields.push('shoulder')
      if (lower.includes('hip')) personalContextFields.push('hip')
      if (lower.includes('neck')) personalContextFields.push('neck')
    } else {
      personalContextFields.push('chest', 'waist', 'inseam')
    }
  }

  return {
    designPersonality,
    suggestedConnectors,
    personalContextFields,
  }
}
