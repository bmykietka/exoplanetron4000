<script setup lang="ts">
import { TresCanvas, useLoop } from '@tresjs/core'
import { Html, OrbitControls, Stars } from '@tresjs/cientos'
import * as THREE from 'three'
import type { PlanetRecord, SystemDetail } from '~~/shared/types/exoplanet'
import starVertexShader from '~/shaders/star.vert.glsl'
import starFragmentShader from '~/shaders/star.frag.glsl'
import hzVertexShader from '~/shaders/habitableZone.vert.glsl'
import hzFragmentShader from '~/shaders/habitableZone.frag.glsl'

const props = defineProps<{ system: SystemDetail }>()

const TARGET_SCENE_RADIUS = 15
const GOLDEN_ANGLE = 2.399963229728653

const orbitingPlanets = computed(() =>
  props.system.planets.filter(
    (p): p is PlanetRecord & { orbitSemiMajorAxisAu: number } =>
      p.orbitSemiMajorAxisAu !== null && Number.isFinite(p.orbitSemiMajorAxisAu) && p.orbitSemiMajorAxisAu > 0
  )
)

const maxOrbitAu = computed(() => {
  const planetMax = orbitingPlanets.value.reduce((max, p) => Math.max(max, p.orbitSemiMajorAxisAu), 0)
  const hzMax = props.system.habitableZone.optimisticOuterAu ?? 0
  return Math.max(planetMax, hzMax, 0.1)
})

const unitsPerAu = computed(() => {
  const scaledMax = Math.sqrt(maxOrbitAu.value)
  return scaledMax > 0 ? TARGET_SCENE_RADIUS / scaledMax : 1
})

function toSceneRadius(au: number): number {
  return auToSceneUnits(au, 'sqrt', unitsPerAu.value)
}

const starColor = computed(() => new THREE.Color(...starColorForTemp(props.system.star.effectiveTempK)))
const starRadius = computed(() => starVisualRadius(props.system.star.radiusSolar))

const hzScene = computed(() => {
  const z = props.system.habitableZone
  if (z.optimisticInnerAu === null || z.optimisticOuterAu === null) return null
  return {
    conservativeInner: z.conservativeInnerAu !== null ? toSceneRadius(z.conservativeInnerAu) : toSceneRadius(z.optimisticInnerAu),
    conservativeOuter: z.conservativeOuterAu !== null ? toSceneRadius(z.conservativeOuterAu) : toSceneRadius(z.optimisticInnerAu),
    optimisticInner: toSceneRadius(z.optimisticInnerAu),
    optimisticOuter: toSceneRadius(z.optimisticOuterAu)
  }
})

function planetColor(radiusEarth: number | null): THREE.Color {
  const r = radiusEarth ?? 1
  if (r < 1.8) return new THREE.Color('#9fb4c9') // rocky
  if (r < 4) return new THREE.Color('#e0c39a') // sub-neptune / mini-neptune
  return new THREE.Color('#e0a672') // gas giant
}

interface PlanetView {
  planet: PlanetRecord & { orbitSemiMajorAxisAu: number }
  sceneRadius: number
  visualRadius: number
  angularSpeed: number
  color: THREE.Color
}

const planetViews = computed<PlanetView[]>(() => {
  const list = orbitingPlanets.value
  if (list.length === 0) return []
  const minPeriod = Math.min(...list.map((p) => (p.orbitPeriodDays && p.orbitPeriodDays > 0 ? p.orbitPeriodDays : Infinity)))
  const basePeriod = Number.isFinite(minPeriod) ? minPeriod : 1
  const baseAngularSpeed = (2 * Math.PI) / 9 // innermost completes an orbit every ~9s

  return list.map((planet) => {
    const period = planet.orbitPeriodDays && planet.orbitPeriodDays > 0 ? planet.orbitPeriodDays : basePeriod
    return {
      planet,
      sceneRadius: toSceneRadius(planet.orbitSemiMajorAxisAu),
      visualRadius: planetVisualRadius(planet.radiusEarth),
      angularSpeed: baseAngularSpeed * (basePeriod / period),
      color: planetColor(planet.radiusEarth)
    }
  })
})

const angles = ref<number[]>([])
watch(
  planetViews,
  (views) => {
    angles.value = views.map((_, i) => i * GOLDEN_ANGLE)
  },
  { immediate: true }
)

const positions = ref<[number, number, number][]>([])
function syncPositions() {
  positions.value = planetViews.value.map((v, i) => {
    const a = angles.value[i] ?? 0
    return [Math.cos(a) * v.sceneRadius, 0, Math.sin(a) * v.sceneRadius]
  })
}
watch(planetViews, syncPositions, { immediate: true })

const starUniforms = {
  uTime: { value: 0 },
  uColor: { value: starColor.value }
}
watch(starColor, (c) => {
  starUniforms.uColor.value = c
})

// A computed (rather than a mutated plain ref) so the template's v-if reacts
// when the zone appears/disappears, while onBeforeRender still mutates
// uTime in place on the stable object returned between recomputes.
const hzUniforms = computed(() => {
  const z = hzScene.value
  if (!z) return null
  return {
    uTime: { value: 0 },
    uConservativeInner: { value: z.conservativeInner },
    uConservativeOuter: { value: z.conservativeOuter },
    uOptimisticInner: { value: z.optimisticInner },
    uOptimisticOuter: { value: z.optimisticOuter },
    uColor: { value: new THREE.Color('#57e389') }
  }
})

const { onBeforeRender } = useLoop()
onBeforeRender(({ delta, elapsed }) => {
  starUniforms.uTime.value = elapsed
  if (hzUniforms.value) hzUniforms.value.uTime.value = elapsed
  for (let i = 0; i < angles.value.length; i++) {
    angles.value[i] += (planetViews.value[i]?.angularSpeed ?? 0) * delta
  }
  syncPositions()
})

const hoveredPlanet = ref<PlanetRecord | null>(null)
const selectedPlanet = ref<PlanetRecord | null>(null)
const activePlanet = computed(() => hoveredPlanet.value ?? selectedPlanet.value)

function formatAu(au: number | null): string {
  if (au === null) return 'unknown'
  return `${au < 0.01 ? au.toExponential(2) : au.toFixed(3)} AU`
}
</script>

<template>
  <div class="viewer-3d">
    <TresCanvas clear-color="#03050a" :output-color-space="THREE.SRGBColorSpace">
      <TresPerspectiveCamera :position="[0, 12, 26]" :fov="50" />
      <OrbitControls make-default enable-damping :damping-factor="0.08" :min-distance="2" :max-distance="120" />

      <Stars :radius="140" :depth="60" :count="3500" :size="1" :factor="2" :fade="true" />

      <TresAmbientLight :intensity="0.35" />
      <TresPointLight :position="[0, 0, 0]" :intensity="4" :color="starColor" :decay="1.4" />

      <!-- Host star -->
      <TresMesh :scale="starRadius">
        <TresSphereGeometry :args="[1, 48, 48]" />
        <TresShaderMaterial
          :vertex-shader="starVertexShader"
          :fragment-shader="starFragmentShader"
          :uniforms="starUniforms"
        />
      </TresMesh>

      <!-- Habitable zone shaded annulus -->
      <TresMesh
        v-if="hzScene && hzUniforms"
        :rotation="[-Math.PI / 2, 0, 0]"
        :position="[0, -0.01, 0]"
        :render-order="-1"
      >
        <TresRingGeometry :args="[hzScene.optimisticInner, hzScene.optimisticOuter, 128, 1]" />
        <TresShaderMaterial
          :vertex-shader="hzVertexShader"
          :fragment-shader="hzFragmentShader"
          :uniforms="hzUniforms"
          :transparent="true"
          :depth-write="false"
          :side="THREE.DoubleSide"
        />
      </TresMesh>

      <!-- Orbit paths -->
      <TresMesh v-for="v in planetViews" :key="`orbit-${v.planet.name}`" :rotation="[-Math.PI / 2, 0, 0]">
        <TresRingGeometry :args="[v.sceneRadius - 0.012, v.sceneRadius + 0.012, 128]" />
        <TresMeshBasicMaterial color="#3a4870" :transparent="true" :opacity="0.5" :side="THREE.DoubleSide" />
      </TresMesh>

      <!-- Planets -->
      <TresMesh
        v-for="(v, i) in planetViews"
        :key="v.planet.name"
        :position="positions[i] ?? [v.sceneRadius, 0, 0]"
        :scale="v.visualRadius"
        @pointer-enter="hoveredPlanet = v.planet"
        @pointer-leave="hoveredPlanet = null"
        @click="selectedPlanet = v.planet"
      >
        <TresSphereGeometry :args="[1, 32, 32]" />
        <TresMeshStandardMaterial :color="v.color" :roughness="0.85" :metalness="0.05" />
        <Html
          v-if="activePlanet === v.planet"
          :position="[0, v.visualRadius + 0.35, 0]"
          center
          :transform="false"
          class="planet-label"
        >
          {{ v.planet.letter }}
        </Html>
      </TresMesh>
    </TresCanvas>

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

    <p class="hint">Drag to orbit · scroll to zoom · hover or click a planet for details</p>
  </div>
</template>

<style scoped>
.viewer-3d {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 420px;
  border-radius: var(--radius);
  overflow: hidden;
  background: #03050a;
}

.info-card {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(12, 18, 32, 0.88);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.85rem 1rem;
  min-width: 200px;
  backdrop-filter: blur(6px);
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

.hint {
  position: absolute;
  bottom: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-dim);
  background: rgba(5, 7, 13, 0.6);
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  pointer-events: none;
}

:global(.planet-label) {
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  pointer-events: none;
  white-space: nowrap;
}
</style>
