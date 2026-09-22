<script setup lang="ts">
import { useLoop, useTresContext } from '@tresjs/core'
import { Html, Line2, OrbitControls, Stars } from '@tresjs/cientos'
import * as THREE from 'three'
import type { SystemPosition } from '~~/shared/types/exoplanet'
import { generateSpiralGalaxy } from '~/utils/galaxyModel'
import starVertexShader from '~/shaders/star.vert.glsl'
import starFragmentShader from '~/shaders/star.frag.glsl'
import starGlowVertexShader from '~/shaders/starGlow.vert.glsl'
import starGlowFragmentShader from '~/shaders/starGlow.frag.glsl'

const props = defineProps<{ systems: SystemPosition[]; viewMode: 'local' | 'galaxy' }>()
const emit = defineEmits<{ hover: [system: SystemPosition | null]; select: [system: SystemPosition] }>()

const LOCAL_TARGET_RADIUS = 45
const GALAXY_TARGET_RADIUS = 170
// Illustrative real-world scale references: the Milky Way's disk is roughly
// 30 kpc across, and Sol sits about 8 kpc (~26,000 ly) from the galactic
// center — used only to size/place the procedural backdrop, not derived
// from per-star survey data.
const GALAXY_RADIUS_PC = 15000
const SOL_GALACTIC_RADIUS_PC = 8000

const isGalaxyMode = computed(() => props.viewMode === 'galaxy')

const maxDistancePc = computed(() => {
  if (isGalaxyMode.value) return GALAXY_RADIUS_PC
  return props.systems.reduce((max, s) => Math.max(max, s.distancePc), 1)
})

const targetSceneRadius = computed(() => (isGalaxyMode.value ? GALAXY_TARGET_RADIUS : LOCAL_TARGET_RADIUS))

const unitsPerSqrtPc = computed(() => {
  const scaledMax = Math.sqrt(maxDistancePc.value)
  return scaledMax > 0 ? targetSceneRadius.value / scaledMax : 1
})

// In galaxy mode, the local neighborhood (Sun + known systems) is rendered
// as a single group offset out along +X to roughly where Sol sits in the
// Milky Way's disk. Three.js propagates this offset through the group's
// world matrix, so both rendering and raycasting (which operates on each
// object's matrixWorld) stay correct without touching any child geometry.
const solOffset = computed<[number, number, number]>(() => {
  if (!isGalaxyMode.value) return [0, 0, 0]
  const offsetDistance = Math.sqrt(SOL_GALACTIC_RADIUS_PC) * unitsPerSqrtPc.value
  return [offsetDistance, 0, 0]
})

const galaxyDiskRadius = computed(() => Math.sqrt(GALAXY_RADIUS_PC) * unitsPerSqrtPc.value)

interface PositionedSystem {
  system: SystemPosition
  position: THREE.Vector3
}

const positioned = computed<PositionedSystem[]>(() =>
  props.systems.map((system) => {
    const sceneDistance = Math.sqrt(Math.max(system.distancePc, 0)) * unitsPerSqrtPc.value
    const [x, y, z] = equatorialToCartesian(system.raDeg, system.decDeg, sceneDistance)
    return { system, position: new THREE.Vector3(x, y, z) }
  })
)

const lineSegments = computed(() => {
  const geometry = new THREE.BufferGeometry()
  const verts = new Float32Array(positioned.value.length * 6)
  positioned.value.forEach((p, i) => {
    verts[i * 6 + 3] = p.position.x
    verts[i * 6 + 4] = p.position.y
    verts[i * 6 + 5] = p.position.z
  })
  geometry.setAttribute('position', new THREE.BufferAttribute(verts, 3))
  const material = new THREE.LineBasicMaterial({ color: '#4a6fa5', transparent: true, opacity: 0.28 })
  return new THREE.LineSegments(geometry, material)
})

const starPoints = computed(() => {
  const geometry = new THREE.BufferGeometry()
  const verts = new Float32Array(positioned.value.length * 3)
  positioned.value.forEach((p, i) => {
    verts[i * 3] = p.position.x
    verts[i * 3 + 1] = p.position.y
    verts[i * 3 + 2] = p.position.z
  })
  geometry.setAttribute('position', new THREE.BufferAttribute(verts, 3))
  const material = new THREE.PointsMaterial({
    color: '#cfe0ff',
    size: 0.4,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9
  })
  return new THREE.Points(geometry, material)
})

const galaxyPoints = computed(() => {
  if (!isGalaxyMode.value) return null
  const stars = generateSpiralGalaxy({ radius: galaxyDiskRadius.value, count: 16000 })
  const geometry = new THREE.BufferGeometry()
  const verts = new Float32Array(stars.length * 3)
  const colors = new Float32Array(stars.length * 3)
  stars.forEach((s, i) => {
    verts[i * 3] = s.x
    verts[i * 3 + 1] = s.y
    verts[i * 3 + 2] = s.z
    colors[i * 3] = s.color[0]
    colors[i * 3 + 1] = s.color[1]
    colors[i * 3 + 2] = s.color[2]
  })
  geometry.setAttribute('position', new THREE.BufferAttribute(verts, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const material = new THREE.PointsMaterial({
    size: 0.55,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  return new THREE.Points(geometry, material)
})

const { camera, renderer, raycaster } = useTresContext()
const hoveredIndex = ref<number | null>(null)
const pointerNdc = new THREE.Vector2()

function onPointerMove(event: PointerEvent) {
  const canvas = renderer.value?.domElement
  if (!canvas || !camera.value) return
  const rect = canvas.getBoundingClientRect()
  pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.value.params.Line = { threshold: Math.max(unitsPerSqrtPc.value * 0.04, 0.4) }
  raycaster.value.setFromCamera(pointerNdc, camera.value)
  const hits = raycaster.value.intersectObject(lineSegments.value, true)
  hoveredIndex.value = hits.length > 0 && hits[0].index !== undefined ? Math.floor(hits[0].index / 2) : null
}

function onClick() {
  const s = hoveredSystem.value
  if (s) emit('select', s.system)
}

onMounted(() => {
  const canvas = renderer.value?.domElement
  canvas?.addEventListener('pointermove', onPointerMove)
  canvas?.addEventListener('click', onClick)
})
onBeforeUnmount(() => {
  const canvas = renderer.value?.domElement
  canvas?.removeEventListener('pointermove', onPointerMove)
  canvas?.removeEventListener('click', onClick)
})

const hoveredSystem = computed<PositionedSystem | null>(() =>
  hoveredIndex.value !== null ? (positioned.value[hoveredIndex.value] ?? null) : null
)
watch(hoveredSystem, (s) => emit('hover', s?.system ?? null))
watch(isGalaxyMode, () => {
  hoveredIndex.value = null
})

const sunColor = new THREE.Color(...starColorForTemp(5772))
const sunUniforms = { uTime: { value: 0 }, uColor: { value: sunColor } }
const sunGlowUniforms = { uTime: { value: 0 }, uColor: { value: sunColor } }

const { onBeforeRender } = useLoop()
onBeforeRender(({ elapsed }) => {
  sunUniforms.uTime.value = elapsed
  sunGlowUniforms.uTime.value = elapsed
})

const cameraPosition = computed<[number, number, number]>(() =>
  isGalaxyMode.value ? [0, 220, 320] : [0, 25, 70]
)
const cameraMaxDistance = computed(() => (isGalaxyMode.value ? 1400 : 400))
</script>

<template>
  <TresPerspectiveCamera :key="`cam-${viewMode}`" :position="cameraPosition" :fov="55" />
  <OrbitControls
    :key="`controls-${viewMode}`"
    make-default
    enable-damping
    :damping-factor="0.08"
    :min-distance="3"
    :max-distance="cameraMaxDistance"
  />

  <Stars :radius="320" :depth="150" :count="4000" :size="1" :factor="2" :fade="true" />
  <TresAmbientLight :intensity="0.6" />

  <primitive v-if="galaxyPoints" :object="galaxyPoints" />
  <Html v-if="isGalaxyMode" :position="[0, 0, 0]" center :transform="false" class="galaxy-label galaxy-label--core">
    Galactic Center
  </Html>

  <TresGroup :position="solOffset">
    <!-- The Sun -->
    <TresMesh :scale="1.4">
      <TresSphereGeometry :args="[1, 48, 48]" />
      <TresShaderMaterial :vertex-shader="starVertexShader" :fragment-shader="starFragmentShader" :uniforms="sunUniforms" />
    </TresMesh>
    <TresMesh :scale="1.4 * 1.9">
      <TresSphereGeometry :args="[1, 32, 32]" />
      <TresShaderMaterial
        :vertex-shader="starGlowVertexShader"
        :fragment-shader="starGlowFragmentShader"
        :uniforms="sunGlowUniforms"
        :transparent="true"
        :depth-write="false"
        :blending="THREE.AdditiveBlending"
        :side="THREE.BackSide"
      />
    </TresMesh>
    <Html :position="[0, -1.8, 0]" center :transform="false" class="galaxy-label galaxy-label--sun">Sol</Html>

    <primitive :object="lineSegments" />
    <primitive :object="starPoints" />

    <template v-if="hoveredSystem">
      <Line2
        :points="[
          [0, 0, 0],
          [hoveredSystem.position.x, hoveredSystem.position.y, hoveredSystem.position.z]
        ]"
        color="#7fd7ff"
        :line-width="2.5"
      />
      <Html :position="hoveredSystem.position" center :transform="false" class="galaxy-label">
        {{ hoveredSystem.system.hostname }}
      </Html>
    </template>
  </TresGroup>
</template>
