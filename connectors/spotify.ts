import type { Connector, DataItem, ConnectorCredentials } from '@/connectors/types'

const SPOTIFY_API = 'https://api.spotify.com/v1'

// ─── Token refresh ────────────────────────────────────────────────────────────

export async function refreshSpotifyToken(
  credentials: ConnectorCredentials
): Promise<ConnectorCredentials> {
  if (!credentials.refreshToken) {
    throw new Error('No refresh token available — user must reconnect Spotify')
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: credentials.refreshToken,
    }),
  })

  if (!res.ok) {
    throw new Error(`Spotify token refresh failed: ${res.status}`)
  }

  const data = await res.json()

  return {
    ...credentials,
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? credentials.refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }
}

// ─── API helper ───────────────────────────────────────────────────────────────

async function spotifyGet(
  path: string,
  credentials: ConnectorCredentials
): Promise<unknown> {
  const expiresAt = credentials.expiresAt ? new Date(credentials.expiresAt).getTime() : 0
  const isExpired = Date.now() > expiresAt - 60_000

  let token = credentials.accessToken
  if (isExpired) {
    const refreshed = await refreshSpotifyToken(credentials)
    token = refreshed.accessToken
  }

  const res = await fetch(`${SPOTIFY_API}${path}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    next: { revalidate: 0 },
  })

  if (res.status === 401) {
    throw new Error('Spotify token expired — user must reconnect')
  }

  if (!res.ok) {
    throw new Error(`Spotify API error: ${res.status} for ${path}`)
  }

  return res.json()
}

// ─── Method implementations ───────────────────────────────────────────────────

async function getTopTracks(
  credentials: ConnectorCredentials,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  limit: number = 20
): Promise<DataItem[]> {
  const data = await spotifyGet(
    `/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
    credentials
  ) as { items: SpotifyTrack[] }

  return data.items.map(track => ({
    title: track.name,
    summary: `by ${track.artists.map(a => a.name).join(', ')} · ${track.album.name}`,
    url: track.external_urls.spotify,
    imageUrl: track.album.images[0]?.url,
    metadata: {
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      popularity: String(track.popularity),
      duration_ms: String(track.duration_ms),
    },
  }))
}

async function getRecentlyPlayed(
  credentials: ConnectorCredentials,
  limit: number = 20
): Promise<DataItem[]> {
  const data = await spotifyGet(
    `/me/player/recently-played?limit=${limit}`,
    credentials
  ) as { items: SpotifyPlayHistory[] }

  return data.items.map(item => ({
    title: item.track.name,
    summary: `by ${item.track.artists.map(a => a.name).join(', ')}`,
    url: item.track.external_urls.spotify,
    imageUrl: item.track.album.images[0]?.url,
    publishedAt: item.played_at,
    metadata: {
      artist: item.track.artists.map(a => a.name).join(', '),
      album: item.track.album.name,
      played_at: item.played_at,
    },
  }))
}

async function getArtistInfo(
  credentials: ConnectorCredentials,
  artistName: string
): Promise<DataItem[]> {
  const searchData = await spotifyGet(
    `/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`,
    credentials
  ) as { artists: { items: SpotifyArtist[] } }

  const artist = searchData.artists.items[0]
  if (!artist) return []

  return [{
    title: artist.name,
    summary: `${artist.followers.total.toLocaleString()} followers · ${artist.genres.slice(0, 3).join(', ')}`,
    url: artist.external_urls.spotify,
    imageUrl: artist.images[0]?.url,
    metadata: {
      followers: String(artist.followers.total),
      popularity: String(artist.popularity),
      genres: artist.genres.join(', '),
      spotify_id: artist.id,
    },
  }]
}

async function getNewReleases(
  credentials: ConnectorCredentials,
  limit: number = 20
): Promise<DataItem[]> {
  const data = await spotifyGet(
    `/browse/new-releases?limit=${limit}`,
    credentials
  ) as { albums: { items: SpotifyAlbum[] } }

  return data.albums.items.map(album => ({
    title: album.name,
    summary: `by ${album.artists.map(a => a.name).join(', ')} · ${album.album_type}`,
    url: album.external_urls.spotify,
    imageUrl: album.images[0]?.url,
    publishedAt: album.release_date,
    metadata: {
      artist: album.artists.map(a => a.name).join(', '),
      album_type: album.album_type,
      total_tracks: String(album.total_tracks),
      release_date: album.release_date,
    },
  }))
}

async function getRelatedArtists(
  credentials: ConnectorCredentials,
  artistName: string
): Promise<DataItem[]> {
  const searchData = await spotifyGet(
    `/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`,
    credentials
  ) as { artists: { items: SpotifyArtist[] } }

  const artist = searchData.artists.items[0]
  if (!artist) return []

  const relatedData = await spotifyGet(
    `/artists/${artist.id}/related-artists`,
    credentials
  ) as { artists: SpotifyArtist[] }

  return relatedData.artists.slice(0, 10).map(a => ({
    title: a.name,
    summary: `${a.followers.total.toLocaleString()} followers · ${a.genres.slice(0, 2).join(', ')}`,
    url: a.external_urls.spotify,
    imageUrl: a.images[0]?.url,
    metadata: {
      followers: String(a.followers.total),
      popularity: String(a.popularity),
      genres: a.genres.join(', '),
    },
  }))
}

// ─── Spotify API types ────────────────────────────────────────────────────────

type SpotifyTrack = {
  name: string
  artists: Array<{ name: string }>
  album: { name: string; images: Array<{ url: string }> }
  external_urls: { spotify: string }
  popularity: number
  duration_ms: number
}

type SpotifyPlayHistory = {
  track: SpotifyTrack
  played_at: string
}

type SpotifyArtist = {
  id: string
  name: string
  followers: { total: number }
  genres: string[]
  popularity: number
  images: Array<{ url: string }>
  external_urls: { spotify: string }
}

type SpotifyAlbum = {
  name: string
  artists: Array<{ name: string }>
  images: Array<{ url: string }>
  external_urls: { spotify: string }
  release_date: string
  album_type: string
  total_tracks: number
}

// ─── Connector definition ─────────────────────────────────────────────────────

export const spotify: Connector = {
  id: 'spotify',
  name: 'Spotify',
  description: 'User listening history, top tracks, artist discovery, and new releases from Spotify. Requires user to connect their Spotify account.',
  icon: '🎵',
  authType: 'oauth2',

  oauth: {
    authUrl: 'https://accounts.spotify.com/authorize',
    tokenUrl: 'https://accounts.spotify.com/api/token',
    scopes: [
      'user-top-read',
      'user-read-recently-played',
      'user-read-private',
    ],
    clientIdEnvVar: 'SPOTIFY_CLIENT_ID',
    clientSecretEnvVar: 'SPOTIFY_CLIENT_SECRET',
  },

  methods: [
    {
      id: 'top_tracks',
      description: "User's most listened-to tracks. time_range: short_term (4 weeks), medium_term (6 months), long_term (all time)",
      params: {
        time_range: { type: 'string', description: 'short_term | medium_term | long_term', required: false },
        limit: { type: 'string', description: 'Number of tracks (default: 20)', required: false },
      },
      fetch: async (credentials, params) =>
        getTopTracks(
          credentials,
          (params.time_range as 'short_term' | 'medium_term' | 'long_term') ?? 'medium_term',
          params.limit ? parseInt(params.limit) : 20
        ),
    },

    {
      id: 'recently_played',
      description: "User's recently played tracks with timestamps",
      params: {
        limit: { type: 'string', description: 'Number of tracks (default: 20)', required: false },
      },
      fetch: async (credentials, params) =>
        getRecentlyPlayed(credentials, params.limit ? parseInt(params.limit) : 20),
    },

    {
      id: 'artist_info',
      description: 'Search for an artist and get their profile, follower count, genres, and popularity',
      params: {
        artist: { type: 'string', description: 'Artist name to search for', required: true },
      },
      fetch: async (credentials, params) => getArtistInfo(credentials, params.artist),
    },

    {
      id: 'new_releases',
      description: 'New album and single releases on Spotify',
      params: {
        limit: { type: 'string', description: 'Number of releases (default: 20)', required: false },
      },
      fetch: async (credentials, params) =>
        getNewReleases(credentials, params.limit ? parseInt(params.limit) : 20),
    },

    {
      id: 'related_artists',
      description: 'Find artists similar to a given artist — useful for music discovery features',
      params: {
        artist: { type: 'string', description: 'Artist name to find related artists for', required: true },
      },
      fetch: async (credentials, params) => getRelatedArtists(credentials, params.artist),
    },
  ],
}
