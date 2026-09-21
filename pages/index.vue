<script setup lang="ts">
const route = useRoute()
const router = useRouter()

const initialHost = typeof route.query.system === 'string' ? route.query.system : null
const selectedHostname = ref<string | null>(initialHost)
const viewMode = ref<'3d' | '2d'>('3d')

watch(selectedHostname, (name) => {
  router.replace({ query: { ...route.query, system: name ?? undefined } })
})

const { detail, pending, error } = useSystemDetail(selectedHostname)

const { systems, ensureLoaded } = useSystemList()
onMounted(() => ensureLoaded())

function pickRandomSystem() {
  if (systems.value.length === 0) return
  const withMultiplePlanets = systems.value.filter((s) => s.numPlanets >= 3)
  const pool = withMultiplePlanets.length > 0 ? withMultiplePlanets : systems.value
  const pick = pool[Math.floor(Math.random() * pool.length)]
  selectedHostname.value = pick.hostname
}

function formatStarStat(label: string, value: string | null) {
  return value ?? `${label} unknown`
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div class="brand">
        <h1>Exoplanetron 4000</h1>
        <p>Explore exoplanet systems from the NASA Exoplanet Archive</p>
      </div>
      <div class="search-row">
        <SystemSearch v-model="selectedHostname" />
        <button type="button" class="dice-btn" title="Jump to a random system" @click="pickRandomSystem">🎲 Random</button>
        <NuxtLink to="/mixed" class="mixed-link" title="Browse multiple systems at once">🪐 Mixed view</NuxtLink>
        <NuxtLink to="/galaxy" class="mixed-link" title="See where every known system sits relative to Earth">🌌 Galaxy map</NuxtLink>
      </div>
    </header>

    <main class="content">
      <section v-if="!selectedHostname" class="empty-state">
        <h2>Pick a star system to begin</h2>
        <p>Search by host star name above, or try a well-known system:</p>
        <div class="suggestions">
          <button v-for="name in ['TRAPPIST-1', 'Kepler-90', 'HD 40307', 'Proxima Cen', 'TOI-700']" :key="name" @click="selectedHostname = name">
            {{ name }}
          </button>
        </div>
      </section>

      <section v-else class="system-view">
        <div v-if="pending" class="state-panel">Loading {{ selectedHostname }}…</div>
        <div v-else-if="error" class="state-panel error">{{ error }}</div>

        <template v-else-if="detail">
          <div class="system-toolbar">
            <div class="system-title">
              <h2>{{ detail.hostname }}</h2>
              <span class="subtitle">
                {{ detail.star.spectralType ?? 'Unknown type' }} star ·
                {{ detail.planets.length }} known planet{{ detail.planets.length === 1 ? '' : 's' }}
                <template v-if="detail.star.distancePc"> · {{ formatDistance(detail.star.distancePc) }} away</template>
              </span>
            </div>
            <div class="view-toggle" role="tablist" aria-label="Viewer mode">
              <button type="button" :class="{ active: viewMode === '3d' }" role="tab" :aria-selected="viewMode === '3d'" @click="viewMode = '3d'">
                3D fly-around
              </button>
              <button type="button" :class="{ active: viewMode === '2d' }" role="tab" :aria-selected="viewMode === '2d'" @click="viewMode = '2d'">
                2D side view
              </button>
            </div>
          </div>

          <div class="star-stats">
            <div class="stat">
              <span class="stat-label">Effective temp</span>
              <span class="stat-value">{{ formatTemperature(detail.star.effectiveTempK) ?? '—' }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Radius</span>
              <span class="stat-value">{{ detail.star.radiusSolar ? `${detail.star.radiusSolar.toFixed(2)} R☉` : '—' }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Mass</span>
              <span class="stat-value">{{ detail.star.massSolar ? `${detail.star.massSolar.toFixed(2)} M☉` : '—' }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Luminosity</span>
              <span class="stat-value">
                {{ detail.star.luminositySolar ? `${detail.star.luminositySolar.toFixed(3)} L☉` : '—' }}
                <small v-if="detail.star.luminosityEstimated">(estimated)</small>
              </span>
            </div>
            <div class="stat">
              <span class="stat-label">Habitable zone</span>
              <span class="stat-value">
                <template v-if="detail.habitableZone.conservativeInnerAu && detail.habitableZone.conservativeOuterAu">
                  {{ detail.habitableZone.conservativeInnerAu.toFixed(2) }}–{{ detail.habitableZone.conservativeOuterAu.toFixed(2) }} AU
                </template>
                <template v-else>—</template>
              </span>
            </div>
          </div>

          <div class="viewer-panel" :class="{ 'viewer-panel--3d': viewMode === '3d' }">
            <ClientOnly v-if="viewMode === '3d'">
              <SystemViewer3D :system="detail" />
              <template #fallback>
                <div class="viewer-loading">Loading 3D viewer…</div>
              </template>
            </ClientOnly>
            <SystemViewer2D v-else :system="detail" />
          </div>

          <p class="planet-count">
            {{ detail.planets.filter((p) => p.inHabitableZone).length }} of {{ detail.planets.length }} known planets fall within the
            (optimistic) habitable zone.
          </p>
        </template>
      </section>
    </main>

    <footer class="page-footer">
      Data: <a href="https://exoplanetarchive.ipac.caltech.edu/" target="_blank" rel="noopener">NASA Exoplanet Archive</a> ·
      Habitable zone boundaries follow Kopparapu et al. (2013).
    </footer>
  </div>
</template>

<style scoped>
.page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1.5rem clamp(1rem, 4vw, 3rem) 2.5rem;
  gap: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
}

.brand h1 {
  margin: 0;
  font-size: 1.6rem;
  letter-spacing: 0.02em;
}

.brand p {
  margin: 0.15rem 0 0;
  color: var(--text-dim);
  font-size: 0.9rem;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.dice-btn {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: var(--radius);
  padding: 0.55rem 0.9rem;
  cursor: pointer;
  white-space: nowrap;
}

.dice-btn:hover {
  border-color: var(--accent);
}

.mixed-link {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: var(--radius);
  padding: 0.55rem 0.9rem;
  white-space: nowrap;
  text-decoration: none;
  font-size: 0.9rem;
}

.mixed-link:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.content {
  flex: 1;
}

.empty-state {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2.5rem;
  text-align: center;
}

.empty-state h2 {
  margin-top: 0;
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem;
  margin-top: 1rem;
}

.suggestions button {
  background: var(--bg-panel-alt);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 999px;
  padding: 0.4rem 1rem;
  cursor: pointer;
  font-size: 0.85rem;
}

.suggestions button:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.state-panel {
  padding: 3rem;
  text-align: center;
  color: var(--text-dim);
  background: var(--bg-panel);
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.state-panel.error {
  color: var(--danger);
}

.system-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.system-title h2 {
  margin: 0;
  font-size: 1.35rem;
}

.subtitle {
  color: var(--text-dim);
  font-size: 0.85rem;
}

.view-toggle {
  display: flex;
  border: 1px solid var(--border);
  border-radius: 999px;
  overflow: hidden;
}

.view-toggle button {
  background: var(--bg-panel);
  color: var(--text-dim);
  border: none;
  padding: 0.45rem 1rem;
  font-size: 0.82rem;
  cursor: pointer;
}

.view-toggle button.active {
  background: var(--accent);
  color: #05070d;
  font-weight: 600;
}

.star-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 1rem;
  padding: 0.85rem 1.1rem;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 90px;
}

.stat-label {
  font-size: 0.72rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-value {
  font-size: 0.98rem;
  font-weight: 600;
}

.stat-value small {
  font-weight: 400;
  color: var(--text-dim);
}

.viewer-panel {
  min-height: 200px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.75rem;
  display: flex;
}

.viewer-panel--3d {
  height: min(68vh, 620px);
  min-height: 420px;
}

.viewer-panel > * {
  flex: 1;
  min-width: 0;
}

.viewer-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-dim);
  font-size: 0.9rem;
}

.planet-count {
  margin: 0.75rem 0 0;
  color: var(--text-dim);
  font-size: 0.85rem;
}

.page-footer {
  text-align: center;
  color: var(--text-dim);
  font-size: 0.78rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}
</style>
