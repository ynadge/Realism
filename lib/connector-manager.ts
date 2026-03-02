import { getConnector, getAllConnectors } from '@/connectors'
import { getConnectorCredentials } from '@/lib/live-apps'
import type { DataItem } from '@/types'
import type { DataFetch } from '@/types/live'

export type ConnectorExecuteResult = {
  items: DataItem[]
  error?: string
}

export async function executeConnectorFetch(
  dataFetch: DataFetch,
  userId: string
): Promise<ConnectorExecuteResult> {
  if (dataFetch.type !== 'connector' || !dataFetch.connector || !dataFetch.method) {
    return { items: [], error: 'Invalid connector fetch config' }
  }

  const connector = getConnector(dataFetch.connector)
  if (!connector) {
    return { items: [], error: `Connector "${dataFetch.connector}" not found` }
  }

  const method = connector.methods.find(m => m.id === dataFetch.method)
  if (!method) {
    return { items: [], error: `Method "${dataFetch.method}" not found on connector "${dataFetch.connector}"` }
  }

  let credentials = {}
  if (connector.authType !== 'none') {
    const stored = await getConnectorCredentials(userId, dataFetch.connector)
    if (!stored) {
      return {
        items: [],
        error: `${connector.name} is not connected. Visit the app settings to connect.`,
      }
    }
    credentials = stored
  }

  const params: Record<string, string> = {}
  if (dataFetch.query) params.query = dataFetch.query
  if (dataFetch.url) params.url = dataFetch.url

  try {
    const items = await method.fetch(credentials, params)
    return { items }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { items: [], error: message }
  }
}

export async function getConnectorSummaryForUser(userId: string): Promise<string> {
  const all = getAllConnectors()
  const lines: string[] = []

  for (const connector of all) {
    let status = 'no auth required'
    if (connector.authType !== 'none') {
      const creds = await getConnectorCredentials(userId, connector.id)
      status = creds ? 'connected ✓' : 'not connected'
    }
    lines.push(`${connector.icon} ${connector.name} (${connector.id}) — ${status}`)
    lines.push(`  ${connector.description}`)
    connector.methods.forEach(m => {
      lines.push(`  · ${m.id}: ${m.description}`)
    })
  }

  return lines.join('\n')
}
