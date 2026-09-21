<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import * as THREE from 'three'
import type { SystemPosition } from '~~/shared/types/exoplanet'

defineProps<{ systems: SystemPosition[] }>()

const router = useRouter()
const hoveredSystem = ref<SystemPosition | null>(null)

function goToSystem(system: SystemPosition) {
  router.push({ path: '/', query: { system: system.hostname } })
}
</script>

<template>
  <div class="galaxy-viewer">
    <TresCanvas clear-color="#03050a" :output-color-space="THREE.SRGBColorSpace">
      <GalaxyMapScene :systems="systems" @hover="hoveredSystem = $event" @select="goToSystem" />
    </TresCanvas>

    <div v-if="hoveredSystem" class="info-card">
      <h3>{{ hoveredSystem.hostname }}</h3>
      <dl>
        <dt>Distance</dt>
        <dd>{{ formatDistance(hoveredSystem.distancePc) ?? `${hoveredSystem.distancePc.toFixed(1)} pc` }}</dd>
        <dt>Planets</dt>
        <dd>{{ hoveredSystem.numPlanets }}</dd>
      </dl>
      <p class="click-hint">Click the line to explore this system</p>
    </div>

    <p class="hint">Drag to orbit · scroll to zoom · hover a line for its distance · click to explore that system</p>
    <p class="count">{{ systems.length.toLocaleString() }} known systems plotted</p>
  </div>
</template>

<style scoped>
.galaxy-viewer {
  position: relative;
  width: 100%;
  height: 100%;
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

.click-hint {
  margin: 0.6rem 0 0;
  font-size: 0.72rem;
  color: var(--text-dim);
  font-style: italic;
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

.count {
  position: absolute;
  bottom: 0.75rem;
  right: 1rem;
  margin: 0;
  font-size: 0.72rem;
  color: var(--text-dim);
  pointer-events: none;
}

:global(.galaxy-label) {
  color: #cfe0ff;
  font-size: 11px;
  font-weight: 600;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  pointer-events: none;
  white-space: nowrap;
}

:global(.galaxy-label--sun) {
  color: #ffe9b8;
}
</style>
