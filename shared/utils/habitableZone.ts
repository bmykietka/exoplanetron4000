import type { HabitableZone } from '../types/exoplanet'

/**
 * Habitable zone flux coefficients from Kopparapu et al. (2013/2014),
 * "Habitable Zones Around Main-sequence Stars: New Estimates".
 * Seff = Seff_sun + a*T + b*T^2 + c*T^3 + d*T^4, where T = Teff - 5780 K.
 * Valid roughly for Teff in [2600 K, 7200 K]; outside that range the
 * polynomial is extrapolated, so results become less reliable.
 */
interface HzCoefficients {
  seffSun: number
  a: number
  b: number
  c: number
  d: number
}

const HZ_COEFFICIENTS: Record<'recentVenus' | 'runawayGreenhouse' | 'maxGreenhouse' | 'earlyMars', HzCoefficients> = {
  recentVenus: { seffSun: 1.776, a: 2.136e-4, b: 2.533e-8, c: -1.332e-11, d: -3.097e-15 },
  runawayGreenhouse: { seffSun: 1.107, a: 1.332e-4, b: 1.58e-8, c: -8.308e-12, d: -1.931e-15 },
  maxGreenhouse: { seffSun: 0.3438, a: 5.8942e-5, b: 1.6558e-9, c: -3.0045e-12, d: -5.2982e-16 },
  earlyMars: { seffSun: 0.3179, a: 5.4513e-5, b: 1.5313e-9, c: -2.7786e-12, d: -4.8997e-16 }
}

const SOLAR_TEFF_K = 5772

function seffAt(teffK: number, coeff: HzCoefficients): number {
  const t = teffK - 5780
  return coeff.seffSun + coeff.a * t + coeff.b * t ** 2 + coeff.c * t ** 3 + coeff.d * t ** 4
}

function auFromSeff(luminositySolar: number, seff: number): number | null {
  if (seff <= 0 || luminositySolar <= 0) return null
  return Math.sqrt(luminositySolar / seff)
}

export interface LuminosityEstimate {
  luminositySolar: number
  estimated: boolean
}

/**
 * Resolve stellar luminosity in solar units, falling back to a
 * Stefan-Boltzmann estimate from radius and effective temperature
 * when the archive doesn't report luminosity directly.
 */
export function resolveLuminosity(
  luminosityLog10Solar: number | null | undefined,
  radiusSolar: number | null | undefined,
  teffK: number | null | undefined
): LuminosityEstimate | null {
  if (luminosityLog10Solar !== null && luminosityLog10Solar !== undefined && Number.isFinite(luminosityLog10Solar)) {
    return { luminositySolar: 10 ** luminosityLog10Solar, estimated: false }
  }
  if (radiusSolar && teffK && Number.isFinite(radiusSolar) && Number.isFinite(teffK)) {
    const luminositySolar = radiusSolar ** 2 * (teffK / SOLAR_TEFF_K) ** 4
    return { luminositySolar, estimated: true }
  }
  return null
}

/**
 * Compute the conservative (runaway greenhouse -> maximum greenhouse) and
 * optimistic (recent Venus -> early Mars) habitable zone boundaries in AU.
 */
export function computeHabitableZone(
  teffK: number | null | undefined,
  luminositySolar: number | null | undefined
): HabitableZone {
  const empty: HabitableZone = {
    conservativeInnerAu: null,
    conservativeOuterAu: null,
    optimisticInnerAu: null,
    optimisticOuterAu: null
  }
  if (!teffK || !luminositySolar || !Number.isFinite(teffK) || !Number.isFinite(luminositySolar)) {
    return empty
  }

  const conservativeInner = seffAt(teffK, HZ_COEFFICIENTS.runawayGreenhouse)
  const conservativeOuter = seffAt(teffK, HZ_COEFFICIENTS.maxGreenhouse)
  const optimisticInner = seffAt(teffK, HZ_COEFFICIENTS.recentVenus)
  const optimisticOuter = seffAt(teffK, HZ_COEFFICIENTS.earlyMars)

  return {
    conservativeInnerAu: auFromSeff(luminositySolar, conservativeInner),
    conservativeOuterAu: auFromSeff(luminositySolar, conservativeOuter),
    optimisticInnerAu: auFromSeff(luminositySolar, optimisticInner),
    optimisticOuterAu: auFromSeff(luminositySolar, optimisticOuter)
  }
}

export function isWithinHabitableZone(orbitAu: number | null, zone: HabitableZone): boolean | null {
  if (orbitAu === null || !Number.isFinite(orbitAu)) return null
  const inner = zone.optimisticInnerAu
  const outer = zone.optimisticOuterAu
  if (inner === null || outer === null) return null
  return orbitAu >= inner && orbitAu <= outer
}
