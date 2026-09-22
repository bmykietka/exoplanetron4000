/**
 * Procedural spiral-galaxy point cloud used purely as an illustrative backdrop
 * for the "Milky Way context" galaxy map mode. This is NOT derived from any
 * real star catalog or survey — it approximates the Milky Way's general shape
 * (a central bulge plus a handful of logarithmic spiral arms in a thin disk)
 * so the local exoplanet neighborhood has visual context, and is deterministic
 * (seeded) so the same view renders identically on every load.
 */

export interface GalaxyStarPoint {
  x: number
  y: number
  z: number
  color: [number, number, number]
}

export interface SpiralGalaxyOptions {
  count?: number
  radius: number
  arms?: number
  armTightness?: number
  bulgeFraction?: number
  thickness?: number
  seed?: number
}

function mulberry32(seed: number): () => number {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function lerpColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

const BULGE_COLOR: [number, number, number] = [1.0, 0.87, 0.68]
const ARM_INNER_COLOR: [number, number, number] = [0.85, 0.82, 1.0]
const ARM_OUTER_COLOR: [number, number, number] = [0.55, 0.68, 1.0]

export function generateSpiralGalaxy(options: SpiralGalaxyOptions): GalaxyStarPoint[] {
  const {
    count = 16000,
    radius,
    arms = 4,
    armTightness = 0.35,
    bulgeFraction = 0.18,
    thickness = 0.06,
    seed = 1337
  } = options

  const rand = mulberry32(seed)
  const points: GalaxyStarPoint[] = []
  const bulgeRadius = radius * bulgeFraction

  for (let i = 0; i < count; i++) {
    const isBulge = rand() < 0.22

    let r: number
    let angle: number
    let color: [number, number, number]

    if (isBulge) {
      // Dense, roughly spherical-ish core: bias sampling toward the center.
      r = bulgeRadius * Math.pow(rand(), 1.7)
      angle = rand() * Math.PI * 2
      color = lerpColor(BULGE_COLOR, ARM_INNER_COLOR, Math.min(r / bulgeRadius, 1) * 0.4)
    } else {
      // Pick a spiral arm and walk outward along its logarithmic curve, with
      // angular jitter so arms read as bands of stars rather than thin lines.
      const armIndex = Math.floor(rand() * arms)
      const armOffset = (armIndex / arms) * Math.PI * 2
      r = bulgeRadius + (radius - bulgeRadius) * Math.pow(rand(), 0.65)
      const spiralAngle = Math.log(r / bulgeRadius + 1) / armTightness
      const jitter = (rand() - 0.5) * (0.55 + (r / radius) * 0.5)
      angle = armOffset + spiralAngle + jitter

      const outwardT = Math.min(r / radius, 1)
      color = lerpColor(ARM_INNER_COLOR, ARM_OUTER_COLOR, outwardT)
    }

    const diskFalloff = 1 - Math.min(r / radius, 1) * 0.6
    const y = (rand() - 0.5) * thickness * radius * diskFalloff

    points.push({
      x: r * Math.cos(angle),
      y,
      z: r * Math.sin(angle),
      color
    })
  }

  return points
}
