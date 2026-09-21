<script setup lang="ts">
import { useLoop, useTresContext } from '@tresjs/core'
import { Html, Line2, OrbitControls, Stars } from '@tresjs/cientos'
import * as THREE from 'three'
import type { SystemPosition } from '~~/shared/types/exoplanet'
import starVertexShader from '~/shaders/star.vert.glsl'
import starFragmentShader from '~/shaders/star.frag.glsl'
import starGlowVertexShader from '~/shaders/starGlow.vert.glsl'
import starGlowFragmentShader from '~/shaders/starGlow.frag.glsl'

/**
 * Rendered inside <TresCanvas> (see GalaxyMapViewer.vue) for the same reason
 * SystemScene3D is split from SystemViewer3D: useLoop()/useTresContext()
 * only see the context TresCanvas provides to components it actually
 * renders, not to whatever merely contains <TresCanvas> in its template.
 *
 * With potentially thousands of systems, rendering one <TresMesh> per line
 * would mean thousands of individually Vue-reactive scene objects — real
 * overhead for something that's otherwise just static geometry. Instead the
 * lines and star markers are each built once as a single THREE.BufferGeometry
 * (one draw call apiece) and mounted via <primitive>, with hover handled by
 * manually raycasting against that shared geometry rather than relying on
 * TresJS's per-object pointer events.
 */

const props = defineProps<{ systems: SystemPosition[] }>()
const emit = defineEmits<{ hover: [system: SystemPosition | null]; select: [system: SystemPosition] }>()

const TARGET_SCENE_RADIUS = 45

const maxDistancePc = computed(() => props.systems.reduce((max, s) => Math.max(max, s.distancePc), 1))
const unitsPerSqrtPc = computed(() => {
  const scaledMax = Math.sqrt(maxDistancePc.value)
  return scaledMax > 0 ? TARGET_SCENE_RADIUS / scaledMax : 1
})

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
  const hits = raycaster.value.intersectObject(lineSegments.value, false)
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

const sunColor = new THREE.Color(...starColorForTemp(5772))
const sunUniforms = { uTime: { value: 0 }, uColor: { value: sunColor } }
const sunGlowUniforms = { uTime: { value: 0 }, uColor: { value: sunColor } }

const { onBeforeRender } = useLoop()
onBeforeRender(({ elapsed }) => {
  sunUniforms.uTime.value = elapsed
  sunGlowUniforms.uTime.value = elapsed
})
</script>

<template>
  <TresPerspectiveCamera :position="[0, 25, 70]" :fov="55" />
  <OrbitControls make-default enable-damping :damping-factor="0.08" :min-distance="3" :max-distance="400" />

  <Stars :radius="320" :depth="150" :count="4000" :size="1" :factor="2" :fade="true" />
  <TresAmbientLight :intensity="0.6" />

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
</template>
