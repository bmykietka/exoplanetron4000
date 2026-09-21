<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import * as THREE from 'three'
import type { PlanetRecord, SystemDetail } from '~~/shared/types/exoplanet'

defineProps<{ system: SystemDetail }>()

const activePlanet = ref<PlanetRecord | null>(null)
const showSolarSystem = ref(false)
</script>

<template>
  <div class="viewer-3d">
    <TresCanvas clear-color="#03050a" :output-color-space="THREE.SRGBColorSpace">
      <SystemScene3D :system="system" :show-solar-system="showSolarSystem" @active-planet="activePlanet = $event" />
    </TresCanvas>

    <label class="solar-system-toggle">
      <input v-model="showSolarSystem" type="checkbox" />
      Compare to our solar system
    </label>

    <div v-if="activePlanet" class="info-card">
      <h3>{{ activePlanet.name }}</h3>
      <dl>
        <dt>Orbit distance</dt>
        <dd>{{ formatOrbitDistance(activePlanet.orbitSemiMajorAxisAu) ?? 'unknown' }}</dd>
        <dt>Radius</dt>
        <dd>{{ formatPlanetRadius(activePlanet.radiusEarth) ?? 'unknown' }}</dd>
        <dt>Mass</dt>
        <dd>{{ formatPlanetMass(activePlanet.massEarth) ?? 'unknown' }}</dd>
        <dt>Eq. temperature</dt>
        <dd>{{ formatTemperature(activePlanet.equilibriumTempK) ?? 'unknown' }}</dd>
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

.solar-system-toggle {
  position: absolute;
  top: 1rem;
  left: 1rem;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  background: rgba(5, 7, 13, 0.7);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.4rem 0.8rem 0.4rem 0.6rem;
  font-size: 0.78rem;
  color: var(--text-dim);
  backdrop-filter: blur(4px);
  cursor: pointer;
  user-select: none;
}

.solar-system-toggle:hover {
  color: var(--text);
  border-color: var(--accent);
}

.solar-system-toggle input {
  accent-color: var(--accent);
  cursor: pointer;
}

:global(.planet-label) {
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  pointer-events: none;
  white-space: nowrap;
}

:global(.solar-system-label) {
  color: #a9c6f0;
  font-size: 10px;
  font-weight: 500;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  pointer-events: none;
  white-space: nowrap;
}
</style>
