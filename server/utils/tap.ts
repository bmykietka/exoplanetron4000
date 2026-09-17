import { browserFetchText } from './browserFetch'

const TAP_SYNC_URL = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync'

interface CacheEntry {
  expiresAt: number
  data: unknown
}

const cache = new Map<string, CacheEntry>()

function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (entry.expiresAt < Date.now()) {
    cache.delete(key)
    return undefined
  }
  return entry.data as T
}

function setCached(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { expiresAt: Date.now() + ttlMs, data })
}

/** Escapes a string literal for use inside an ADQL/SQL query (doubles single quotes). */
export function adqlLiteral(value: string): string {
  return value.replace(/'/g, "''")
}

/**
 * Runs an ADQL query against the NASA Exoplanet Archive TAP service and
 * returns the parsed rows. Results are cached in-memory per exact query.
 *
 * The archive's edge issues a Cloudflare JS challenge to plain HTTP clients
 * (confirmed even with a full realistic browser header set), so the actual
 * request is made through a persistent headless-browser page — see
 * `browserFetch.ts` — rather than a bare server-side fetch.
 */
export async function runTapQuery<T = Record<string, unknown>>(
  adql: string,
  options: { ttlMs?: number } = {}
): Promise<T[]> {
  const ttlMs = options.ttlMs ?? 1000 * 60 * 60 // 1 hour default
  const cacheKey = adql
  const cached = getCached<T[]>(cacheKey)
  if (cached) return cached

  const url = `${TAP_SYNC_URL}?${new URLSearchParams({
    REQUEST: 'doQuery',
    LANG: 'ADQL',
    QUERY: adql,
    FORMAT: 'json'
  }).toString()}`

  let response: string
  try {
    response = await browserFetchText(url)
  } catch (err: any) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Failed to reach the NASA Exoplanet Archive',
      data: { cause: err?.message ?? String(err) }
    })
  }

  let rows: T[]
  try {
    rows = JSON.parse(response) as T[]
  } catch {
    // The TAP service reports query errors as plain text/HTML with a 200 status.
    throw createError({
      statusCode: 502,
      statusMessage: 'The NASA Exoplanet Archive returned an unexpected response',
      data: { body: response.slice(0, 2000) }
    })
  }

  setCached(cacheKey, rows, ttlMs)
  return rows
}
