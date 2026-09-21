<script setup lang="ts">
import { useLoop } from '@tresjs/core'
import { Html, OrbitControls, Stars } from '@tresjs/cientos'
import * as THREE from 'three'
import type { PlanetRecord, SystemDetail } from '~~/shared/types/exoplanet'
import type { SolarSystemPlanet } from '~/utils/solarSystem'
import starVertexShader from '~/shaders/star.vert.glsl'
import starFragmentShader from '~/shaders/star.frag.glsl'
import starGlowVertexShader from '~/shaders/starGlow.vert.glsl'
import starGlowFragmentShader from '~/shaders/starGlow.frag.glsl'
import hzVertexShader from '~/shaders/habitableZone.vert.glsl'
import hzFragmentShader from '~/shaders/habitableZone.frag.glsl'

/**
 * All the actual Tres scene content lives here, in a component rendered
 * *inside* <TresCanvas> (see SystemViewer3D.vue). useLoop()/useTresContext()
 * only see the context TresCanvas provides to its own descendants — calling
 * them from the wrapping component that merely contains <TresCanvas> in its
 * template throws "useTresContext must be used together with
 * useTresContextProvider", since that wrapper is TresCanvas's parent, not a
 * component it renders.
 */

const props = withDefaults(defineProps<{ system: SystemDetail; showSolarSystem?: boolean }>(), {
  showSolarSystem: false
})
const emit = defineEmits<{ activePlanet: [planet: PlanetRecord | null] }>()

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
  // Including Neptune's orbit in the scaling whenever the comparison layer is
  // on means both systems share one consistent scale — the whole point of
  // the comparison — even though it can make the current system's own
  // planets bunch up near the star for compact systems like TRAPPIST-1.
  const solarMax = props.showSolarSystem ? SOLAR_SYSTEM_MAX_ORBIT_AU : 0
  return Math.max(planetMax, hzMax, solarMax, 0.1)
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
    conservativeOuter: z.conservativeOuterAu !== null ? toSceneRadius(z.conservativeOuterAu) : toSceneRadius(z.optimisticOuterAu),
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

interface SolarSystemPlanetView {
  planet: SolarSystemPlanet
  sceneRadius: number
  visualRadius: number
  angle: number
}

// The reference layer is static (no orbit animation) — its own 8 planets
// don't share a meaningful common time base with whatever exoplanet system
// is on screen, so a fixed, evenly-spread layout reads more clearly than an
// animation that implies a relationship between the two that isn't there.
const solarSystemViews = computed<SolarSystemPlanetView[]>(() => {
  if (!props.showSolarSystem) return []
  return SOLAR_SYSTEM_PLANETS.map((planet, i) => ({
    planet,
    sceneRadius: toSceneRadius(planet.orbitAu),
    visualRadius: planetVisualRadius(planet.radiusEarth),
    angle: i * GOLDEN_ANGLE + Math.PI / 8
  }))
})

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
const starGlowUniforms = {
  uTime: { value: 0 },
  uColor: { value: starColor.value }
}
watch(starColor, (c) => {
  starUniforms.uColor.value = c
  starGlowUniforms.uColor.value = c
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
  starGlowUniforms.uTime.value = elapsed
  if (hzUniforms.value) hzUniforms.value.uTime.value = elapsed
  for (let i = 0; i < angles.value.length; i++) {
    angles.value[i] += (planetViews.value[i]?.angularSpeed ?? 0) * delta
  }
  syncPositions()
})

const hoveredPlanet = ref<PlanetRecord | null>(null)
const selectedPlanet = ref<PlanetRecord | null>(null)
const activePlanet = computed(() => hoveredPlanet.value ?? selectedPlanet.value)
watch(activePlanet, (p) => emit('activePlanet', p), { immediate: true })
</script>

<template>
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

  <!-- Star halo/glow: a larger sphere, back faces only, additively blended -->
  <TresMesh :scale="starRadius * 1.9">
    <TresSphereGeometry :args="[1, 32, 32]" />
    <TresShaderMaterial
      :vertex-shader="starGlowVertexShader"
      :fragment-shader="starGlowFragmentShader"
      :uniforms="starGlowUniforms"
      :transparent="true"
      :depth-write="false"
      :blending="THREE.AdditiveBlending"
      :side="THREE.BackSide"
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

    <!-- Habitable-zone halo: a soft green glow shell, visible from any
         angle, so an in-HZ planet doesn't rely on visually judging its
         overlap with the (semi-transparent, sometimes subtle) HZ ring. -->
    <TresMesh v-if="v.planet.inHabitableZone">
      <TresSphereGeometry :args="[1.8, 20, 20]" />
      <TresMeshBasicMaterial
        color="#57e389"
        :transparent="true"
        :opacity="0.45"
        :side="THREE.BackSide"
        :depth-write="false"
      />
    </TresMesh>

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

  <!-- Solar system comparison layer: orbits + planets of our own solar
       system, laid over the same star position, for scale reference. -->
  <template v-if="showSolarSystem">
    <TresMesh v-for="v in solarSystemViews" :key="`ss-orbit-${v.planet.name}`" :rotation="[-Math.PI / 2, 0, 0]" :position="[0, 0.05, 0]">
      <TresRingGeometry :args="[v.sceneRadius - 0.01, v.sceneRadius + 0.01, 128]" />
      <TresMeshBasicMaterial color="#6fa3e0" :transparent="true" :opacity="0.3" :side="THREE.DoubleSide" />
    </TresMesh>

    <TresMesh
      v-for="v in solarSystemViews"
      :key="`ss-planet-${v.planet.name}`"
      :position="[Math.cos(v.angle) * v.sceneRadius, 0.05, Math.sin(v.angle) * v.sceneRadius]"
      :scale="v.visualRadius"
    >
      <TresSphereGeometry :args="[1, 20, 20]" />
      <TresMeshBasicMaterial :color="v.planet.color" />
      <Html :position="[0, 1.4, 0]" center :transform="false" class="solar-system-label">
        {{ v.planet.name }}
      </Html>
    </TresMesh>
  </template>
</template>
