import type { PlanetRecord, StarRecord, SystemDetail } from '../../../shared/types/exoplanet'
import { computeHabitableZone, isWithinHabitableZone, resolveLuminosity } from '../../../shared/utils/habitableZone'
import { semiMajorAxisFromPeriod } from '../../../shared/utils/orbit'
import { adqlLiteral, runTapQuery } from '../../utils/tap'

interface PlanetRow {
  pl_name: string
  hostname: string
  sy_snum: number | null
  sy_pnum: number | null
  pl_orbsmax: number | null
  pl_orbper: number | null
  pl_orbeccen: number | null
  pl_rade: number | null
  pl_bmasse: number | null
  pl_eqt: number | null
  pl_insol: number | null
  pl_orbincl: number | null
  disc_year: number | null
  discoverymethod: string | null
  st_spectype: string | null
  st_teff: number | null
  st_rad: number | null
  st_mass: number | null
  st_lum: number | null
  st_met: number | null
  st_age: number | null
  sy_dist: number | null
  ra: number | null
  dec: number | null
}

function planetLetter(plName: string, hostname: string): string {
  const suffix = plName.slice(hostname.length).trim()
  return suffix || plName
}

export default defineEventHandler(async (event) => {
  const rawName = getRouterParam(event, 'name')
  if (!rawName) {
    throw createError({ statusCode: 400, statusMessage: 'Missing system name' })
  }
  const hostname = decodeURIComponent(rawName)

  const columns = [
    'pl_name', 'hostname', 'sy_snum', 'sy_pnum',
    'pl_orbsmax', 'pl_orbper', 'pl_orbeccen', 'pl_rade', 'pl_bmasse', 'pl_eqt', 'pl_insol', 'pl_orbincl',
    'disc_year', 'discoverymethod',
    'st_spectype', 'st_teff', 'st_rad', 'st_mass', 'st_lum', 'st_met', 'st_age',
    'sy_dist', 'ra', 'dec'
  ].join(', ')

  const rows = await runTapQuery<PlanetRow>(
    `select ${columns} from pscomppars where hostname = '${adqlLiteral(hostname)}' order by pl_orbsmax asc`,
    { ttlMs: 1000 * 60 * 60 * 6 }
  )

  if (rows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: `No system found for host star "${hostname}"` })
  }

  const first = rows[0]
  const luminosity = resolveLuminosity(first.st_lum, first.st_rad, first.st_teff)
  const habitableZone = computeHabitableZone(first.st_teff, luminosity?.luminositySolar ?? null)

  const star: StarRecord = {
    hostname: first.hostname,
    spectralType: first.st_spectype ?? null,
    effectiveTempK: first.st_teff ?? null,
    radiusSolar: first.st_rad ?? null,
    massSolar: first.st_mass ?? null,
    luminositySolar: luminosity?.luminositySolar ?? null,
    luminosityEstimated: luminosity?.estimated ?? false,
    metallicity: first.st_met ?? null,
    ageGyr: first.st_age ?? null,
    distancePc: first.sy_dist ?? null,
    numStars: first.sy_snum ?? null,
    numPlanets: first.sy_pnum ?? rows.length,
    raDeg: first.ra ?? null,
    decDeg: first.dec ?? null
  }

  const planets: PlanetRecord[] = rows.map((row) => {
    const orbitAu =
      row.pl_orbsmax ?? (row.pl_orbper && star.massSolar ? semiMajorAxisFromPeriod(row.pl_orbper, star.massSolar) : null)

    return {
      name: row.pl_name,
      letter: planetLetter(row.pl_name, row.hostname),
      orbitSemiMajorAxisAu: orbitAu,
      orbitPeriodDays: row.pl_orbper ?? null,
      eccentricity: row.pl_orbeccen ?? null,
      radiusEarth: row.pl_rade ?? null,
      massEarth: row.pl_bmasse ?? null,
      equilibriumTempK: row.pl_eqt ?? null,
      insolationEarth: row.pl_insol ?? null,
      inclinationDeg: row.pl_orbincl ?? null,
      discoveryYear: row.disc_year ?? null,
      discoveryMethod: row.discoverymethod ?? null,
      inHabitableZone: isWithinHabitableZone(orbitAu, habitableZone)
    }
  })

  const detail: SystemDetail = { hostname: star.hostname, star, planets, habitableZone }
  return detail
})
