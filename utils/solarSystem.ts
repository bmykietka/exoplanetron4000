/** Static reference data for the "compare to our solar system" 3D overlay. */
export interface SolarSystemPlanet {
  name: string
  orbitAu: number
  radiusEarth: number
  color: string
}

export const SOLAR_SYSTEM_PLANETS: SolarSystemPlanet[] = [
  { name: 'Mercury', orbitAu: 0.387, radiusEarth: 0.383, color: '#9c9c94' },
  { name: 'Venus', orbitAu: 0.723, radiusEarth: 0.949, color: '#e8cda2' },
  { name: 'Earth', orbitAu: 1.0, radiusEarth: 1.0, color: '#4d96ff' },
  { name: 'Mars', orbitAu: 1.524, radiusEarth: 0.532, color: '#c1440e' },
  { name: 'Jupiter', orbitAu: 5.203, radiusEarth: 11.21, color: '#d8ae82' },
  { name: 'Saturn', orbitAu: 9.537, radiusEarth: 9.45, color: '#e3c98f' },
  { name: 'Uranus', orbitAu: 19.191, radiusEarth: 4.01, color: '#9fe3e3' },
  { name: 'Neptune', orbitAu: 30.07, radiusEarth: 3.88, color: '#5b7fe0' }
]

export const SOLAR_SYSTEM_MAX_ORBIT_AU = 30.07
