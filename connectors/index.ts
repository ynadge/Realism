import { reddit } from './reddit'
import { rss } from './rss'
import type { Connector, ConnectorRegistry } from './types'

export const connectors: ConnectorRegistry = {
  [reddit.id]: reddit,
  [rss.id]: rss,
}

export function getAllConnectors(): Connector[] {
  return Object.values(connectors)
}

export function getConnector(id: string): Connector | null {
  return connectors[id] ?? null
}

export function getConnectorDescriptions(): string {
  return getAllConnectors()
    .map(c => {
      const methods = c.methods.map(m => `  - ${m.id}: ${m.description}`).join('\n')
      return `${c.name} (${c.id}, auth: ${c.authType})\n${c.description}\nMethods:\n${methods}`
    })
    .join('\n\n')
}
