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
 */
export async function runTapQuery<T = Record<string, unknown>>(
  adql: string,
  options: { ttlMs?: number } = {}
): Promise<T[]> {
  const ttlMs = options.ttlMs ?? 1000 * 60 * 60 // 1 hour default
  const cacheKey = adql
  const cached = getCached<T[]>(cacheKey)
  if (cached) return cached

  let response: string
  try {
    response = await $fetch<string>(TAP_SYNC_URL, {
      method: 'GET',
      query: { REQUEST: 'doQuery', LANG: 'ADQL', QUERY: adql, FORMAT: 'json' },
      responseType: 'text',
      headers: {
        'User-Agent': 'Exoplanetron4000/1.0 (+https://github.com/)',
        Accept: 'application/json, text/plain, */*'
      },
      retry: 1,
      timeout: 20000
    })
  } catch (err: any) {
    // Distinguish "we got a response but it was an error" (upstream status +
    // body are useful for diagnosing a bad query) from "never got a
    // response" (true network/connectivity failure).
    const upstreamStatus = err?.response?.status ?? err?.status
    const upstreamBody =
      typeof err?.response?._data === 'string'
        ? err.response._data.slice(0, 2000)
        : err?.data
          ? JSON.stringify(err.data).slice(0, 2000)
          : undefined

    throw createError({
      statusCode: 502,
      statusMessage: upstreamStatus
        ? `The NASA Exoplanet Archive returned an error (HTTP ${upstreamStatus})`
        : 'Failed to reach the NASA Exoplanet Archive',
      data: { cause: err?.message ?? String(err), upstreamStatus, upstreamBody }
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
