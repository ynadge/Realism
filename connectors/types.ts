import type { DataItem, ConnectorCredentials } from '@/types'

export type { DataItem, ConnectorCredentials }

export type ConnectorMethod = {
  id: string
  description: string
  params: Record<string, {
    type: string
    description: string
    required: boolean
  }>
  fetch: (
    credentials: ConnectorCredentials,
    params: Record<string, string>
  ) => Promise<DataItem[]>
}

export type Connector = {
  id: string
  name: string
  description: string
  icon: string
  authType: 'oauth2' | 'api_key' | 'none'

  oauth?: {
    authUrl: string
    tokenUrl: string
    scopes: string[]
    clientIdEnvVar: string
    clientSecretEnvVar: string
  }

  methods: ConnectorMethod[]
}

export type ConnectorRegistry = Record<string, Connector>
