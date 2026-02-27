import { sapiomChat } from '@/lib/sapiom'
import type { JobType } from '@/types'

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
