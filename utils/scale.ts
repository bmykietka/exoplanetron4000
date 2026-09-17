/**
 * Distance and size scaling helpers shared by the 2D and 3D system viewers.
 *
 * Real systems span orders of magnitude in both orbital distance and body
 * radius, so raw AU/Earth-radii values are unusable for direct rendering:
 * inner planets would sit on top of the star and gas giants would swallow
 * rocky worlds. Distances can optionally use a sqrt scale to keep close-in
 * planets visible while preserving their relative order; the 2D "proportional"
 * view uses `mode: 'linear'` so distances stay true-to-scale. Body sizes
 * always use a compressed log scale purely for visibility and are never
 * proportional to distance.
 */

export type DistanceScaleMode = 'linear' | 'sqrt'

export function auToSceneUnits(au: number, mode: DistanceScaleMode, unitsPerAu: number): number {
  const safeAu = Math.max(au, 0)
  const scaled = mode === 'sqrt' ? Math.sqrt(safeAu) : safeAu
  return scaled * unitsPerAu
}

/** Inverse of auToSceneUnits, used to place axis tick labels. */
export function sceneUnitsToAu(units: number, mode: DistanceScaleMode, unitsPerAu: number): number {
  const scaled = units / unitsPerAu
  return mode === 'sqrt' ? scaled ** 2 : scaled
}

const MIN_PLANET_VISUAL_RADIUS = 0.045
const MAX_PLANET_VISUAL_RADIUS = 0.34

/**
 * Maps a planet radius (Earth radii) to a visually legible render radius
 * using a log scale clamped to a sane range. Not proportional to distance
 * or to the star's rendered size.
 */
export function planetVisualRadius(radiusEarth: number | null | undefined): number {
  const r = radiusEarth && Number.isFinite(radiusEarth) && radiusEarth > 0 ? radiusEarth : 1
  const t = Math.log10(r + 1) / Math.log10(23) // ~23 R⊕ covers Earth -> large gas giant
  const clampedT = Math.min(Math.max(t, 0), 1)
  return MIN_PLANET_VISUAL_RADIUS + clampedT * (MAX_PLANET_VISUAL_RADIUS - MIN_PLANET_VISUAL_RADIUS)
}

const MIN_STAR_VISUAL_RADIUS = 0.55
const MAX_STAR_VISUAL_RADIUS = 1.6

/** Maps a stellar radius (Solar radii) to a visually legible render radius. */
export function starVisualRadius(radiusSolar: number | null | undefined): number {
  const r = radiusSolar && Number.isFinite(radiusSolar) && radiusSolar > 0 ? radiusSolar : 1
  const t = Math.log10(r + 0.2) / Math.log10(12)
  const clampedT = Math.min(Math.max(t, 0), 1)
  return MIN_STAR_VISUAL_RADIUS + clampedT * (MAX_STAR_VISUAL_RADIUS - MIN_STAR_VISUAL_RADIUS)
}

/**
 * Approximates a blackbody color for a given effective temperature,
 * used to tint the star mesh and its glow/light.
 */
export function starColorForTemp(teffK: number | null | undefined): [number, number, number] {
  const t = teffK && Number.isFinite(teffK) ? teffK : 5772
  // Piecewise-linear fit through common O..M spectral-class colors (approximate, for visuals only).
  const stops: [number, [number, number, number]][] = [
    [3000, [1.0, 0.42, 0.2]],
    [3700, [1.0, 0.55, 0.28]],
    [5200, [1.0, 0.78, 0.55]],
    [5772, [1.0, 0.93, 0.85]],
    [6500, [0.93, 0.94, 1.0]],
    [7500, [0.79, 0.86, 1.0]],
    [10000, [0.64, 0.75, 1.0]],
    [25000, [0.55, 0.68, 1.0]]
  ]
  if (t <= stops[0][0]) return stops[0][1]
  if (t >= stops[stops.length - 1][0]) return stops[stops.length - 1][1]
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i]
    const [t1, c1] = stops[i + 1]
    if (t >= t0 && t <= t1) {
      const f = (t - t0) / (t1 - t0)
      return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f]
    }
  }
  return stops[stops.length - 1][1]
}
