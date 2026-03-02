import { notFound } from 'next/navigation'
import { getLiveApp, getLiveBundle } from '@/lib/live-apps'
import { LiveShell } from '@/components/LiveShell'

type Props = {
  params: Promise<{ userId: string; slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { userId, slug } = await params
  const config = await getLiveApp(userId, slug)

  if (!config) {
    return { title: 'App Not Found — Realism' }
  }

  return {
    title: `${config.title} — Realism`,
    description: config.description,
  }
}

export default async function LivePage({ params }: Props) {
  const { userId, slug } = await params

  const [config, bundle] = await Promise.all([
    getLiveApp(userId, slug),
    getLiveBundle(userId, slug),
  ])

  if (!config || !bundle) {
    notFound()
  }

  return <LiveShell config={config} bundle={bundle} userId={userId} slug={slug} />
}
