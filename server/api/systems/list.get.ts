import type { SystemSummary } from '../../../shared/types/exoplanet'
import { runTapQuery } from '../../utils/tap'

interface ListRow {
  hostname: string
  num_planets: number
  sy_dist: number | null
}

/**
 * Returns every known host star system with its planet count, for the
 * client-side search/autocomplete list. Cached for 12 hours since the
 * archive's system roster changes slowly.
 */
export default defineEventHandler(async () => {
  const rows = await runTapQuery<ListRow>(
    'select hostname, count(*) as num_planets, min(sy_dist) as sy_dist ' +
      'from pscomppars group by hostname order by hostname',
    { ttlMs: 1000 * 60 * 60 * 12 }
  )

  const systems: SystemSummary[] = rows
    .filter((row) => !!row.hostname)
    .map((row) => ({
      hostname: row.hostname,
      numPlanets: Number(row.num_planets) || 0,
      distancePc: row.sy_dist ?? null
    }))

  return systems
})
