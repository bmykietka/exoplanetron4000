<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import * as THREE from 'three'
import type { SystemPosition } from '~~/shared/types/exoplanet'

defineProps<{ systems: SystemPosition[] }>()

const router = useRouter()
const hoveredSystem = ref<SystemPosition | null>(null)
const viewMode = ref<'local' | 'galaxy'>('local')

function goToSystem(system: SystemPosition) {
  router.push({ path: '/', query: { system: system.hostname } })
}
</script>

<template>
  <div class="galaxy-viewer">
    <TresCanvas clear-color="#03050a" :output-color-space="THREE.SRGBColorSpace">
      <GalaxyMapScene :systems="systems" :view-mode="viewMode" @hover="hoveredSystem = $event" @select="goToSystem" />
    </TresCanvas>

    <div class="mode-toggle" role="tablist" aria-label="Galaxy map mode">
      <button type="button" :class="{ active: viewMode === 'local' }" role="tab" :aria-selected="viewMode === 'local'" @click="viewMode = 'local'">
        Local neighborhood
      </button>
      <button type="button" :class="{ active: viewMode === 'galaxy' }" role="tab" :aria-selected="viewMode === 'galaxy'" @click="viewMode = 'galaxy'">
        Milky Way context
      </button>
    </div>

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
    <p v-if="viewMode === 'galaxy'" class="disclaimer">
      Milky Way backdrop is an illustrative procedural approximation, not real star survey data.
    </p>
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

.mode-toggle {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  border: 1px solid var(--border);
  border-radius: 999px;
  overflow: hidden;
  background: rgba(5, 7, 13, 0.65);
  backdrop-filter: blur(6px);
  z-index: 2;
}

.mode-toggle button {
  background: transparent;
  color: var(--text-dim);
  border: none;
  padding: 0.5rem 1.1rem;
  font-size: 0.82rem;
  cursor: pointer;
  white-space: nowrap;
}

.mode-toggle button.active {
  background: var(--accent);
  color: #05070d;
  font-weight: 600;
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

.disclaimer {
  position: absolute;
  bottom: 2.2rem;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  font-size: 0.7rem;
  font-style: italic;
  color: var(--text-dim);
  background: rgba(5, 7, 13, 0.6);
  padding: 0.2rem 0.6rem;
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

:global(.galaxy-label--core) {
  color: #ffd9a0;
  font-size: 10px;
  opacity: 0.75;
}
</style>
