import type { SystemPosition } from '../../../shared/types/exoplanet'
import { runTapQuery } from '../../utils/tap'

interface PositionRow {
  hostname: string
  sy_dist: number | null
  ra: number | null
  dec: number | null
  num_planets: number
}

/**
 * Returns every known host star's sky position (RA/Dec) and distance, for
 * the galaxy map view. Cached for 12 hours, same as the search list — this
 * roster changes slowly.
 */
export default defineEventHandler(async () => {
  const rows = await runTapQuery<PositionRow>(
    'select hostname, min(sy_dist) as sy_dist, min(ra) as ra, min(dec) as dec, count(*) as num_planets ' +
      'from pscomppars where sy_dist is not null and ra is not null and dec is not null ' +
      'group by hostname order by hostname',
    { ttlMs: 1000 * 60 * 60 * 12 }
  )

  const positions: SystemPosition[] = rows
    .filter((row): row is PositionRow & { sy_dist: number; ra: number; dec: number } =>
      !!row.hostname && row.sy_dist !== null && row.ra !== null && row.dec !== null
    )
    .map((row) => ({
      hostname: row.hostname,
      distancePc: row.sy_dist,
      raDeg: row.ra,
      decDeg: row.dec,
      numPlanets: Number(row.num_planets) || 0
    }))

  return positions
})
