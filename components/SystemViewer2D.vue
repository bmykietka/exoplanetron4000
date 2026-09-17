<script setup lang="ts">
import type { PlanetRecord, SystemDetail } from '~~/shared/types/exoplanet'

const props = defineProps<{ system: SystemDetail }>()

const BASELINE_WIDTH = 1000
const LEFT_PAD = 70
const RIGHT_PAD = 50
const TRACK_HEIGHT = 240
const TRACK_Y = TRACK_HEIGHT / 2

const zoom = ref(1)

const orbitingPlanets = computed(() =>
  props.system.planets.filter(
    (p): p is PlanetRecord & { orbitSemiMajorAxisAu: number } =>
      p.orbitSemiMajorAxisAu !== null && Number.isFinite(p.orbitSemiMajorAxisAu) && p.orbitSemiMajorAxisAu > 0
  )
)

const maxAu = computed(() => {
  const planetMax = orbitingPlanets.value.reduce((max, p) => Math.max(max, p.orbitSemiMajorAxisAu), 0)
  const hzMax = props.system.habitableZone.optimisticOuterAu ?? 0
  return Math.max(planetMax, hzMax, 0.1) * 1.12
})

const unitsPerAu = computed(() => (BASELINE_WIDTH - LEFT_PAD - RIGHT_PAD) / maxAu.value)

const svgWidth = computed(() => LEFT_PAD + RIGHT_PAD + maxAu.value * unitsPerAu.value * zoom.value)

function auToX(au: number): number {
  return LEFT_PAD + au * unitsPerAu.value * zoom.value
}

const AU_TICK_STEPS = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]

const ticks = computed(() => {
  const max = maxAu.value
  const step = AU_TICK_STEPS.find((s) => max / s <= 9) ?? AU_TICK_STEPS[AU_TICK_STEPS.length - 1]
  const values: number[] = []
  for (let v = 0; v <= max; v += step) values.push(v)
  return { step, values }
})

function formatAuLabel(au: number): string {
  if (au === 0) return '0'
  if (au < 0.01) return au.toExponential(1)
  if (au < 10) return au.toFixed(2).replace(/\.?0+$/, '')
  return au.toFixed(0)
}

const starColor = computed(() => {
  const [r, g, b] = starColorForTemp(props.system.star.effectiveTempK)
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`
})
const starPixelRadius = computed(() => 10 + starVisualRadius(props.system.star.radiusSolar) * 10)

function planetPixelRadius(radiusEarth: number | null): number {
  return 3 + planetVisualRadius(radiusEarth) * 34
}

function planetFill(radiusEarth: number | null): string {
  const r = radiusEarth ?? 1
  if (r < 1.8) return '#9fb4c9'
  if (r < 4) return '#e0c39a'
  return '#e0a672'
}

interface PlanetView {
  planet: PlanetRecord & { orbitSemiMajorAxisAu: number }
  x: number
  r: number
  fill: string
  laneOffset: number
}

const planetViews = computed<PlanetView[]>(() =>
  orbitingPlanets.value.map((planet, i) => ({
    planet,
    x: auToX(planet.orbitSemiMajorAxisAu),
    r: planetPixelRadius(planet.radiusEarth),
    fill: planetFill(planet.radiusEarth),
    laneOffset: i % 2 === 0 ? -1 : 1
  }))
)

const hz = computed(() => props.system.habitableZone)

const hoveredPlanet = ref<PlanetRecord | null>(null)
const selectedPlanet = ref<PlanetRecord | null>(null)
const activePlanet = computed(() => hoveredPlanet.value ?? selectedPlanet.value)

function formatAu(au: number | null): string {
  if (au === null) return 'unknown'
  return `${au < 0.01 ? au.toExponential(2) : au.toFixed(3)} AU`
}

function resetZoom() {
  zoom.value = 1
}
</script>

<template>
  <div class="viewer-2d">
    <div class="controls">
      <label class="zoom-control">
        Zoom
        <input v-model.number="zoom" type="range" min="1" max="120" step="1" />
        <span>{{ zoom.toFixed(0) }}x</span>
      </label>
      <button type="button" class="reset-btn" @click="resetZoom">Fit whole system</button>
    </div>

    <div class="scroll-area scrollbar-thin">
      <svg :width="svgWidth" :height="TRACK_HEIGHT" role="img" :aria-label="`Side view of the ${system.hostname} system`">
        <defs>
          <linearGradient id="hz-optimistic" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stop-color="#57e389" stop-opacity="0" />
            <stop offset="15%" stop-color="#57e389" stop-opacity="0.16" />
            <stop offset="85%" stop-color="#57e389" stop-opacity="0.16" />
            <stop offset="100%" stop-color="#57e389" stop-opacity="0" />
          </linearGradient>
          <radialGradient id="star-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" :stop-color="starColor" stop-opacity="0.9" />
            <stop offset="100%" :stop-color="starColor" stop-opacity="0" />
          </radialGradient>
        </defs>

        <!-- Habitable zone bands -->
        <g v-if="hz.optimisticInnerAu !== null && hz.optimisticOuterAu !== null">
          <rect
            :x="auToX(hz.optimisticInnerAu)"
            y="0"
            :width="auToX(hz.optimisticOuterAu) - auToX(hz.optimisticInnerAu)"
            :height="TRACK_HEIGHT"
            fill="url(#hz-optimistic)"
          />
          <rect
            v-if="hz.conservativeInnerAu !== null && hz.conservativeOuterAu !== null"
            :x="auToX(hz.conservativeInnerAu)"
            y="0"
            :width="auToX(hz.conservativeOuterAu) - auToX(hz.conservativeInnerAu)"
            :height="TRACK_HEIGHT"
            fill="#57e389"
            fill-opacity="0.14"
          />
        </g>

        <!-- Axis ticks -->
        <g class="ticks">
          <g v-for="t in ticks.values" :key="t">
            <line :x1="auToX(t)" :x2="auToX(t)" y1="0" :y2="TRACK_HEIGHT" stroke="#1f2b45" stroke-width="1" />
            <text :x="auToX(t)" :y="TRACK_HEIGHT - 6" text-anchor="middle">{{ formatAuLabel(t) }} AU</text>
          </g>
        </g>

        <!-- Orbit track -->
        <line :x1="LEFT_PAD" :x2="svgWidth - RIGHT_PAD" :y1="TRACK_Y" :y2="TRACK_Y" stroke="#2a3556" stroke-width="1.5" />

        <!-- Planet stems (connect marker to track when offset for label clarity) -->
        <line
          v-for="v in planetViews"
          :key="`stem-${v.planet.name}`"
          :x1="v.x"
          :x2="v.x"
          :y1="TRACK_Y"
          :y2="TRACK_Y + v.laneOffset * 34"
          stroke="#2a3556"
          stroke-width="1"
        />

        <!-- Star -->
        <circle :cx="LEFT_PAD" :cy="TRACK_Y" :r="starPixelRadius * 2.2" fill="url(#star-glow)" />
        <circle :cx="LEFT_PAD" :cy="TRACK_Y" :r="starPixelRadius" :fill="starColor" />

        <!-- Planets -->
        <g v-for="v in planetViews" :key="v.planet.name">
          <circle
            :cx="v.x"
            :cy="TRACK_Y + v.laneOffset * 34"
            :r="v.r"
            :fill="v.fill"
            :stroke="v.planet.inHabitableZone ? '#57e389' : 'transparent'"
            stroke-width="2"
            class="planet-dot"
            @mouseenter="hoveredPlanet = v.planet"
            @mouseleave="hoveredPlanet = null"
            @click="selectedPlanet = v.planet"
          />
          <text
            :x="v.x"
            :y="TRACK_Y + v.laneOffset * 34 + v.laneOffset * (v.r + 12)"
            text-anchor="middle"
            class="planet-label"
            :class="{ active: activePlanet === v.planet }"
          >
            {{ v.planet.letter }}
          </text>
        </g>
      </svg>
    </div>

    <div class="legend">
      <span><i class="swatch hz" /> habitable zone (bright = conservative, dim = optimistic)</span>
      <span><i class="swatch rocky" /> rocky</span>
      <span><i class="swatch subneptune" /> sub-Neptune</span>
      <span><i class="swatch giant" /> giant</span>
      <span class="note">Distances are true to scale · body sizes are exaggerated for visibility</span>
    </div>

    <div v-if="activePlanet" class="info-card">
      <h3>{{ activePlanet.name }}</h3>
      <dl>
        <dt>Orbit distance</dt>
        <dd>{{ formatAu(activePlanet.orbitSemiMajorAxisAu) }}</dd>
        <dt>Radius</dt>
        <dd>{{ activePlanet.radiusEarth ? `${activePlanet.radiusEarth.toFixed(2)} R⊕` : 'unknown' }}</dd>
        <dt>Mass</dt>
        <dd>{{ activePlanet.massEarth ? `${activePlanet.massEarth.toFixed(2)} M⊕` : 'unknown' }}</dd>
        <dt>Eq. temperature</dt>
        <dd>{{ activePlanet.equilibriumTempK ? `${Math.round(activePlanet.equilibriumTempK)} K` : 'unknown' }}</dd>
        <dt>Habitable zone</dt>
        <dd :class="{ 'hz-yes': activePlanet.inHabitableZone, 'hz-no': activePlanet.inHabitableZone === false }">
          {{ activePlanet.inHabitableZone === null ? 'unknown' : activePlanet.inHabitableZone ? 'within HZ' : 'outside HZ' }}
        </dd>
      </dl>
    </div>
  </div>
</template>

<style scoped>
.viewer-2d {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.zoom-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-dim);
}

.zoom-control input {
  accent-color: var(--accent);
}

.reset-btn {
  background: var(--bg-panel);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.3rem 0.9rem;
  font-size: 0.78rem;
  cursor: pointer;
}

.reset-btn:hover {
  border-color: var(--accent);
}

.scroll-area {
  overflow-x: auto;
  background: #03050a;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

svg {
  display: block;
}

.ticks text {
  fill: var(--text-dim);
  font-size: 10px;
}

.planet-dot {
  cursor: pointer;
  transition: r 0.15s ease;
}

.planet-dot:hover {
  filter: brightness(1.3);
}

.planet-label {
  fill: var(--text-dim);
  font-size: 10px;
}

.planet-label.active {
  fill: var(--text);
  font-weight: 600;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  font-size: 0.76rem;
  color: var(--text-dim);
  align-items: center;
}

.swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 0.3rem;
  vertical-align: middle;
}

.swatch.hz {
  background: #57e389;
}

.swatch.rocky {
  background: #9fb4c9;
}

.swatch.subneptune {
  background: #e0c39a;
}

.swatch.giant {
  background: #e0a672;
}

.note {
  margin-left: auto;
  font-style: italic;
}

.info-card {
  background: rgba(12, 18, 32, 0.88);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.85rem 1rem;
  min-width: 200px;
  align-self: flex-start;
}

.info-card h3 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  color: var(--accent);
}

.info-card dl {
  display: grid;
  grid-template-columns: auto auto;
  gap: 0.15rem 0.6rem;
  margin: 0;
  font-size: 0.82rem;
}

.info-card dt {
  color: var(--text-dim);
}

.info-card dd {
  margin: 0;
  text-align: right;
}

.hz-yes {
  color: var(--hz-color);
  font-weight: 600;
}

.hz-no {
  color: var(--text-dim);
}
</style>
