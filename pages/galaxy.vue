<script setup lang="ts">
const { positions, pending, error, ensureLoaded } = useSystemPositions()
onMounted(() => ensureLoaded())
</script>

<template>
  <div class="galaxy-page">
    <NuxtLink to="/" class="back-link">← Exoplanetron 4000</NuxtLink>

    <div v-if="pending && positions.length === 0" class="state">Loading known systems…</div>
    <div v-else-if="error" class="state error">{{ error }}</div>

    <ClientOnly v-else>
      <GalaxyMapViewer :systems="positions" />
      <template #fallback>
        <div class="state">Loading 3D map…</div>
      </template>
    </ClientOnly>
  </div>
</template>

<style scoped>
.galaxy-page {
  position: fixed;
  inset: 0;
  background: #03050a;
}

.back-link {
  position: absolute;
  top: 0.9rem;
  left: 1rem;
  z-index: 3;
  background: rgba(5, 7, 13, 0.65);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.35rem 0.9rem;
  font-size: 0.78rem;
  color: var(--text-dim);
  text-decoration: none;
  backdrop-filter: blur(4px);
}

.back-link:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-dim);
  font-size: 0.95rem;
}

.state.error {
  color: var(--danger);
}
</style>
