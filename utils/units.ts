/**
 * Common "relatable" unit conversions shown alongside the archive's native
 * units (parsecs, Kelvin, AU, Earth radii/masses) throughout the app.
 * Each formatter returns null for missing data so call sites can supply
 * whatever "no data" placeholder matches their surrounding UI.
 */

const LIGHT_YEARS_PER_PARSEC = 3.26156
const LIGHT_MINUTES_PER_AU = 8.3167
const EARTH_RADII_PER_JUPITER_RADIUS = 11.209
const EARTH_MASSES_PER_JUPITER_MASS = 317.8

export function parsecsToLightYears(pc: number): number {
  return pc * LIGHT_YEARS_PER_PARSEC
}

export function kelvinToCelsius(k: number): number {
  return k - 273.15
}

/** Distance to the host star, e.g. "12.4 pc (40.4 ly)". */
export function formatDistance(pc: number | null | undefined): string | null {
  if (pc === null || pc === undefined || !Number.isFinite(pc)) return null
  const ly = parsecsToLightYears(pc)
  return `${pc.toFixed(1)} pc (${ly.toFixed(ly < 10 ? 2 : 1)} ly)`
}

/** A temperature, e.g. "5778 K (5505°C)". */
export function formatTemperature(k: number | null | undefined): string | null {
  if (k === null || k === undefined || !Number.isFinite(k)) return null
  return `${Math.round(k)} K (${Math.round(kelvinToCelsius(k))}°C)`
}

function formatLightTravelTime(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes < 10 ? totalMinutes.toFixed(1) : totalMinutes.toFixed(0)} light-min`
  const hours = totalMinutes / 60
  if (hours < 48) return `${hours.toFixed(1)} light-hr`
  return `${(hours / 24).toFixed(1)} light-days`
}

/** Orbital distance, e.g. "1.000 AU (8.3 light-min)". */
export function formatOrbitDistance(au: number | null | undefined): string | null {
  if (au === null || au === undefined || !Number.isFinite(au)) return null
  const auStr = au < 0.01 ? au.toExponential(2) : au.toFixed(3)
  return `${auStr} AU (${formatLightTravelTime(au * LIGHT_MINUTES_PER_AU)})`
}

/** Planet radius; adds the Jupiter-relative size once it's large enough for that to be a meaningful comparison. */
export function formatPlanetRadius(radiusEarth: number | null | undefined): string | null {
  if (radiusEarth === null || radiusEarth === undefined || !Number.isFinite(radiusEarth)) return null
  const base = `${radiusEarth.toFixed(2)} R⊕`
  if (radiusEarth < 2) return base
  return `${base} (${(radiusEarth / EARTH_RADII_PER_JUPITER_RADIUS).toFixed(2)} R♃)`
}

/** Planet mass; adds the Jupiter-relative mass once it's large enough for that to be a meaningful comparison. */
export function formatPlanetMass(massEarth: number | null | undefined): string | null {
  if (massEarth === null || massEarth === undefined || !Number.isFinite(massEarth)) return null
  const base = `${massEarth.toFixed(2)} M⊕`
  if (massEarth < 10) return base
  return `${base} (${(massEarth / EARTH_MASSES_PER_JUPITER_MASS).toFixed(2)} M♃)`
}
