export interface PlanetRecord {
  name: string
  letter: string
  orbitSemiMajorAxisAu: number | null
  orbitPeriodDays: number | null
  eccentricity: number | null
  radiusEarth: number | null
  massEarth: number | null
  equilibriumTempK: number | null
  insolationEarth: number | null
  inclinationDeg: number | null
  discoveryYear: number | null
  discoveryMethod: string | null
  inHabitableZone: boolean | null
}

export interface StarRecord {
  hostname: string
  spectralType: string | null
  effectiveTempK: number | null
  radiusSolar: number | null
  massSolar: number | null
  luminositySolar: number | null
  luminosityEstimated: boolean
  metallicity: number | null
  ageGyr: number | null
  distancePc: number | null
  numStars: number | null
  numPlanets: number | null
  raDeg: number | null
  decDeg: number | null
}

export interface HabitableZone {
  /** Conservative HZ (runaway greenhouse -> maximum greenhouse), in AU */
  conservativeInnerAu: number | null
  conservativeOuterAu: number | null
  /** Optimistic HZ (recent Venus -> early Mars), in AU */
  optimisticInnerAu: number | null
  optimisticOuterAu: number | null
}

export interface SystemDetail {
  hostname: string
  star: StarRecord
  planets: PlanetRecord[]
  habitableZone: HabitableZone
}

export interface SystemSummary {
  hostname: string
  numPlanets: number
  distancePc: number | null
}
