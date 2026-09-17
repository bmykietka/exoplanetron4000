const DAYS_PER_YEAR = 365.25

/**
 * Estimates a planet's semi-major axis (AU) from its orbital period and the
 * host star's mass via Kepler's third law, ignoring the planet's own mass.
 * Used as a fallback when the archive doesn't report orbsmax directly.
 */
export function semiMajorAxisFromPeriod(periodDays: number, starMassSolar: number): number | null {
  if (!Number.isFinite(periodDays) || !Number.isFinite(starMassSolar) || periodDays <= 0 || starMassSolar <= 0) {
    return null
  }
  const periodYears = periodDays / DAYS_PER_YEAR
  return (periodYears ** 2 * starMassSolar) ** (1 / 3)
}
