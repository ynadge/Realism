import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { getAllConnectors } from '@/connectors'
import { getConnectorCredentials } from '@/lib/live-apps'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('realism-session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = await validateSession(token)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allConnectors = getAllConnectors()

  const status = await Promise.all(
    allConnectors.map(async connector => {
      let connected = false

      if (connector.authType === 'none') {
        connected = true
      } else {
        const creds = await getConnectorCredentials(userId, connector.id)
        connected = creds !== null
      }

      return {
        id: connector.id,
        name: connector.name,
        icon: connector.icon,
        authType: connector.authType,
        connected,
        authUrl: connector.authType === 'oauth2'
          ? `/api/connectors/${connector.id}/auth`
          : null,
      }
    })
  )

  return NextResponse.json({ connectors: status })
}
