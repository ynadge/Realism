import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth'
import { getLiveApp, getDataPlan, getConnectorCredentials } from '@/lib/live-apps'
import { getAllConnectors } from '@/connectors'
import { SettingsClient } from '@/components/live/SettingsClient'

type Props = {
  params: Promise<{ userId: string; slug: string }>
}

export default async function LiveSettingsPage({ params }: Props) {
  const { userId, slug } = await params

  const cookieStore = await cookies()
  const token = cookieStore.get('realism-session')?.value

  if (!token) {
    redirect(`/?auth=required&returnTo=/live/${userId}/${slug}/settings`)
  }

  const sessionUserId = await validateSession(token)
  if (!sessionUserId || sessionUserId !== userId) {
    redirect(`/live/${userId}/${slug}`)
  }

  const [config, plan] = await Promise.all([
    getLiveApp(userId, slug),
    getDataPlan(userId, slug),
  ])

  if (!config || !plan) {
    notFound()
  }

  const allConnectors = getAllConnectors().filter(c => c.authType !== 'none')
  const connectorStatuses = await Promise.all(
    allConnectors.map(async connector => {
      const creds = await getConnectorCredentials(userId, connector.id)
      return {
        id: connector.id,
        name: connector.name,
        icon: connector.icon,
        connected: creds !== null,
        authUrl: `/api/connectors/${connector.id}/auth?returnTo=/live/${userId}/${slug}/settings`,
      }
    })
  )

  return (
    <SettingsClient
      config={config}
      plan={plan}
      userId={userId}
      slug={slug}
      connectorStatuses={connectorStatuses}
    />
  )
}
