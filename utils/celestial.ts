/**
 * Converts equatorial sky coordinates (right ascension, declination) plus a
 * distance into Cartesian coordinates centered on the Sun, for plotting
 * host stars in 3D space relative to us on the galaxy map. Declination
 * maps to Three.js's Y ("up") axis since that reads more naturally as
 * "north" in a 3D scene; right ascension sweeps around the X-Z plane.
 */
export function equatorialToCartesian(raDeg: number, decDeg: number, distance: number): [number, number, number] {
  const ra = (raDeg * Math.PI) / 180
  const dec = (decDeg * Math.PI) / 180
  const x = distance * Math.cos(dec) * Math.cos(ra)
  const y = distance * Math.sin(dec)
  const z = distance * Math.cos(dec) * Math.sin(ra)
  return [x, y, z]
}
